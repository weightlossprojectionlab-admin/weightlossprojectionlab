/**
 * DELETE /api/tenant/[tenantId]/managed-families/[userId]
 *
 * Phase B slice 3: a franchise owner revokes management of a family they
 * previously attached. The family retains all of their data — only the
 * franchise's read access is removed (per FRANCHISE_PRD open question
 * "What happens to a family's existing data when a franchise gets revoked?
 *  Recommendation: family retains everything; tenant loses access immediately").
 *
 * Behavior:
 *  - Idempotent: removing a tenantId that isn't in managedBy returns 200
 *    with `wasManaged: false`. Mirrors the POST endpoint's idempotent attach.
 *  - Removes tenantId via FieldValue.arrayRemove
 *  - Clears managedByUpdatedAt via FieldValue.delete()
 *  - Audit-logs every successful revoke
 *
 * Auth: verifyTenantStaffOrAdminAuth — accepts the franchise admin OR staff
 * for THIS tenant, or any super admin. Staff are allowed because day-to-day
 * roster management is exactly what staff do.
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantStaffOrAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string; userId: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, userId } = await context.params
    if (!tenantId || !userId) {
      return NextResponse.json(
        { error: 'tenantId and userId are required' },
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

    // Atomic revoke + counter decrement. Wraps the user-doc read, the
    // managedBy update, and the tenant.billing.currentFamilies decrement
    // into a single Firestore transaction so the counter cannot drift if
    // two concurrent revokes (or attach+revoke) interleave.
    const userRef = adminDb.collection('users').doc(userId)
    const tenantRef = adminDb.collection('tenants').doc(tenantId)

    type RevokeResult = { wasManaged: boolean }
    let result: RevokeResult
    try {
      result = await adminDb.runTransaction<RevokeResult>(async tx => {
        const userSnap = await tx.get(userRef)
        if (!userSnap.exists) {
          throw new Error('USER_NOT_FOUND')
        }
        const userData = userSnap.data() as any
        const existingManagedBy: string[] = Array.isArray(userData?.managedBy)
          ? userData.managedBy
          : []

        // Idempotent: nothing to do.
        if (!existingManagedBy.includes(tenantId)) {
          return { wasManaged: false }
        }

        const remainingAfterRemoval = existingManagedBy.filter(t => t !== tenantId)
        const userUpdates: Record<string, any> = {
          managedBy: FieldValue.arrayRemove(tenantId),
        }
        if (remainingAfterRemoval.length === 0) {
          userUpdates.managedByUpdatedAt = FieldValue.delete()
        }
        tx.update(userRef, userUpdates)
        // Decrement the family seat counter on the tenant. We don't read the
        // tenant doc here because increment is atomic — but we do need to
        // guard against driving the counter negative if state ever drifts.
        // FieldValue.increment(-1) at zero would yield -1; the dashboard
        // display clamps to 0 on read.
        tx.update(tenantRef, {
          'billing.currentFamilies': FieldValue.increment(-1),
        })
        return { wasManaged: true }
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'Family not found' }, { status: 404 })
      }
      throw err
    }

    if (!result.wasManaged) {
      return NextResponse.json({
        success: true,
        wasManaged: false,
        userId,
      })
    }

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_family_revoked',
      targetType: 'user',
      targetId: userId,
      tenantId,
      changes: { revokedTenantId: tenantId },
      reason: verification.isSuperAdmin
        ? 'super-admin manual revoke'
        : verification.isFranchiseAdmin
        ? 'franchise owner manual revoke'
        : 'franchise staff manual revoke',
    })

    // Re-render the families list so the removed row disappears.
    revalidatePath('/tenant-shell/dashboard/families')

    logger.info('[managed-families] family revoked', {
      tenantId,
      adminUid: verification.uid,
      familyUid: userId,
    })

    return NextResponse.json({
      success: true,
      wasManaged: true,
      userId,
    })
  } catch (err) {
    logger.error('[managed-families] DELETE failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
