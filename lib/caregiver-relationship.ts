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
  const existingQuery = await col.where('userId', '==', member.userId).limit(1).get()

  if (existingQuery.empty) {
    const newDoc = await col.add({
      ...member,
      ...extraFields,
    })
    return newDoc.id
  }

  const existingDoc = existingQuery.docs[0]
  const existingData = existingDoc.data()
  const merged = {
    ...existingData,
    ...extraFields,
    name: member.name || existingData.name,
    email: member.email || existingData.email,
    patientsAccess: unionArrays(existingData.patientsAccess, member.patientsAccess),
    permissions: mergePermissions(existingData.permissions, member.permissions),
  }
  await existingDoc.ref.set(merged, { merge: true })
  return existingDoc.id
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
