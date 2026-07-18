import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { collectUserExport } from '@/lib/user-data-export'

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
      return unauthorizedResponse()
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin or support
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && !['admin', 'support'].includes(adminData?.role)) {
      return forbiddenResponse('Insufficient permissions')
    }

    const searchParams = request.nextUrl.searchParams
    const uid = searchParams.get('uid')

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 })
    }

    // Get user auth data
    const userRecord = await adminAuth.getUser(uid)

    // Gather all Firestore data via the shared collector (same shape as the
    // user-facing /api/user/export).
    const data = await collectUserExport(uid)

    // Build export data
    const exportData = {
      ...data,
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
    return errorResponse(error, {
      route: '/api/admin/users/export',
      operation: 'fetch'
    })
  }
}
