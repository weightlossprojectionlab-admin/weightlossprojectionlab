import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'

/**
 * GET /api/admin/users?q=<query>
 * Search users by email or UID
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      // For client-side requests, check cookie
      const idToken = request.cookies.get('idToken')?.value
      if (!idToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query) {
      return NextResponse.json({ error: 'Query parameter required' }, { status: 400 })
    }

    // Search by email or UID
    let users: any[] = []

    // Try email search first
    if (query.includes('@')) {
      try {
        const userRecord = await adminAuth.getUserByEmail(query)
        users = [userRecord]
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') {
          throw err
        }
      }
    } else {
      // Try UID search
      try {
        const userRecord = await adminAuth.getUser(query)
        users = [userRecord]
      } catch (err: any) {
        if (err.code !== 'auth/user-not-found') {
          throw err
        }
      }
    }

    // Get user profiles from Firestore
    const enrichedUsers = await Promise.all(
      users.map(async (user) => {
        try {
          const userDoc = await adminDb.collection('users').doc(user.uid).get()
          const userData = userDoc.data()

          // Get activity counts
          const [mealLogs, weightLogs, stepLogs] = await Promise.all([
            adminDb.collection(`users/${user.uid}/mealLogs`).count().get(),
            adminDb.collection(`users/${user.uid}/weightLogs`).count().get(),
            adminDb.collection(`users/${user.uid}/stepLogs`).count().get(),
          ])

          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData?.displayName,
            createdAt: user.metadata.creationTime,
            lastActiveAt: userData?.lastActiveAt?.toDate?.() || null,
            role: userData?.role,
            suspended: user.disabled,
            mealLogsCount: mealLogs.data().count,
            weightLogsCount: weightLogs.data().count,
            stepLogsCount: stepLogs.data().count,
          }
        } catch (err) {
          console.error(`Error enriching user ${user.uid}:`, err)
          return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            createdAt: user.metadata.creationTime,
            lastActiveAt: null,
            role: null,
            suspended: user.disabled,
            mealLogsCount: 0,
            weightLogsCount: 0,
            stepLogsCount: 0,
          }
        }
      })
    )

    return NextResponse.json({ users: enrichedUsers })
  } catch (error) {
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search users' },
      { status: 500 }
    )
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
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user' },
      { status: 500 }
    )
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
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete user' },
      { status: 500 }
    )
  }
}
