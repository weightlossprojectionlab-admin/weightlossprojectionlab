/**
 * Self-Patient creation — the account holder is themselves a Patient
 * in their own household.
 *
 * Per the onboarding rethink design conversation (2026-05-23): the
 * account holder shouldn't be outside the family they manage. They
 * should be a first-class Patient so their own vitals, meals, meds,
 * and health profile flow through the same infrastructure as every
 * other family member. See memory/project_family_tree_ml — chosen-
 * identity / role-based household model.
 *
 * Phase 1 stub: this helper creates a Patient document with the
 * minimum fields we know at signup/onboarding-completion time. DOB
 * and gender (required for full validity per patientProfileSchema)
 * are left undefined; the patient is flagged with
 * `requiresProfileCompletion: true` so the UI can prompt the user to
 * fill them in via the existing patient detail Info-tab editor.
 *
 * Idempotent: caller passes an existence check ("already have a
 * self-Patient?") via the `existingSelfPatientId` parameter. Pass
 * null if you've already confirmed there isn't one; pass the id and
 * the helper no-ops.
 */

import { doc, setDoc, collection, Timestamp, type Firestore } from 'firebase/firestore'

export interface CreateSelfPatientInput {
  /** Firebase Auth UID of the account holder. */
  userId: string
  /** The Patient's initial `name`. Onboarding passes the user's
   *  preferred-name answer (the "What should we call you?" screen);
   *  legacy callers fall back to Firebase Auth displayName or an
   *  email-derived value. User can edit later via the patient detail
   *  page. */
  displayName: string
  /** Optional explicit nickname for everyday-display surfaces. When
   *  the user typed something on the preferred-name screen we use the
   *  same value for both `name` and `nickname` — so the platform
   *  immediately calls them what they want to be called. Falls back
   *  to no nickname (legal `name` only) when undefined. See
   *  memory/project_patient_name_model for the nickname/legal-name
   *  display rule. */
  nickname?: string
  /** Firestore client instance. Caller passes their own — keeps this
   *  module free of an import-time `db` dependency. */
  db: Firestore
}

export interface CreateSelfPatientResult {
  patientId: string
  /** When the patient document was created. */
  createdAt: Date
}

/**
 * Create the account holder's self-Patient document.
 *
 * Path: `users/{userId}/patients/{patientId}` — same parent collection
 * the family-member wizard writes to, so existing access rules + read
 * paths cover it without modification.
 *
 * Does NOT check whether a self-Patient already exists — caller is
 * responsible for that check (so this helper stays composable and
 * doesn't require a Firestore read it might not need). See
 * `findSelfPatientId` below.
 */
export async function createSelfPatient(
  input: CreateSelfPatientInput
): Promise<CreateSelfPatientResult> {
  const { userId, displayName, nickname, db } = input

  // Generate a doc ID under the user's patients subcollection.
  const patientRef = doc(collection(db, 'users', userId, 'patients'))
  const now = Timestamp.now()

  // Minimum viable Patient document. DOB / gender / height / etc. all
  // deferred — `requiresProfileCompletion: true` signals the UI to
  // prompt for completion via the patient detail page's Info-tab
  // editor (PatientFieldEditor already covers every required field).
  // We intentionally do NOT write empty / placeholder values for DOB
  // because Firestore-stored empty strings are worse than absent
  // fields (the UI can't distinguish "user said empty" from "we
  // haven't asked yet"). Absent = haven't asked.
  //
  // When the caller passes a nickname (onboarding does, with the
  // preferred-name answer), we also set displayPreference='nickname'
  // so everyday surfaces immediately render the chosen name. The
  // legal name remains in `name` for formal surfaces. See
  // memory/project_patient_name_model for the dual-name rule.
  const data: Record<string, unknown> = {
    userId,
    name: displayName,
    type: 'human',
    relationship: 'self',
    requiresProfileCompletion: true,
    createdAt: now,
    lastModified: now,
  }
  if (nickname && nickname.trim().length > 0) {
    data.nickname = nickname.trim()
    data.displayPreference = 'nickname'
  }
  await setDoc(patientRef, data)

  return { patientId: patientRef.id, createdAt: now.toDate() }
}

/**
 * Look up the account holder's self-Patient ID, if one exists.
 * Returns null if no self-Patient is present (e.g., legacy user
 * pre-dating the Phase 1 onboarding work).
 *
 * Uses a small collectionRef query under the user's patients
 * subcollection. Pre-Phase-2 (no households), a user has at most one
 * Patient with `relationship: 'self'`. After households ship, this
 * helper might need to take a `householdId` filter — leave that for
 * the phase that introduces households.
 */
export async function findSelfPatientId(
  userId: string,
  db: Firestore
): Promise<string | null> {
  const { collection: col, query, where, getDocs, limit } = await import('firebase/firestore')
  const patientsCol = col(db, 'users', userId, 'patients')
  const q = query(patientsCol, where('relationship', '==', 'self'), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  return snap.docs[0].id
}

/**
 * Derive a sensible initial display name when Firebase Auth's
 * `displayName` is empty. Uses the local-part of the email
 * capitalized (e.g., "alice.smith@example.com" → "Alice Smith").
 *
 * The user can edit later; this is just to avoid creating a Patient
 * named empty-string at signup.
 */
export function deriveDisplayName(
  authDisplayName: string | null | undefined,
  email: string | null | undefined
): string {
  const trimmed = authDisplayName?.trim()
  if (trimmed) return trimmed
  if (!email) return 'Me'
  const local = email.split('@')[0] ?? ''
  if (!local) return 'Me'
  // "alice.smith" → ["alice", "smith"] → "Alice Smith"
  return local
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ') || 'Me'
}
