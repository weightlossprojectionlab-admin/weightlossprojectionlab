import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { errorResponse, unauthorizedResponse, forbiddenResponse } from '@/lib/api-response'

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
      return unauthorizedResponse()
    }

    // Verify token with Firebase Admin SDK
    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin (super admin or has admin/moderator/support role)
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return forbiddenResponse('Admin access required')
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
    } else {
      // List all users with pagination
      try {
        const listUsersResult = await adminAuth.listUsers(limit, pageToken)
        users = listUsersResult.users
        nextPageToken = listUsersResult.pageToken
      } catch (err) {
        logger.error('Error listing users', err as Error)
        throw err
      }
    }

    // Batch-fetch all user profile docs in a single getAll() call
    const userRefs = users.map(u => adminDb.collection('users').doc(u.uid))
    const userDocs = userRefs.length > 0 ? await adminDb.getAll(...userRefs) : []
    const userDataMap = new Map<string, FirebaseFirestore.DocumentData>()
    for (const doc of userDocs) {
      if (doc.exists) {
        userDataMap.set(doc.id, doc.data()!)
      }
    }

    // Batch all count queries in parallel (one Promise.all instead of N separate ones)
    const countResults = await Promise.all(
      users.map(user => Promise.all([
        adminDb.collection(`users/${user.uid}/mealLogs`).count().get(),
        adminDb.collection(`users/${user.uid}/weightLogs`).count().get(),
        adminDb.collection(`users/${user.uid}/stepLogs`).count().get(),
        adminDb.collection(`users/${user.uid}/patients`).count().get(),
        adminDb.collection(`users/${user.uid}/familyMembers`).count().get(),
      ]).catch(err => {
        logger.error('Error fetching counts for user', err as Error, { uid: user.uid })
        return null
      }))
    )

    const enrichedUsers = users.map((user, i) => {
      const userData = userDataMap.get(user.uid)
      const counts = countResults[i]

      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userData?.displayName,
        name: userData?.name,
        createdAt: user.metadata.creationTime,
        lastActiveAt: userData?.lastActiveAt?.toDate?.() || null,
        role: userData?.role,
        suspended: user.disabled,
        mealLogsCount: counts?.[0]?.data().count ?? 0,
        weightLogsCount: counts?.[1]?.data().count ?? 0,
        stepLogsCount: counts?.[2]?.data().count ?? 0,
        patientsCount: counts?.[3]?.data().count ?? 0,
        familyMembersCount: counts?.[4]?.data().count ?? 0,
        caregiverOf: userData?.caregiverOf || [],
        onboardingCompleted: userData?.profile?.onboardingCompleted,
        userMode: userData?.preferences?.userMode,
        isAccountOwner: userData?.preferences?.isAccountOwner,
        subscription: userData?.subscription || null,
      }
    })

    return NextResponse.json({
      users: enrichedUsers,
      ...(nextPageToken && { nextPageToken })
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/users', operation: 'search' })
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
      return unauthorizedResponse()
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
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
    return errorResponse(error, { route: '/api/admin/users', operation: 'update' })
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
      return unauthorizedResponse()
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email || 'unknown'

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin') {
      return forbiddenResponse('Admin access required')
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
    return errorResponse(error, { route: '/api/admin/users', operation: 'delete' })
  }
}
