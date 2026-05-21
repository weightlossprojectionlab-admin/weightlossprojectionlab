/**
 * One-shot: promote "Chris Smithbriar" from a corrupted-medication
 * test artifact on the caregiver's profile into a real Patient
 * (relationship: child, adult young-adult) under the test account.
 *
 * The caregiver account (weightlossprojectionlab@gmail.com) has:
 *   - A bogus medication record  { name: 'CHRIS SMITHBRIAR', ... }
 *     in profile.medications, surfaced as a "patient" chip on /progress
 *   - Top-level height + goals + activityLevel originally seeded by
 *     scripts/ensure-e2e-test-user-onboarded.ts
 *   - 30 days of weight logs in users/{uid}/weightLogs (one entry
 *     per day, declining trend from ~185 → ~178.5 lbs), each tagged
 *     patientId = caregiverUid (i.e. "the caregiver IS the patient")
 *
 * Intent: that data really belongs to Chris (a tracked family member
 * with diabetes + hypertension), not the caregiver. This script
 * fixes the model:
 *
 *   1. Creates a Patient doc at users/{uid}/patients/{chrisId} with:
 *      - name: "Chris Smithbriar"
 *      - relationship: 'child' (adult-child caregiver scenario)
 *      - dateOfBirth: 2000-06-15 (mid-20s in 2026)
 *      - gender: 'male'
 *      - type: 'human'
 *      - height + currentWeight + targetWeight + healthConditions
 *        copied off the caregiver doc
 *      - householdId: the caregiver's primary household
 *
 *   2. Rewrites all 30 seeded weight logs to set patientId = chrisId.
 *      The logs stay in the caregiver's subcollection (that's how the
 *      schema works) but they now belong to Chris semantically.
 *
 *   3. Removes the bad CHRIS SMITHBRIAR row from profile.medications.
 *
 *   4. Clears the moved-over fields on the caregiver (height, goals,
 *      activityLevel, profile.healthConditions) — they were on the
 *      caregiver as a workaround for /progress's identity muddle;
 *      now they live on Chris where they belong. Caregiver profile
 *      becomes clean.
 *
 * Idempotent: skips if a patient named "Chris Smithbriar" already
 * exists under this user. Re-run cleanly if anything fails midway.
 *
 * Run:
 *   npx tsx scripts/promote-chris-to-patient.ts            # dry-run
 *   npx tsx scripts/promote-chris-to-patient.ts --live     # apply
 */

import * as path from 'path'
import * as dotenv from 'dotenv'
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const TARGET_EMAIL = 'weightlossprojectionlab@gmail.com'
const HOUSEHOLD_ID = '29GCzfnQ9GvJ58QQo1DB' // "Mothers House", from earlier seed work
const CHRIS = {
  name: 'Chris Smithbriar',
  dateOfBirth: '2000-06-15',
  gender: 'male' as const,
  relationship: 'child' as const,
  type: 'human' as const,
}

const LIVE = process.argv.includes('--live')

async function main() {
  const { initializeApp, cert, getApps, getApp } = await import('firebase-admin/app')
  const { getAuth } = await import('firebase-admin/auth')
  const { getFirestore, FieldValue, Timestamp } = await import('firebase-admin/firestore')
  const fs = await import('fs')

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

  const auth = getAuth(getApp())
  const db = getFirestore(getApp())

  console.log(`\nMode: ${LIVE ? 'LIVE' : 'DRY RUN'}`)
  console.log(`Target: ${TARGET_EMAIL}`)

  const user = await auth.getUserByEmail(TARGET_EMAIL)
  console.log(`  uid: ${user.uid}`)

  const userRef = db.collection('users').doc(user.uid)
  const userSnap = await userRef.get()
  if (!userSnap.exists) throw new Error('User doc not found in Firestore')
  const userData = userSnap.data() as Record<string, any>

  // ── Idempotency: bail if Chris already exists ─────────────────────
  const existingChris = await userRef
    .collection('patients')
    .where('name', '==', CHRIS.name)
    .limit(1)
    .get()
  if (!existingChris.empty) {
    console.log(`\n⚠ Patient "${CHRIS.name}" already exists (id=${existingChris.docs[0].id}).`)
    console.log('  Skipping. Delete first if you want to re-create.')
    return
  }

  // ── Read what to move from the caregiver ──────────────────────────
  const movedFields: Record<string, unknown> = {}
  if (userData.height) movedFields.height = userData.height
  if (userData.activityLevel) movedFields.activityLevel = userData.activityLevel
  if (userData.goals?.dailyCalorieGoal) movedFields.dailyCalorieGoal = userData.goals.dailyCalorieGoal
  if (userData.goals?.targetWeight) movedFields.targetWeight = userData.goals.targetWeight

  const profileHealth = (userData.profile?.healthConditions as string[] | undefined) ?? []
  if (profileHealth.length > 0) movedFields.healthConditions = profileHealth

  // Latest weight from the seeded weight logs (becomes currentWeight)
  const weightSnap = await userRef
    .collection('weightLogs')
    .orderBy('loggedAt', 'desc')
    .limit(1)
    .get()
  const currentWeight = weightSnap.empty ? null : (weightSnap.docs[0].data().weight as number)
  if (currentWeight !== null) movedFields.currentWeight = currentWeight

  // Existing weight logs to re-tag
  const allWeightLogs = await userRef.collection('weightLogs').get()
  const logsToRetag = allWeightLogs.docs.filter((d) => {
    const pid = d.data().patientId
    // Re-tag logs that are either pointing at the caregiver (the
    // "self" case from the earlier seed) or have no patientId.
    return !pid || pid === user.uid
  })

  // Bad medication row to delete
  const meds = (userData.profile?.medications as Array<Record<string, unknown>> | undefined) ?? []
  const badMedIndex = meds.findIndex((m) => typeof m.name === 'string' && m.name.toUpperCase() === 'CHRIS SMITHBRIAR')
  const remainingMeds = meds.filter((_, i) => i !== badMedIndex)

  console.log('\n--- Plan ---')
  console.log(`  Create patient: ${CHRIS.name} (${CHRIS.relationship}, DOB ${CHRIS.dateOfBirth})`)
  console.log(`  Move to patient: ${Object.keys(movedFields).join(', ') || '(nothing to move)'}`)
  console.log(`  Re-tag weight logs: ${logsToRetag.length}`)
  console.log(`  Remove bad medication: ${badMedIndex >= 0 ? 'YES (one row)' : 'no — not found'}`)
  console.log(`  Clear caregiver: height, activityLevel, goals, profile.healthConditions`)

  if (!LIVE) {
    console.log('\n(dry run — pass --live to apply)')
    return
  }

  // ── Apply ──────────────────────────────────────────────────────────
  console.log('\n--- Applying ---')

  // 1. Create the patient
  const patientRef = userRef.collection('patients').doc()
  const now = Timestamp.now()
  const patientDoc: Record<string, unknown> = {
    id: patientRef.id,
    userId: user.uid,
    householdId: HOUSEHOLD_ID,
    type: CHRIS.type,
    name: CHRIS.name,
    dateOfBirth: CHRIS.dateOfBirth,
    relationship: CHRIS.relationship,
    gender: CHRIS.gender,
    weightUnit: 'lbs',
    targetWeightUnit: 'lbs',
    heightUnit: 'imperial',
    addedBy: user.uid,
    addedAt: now,
    createdAt: now,
    updatedAt: now,
    countsAsSeat: true,
    ...movedFields,
  }
  await patientRef.set(patientDoc)
  console.log(`  ✓ Created patient ${patientRef.id}`)

  // 2. Re-tag weight logs
  if (logsToRetag.length > 0) {
    let batch = db.batch()
    let n = 0
    for (const d of logsToRetag) {
      batch.update(d.ref, { patientId: patientRef.id, updatedAt: now })
      n++
      if (n % 400 === 0) {
        await batch.commit()
        batch = db.batch()
      }
    }
    if (n % 400 !== 0) await batch.commit()
    console.log(`  ✓ Re-tagged ${logsToRetag.length} weight logs to patientId=${patientRef.id}`)
  }

  // 3. + 4. Clean caregiver profile
  const userUpdates: Record<string, unknown> = {
    height: FieldValue.delete(),
    activityLevel: FieldValue.delete(),
    'goals.dailyCalorieGoal': FieldValue.delete(),
    'goals.targetWeight': FieldValue.delete(),
    'profile.healthConditions': FieldValue.delete(),
    updatedAt: now,
  }
  if (badMedIndex >= 0) {
    userUpdates['profile.medications'] = remainingMeds
  }
  await userRef.update(userUpdates)
  console.log(`  ✓ Cleaned caregiver: removed moved fields${badMedIndex >= 0 ? ' + bad medication row' : ''}`)

  console.log('\n✓ Done. Reload /progress and pick Chris from the family-member selector.')
}

main().catch((err) => {
  console.error('\n[FAIL]', err)
  process.exit(1)
})
