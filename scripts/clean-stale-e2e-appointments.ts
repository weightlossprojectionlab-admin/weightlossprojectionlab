/**
 * One-shot cleanup for stale appointments left behind by KEEP_DATA=1
 * Phase E test runs that crashed before the cleanup ran. Idempotent.
 *
 * Targets only test fixtures: providerName starts with "Dr. E2E Test"
 * AND follow-ups derived from those (reason starts with
 * "Follow-up to Annual physical-").
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

async function run() {
  const email = process.env.E2E_TEST_USER_EMAIL ?? 'wellnessprojectionlab@gmail.com'
  const user = await admin.auth().getUserByEmail(email)
  const apptsCol = db.collection('users').doc(user.uid).collection('appointments')

  const parents = await apptsCol
    .where('providerName', '>=', 'Dr. E2E Test ')
    .where('providerName', '<', 'Dr. E2E Test~')
    .get()
  console.log(`Found ${parents.size} stale Dr. E2E Test appointments`)
  for (const doc of parents.docs) {
    console.log(`  Deleting parent ${doc.id}: ${doc.data().providerName}`)
    await doc.ref.delete()
  }

  const followUps = await apptsCol
    .where('reason', '>=', 'Follow-up to Annual physical-')
    .where('reason', '<', 'Follow-up to Annual physical-~')
    .get()
  console.log(`Found ${followUps.size} stale follow-ups`)
  for (const doc of followUps.docs) {
    console.log(`  Deleting follow-up ${doc.id}`)
    await doc.ref.delete()
  }

  console.log('Cleanup done.')
}

run().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
