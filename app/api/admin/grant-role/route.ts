import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
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
    const { targetUserId, role, action } = body

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

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    // Get target user
    const userRef = adminDb.collection('users').doc(targetUserId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
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
        targetId: targetUserId,
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
          userId: targetUserId,
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
        targetId: targetUserId,
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
          userId: targetUserId,
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
