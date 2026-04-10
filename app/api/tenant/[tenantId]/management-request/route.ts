/**
 * POST /api/tenant/[tenantId]/management-request
 *
 * Phase B slice 7: a consumer family submits a request to be managed by
 * a specific franchise tenant. This is the family-side counterpart to
 * the franchise owner's manual attach-by-email flow from slice 2.
 *
 * Body: { message?: string }
 *
 * Auth: Bearer token of the family's own Firebase user. NOT a tenant
 * admin token — the family is the actor, requesting management. The
 * server reads the uid from the verified token and writes that as the
 * familyUid on the request doc.
 *
 * Behavior:
 *  - Tenant must exist and be in 'active' or 'paid' status
 *  - Family must have a Firestore user doc (i.e. completed sign-up)
 *  - Family must NOT already be managed by ANY tenant (per the same
 *    single-tenant constraint enforced in slice 2)
 *  - Reject duplicate pending requests for the same {tenantId, familyUid}
 *  - Audit log
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId } = await context.params
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    const idToken = authHeader.split('Bearer ')[1]
    let decoded
    try {
      decoded = await adminAuth.verifyIdToken(idToken)
    } catch (err) {
      logger.warn('[management-request] token verification failed', { err: (err as Error).message })
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 })
    }
    const familyUid = decoded.uid
    const familyEmail = decoded.email || ''

    const body = await request.json().catch(() => ({}))
    const message =
      typeof body?.message === 'string' ? body.message.trim().slice(0, 1000) : ''

    // Tenant existence + status check.
    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const tenantSnap = await tenantRef.get()
    if (!tenantSnap.exists) {
      return NextResponse.json({ error: 'Provider not found' }, { status: 404 })
    }
    const tenant = tenantSnap.data() as any
    if (tenant.status !== 'active' && tenant.status !== 'paid') {
      return NextResponse.json(
        { error: 'This provider is not currently accepting new families.' },
        { status: 409 }
      )
    }

    // Family must have a user doc (i.e. completed onboarding).
    const familyRef = adminDb.collection('users').doc(familyUid)
    const familySnap = await familyRef.get()
    if (!familySnap.exists) {
      return NextResponse.json(
        { error: 'Please complete your account setup before requesting a provider.' },
        { status: 409 }
      )
    }
    const familyData = familySnap.data() as any
    const existingManagedBy: string[] = Array.isArray(familyData?.managedBy)
      ? familyData.managedBy
      : []

    // Already managed by someone — block (single-tenant constraint matches slice 2).
    if (existingManagedBy.length > 0) {
      const isThis = existingManagedBy.includes(tenantId)
      return NextResponse.json(
        {
          error: isThis
            ? 'This provider already manages your account.'
            : 'You are already managed by another provider. Ask them to release your account first.',
        },
        { status: 409 }
      )
    }

    // Reject duplicate pending requests for the same family→tenant pair.
    const dupSnap = await adminDb
      .collection('tenantManagementRequests')
      .where('tenantId', '==', tenantId)
      .where('familyUid', '==', familyUid)
      .where('status', '==', 'pending')
      .limit(1)
      .get()
    if (!dupSnap.empty) {
      return NextResponse.json(
        { error: 'You already have a pending request with this provider.' },
        { status: 409 }
      )
    }

    const nowIso = new Date().toISOString()
    const requestRef = adminDb.collection('tenantManagementRequests').doc()
    await requestRef.set({
      id: requestRef.id,
      tenantId,
      tenantSlug: tenant.slug,
      tenantName: tenant.branding?.companyName || tenant.name,
      familyUid,
      familyEmail,
      familyName: familyData.name || familyData.displayName || familyEmail,
      message,
      status: 'pending',
      submittedAt: nowIso,
    })

    await logAdminAction({
      adminUid: familyUid,
      adminEmail: familyEmail,
      action: 'tenant_request_submitted',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      changes: { requestId: requestRef.id, message: message ? '(present)' : '(empty)' },
      reason: 'family-initiated management request',
    })

    // TODO(phase-b polish): send a Resend email to the franchise owner
    // notifying them of the new pending request. Out of scope for slice 7;
    // the dashboard 'Pending Requests' panel surfaces them anyway.

    logger.info('[management-request] submitted', {
      tenantId,
      familyUid,
      requestId: requestRef.id,
    })

    return NextResponse.json({
      success: true,
      requestId: requestRef.id,
    })
  } catch (err) {
    logger.error('[management-request] POST failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
