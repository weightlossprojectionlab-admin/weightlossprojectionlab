import { NextRequest, NextResponse } from 'next/server'
import { adminDb, adminAuth, verifyIdToken } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'
import { ErrorHandler } from '@/lib/utils/error-handler'
import { rateLimit } from '@/lib/rate-limit'
import { errorResponse } from '@/lib/api-response'

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

    // Apply rate limiting (SEC-006)
    const rateLimitResponse = await rateLimit(request, 'admin:grant-role', adminUid)
    if (rateLimitResponse) {
      return rateLimitResponse
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
    return errorResponse(err: any, {
      route: '/api/admin/grant-role',
      operation: 'create'
    })
  }
}
