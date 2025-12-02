import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'
import { Timestamp } from 'firebase-admin/firestore'
import { errorResponse } from '@/lib/api-response'

/**
 * One-time API endpoint to fix incorrect startWeight in user profile
 * This endpoint finds the user's first weight log and updates startWeight to match it
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get user's profile
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const userData = userDoc.data()
    const currentStartWeight = userData?.goals?.startWeight

    // Get the first (oldest) weight log
    const weightLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('weightLogs')
      .orderBy('loggedAt', 'asc')
      .limit(1)
      .get()

    if (weightLogsSnapshot.empty) {
      return NextResponse.json({ error: 'No weight logs found' }, { status: 404 })
    }

    const firstWeightLog = weightLogsSnapshot.docs[0].data()
    const firstWeight = firstWeightLog.weight

    // Only update if current startWeight is unrealistic (< 50 lbs)
    if (currentStartWeight && currentStartWeight >= 50) {
      return NextResponse.json({
        message: 'Start weight is already valid, no update needed',
        currentStartWeight,
        firstWeight
      })
    }

    // Update the startWeight
    await adminDb.collection('users').doc(userId).update({
      'goals.startWeight': firstWeight
    })

    return NextResponse.json({
      success: true,
      message: 'Start weight updated successfully',
      oldStartWeight: currentStartWeight,
      newStartWeight: firstWeight,
      firstWeightLogDate: firstWeightLog.loggedAt.toDate().toISOString()
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/fix-start-weight',
      operation: 'create'
    })
  }
}
