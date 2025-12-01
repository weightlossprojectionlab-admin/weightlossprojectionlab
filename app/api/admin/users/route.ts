import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/users?q=<query>&limit=<limit>&pageToken=<pageToken>
 * Search users by email/UID OR list all users with pagination
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    const idToken = authHeader?.replace('Bearer ', '') || request.cookies.get('idToken')?.value

    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin (super admin or has admin/moderator/support role)
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail.toLowerCase())

    if (!isSuperAdmin && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const pageToken = searchParams.get('pageToken') || undefined

    let users: any[] = []
    let nextPageToken: string | undefined

    // If query provided, search for specific user
    if (query) {
      // Try email search first
      if (query.includes('@')) {
        try {
          const userRecord = await adminAuth.getUserByEmail(query)
          users = [userRecord]
        } catch (err: any) {
    return errorResponse(err: any, {
      route: '/api/admin/users',
      operation: 'fetch'
    })
  }
}

/**
 * PATCH /api/admin/users
 * Suspend or unsuspend a user
 */
export async function PATCH(request: NextRequest) {
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

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { uid, action } = body

    if (!uid || !action) {
      return NextResponse.json({ error: 'UID and action required' }, { status: 400 })
    }

    if (action === 'suspend') {
      // Suspend user
      await adminAuth.updateUser(uid, { disabled: true })
      await adminDb.collection('users').doc(uid).update({ suspended: true })

      // Log action
      await logAdminAction({
        adminUid,
        adminEmail,
        action: 'user_suspend',
        targetType: 'user',
        targetId: uid,
        reason: 'Suspended via admin panel',
      })

      return NextResponse.json({ success: true, message: 'User suspended' })
    } else if (action === 'unsuspend') {
      // Unsuspend user
      await adminAuth.updateUser(uid, { disabled: false })
      await adminDb.collection('users').doc(uid).update({ suspended: false })

      // Log action
      await logAdminAction({
        adminUid,
        adminEmail,
        action: 'user_unsuspend',
        targetType: 'user',
        targetId: uid,
        reason: 'Unsuspended via admin panel',
      })

      return NextResponse.json({ success: true, message: 'User unsuspended' })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/users',
      operation: 'patch'
    })
  }
}

/**
 * DELETE /api/admin/users
 * Delete a user account (permanent)
 */
export async function DELETE(request: NextRequest) {
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

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { uid } = body

    if (!uid) {
      return NextResponse.json({ error: 'UID required' }, { status: 400 })
    }

    // Get user email before deletion
    const userRecord = await adminAuth.getUser(uid)
    const userEmail = userRecord.email

    // Delete user from Firebase Auth
    await adminAuth.deleteUser(uid)

    // Delete user document from Firestore
    // Note: Subcollections are NOT automatically deleted - consider a Cloud Function for this
    await adminDb.collection('users').doc(uid).delete()

    // Log action
    await logAdminAction({
      adminUid,
      adminEmail,
      action: 'user_delete',
      targetType: 'user',
      targetId: uid,
      reason: 'Deleted via admin panel',
      metadata: { deletedEmail: userEmail },
    })

    return NextResponse.json({ success: true, message: 'User deleted' })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/users',
      operation: 'delete'
    })
  }
}
