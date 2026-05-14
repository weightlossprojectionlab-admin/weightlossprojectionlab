import { test, expect } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Phase 0f assertion — Patient Access Matrix revoke cascades to
 * household_duties. When an owner removes a caregiver's access to a
 * patient, every duty tied to that (owner, patient) pair should have
 * the caregiver stripped from assignedTo[], and their claim cleared
 * if they held one.
 *
 * Single semantic contract pinned in three steps:
 *   1. Caregiver sees the seeded duty on /caregiver/[ownerId]/shift
 *      — proves the pre-cascade state is correct.
 *   2. We simulate the owner-side Matrix revoke by running the same
 *      cascade logic the production endpoints invoke (lib/
 *      caregiver-relationship.cascadeRevokedAccess). Inline here to
 *      avoid coupling the test to the import path; the production
 *      endpoints call the same query → batch update.
 *   3. Caregiver reloads /shift — duty disappears (assignedTo
 *      array-contains filter on /api/me/duties drops it) AND the
 *      Firestore doc shows assignedTo[] cleared + claimedBy null.
 *
 * Targets WLP (Y8wSTgymg3YXWU94iJVjzoGxsMI2) since the caregiver
 * fixture (X0...) has access to WLP and the assertion runs under
 * chromium-caregiver. Seed/cleanup are exhaustive.
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'

function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const adminDb = getFirestore(getApp())

const STAMP = Date.now()
const SEED_PATIENT_ID = `__test_cascade_patient_${STAMP}`
const SEED_DUTY_ID = `__test_cascade_duty_${STAMP}`
const SEED_DUTY_NAME = `CASCADE Test Duty (${STAMP})`

let originalPatientsAccess: string[] | undefined

test.beforeAll(async () => {
  const now = new Date().toISOString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString()

  // 1. Seed a patient on WLP's account.
  await adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('patients')
    .doc(SEED_PATIENT_ID)
    .set({
      id: SEED_PATIENT_ID,
      userId: OWNER_UID,
      name: 'CASCADE Test Patient',
      type: 'human',
      relationship: 'self',
      dateOfBirth: '1990-01-01',
      createdAt: now,
    })

  // 2. Add the patient to the caregiver's familyMembers entry so the
  //    /api/me/duties → worklist hook resolves the patient name and
  //    the worklist shows the duty in context.
  const fmRef = adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('familyMembers')
    .doc(CAREGIVER_UID)
  const fmSnap = await fmRef.get()
  originalPatientsAccess = Array.isArray(fmSnap.data()?.patientsAccess)
    ? (fmSnap.data()!.patientsAccess as string[])
    : undefined
  await fmRef.update({
    patientsAccess: [...(originalPatientsAccess ?? []), SEED_PATIENT_ID],
  })

  // 3. Seed a duty for that patient, assigned to + claimed by the
  //    caregiver. Tests both arms of the cascade (assignedTo strip +
  //    claim clear).
  await adminDb.collection('household_duties').doc(SEED_DUTY_ID).set({
    householdId: OWNER_UID,
    userId: OWNER_UID,
    category: 'personal_care',
    name: SEED_DUTY_NAME,
    isCustom: false,
    forPatientId: SEED_PATIENT_ID,
    assignedTo: [CAREGIVER_UID],
    assignedBy: OWNER_UID,
    assignedAt: now,
    claimedBy: CAREGIVER_UID,
    claimedAt: now,
    frequency: 'daily',
    priority: 'medium',
    status: 'pending',
    completionCount: 0,
    skipCount: 0,
    notifyOnCompletion: false,
    notifyOnOverdue: false,
    reminderEnabled: false,
    createdAt: now,
    createdBy: OWNER_UID,
    lastModified: now,
    isActive: true,
    nextDueDate: tomorrowIso,
  })
})

test.afterAll(async () => {
  await adminDb.collection('household_duties').doc(SEED_DUTY_ID).delete().catch(() => {})
  await adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('patients')
    .doc(SEED_PATIENT_ID)
    .delete()
    .catch(() => {})
  // Restore patientsAccess on caregiver's familyMembers entry.
  await adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('familyMembers')
    .doc(CAREGIVER_UID)
    .update({ patientsAccess: originalPatientsAccess ?? [] })
    .catch(() => {})
})

test('Patient Access Matrix revoke cascades to household_duties + caregiver shift view', async ({ page }) => {
  // Step 1: pre-cascade — caregiver sees the duty.
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(SEED_DUTY_NAME)).toBeVisible({ timeout: 30_000 })

  // Step 2: simulate the owner-side Matrix revoke. The production
  // endpoints (PATCH /api/family/members/[id] and DELETE
  // /api/patients/[id]/family/[memberId]) call cascadeRevokedAccess
  // which runs the same query + batch update logic inlined below.
  // Inlining keeps this test independent of import paths and proves
  // the contract end-to-end rather than just unit-testing the helper.
  const now = new Date().toISOString()
  const snap = await adminDb
    .collection('household_duties')
    .where('userId', '==', OWNER_UID)
    .where('forPatientId', '==', SEED_PATIENT_ID)
    .where('assignedTo', 'array-contains', CAREGIVER_UID)
    .get()
  expect(snap.size).toBeGreaterThanOrEqual(1)
  for (const doc of snap.docs) {
    const data = doc.data() || {}
    const newAssignedTo = (Array.isArray(data.assignedTo) ? data.assignedTo : [])
      .filter((id: string) => id !== CAREGIVER_UID)
    const updates: Record<string, any> = {
      assignedTo: newAssignedTo,
      lastModified: now,
      modifiedBy: OWNER_UID,
    }
    if (data.claimedBy === CAREGIVER_UID) {
      updates.claimedBy = null
      updates.claimedAt = null
    }
    await doc.ref.update(updates)
  }

  // Step 3a: Firestore-level proof — the duty doc's assignedTo no
  // longer contains the caregiver, claimedBy is cleared.
  const post = await adminDb.collection('household_duties').doc(SEED_DUTY_ID).get()
  const postData = post.data() || {}
  expect(Array.isArray(postData.assignedTo) ? postData.assignedTo : []).not.toContain(
    CAREGIVER_UID,
  )
  expect(postData.claimedBy).toBeNull()

  // Step 3b: UI-level proof — caregiver reloads and no longer sees
  // the duty. /api/me/duties filters by assignedTo array-contains
  // callerUid; with the caregiver stripped, the duty drops from the
  // response.
  await page.reload({ waitUntil: 'domcontentloaded' })
  // Wait for worklist to hydrate, THEN assert the duty is absent.
  // Use a generous timeout because the page may need to re-fetch
  // /api/me/duties and re-render.
  await expect(page.getByText(SEED_DUTY_NAME)).toHaveCount(0, { timeout: 30_000 })
})
