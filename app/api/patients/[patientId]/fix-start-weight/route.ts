import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { errorResponse } from '@/lib/api-response'

/**
 * One-time API endpoint to fix missing startWeight for a patient
 * This endpoint finds the patient's first weight log and sets goals.startWeight to match it
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const { patientId } = await params

    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Get patient document
    const patientDoc = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .get()

    if (!patientDoc.exists) {
      return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    }

    const patientData = patientDoc.data()
    const currentStartWeight = patientData?.goals?.startWeight

    // Get the first (oldest) weight log for this patient
    const weightLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .collection('weightLogs')
      .orderBy('loggedAt', 'asc')
      .limit(1)
      .get()

    if (weightLogsSnapshot.empty) {
      // No weight logs - check if patient has currentWeight field (legacy)
      if (patientData?.currentWeight && patientData.currentWeight > 0) {
        // Use currentWeight as starting weight
        await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .update({
            'goals.startWeight': patientData.currentWeight
          })

        return NextResponse.json({
          success: true,
          message: 'Start weight set from currentWeight field',
          newStartWeight: patientData.currentWeight,
          source: 'currentWeight'
        })
      }

      return NextResponse.json({ error: 'No weight logs or currentWeight found for this patient' }, { status: 404 })
    }

    const firstWeightLog = weightLogsSnapshot.docs[0].data()
    const firstWeight = firstWeightLog.weight

    // Only update if current startWeight is missing or unrealistic (< 10 lbs for humans)
    if (currentStartWeight && currentStartWeight >= 10) {
      return NextResponse.json({
        message: 'Start weight is already set and valid, no update needed',
        currentStartWeight,
        firstWeight
      })
    }

    // Update the goals.startWeight
    await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)
      .update({
        'goals.startWeight': firstWeight
      })

    return NextResponse.json({
      success: true,
      message: 'Start weight updated successfully from first weight log',
      oldStartWeight: currentStartWeight || null,
      newStartWeight: firstWeight,
      firstWeightLogDate: firstWeightLog.loggedAt.toDate().toISOString(),
      source: 'weightLog'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/fix-start-weight',
      operation: 'create'
    })
  }
}
