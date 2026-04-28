/**
 * Household membership / RBAC helper (server-side, admin SDK)
 *
 * Centralizes the "is this caller a member of this household?" check that
 * was duplicated across:
 *   - /api/households/[id] (GET)
 *   - /api/households/[id]/shopping (GET)
 *   - and now the mark-purchased / add-item / etc. write endpoints below.
 *
 * Membership rules (any one of these grants access):
 *   1. Direct fields on the household doc:
 *        primaryCaregiverId, createdBy, additionalCaregiverIds[]
 *   2. An accepted entry in `users/{ownerUid}/familyMembers` where the
 *      caller's auth uid matches the `userId` field. This is what the
 *      /admin "Caregivers" UI populates (see
 *      app/api/admin/users/[uid]/add-caregiver/route.ts) — the household's
 *      `additionalCaregiverIds` array is NOT updated by that flow, so the
 *      subcollection check is required for caregivers added via /admin.
 *
 * The check is run for every plausible household-owner uid
 * (primaryCaregiverId / createdBy) for backward compatibility — older
 * households used different fields as the canonical owner.
 */

import { getAdminDb } from '@/lib/firebase-admin'

export interface HouseholdAccessResult {
  /** True if the caller can read the household. */
  isMember: boolean
  /**
   * The owner uid we resolved (primaryCaregiverId, falling back to
   * createdBy). Used as the `userId` to query owner-keyed collections like
   * `shopping_items`. Undefined if the household has no resolvable owner.
   */
  ownerUserId?: string
  /** The raw household doc data, so callers don't have to re-read it. */
  household: FirebaseFirestore.DocumentData
}

/**
 * Look up the household, decide whether `callerUserId` is a member, and
 * return both the verdict and the household doc so the caller can use it.
 *
 * Returns `{ isMember: false, household: {} }` if the household doc is
 * missing — caller should 404 in that case (we don't throw, so caller can
 * pick the response shape).
 */
export async function checkHouseholdAccess(
  householdId: string,
  callerUserId: string
): Promise<HouseholdAccessResult & { exists: boolean }> {
  const db = getAdminDb()
  const doc = await db.collection('households').doc(householdId).get()
  if (!doc.exists) {
    return { exists: false, isMember: false, household: {} }
  }

  const household = doc.data() ?? {}
  const ownerUserId: string | undefined =
    household.primaryCaregiverId || household.createdBy

  const directMember =
    household.primaryCaregiverId === callerUserId ||
    household.createdBy === callerUserId ||
    (Array.isArray(household.additionalCaregiverIds) &&
      household.additionalCaregiverIds.includes(callerUserId))

  if (directMember) {
    return { exists: true, isMember: true, ownerUserId, household }
  }

  // Subcollection fallback: the /admin add-caregiver flow writes accepted
  // caregivers to users/{ownerUid}/familyMembers, not to the household doc.
  const ownerCandidates = Array.from(
    new Set(
      [household.primaryCaregiverId, household.createdBy].filter(Boolean) as string[]
    )
  )

  for (const ownerUid of ownerCandidates) {
    const snap = await db
      .collection('users')
      .doc(ownerUid)
      .collection('familyMembers')
      .where('userId', '==', callerUserId)
      .where('status', '==', 'accepted')
      .limit(1)
      .get()
    if (!snap.empty) {
      return { exists: true, isMember: true, ownerUserId, household }
    }
  }

  return { exists: true, isMember: false, ownerUserId, household }
}
