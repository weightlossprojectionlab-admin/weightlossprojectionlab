/**
 * One-off cleanup for the e2e test account.
 *
 * Wipes:
 *   - ALL households (primaryCaregiverId == test user)
 *   - householdId field on EVERY patient (so survivors are "homeless")
 *   - Patients whose name ends with a 13-digit timestamp (e2e stamp pattern)
 *
 * Preserves:
 *   - Subscription on the user doc (untouched)
 *   - Patients without the stamp suffix (e.g., "E2E Test Patient" referenced
 *     by E2E_TEST_PATIENT_ID in .env.local)
 *   - All other user-doc fields
 *
 * Idempotent. Logs what it did. Refuses to run unless the test-user env
 * variables are set (avoids running against a real account by accident).
 */

const admin = require('firebase-admin')
const dotenv = require('dotenv')
dotenv.config({ path: '.env.local' })

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const db = admin.firestore()

const STAMP_SUFFIX = /\b1\d{12}\b\s*$/ // matches "...Stone 1778523607627" etc.

;(async () => {
  const email = process.env.E2E_TEST_USER_EMAIL
  if (!email) {
    console.error('E2E_TEST_USER_EMAIL missing from .env.local — refusing to run.')
    process.exit(1)
  }
  const user = await admin.auth().getUserByEmail(email)
  console.log(`Target user: ${email} (${user.uid})\n`)

  // 1. Hard-delete every household for this user, active or not.
  const hh = await db
    .collection('households')
    .where('primaryCaregiverId', '==', user.uid)
    .get()
  console.log(`Households found: ${hh.size}`)
  for (const doc of hh.docs) {
    console.log(`  delete household: ${doc.id} ("${doc.data().name}")`)
  }
  if (!hh.empty) {
    // Firestore batches max 500 ops; this should be well under.
    const batch = db.batch()
    for (const doc of hh.docs) batch.delete(doc.ref)
    await batch.commit()
  }
  console.log(`Deleted ${hh.size} household(s).\n`)

  // 2. List all patients for this user.
  const patientsSnap = await db
    .collection('users')
    .doc(user.uid)
    .collection('patients')
    .get()
  console.log(`Patients found: ${patientsSnap.size}`)

  const toDelete = []
  const toClearHouseholdId = []
  for (const doc of patientsSnap.docs) {
    const data = doc.data()
    const name = data.name || ''
    if (STAMP_SUFFIX.test(name)) {
      toDelete.push({ id: doc.id, name, ref: doc.ref })
    } else if (data.householdId) {
      toClearHouseholdId.push({ id: doc.id, name, ref: doc.ref })
    }
  }

  console.log(`\n  - Stamped (delete): ${toDelete.length}`)
  for (const p of toDelete) console.log(`      delete: "${p.name}" (${p.id})`)
  console.log(`  - Unstamped with householdId (clear): ${toClearHouseholdId.length}`)
  for (const p of toClearHouseholdId)
    console.log(`      clear:  "${p.name}" (${p.id})`)
  console.log()

  if (toDelete.length > 0) {
    const batch = db.batch()
    for (const p of toDelete) batch.delete(p.ref)
    await batch.commit()
    console.log(`Deleted ${toDelete.length} stamped patient(s).`)
  }
  if (toClearHouseholdId.length > 0) {
    const batch = db.batch()
    for (const p of toClearHouseholdId)
      batch.update(p.ref, { householdId: admin.firestore.FieldValue.delete() })
    await batch.commit()
    console.log(`Cleared householdId on ${toClearHouseholdId.length} survivor(s).`)
  }

  console.log('\nDone. Subscription untouched.')
  process.exit(0)
})().catch((err) => {
  console.error('FATAL:', err)
  process.exit(1)
})
