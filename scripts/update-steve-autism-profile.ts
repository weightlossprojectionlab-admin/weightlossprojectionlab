/**
 * scripts/update-steve-autism-profile.ts
 *
 * One-shot test fixture: patches the existing Steve patient with
 * autism-context profile fields per the family-meal PRD:
 *
 *   preferredFoods    — "safe foods" Steve consistently eats; the
 *                       recipe browser will boost matches against
 *                       these in Commit B work.
 *   aversions         — soft negatives (sensory dislikes / textures);
 *                       recipe browser de-prioritizes; future
 *                       substitution engine offers swaps.
 *   preparationNeeds  — separation / cut size / texture / temperature
 *                       requirements that surface as inline mods on
 *                       the cooking page (Commit E).
 *   relationship      — corrected from 'sibling' (placeholder) to
 *                       'child' (Steve is a child).
 *   dateOfBirth       — set to ~9 years old (a common smoke-test
 *                       persona for special-needs flows).
 *
 * foodAllergies stays as ['milk', 'peanuts'] so the Commit C
 * allergen gate at Cook Now still has data to fire on.
 *
 * Run: tsx scripts/update-steve-autism-profile.ts
 */

import * as path from 'path'
import * as dotenv from 'dotenv'

dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const EMAIL = 'weightlossprojectionlab@gmail.com'
const NAME = 'Steve'

async function main() {
  const { adminAuth, adminDb } = await import('../lib/firebase-admin')

  const userRecord = await adminAuth.getUserByEmail(EMAIL)
  const ownerUid = userRecord.uid

  const patientsRef = adminDb.collection('users').doc(ownerUid).collection('patients')
  const existing = await patientsRef.where('name', '==', NAME).limit(1).get()

  if (existing.empty) {
    console.error(`[update-steve] No patient named "${NAME}" found under ${EMAIL}.`)
    console.error('[update-steve] Run scripts/create-test-family-member.ts first.')
    process.exit(1)
  }

  const doc = existing.docs[0]
  const updates = {
    relationship: 'child',
    dateOfBirth: '2017-01-01', // ~9 years old as of 2026
    gender: 'male', // Steve — traditionally male name, also drives
                    // medical-math (calorie targets) downstream.
                    // The visual-identity layer doesn't sex-code
                    // avatars per the family-meal PRD.
    // Autism-context profile fields (family-meal PRD additions).
    preferredFoods: [
      'chicken nuggets',
      'plain pasta',
      'cheese pizza',
      'applesauce',
      'plain crackers',
      'french fries',
      'cheese sandwich',
    ],
    aversions: [
      'mixed foods',
      'sauces on top',
      'leafy greens',
      'mushrooms',
      'foods touching',
    ],
    preparationNeeds: {
      texture: 'whole',
      cutSize: 'small-cubes',
      separated: true,
      notes: 'Foods must not touch on the plate. Sauces served on the side.',
    },
    lastModified: new Date().toISOString(),
  }

  await doc.ref.update(updates)

  console.log(`[update-steve] Patched patientId=${doc.id}`)
  console.log(`[update-steve] relationship → child, age ~9`)
  console.log(`[update-steve] preferredFoods: ${updates.preferredFoods.join(', ')}`)
  console.log(`[update-steve] aversions: ${updates.aversions.join(', ')}`)
  console.log(`[update-steve] separated:true, cutSize:small-cubes`)
  console.log(`[update-steve] foodAllergies unchanged (milk, peanuts)`)
  console.log(`[update-steve] Open at: /patients/${doc.id}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('[update-steve] Fatal:', err)
  process.exit(1)
})
