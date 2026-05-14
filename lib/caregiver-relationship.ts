/**
 * Caregiver relationship upserts — admin-SDK helpers.
 *
 * Semantic intent: a new invite-accept or admin-add EXTENDS an existing
 * caregiver relationship (more patients, more permissions). It does NOT
 * create a parallel one. If an entry/doc for the same (owner, caregiver)
 * pair already exists, MERGE into it. Otherwise create.
 *
 * Two consumers today: app/api/invitations/[id]/accept/route.ts and
 * app/api/admin/users/[uid]/add-caregiver/route.ts. Both used to .add()
 * and append, producing visible duplicates in the Caregivers tab and in
 * the caller's caregiverOf array. These helpers fix that at the write
 * site, not just in display.
 *
 * Permission shape note: callers must pass the canonical schema from
 * lib/family-permissions.ts. This module unions values blindly; it does
 * NOT translate old-vocabulary keys (viewRecords → viewMedicalRecords).
 * Phase S4's migration handles old data.
 */

import { adminDb } from '@/lib/firebase-admin'

/** Union of two string arrays, preserving order, de-duplicated. */
function unionArrays<T>(a: T[] | undefined | null, b: T[] | undefined | null): T[] {
  return Array.from(new Set([...(a || []), ...(b || [])]))
}

/** Merge two permission objects — OR'd booleans (granted in either side wins). */
function mergePermissions(
  a: Record<string, boolean> | undefined | null,
  b: Record<string, boolean> | undefined | null,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) }
  for (const [k, v] of Object.entries(b || {})) {
    out[k] = !!(out[k] || v)
  }
  return out
}

/**
 * Collapse a caregiverOf array so that entries sharing accountOwnerId are
 * merged into a single entry per owner. Same union/OR semantics as the
 * write-time upserts in S2 — kept here so the live UI merge, S2 upserts,
 * and the S4 migration script can all share one definition.
 *
 * Order is preserved: the first occurrence of each accountOwnerId keeps
 * its position; subsequent occurrences fold into that slot.
 */
export function mergeCaregiverContexts(
  entries: CaregiverContextInput[] | undefined | null,
): CaregiverContextInput[] {
  if (!entries || entries.length === 0) return []
  const byOwner = new Map<string, CaregiverContextInput>()
  for (const ctx of entries) {
    if (!ctx?.accountOwnerId) continue
    const existing = byOwner.get(ctx.accountOwnerId)
    if (!existing) {
      byOwner.set(ctx.accountOwnerId, { ...ctx })
      continue
    }
    byOwner.set(ctx.accountOwnerId, {
      ...existing,
      ...ctx,
      patientsAccess: unionArrays(existing.patientsAccess, ctx.patientsAccess),
      permissions: mergePermissions(existing.permissions, ctx.permissions),
    })
  }
  return Array.from(byOwner.values())
}

export interface CaregiverContextInput {
  accountOwnerId: string
  accountOwnerName: string
  role: string
  patientsAccess: string[]
  permissions: Record<string, boolean>
  addedAt?: string
  invitationId?: string
  addedByAdmin?: boolean
  accountOwnerEmail?: string | null
  familyPlan?: boolean
}

/**
 * Add or extend a caregiver context on the CAREGIVER'S user doc
 * (users/{caregiverUserId}.caregiverOf).
 *
 * If an entry with matching accountOwnerId exists, its patientsAccess +
 * permissions get unioned with the incoming values. Otherwise a new
 * entry is appended. Other metadata (role, addedAt, invitationId, etc.)
 * takes the newer value when merging.
 */
export async function upsertCaregiverOf(
  caregiverUserId: string,
  ctx: CaregiverContextInput,
): Promise<void> {
  const ref = adminDb.collection('users').doc(caregiverUserId)
  const snap = await ref.get()
  const existing = (snap.data()?.caregiverOf || []) as CaregiverContextInput[]

  const idx = existing.findIndex((e) => e?.accountOwnerId === ctx.accountOwnerId)
  if (idx === -1) {
    await ref.set({ caregiverOf: [...existing, ctx] }, { merge: true })
    return
  }

  const merged: CaregiverContextInput = {
    ...existing[idx],
    ...ctx,
    patientsAccess: unionArrays(existing[idx].patientsAccess, ctx.patientsAccess),
    permissions: mergePermissions(existing[idx].permissions, ctx.permissions),
  }
  const next = [...existing]
  next[idx] = merged
  await ref.set({ caregiverOf: next }, { merge: true })
}

export interface FamilyMemberInput {
  userId: string
  email: string
  name: string
  permissions: Record<string, boolean>
  patientsAccess: string[]
}

/**
 * Add or extend a family-member record on the OWNER'S user doc
 * (users/{ownerId}/familyMembers).
 *
 * Looks up an existing doc by `userId` (the caregiver's UID). If found,
 * merges patientsAccess + permissions. If not, creates one with `extraFields`
 * merged in.
 *
 * Returns the doc ID (existing or newly created) so the caller can wire
 * patient-level family-member docs to the same key.
 */
export async function upsertFamilyMember(
  ownerId: string,
  member: FamilyMemberInput,
  extraFields: Record<string, any> = {},
): Promise<string> {
  const col = adminDb.collection('users').doc(ownerId).collection('familyMembers')

  // Keyed by the caregiver's uid — NOT a random Firestore ID. The
  // firestore.rules `isHouseholdMember` helper calls
  //   exists(/users/{ownerId}/familyMembers/{request.auth.uid})
  // so the doc id MUST equal the caregiver's uid for the rule's
  // path-based exists() check to succeed. The legacy `.add()` flow
  // produced random IDs and silently broke caregiver access to
  // shopping_items / stores at the rule layer (queries via .where
  // 'userId' still worked at the API layer, which masked the bug).
  // Existing random-id docs are normalized by
  // scripts/migrate-rekey-familymembers.ts.
  const memberRef = col.doc(member.userId)

  // Old random-id doc may still exist for the same caregiver — query
  // by userId field to find it, merge its data, then delete it after
  // writing to the new deterministic doc.
  const existingByField = await col
    .where('userId', '==', member.userId)
    .limit(2)
    .get()

  const existingDeterministicSnap = await memberRef.get()
  const existingDataParts: Record<string, any>[] = []
  if (existingDeterministicSnap.exists) {
    existingDataParts.push(existingDeterministicSnap.data() || {})
  }
  for (const d of existingByField.docs) {
    if (d.id === member.userId) continue
    existingDataParts.push(d.data() || {})
  }

  if (existingDataParts.length === 0) {
    await memberRef.set({ ...member, ...extraFields })
    return member.userId
  }

  // Merge: deterministic-doc data first, then any stale random-id
  // doc data, then incoming. Patient access + permissions are unioned.
  const base = existingDataParts.reduce<Record<string, any>>(
    (acc, part) => ({
      ...acc,
      ...part,
      patientsAccess: unionArrays(acc.patientsAccess, part.patientsAccess),
      permissions: mergePermissions(acc.permissions, part.permissions),
    }),
    {},
  )
  const merged = {
    ...base,
    ...extraFields,
    name: member.name || base.name,
    email: member.email || base.email,
    patientsAccess: unionArrays(base.patientsAccess, member.patientsAccess),
    permissions: mergePermissions(base.permissions, member.permissions),
    userId: member.userId,
  }
  await memberRef.set(merged, { merge: true })

  // Best-effort cleanup of stale random-id docs (don't block on failure).
  for (const d of existingByField.docs) {
    if (d.id === member.userId) continue
    try {
      await d.ref.delete()
    } catch {
      // Ignore — migration script will catch it later.
    }
  }
  return member.userId
}

/**
 * Set or update the patient-level family-member record for a (patient,
 * caregiver) pair. Always idempotent at this layer (merge:true on a
 * deterministic doc id keyed off familyMemberId).
 */
export async function upsertPatientFamilyMember(
  ownerId: string,
  patientId: string,
  familyMemberId: string,
  data: Record<string, any>,
): Promise<void> {
  const ref = adminDb
    .collection('users')
    .doc(ownerId)
    .collection('patients')
    .doc(patientId)
    .collection('familyMembers')
    .doc(familyMemberId)
  await ref.set(data, { merge: true })
}

/**
 * Cascade owner-side patient-access revoke → household_duties.
 *
 * Semantic intent: when the owner removes a caregiver's access to one or
 * more patients (Patient Access Matrix UI / surgical DELETE on
 * /patients/[id]/family/[memberId]), the caregiver can no longer
 * fulfill duties tied to those patients. Strip them from each affected
 * duty's `assignedTo[]` and clear `claimedBy` if they held the claim.
 *
 * Without this cascade, the caregiver still sees the duty on their
 * shift view (assignedTo array-contains them), and could even claim/
 * complete it post-revoke — a real consistency hole between the access
 * Matrix and the duties surface. Phase 0d shipped the claim semantic;
 * this closes the cross-surface drift.
 *
 * Scope:
 *   • Only duties where userId === ownerUserId AND forPatientId is
 *     in revokedPatientIds — duties for OTHER patients (or no patient)
 *     are unaffected.
 *   • Empty assignedTo[] post-strip is left as-is (orphan duty,
 *     visible to owner for reassignment). Better than auto-deactivating
 *     or deleting — the owner should see the consequence and act.
 *
 * Returns counters for the caller to log / surface to the owner.
 */
export async function cascadeRevokedAccess(
  ownerUserId: string,
  caregiverUid: string,
  revokedPatientIds: string[],
): Promise<{ dutiesUpdated: number; claimsCleared: number }> {
  let dutiesUpdated = 0
  let claimsCleared = 0
  if (!ownerUserId || !caregiverUid || revokedPatientIds.length === 0) {
    return { dutiesUpdated, claimsCleared }
  }
  const now = new Date().toISOString()
  for (const patientId of revokedPatientIds) {
    const snap = await adminDb
      .collection('household_duties')
      .where('userId', '==', ownerUserId)
      .where('forPatientId', '==', patientId)
      .where('assignedTo', 'array-contains', caregiverUid)
      .get()
    for (const doc of snap.docs) {
      const data = doc.data() || {}
      const newAssignedTo = (Array.isArray(data.assignedTo) ? data.assignedTo : [])
        .filter((id: string) => id !== caregiverUid)
      const updates: Record<string, any> = {
        assignedTo: newAssignedTo,
        lastModified: now,
        modifiedBy: ownerUserId,
      }
      if (data.claimedBy === caregiverUid) {
        updates.claimedBy = null
        updates.claimedAt = null
        claimsCleared += 1
      }
      await doc.ref.update(updates)
      dutiesUpdated += 1
    }
  }
  return { dutiesUpdated, claimsCleared }
}
