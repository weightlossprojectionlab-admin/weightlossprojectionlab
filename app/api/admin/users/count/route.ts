import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { isSuperAdmin } from '@/lib/admin/permissions'

/**
 * GET /api/admin/users/count
 * Get total count of authenticated users (Firebase Auth accounts)
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
    const isSuper = isSuperAdmin(adminEmail)

    if (!isSuper && adminData?.role !== 'admin' && adminData?.role !== 'moderator' && adminData?.role !== 'support') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Count all authenticated users by iterating through all pages
    let totalCount = 0
    let pageToken: string | undefined = undefined

    do {
      const listUsersResult = await adminAuth.listUsers(1000, pageToken)
      totalCount += listUsersResult.users.length
      pageToken = listUsersResult.pageToken

      logger.debug(`Counted ${listUsersResult.users.length} users (total so far: ${totalCount})`)
    } while (pageToken)

    logger.info(`Total authenticated users count: ${totalCount}`)

    return NextResponse.json({ count: totalCount })
  } catch (error) {
    logger.error('Error counting users', error as Error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to count users' },
      { status: 500 }
    )
  }
}
