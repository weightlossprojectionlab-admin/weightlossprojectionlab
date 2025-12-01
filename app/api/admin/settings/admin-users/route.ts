import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * GET /api/admin/settings/admin-users
 * Get list of all users with admin roles
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

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(adminUid).get()
    const adminData = adminDoc.data()
    const isSuperAdmin = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com'].includes(adminEmail)

    if (!isSuperAdmin && adminData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Query users with admin roles
    const usersSnapshot = await adminDb
      .collection('users')
      .where('role', 'in', ['admin', 'moderator', 'support'])
      .get()

    const adminUsers = usersSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        uid: doc.id,
        email: data.email,
        displayName: data.displayName,
        role: data.role,
        grantedAt: data.roleGrantedAt?.toDate?.() || null,
        grantedBy: data.roleGrantedBy || null,
      }
    })

    // Also add super admins if not already in list
    const superAdminEmails = ['perriceconsulting@gmail.com', 'weigthlossprojectionlab@gmail.com']
    for (const email of superAdminEmails) {
      try {
        const userRecord = await adminAuth.getUserByEmail(email)
        if (!adminUsers.find(u => u.uid === userRecord.uid)) {
          adminUsers.push({
            uid: userRecord.uid,
            email: userRecord.email!,
            displayName: userRecord.displayName || null,
            role: 'admin',
            grantedAt: null,
            grantedBy: 'System (Super Admin)',
          })
        }
      } catch (err) {
    return errorResponse(err, {
      route: '/api/admin/settings/admin-users',
      operation: 'fetch'
    })
  }
}
