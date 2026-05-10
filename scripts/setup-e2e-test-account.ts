/**
 * One-shot setup for the Playwright E2E test account.
 *
 * Idempotent:
 *   - If the account already exists, sets/resets the password.
 *   - If not, creates the user.
 *   - If the user has no patients, seeds one named "E2E Test Patient"
 *     so the Phase B (and beyond) tests have somewhere to write to.
 *
 * Usage:
 *   npx tsx scripts/setup-e2e-test-account.ts <email> <password>
 *
 * Run after: append the email + password to .env.local as
 *   E2E_TEST_USER_EMAIL=...
 *   E2E_TEST_USER_PASSWORD=...
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import { v4 as uuidv4 } from 'uuid'

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

async function run(email: string, password: string) {
  console.log(`\nSetting up E2E test account: ${email}`)
  console.log('='.repeat(60))

  // Step 1: ensure user exists with the given password.
  let userId: string
  try {
    const existing = await admin.auth().getUserByEmail(email)
    userId = existing.uid
    await admin.auth().updateUser(userId, { password, emailVerified: true })
    console.log(`Updated existing user ${userId} (password reset, email verified)`)
  } catch (e: any) {
    if (e.code === 'auth/user-not-found') {
      const created = await admin.auth().createUser({
        email,
        password,
        emailVerified: true,
        displayName: 'E2E Test User',
      })
      userId = created.uid
      console.log(`Created new user ${userId}`)
    } else {
      throw e
    }
  }

  // Step 2: ensure the user is on Family Premium so plan-gated
  // features (importer, premium tabs) are exercised by tests.
  const now = new Date().toISOString()
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  await db.collection('users').doc(userId).set(
    {
      subscription: {
        plan: 'family_premium',
        billingInterval: 'monthly',
        status: 'active',
        maxSeats: 20,
        maxPatients: 20,
        maxExternalCaregivers: 50,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        updatedAt: now,
      },
    },
    { merge: true },
  )
  console.log('Subscription set: family_premium (20 patients / 50 caregivers)')

  // Step 3: ensure at least one patient exists for the test target.
  const patientsRef = db.collection('users').doc(userId).collection('patients')
  const existingPatients = await patientsRef.limit(5).get()

  if (existingPatients.empty) {
    const patientId = uuidv4()
    await patientsRef.doc(patientId).set({
      id: patientId,
      userId,
      name: 'E2E Test Patient',
      type: 'human',
      relationship: 'self',
      gender: 'other',
      dateOfBirth: '1990-01-01',
      addedAt: now,
      addedBy: userId,
      source: 'e2e-setup',
    })
    console.log(`Seeded patient: E2E Test Patient (${patientId})`)
  } else {
    const first = existingPatients.docs[0]
    const data = first.data() as { name?: string }
    console.log(`Existing patient found — reusing: ${data.name} (${first.id})`)
  }

  console.log('\nDone. Add to .env.local:')
  console.log(`  E2E_TEST_USER_EMAIL=${email}`)
  console.log(`  E2E_TEST_USER_PASSWORD=<the password you just set>`)
}

const [, , email, password] = process.argv
if (!email || !password) {
  console.log('Usage: npx tsx scripts/setup-e2e-test-account.ts <email> <password>')
  process.exit(1)
}

run(email, password)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('ERROR:', err)
    process.exit(1)
  })
