import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

/**
 * GET /api/admin/users/export?uid=<uid>
 * Export all user data for GDPR compliance
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin or support
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && !['admin', 'support'].includes(adminData?.role)) {
      return NextResponse.json({ error: 'Forbidden - Insufficient permissions' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 })
    }

    // Get user auth data
    const userRecord = await adminAuth.getUser(uid)

    // Get user Firestore data
    const userDoc = await adminDb.collection('users').doc(uid).get()
    const userData = userDoc.data()

    // Get all subcollections
    const [
      mealLogs,
      weightLogs,
      stepLogs,
      biometricCredentials,
      cookingSessions,
      recipeQueue,
    ] = await Promise.all([
      adminDb.collection(`users/${uid}/mealLogs`).get(),
      adminDb.collection(`users/${uid}/weightLogs`).get(),
      adminDb.collection(`users/${uid}/stepLogs`).get(),
      adminDb.collection(`users/${uid}/biometricCredentials`).get(),
      adminDb.collection('cooking-sessions').where('userId', '==', uid).get(),
      adminDb.collection('recipe-queue').where('userId', '==', uid).get(),
    ])

    // Build export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedBy: adminEmail,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        emailVerified: userRecord.emailVerified,
        disabled: userRecord.disabled,
        createdAt: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
      },
      profile: userData || {},
      mealLogs: mealLogs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      weightLogs: weightLogs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      stepLogs: stepLogs.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      biometricCredentials: biometricCredentials.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      cookingSessions: cookingSessions.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      recipeQueue: recipeQueue.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    }

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'user_export',
      targetType: 'user',
      targetId: uid,
      reason: 'GDPR data export',
    })

    // Return as downloadable JSON
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="user-${uid}-export-${Date.now()}.json"`,
      },
    })
  } catch (error) {
    logger.error('Error exporting user data', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export user data' },
      { status: 500 }
    )
  }
}
