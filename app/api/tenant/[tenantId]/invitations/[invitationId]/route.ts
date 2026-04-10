/**
 * DELETE /api/tenant/[tenantId]/invitations/[invitationId]
 *
 * Phase B slice 4: franchise admin revokes a staff invitation OR removes
 * an accepted staff member's access. Same endpoint covers both because
 * "revoke a seat" is the same conceptual action regardless of whether the
 * invitee has accepted yet.
 *
 * Behavior:
 *   - status='pending'  → flip to 'revoked' (link no longer accepts)
 *   - status='accepted' → flip to 'revoked' AND clear custom claims on the
 *     accepted Firebase Auth user so they can no longer access the dashboard
 *   - status='revoked'  → idempotent no-op success
 *
 * Auth: verifyTenantAdminAuth — admin-only. Staff cannot revoke other staff.
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'
import { verifyTenantAdminAuth } from '@/lib/tenant-auth'
import { logAdminAction } from '@/lib/admin/audit'
import { logger } from '@/lib/logger'

interface RouteContext {
  params: Promise<{ tenantId: string; invitationId: string }>
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const { tenantId, invitationId } = await context.params
    if (!tenantId || !invitationId) {
      return NextResponse.json(
        { error: 'tenantId and invitationId are required' },
        { status: 400 }
      )
    }

    const verification = await verifyTenantAdminAuth(request.headers.get('authorization'))
    if (!verification.ok) {
      return NextResponse.json({ error: verification.error || 'Forbidden' }, { status: 403 })
    }
    if (!verification.isSuperAdmin && verification.tenantId !== tenantId) {
      return NextResponse.json({ error: 'Forbidden — wrong tenant' }, { status: 403 })
    }

    const tenantRef = adminDb.collection('tenants').doc(tenantId)
    const invitationRef = tenantRef.collection('invitations').doc(invitationId)

    // Read the invitation outside the transaction so the (slow) Firebase Auth
    // claim-clear can happen between read and write without holding a tx open.
    // The transaction itself only does the conditional Firestore writes.
    const preSnap = await invitationRef.get()
    if (!preSnap.exists) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    const invitation = preSnap.data() as any
    if (invitation.status === 'revoked') {
      return NextResponse.json({ success: true, alreadyRevoked: true })
    }

    // If the staff member already accepted, clear their custom claims so the
    // browser session loses dashboard access on next token refresh. We don't
    // delete the Firebase Auth user — they may still need their account for
    // other reasons; we just strip the tenant grant.
    let clearedUid: string | null = null
    if (invitation.status === 'accepted' && invitation.acceptedByUid) {
      try {
        clearedUid = invitation.acceptedByUid
        await adminAuth.setCustomUserClaims(invitation.acceptedByUid, {})
      } catch (err) {
        logger.error('[invitations] failed to clear claims on accepted staff', err as Error, {
          tenantId,
          invitationId,
          uid: invitation.acceptedByUid,
        })
        // Continue — flip the doc status anyway so the dashboard reflects revocation.
      }
    }

    // Atomic flip + counter decrement. Re-reads the invitation inside the
    // transaction to handle the race where someone else revoked it between
    // our pre-read and now (in which case we no-op the decrement).
    await adminDb.runTransaction(async tx => {
      const txSnap = await tx.get(invitationRef)
      if (!txSnap.exists) {
        return
      }
      const current = txSnap.data() as any
      if (current.status === 'revoked') {
        // Lost the race — somebody else already revoked. Don't double-decrement.
        return
      }
      tx.update(invitationRef, {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
        revokedBy: verification.uid,
        revokedByEmail: verification.email,
      })
      // Pending and accepted invitations both counted toward the seat cap
      // when they were created, so revoking either one frees a seat.
      tx.update(tenantRef, {
        'billing.currentSeats': FieldValue.increment(-1),
      })
    })

    await logAdminAction({
      adminUid: verification.uid,
      adminEmail: verification.email,
      action: 'tenant_staff_revoked',
      targetType: 'tenant',
      targetId: tenantId,
      tenantId,
      changes: {
        invitationId,
        priorStatus: invitation.status,
        invitedEmail: invitation.email,
        clearedClaimsForUid: clearedUid,
      },
      reason: verification.isSuperAdmin
        ? 'super-admin staff revoke'
        : 'franchise owner staff revoke',
    })

    logger.info('[invitations] staff invitation revoked', {
      tenantId,
      invitationId,
      adminUid: verification.uid,
      priorStatus: invitation.status,
    })

    return NextResponse.json({ success: true, alreadyRevoked: false })
  } catch (err) {
    logger.error('[invitations] DELETE failed', err as Error)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
