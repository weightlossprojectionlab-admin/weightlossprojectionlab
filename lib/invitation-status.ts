/**
 * Invitation lifecycle predicates — the single source for "is this invite
 * expired / dead / what label do we show". These questions were previously
 * answered inline at several sites (the dashboard page computed `isDeadInvitation`
 * AND the card re-derived `isDead`/`isExpired`/`statusLabel` from scratch), which
 * is exactly the kind of drift feedback_one_question_one_answer warns against.
 */

import type { FamilyInvitation } from '@/types/medical'

type InviteLifecycle = Pick<FamilyInvitation, 'status' | 'expiresAt'>

/**
 * A pending invite past its expiry is effectively expired even though the stored
 * status still reads 'pending' (the server hasn't swept it yet).
 */
export function isInvitationExpired(inv: InviteLifecycle): boolean {
  return !!inv.expiresAt && new Date(inv.expiresAt).getTime() < Date.now()
}

/**
 * "Dead" = safe to delete: revoked, declined, expired, or a pending invite that
 * has passed its expiry. Accepted invites are kept as the record of granted
 * access. Mirrors the server-side deletable rule.
 */
export function isInvitationDead(inv: InviteLifecycle): boolean {
  return (
    inv.status === 'revoked' ||
    inv.status === 'declined' ||
    inv.status === 'expired' ||
    (inv.status === 'pending' && isInvitationExpired(inv))
  )
}

/**
 * An invite that is still actionable (pending and not yet past expiry).
 */
export function isInvitationActivePending(inv: InviteLifecycle): boolean {
  return inv.status === 'pending' && !isInvitationExpired(inv)
}

/**
 * Display label — surfaces expiry the stored status hasn't caught up to, so a
 * pending-but-expired invite reads "expired".
 */
export function invitationStatusLabel(inv: InviteLifecycle): string {
  return inv.status === 'pending' && isInvitationExpired(inv) ? 'expired' : inv.status
}
