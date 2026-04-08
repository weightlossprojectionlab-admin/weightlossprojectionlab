/**
 * Admin Franchise Application Detail / Update API
 *
 * GET   /api/admin/franchise-requests/[applicationId]
 *   Returns the full application doc.
 *
 * PATCH /api/admin/franchise-requests/[applicationId]
 *   Updates application status to 'reviewed' or 'rejected' (with optional notes).
 *   Approval is a separate endpoint (./approve) because it has a non-trivial
 *   side effect (creates a tenant doc).
 *
 * Auth: super admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { isSuperAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'
import { errorResponse, forbiddenResponse } from '@/lib/api-response'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const idToken = authHeader?.replace('Bearer ', '')
  if (!idToken) return null
  const decodedToken = await adminAuth.verifyIdToken(idToken)
  const adminEmail = decodedToken.email || ''
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get()
  const adminData = adminDoc.data()
  if (!isSuperAdmin(adminEmail) && adminData?.role !== 'admin') return null
  return decodedToken
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const doc = await adminDb.collection('franchise_applications').doc(applicationId).get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      application: { id: doc.id, ...doc.data() },
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/franchise-requests/[id]', operation: 'get' })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  try {
    const { applicationId } = await params
    const decoded = await verifyAdmin(request)
    if (!decoded) return forbiddenResponse('Admin access required')

    const body = await request.json().catch(() => ({}))
    const { status, notes } = body

    if (!status || !['reviewed', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'reviewed' or 'rejected'. Use the /approve endpoint for approval." },
        { status: 400 }
      )
    }

    const ref = adminDb.collection('franchise_applications').doc(applicationId)
    const doc = await ref.get()
    if (!doc.exists) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updates: Record<string, any> = {
      status,
      reviewedBy: decoded.email,
      reviewedAt: now,
      updatedAt: now,
    }
    if (typeof notes === 'string') {
      updates.adminNotes = notes
    }

    await ref.update(updates)

    await logAdminAction({
      adminUid: decoded.uid,
      adminEmail: decoded.email || 'unknown',
      action: status === 'rejected' ? 'franchise_application_rejected' : 'franchise_application_reviewed',
      targetType: 'tenant',
      targetId: applicationId,
      reason: `Application ${status}${notes ? `: ${notes.slice(0, 100)}` : ''}`,
    })

    logger.info('[Franchise Requests] Status updated', { applicationId, status })

    return NextResponse.json({ success: true })
  } catch (error) {
    return errorResponse(error, { route: '/api/admin/franchise-requests/[id]', operation: 'patch' })
  }
}
