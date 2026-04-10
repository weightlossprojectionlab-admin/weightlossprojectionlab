/**
 * POST /api/tenant/[tenantId]/management-request/[requestId]/approve
 *
 * Phase B slice 7: franchise admin (or staff) approves a family's
 * management request. Runs the same transactional attach as slice 2
 * — consumes a family seat, validates the cap, appends tenantId to the
 * family's managedBy array — and flips the request status to 'approved'
 * atomically.
 *
 * Auth: verifyTenantStaffOrAdminAuth — staff can approve requests as part
 * of day-to-day roster management.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { getPlanLimits } from '@/lib/franchise-plans'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string; requestId: string }>
}

class ApproveError extends Error {
  constructor(public status: number, public code: string) {
    super(code)
  }
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
    const tenantRef = adminDb.collection('tenants').doc(tenantId)

    let approvedFamilyUid: string | null = null
    try {
      await adminDb.runTransaction(async tx => {
        const reqSnap = await tx.get(requestRef)
        if (!reqSnap.exists) {
          throw new ApproveError(404, 'REQUEST_NOT_FOUND')
        }
        const req = reqSnap.data() as any
        if (req.tenantId !== tenantId) {
          throw new ApproveError(403, 'WRONG_TENANT')
        }
        if (req.status !== 'pending') {
          throw new ApproveError(409, 'NOT_PENDING')
        }

        const familyRef = adminDb.collection('users').doc(req.familyUid)
        const familySnap = await tx.get(familyRef)
        if (!familySnap.exists) {
          throw new ApproveError(409, 'FAMILY_GONE')
        }
        const familyData = familySnap.data() as any
        const existing: string[] = Array.isArray(familyData?.managedBy)
          ? familyData.managedBy
          : []
        if (existing.length > 0 && !existing.includes(tenantId)) {
          throw new ApproveError(409, 'OTHER_TENANT')
        }

        const tenantTxSnap = await tx.get(tenantRef)
        if (!tenantTxSnap.exists) {
          throw new ApproveError(404, 'TENANT_GONE')
        }
        const tenantData = tenantTxSnap.data() as any

        // Seat cap check (only if the family isn't already attached, in which
        // case approval is purely a status flip and consumes no seat).
        if (!existing.includes(tenantId)) {
          const currentFamilies: number = tenantData?.billing?.currentFamilies || 0
          const snapshotMax: number | undefined = tenantData?.billing?.maxFamilies
          const limit =
            typeof snapshotMax === 'number' && snapshotMax >= 0
              ? snapshotMax
              : getPlanLimits(tenantData?.billing?.plan).maxFamilies
          if (limit !== -1 && currentFamilies >= limit) {
            throw new ApproveError(402, 'FAMILY_LIMIT')
          }

          tx.update(familyRef, {
            managedBy: FieldValue.arrayUnion(tenantId),
            managedByUpdatedAt: new Date().toISOString(),
          })
          tx.update(tenantRef, {
            'billing.currentFamilies': FieldValue.increment(1),
          })
        }

        tx.update(requestRef, {
          status: 'approved',
          decidedAt: new Date().toISOString(),
          decidedBy: verification.uid,
          decidedByEmail: verification.email,
        })

        approvedFamilyUid = req.familyUid
      })
    } catch (err) {
      if (err instanceof ApproveError) {
        const messages: Record<string, string> = {
          REQUEST_NOT_FOUND: 'Request not found',
          WRONG_TENANT: 'Forbidden — request does not belong to this tenant',
          NOT_PENDING:
            'This request is no longer pending. It may have been approved or declined already.',
          FAMILY_GONE: 'The family who submitted this request no longer exists.',
          TENANT_GONE: 'Tenant not found',
          OTHER_TENANT:
            'This family is now managed by another practice. Decline this request instead.',
          FAMILY_LIMIT:
            'Your family seat limit is reached. Upgrade your plan before approving more requests.',
        }
        return NextResponse.json(
          { error: messages[err.code] || 'Approve blocked' },
          { status: err.status }
        )
      }
      throw err
    }

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_request_approved',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      changes: { requestId, familyUid: approvedFamilyUid },
      reason: verification.isSuperAdmin
        ? 'super-admin approve'
        : verification.isFranchiseAdmin
        ? 'franchise owner approve'
        : 'franchise staff approve',
    })

    revalidatePath('/tenant-shell/dashboard/families')

    logger.info('[management-request] approved', {
      tenantId,
      requestId,
      familyUid: approvedFamilyUid,
      adminUid: verification.uid,
    })

    return NextResponse.json({ success: true, requestId })
  } catch (err) {
    logger.error('[management-request] approve failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
