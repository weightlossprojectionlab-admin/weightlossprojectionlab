/**
 * scripts/create-test-family-member.ts
 *
 * One-shot test fixture: creates a family-member patient under a
 * specified user account so the family-meal allergen-gate flow
 * (RecipeModal Cook Now pre-flight, family-meal Commit C) can be
 * smoke-tested without going through the onboarding wizard.
 *
 * Run: tsx scripts/create-test-family-member.ts
 *
 * Hardcoded for the smoke-test: name=Steve, allergens=[milk, peanuts],
 * relationship=sibling, type=human, dateOfBirth=1990-01-01.
 * Edit any field below if needed before re-running.
 *
 * Idempotent-ish: looks for an existing patient with the same name
 * under the same owner before creating, so re-runs don't pile up
 * duplicate Steves.
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const EMAIL = 'weightlossprojectionlab@gmail.com'
const NAME = 'Steve'
const ALLERGENS = ['milk', 'peanuts']
const DATE_OF_BIRTH = '1990-01-01'
const RELATIONSHIP = 'sibling' as const
const TYPE = 'human' as const

async function main() {
  const { adminAuth, adminDb } = await import('../lib/firebase-admin')

  console.log(`[create-test-family-member] Looking up owner by email: ${EMAIL}`)
  let ownerUid: string
  try {
    const userRecord = await adminAuth.getUserByEmail(EMAIL)
    ownerUid = userRecord.uid
    console.log(`[create-test-family-member] Owner UID: ${ownerUid}`)
  } catch (err) {
    console.error(`[create-test-family-member] Could not find user with email ${EMAIL}`)
    console.error((err as Error).message)
    process.exit(1)
  }

  const patientsRef = adminDb.collection('users').doc(ownerUid).collection('patients')

  // Idempotency check — avoid making a 5th "Steve" if you've run
  // this a few times. Match on name + relationship; if you want
  // multiple Steves, change one of those.
  const existing = await patientsRef
    .where('name', '==', NAME)
    .where('relationship', '==', RELATIONSHIP)
    .limit(1)
    .get()
  if (!existing.empty) {
    const doc = existing.docs[0]
    console.log(
      `[create-test-family-member] Already exists: patientId=${doc.id} (skipping create)`
    )
    console.log(`[create-test-family-member] Edit at: /patients/${doc.id}`)
    process.exit(0)
  }

  // Build the new doc id ourselves so we can log it before write
  // and the caller can deep-link immediately.
  const newRef = patientsRef.doc()
  const now = new Date().toISOString()

  const profile = {
    id: newRef.id,
    userId: ownerUid,
    type: TYPE,
    name: NAME,
    dateOfBirth: DATE_OF_BIRTH,
    relationship: RELATIONSHIP,
    foodAllergies: ALLERGENS,
    healthConditions: [],
    countsAsSeat: true,
    addedBy: ownerUid,
    addedAt: now,
    status: 'active',
    createdAt: now,
    lastModified: now,
  }

  await newRef.set(profile)

  console.log(`[create-test-family-member] Created patientId=${newRef.id}`)
  console.log(`[create-test-family-member] Allergens: ${ALLERGENS.join(', ')}`)
  console.log(`[create-test-family-member] Open at: /patients/${newRef.id}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[create-test-family-member] Fatal:', err)
  process.exit(1)
})
