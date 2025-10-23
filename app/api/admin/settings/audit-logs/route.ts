import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

/**
 * GET /api/admin/settings/audit-logs?limit=<limit>
 * Get recent audit logs
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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')

    // Query audit logs
    const logsSnapshot = await adminDb
      .collection('admin_audit_logs')
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get()

    const logs = logsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        logId: doc.id,
        adminEmail: data.adminEmail,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        timestamp: data.timestamp?.toDate?.() || new Date(),
        reason: data.reason,
        changes: data.changes,
        metadata: data.metadata,
      }
    })

    return NextResponse.json({ logs })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
