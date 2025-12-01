import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'

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
      // Set Firebase Custom Claims (for security rules)
      const customClaims: Record<string, any> = {
        role,
        admin: role === 'admin',
        moderator: role === 'moderator',
        support: role === 'support',
      }

      try {
        await adminAuth.setCustomUserClaims(targetUid, customClaims)
        logger.info('Custom claims set successfully', { targetUid, role })
      } catch (claimsError) {
        ErrorHandler.handle(claimsError, {
          operation: 'set_custom_claims',
          userId: adminUid,
          component: 'api/admin/grant-role',
          severity: 'error',
          metadata: { targetUid, role }
        })
        throw new Error('Failed to set custom claims on user account')
      }

      // Update Firestore (for backward compatibility and querying)
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
        message: `Successfully granted ${role} role to user. User must refresh their token for changes to take effect.`,
        data: {
          userId: targetUid,
          email: userData?.email,
          newRole: role,
          customClaimsSet: true,
        },
      })
    } else if (action === 'revoke') {
      // Clear Firebase Custom Claims
      try {
        await adminAuth.setCustomUserClaims(targetUid, {
          role: null,
          admin: false,
          moderator: false,
          support: false,
        })
        logger.info('Custom claims cleared successfully', { targetUid })
      } catch (claimsError) {
        ErrorHandler.handle(claimsError, {
          operation: 'clear_custom_claims',
          userId: adminUid,
          component: 'api/admin/grant-role',
          severity: 'error',
          metadata: { targetUid }
        })
        throw new Error('Failed to clear custom claims on user account')
      }

      // Update Firestore (for backward compatibility)
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
        message: 'Successfully revoked admin role from user. User must refresh their token for changes to take effect.',
        data: {
          userId: targetUid,
          email: userData?.email,
          newRole: null,
          customClaimsCleared: true,
        },
      })
    }
  } catch (error) {
    ErrorHandler.handle(error, {
      operation: 'admin_grant_role',
      component: 'api/admin/grant-role',
      userId: 'unknown'
    })

    const userMessage = ErrorHandler.getUserMessage(error)
    return NextResponse.json(
      {
        error: userMessage,
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    )
  }
}
