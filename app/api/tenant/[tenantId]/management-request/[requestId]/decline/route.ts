/**
 * POST /api/tenant/[tenantId]/management-request/[requestId]/decline
 *
 * Phase B slice 7: franchise admin (or staff) declines a family's
 * management request. No Firestore counter changes — the family was
 * never attached, so no seats consumed.
 *
 * Auth: verifyTenantStaffOrAdminAuth (same as approve).
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string; requestId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, requestId } = await context.params
    if (!tenantId || !requestId) {
      return NextResponse.json(
        { error: 'tenantId and requestId are required' },
        { status: 400 }
      )
    }

    const verification = await verifyTenantStaffOrAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const requestRef = adminDb.collection('tenantManagementRequests').doc(requestId)
    const reqSnap = await requestRef.get()
    if (!reqSnap.exists) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }
    const req = reqSnap.data() as any
    if (req.tenantId !== tenantId) {
      return NextResponse.json(
        { error: 'Forbidden — request does not belong to this tenant' },
        { status: 403 }
      )
    }
    if (req.status !== 'pending') {
      return NextResponse.json(
        { error: 'This request is no longer pending.' },
        { status: 409 }
      )
    }

    await requestRef.update({
      status: 'declined',
      decidedAt: new Date().toISOString(),
      decidedBy: verification.uid,
      decidedByEmail: verification.email,
    })

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_request_declined',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      changes: { requestId, familyUid: req.familyUid },
      reason: verification.isSuperAdmin
        ? 'super-admin decline'
        : verification.isFranchiseAdmin
        ? 'franchise owner decline'
        : 'franchise staff decline',
    })

    revalidatePath('/tenant-shell/dashboard/families')

    logger.info('[management-request] declined', {
      tenantId,
      requestId,
      adminUid: verification.uid,
    })

    return NextResponse.json({ success: true, requestId })
  } catch (err) {
    logger.error('[management-request] decline failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
