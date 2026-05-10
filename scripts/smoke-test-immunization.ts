/**
 * Smoke-test the Phase B Immunization data layer end-to-end:
 *   1. Look up the user by email
 *   2. List their patients, pick the first one
 *   3. Write an immunization
 *   4. Read the subcollection back to confirm the record
 *   5. Delete the record
 *   6. Read again to confirm it's gone
 *
 * Usage: npx tsx scripts/smoke-test-immunization.ts <email>
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

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

async function run(email: string) {
  console.log(`\nSmoke-test: Immunization data layer`)
  console.log(`Email: ${email}`)
  console.log('='.repeat(60))

  let userId: string
  try {
    const authUser = await admin.auth().getUserByEmail(email)
    userId = authUser.uid
  } catch (e) {
    console.log('FAIL: user not found in Auth:', (e as Error).message)
    process.exit(1)
  }
  console.log(`User UID: ${userId}`)

  const patientsSnap = await db
    .collection('users').doc(userId)
    .collection('patients').limit(5).get()
  if (patientsSnap.empty) {
    console.log('FAIL: no patients on this account')
    process.exit(1)
  }
  const patient = patientsSnap.docs[0]
  const patientId = patient.id
  const patientName = (patient.data() as any).name
  console.log(`Patient: ${patientName} (${patientId})`)

  const collection = db
    .collection('users').doc(userId)
    .collection('patients').doc(patientId)
    .collection('immunizations')

  // Step 1: count existing
  const beforeSnap = await collection.get()
  console.log(`\nExisting immunizations: ${beforeSnap.size}`)

  // Step 2: write
  const now = new Date().toISOString()
  const id = `smoke-test-${Date.now()}`
  const record = {
    id,
    patientId,
    userId,
    vaccineName: 'Tetanus (smoke-test)',
    administeredAt: '2026-05-10',
    doseNumber: 1,
    lotNumber: 'TEST-LOT-001',
    administeredBy: 'Smoke Test Clinic',
    nextDueAt: '2036-05-10',
    notes: 'Created by Phase B smoke-test script.',
    source: 'manual' as const,
    addedAt: now,
    addedBy: userId,
  }
  await collection.doc(id).set(record)
  console.log(`\nWrite OK: ${id}`)

  // Step 3: read back
  const readSnap = await collection.doc(id).get()
  if (!readSnap.exists) {
    console.log('FAIL: doc not found after write')
    process.exit(1)
  }
  console.log(`Read OK:`, JSON.stringify(readSnap.data(), null, 2))

  // Step 4: list ordering / count
  const afterWriteSnap = await collection.orderBy('administeredAt', 'desc').get()
  console.log(`\nList after write: ${afterWriteSnap.size} record(s)`)

  // Step 5: delete
  await collection.doc(id).delete()
  console.log(`\nDelete OK: ${id}`)

  // Step 6: confirm gone
  const afterDeleteSnap = await collection.doc(id).get()
  if (afterDeleteSnap.exists) {
    console.log('FAIL: doc still exists after delete')
    process.exit(1)
  }
  const finalSnap = await collection.get()
  console.log(`Final count: ${finalSnap.size} (back to baseline)`)

  if (finalSnap.size !== beforeSnap.size) {
    console.log(`WARN: count drift detected — expected ${beforeSnap.size}, got ${finalSnap.size}`)
    process.exit(1)
  }

  console.log('\nPASS: write → read → list → delete all OK')
}

const email = process.argv[2]
if (!email) {
  console.log('Usage: npx tsx scripts/smoke-test-immunization.ts <email>')
  process.exit(1)
}

run(email)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
