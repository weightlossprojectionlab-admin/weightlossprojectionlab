import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { Timestamp } from 'firebase-admin/firestore'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const adminUid = decodedToken.uid
    const adminEmail = decodedToken.email

    // Only super admins can grant roles
    if (!isSuperAdmin(adminEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized: Only super admins can grant roles' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { targetUserId, targetEmail, role, action } = body

    // Validate role
    const validRoles = ['admin', 'moderator', 'support', null]
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin, moderator, support, or null (to revoke)' },
        { status: 400 }
      )
    }

    // Validate action
    if (!['grant', 'revoke'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "grant" or "revoke"' },
        { status: 400 }
      )
    }

    if (!targetUserId && !targetEmail) {
      return NextResponse.json(
        { error: 'Target user ID or email is required' },
        { status: 400 }
      )
    }

    // Get target user UID (from email if needed)
    let targetUid = targetUserId
    if (!targetUid && targetEmail) {
      try {
        const userRecord = await adminAuth.getUserByEmail(targetEmail)
        targetUid = userRecord.uid
      } catch (err: any) {
        if (err.code === 'auth/user-not-found') {
          return NextResponse.json(
            { error: 'User not found with that email' },
            { status: 404 }
          )
        }
        throw err
      }
    }

    // Get target user from Firestore
    const userRef = adminDb.collection('users').doc(targetUid)
    const userDoc = await userRef.get()

    // If user doesn't exist in Firestore, create a basic profile
    if (!userDoc.exists) {
      const userRecord = await adminAuth.getUser(targetUid)
      await userRef.set({
        email: userRecord.email,
        displayName: userRecord.displayName || null,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      })
    }

    const userData = userDoc.data()

    // Update user role
    if (action === 'grant') {
      await userRef.update({
        role,
        updatedAt: Timestamp.now(),
      })

      // Log admin action
      await logAdminAction({
        adminUid,
        adminEmail: adminEmail || 'unknown',
        action: 'admin_role_grant',
        targetType: 'user',
        targetId: targetUid,
        metadata: {
          targetEmail: userData?.email,
          grantedRole: role,
        },
        reason: `Granted ${role} role to ${userData?.email}`,
      })

      return NextResponse.json({
        success: true,
        message: `Successfully granted ${role} role to user`,
        data: {
          userId: targetUid,
          email: userData?.email,
          newRole: role,
        },
      })
    } else if (action === 'revoke') {
      await userRef.update({
        role: null,
        updatedAt: Timestamp.now(),
      })

      // Log admin action
      await logAdminAction({
        adminUid,
        adminEmail: adminEmail || 'unknown',
        action: 'admin_role_revoke',
        targetType: 'user',
        targetId: targetUid,
        metadata: {
          targetEmail: userData?.email,
          previousRole: userData?.role,
        },
        reason: `Revoked ${userData?.role} role from ${userData?.email}`,
      })

      return NextResponse.json({
        success: true,
        message: 'Successfully revoked admin role from user',
        data: {
          userId: targetUid,
          email: userData?.email,
          newRole: null,
        },
      })
    }
  } catch (error) {
    console.error('Error managing admin role:', error)
    return NextResponse.json(
      {
        error: 'Failed to manage admin role',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
