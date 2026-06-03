/**
 * Provision a `single`-plan E2E fixture account.
 *
 * Creates (idempotently) a Firebase Auth user with a known password,
 * an onboarded user doc on the `single` plan (1 patient cap), and a
 * single self-patient. Used by e2e/auth-single.setup.ts + the
 * chromium-single Playwright project to verify single-user-mode UI
 * gating (no household switcher, no scope chips, no member selector).
 *
 * Run: npx tsx scripts/provision-single-user-e2e.ts
 */
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\n/g, '\n'),
  })})
}
const db = admin.firestore()

const EMAIL = process.env.E2E_SINGLE_USER_EMAIL || 'e2e.single@wpl.test'
const PASSWORD = process.env.E2E_SINGLE_USER_PASSWORD || 'E2eSingleUser!2026'

async function main() {
  let user
  try { user = await admin.auth().getUserByEmail(EMAIL) }
  catch { user = null }
  if (!user) {
    user = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, emailVerified: true, displayName: 'Solo Sam' })
    console.log('Created auth user', user.uid)
  } else {
    await admin.auth().updateUser(user.uid, { password: PASSWORD, emailVerified: true, displayName: 'Solo Sam' })
    console.log('Updated existing auth user', user.uid)
  }
  const uid = user.uid
  const now = new Date().toISOString()

  await db.collection('users').doc(uid).set({
    name: 'Solo Sam',
    email: EMAIL,
    primaryAuthMethod: 'password',
    authProviders: ['password'],
    createdAt: now,
    updatedAt: now,
    profile: {
      onboardingCompleted: true,
      onboardingCompletedAt: now,
      currentOnboardingStep: 'complete',
    },
    subscription: {
      plan: 'single',
      status: 'active',
      maxPatients: 1,
      maxSeats: 1,
      currentSeats: 1,
      billingInterval: 'monthly',
    },
    dataSource: 'single-fixture',
  }, { merge: true })

  // Ensure exactly one self-patient.
  const existing = await db.collection('users').doc(uid).collection('patients').get()
  if (existing.empty) {
    const pRef = db.collection('users').doc(uid).collection('patients').doc()
    await pRef.set({
      id: pRef.id, userId: uid, type: 'human', name: 'Solo Sam',
      dateOfBirth: '1988-05-20', gender: 'male', relationship: 'self',
      height: 70, heightUnit: 'imperial', currentWeight: 190,
      goals: { startWeight: 205, targetWeight: 175, weeklyWeightLossGoal: 1 },
      healthConditions: [], foodAllergies: [],
      addedBy: uid, addedAt: now, createdAt: now, lastModified: now,
      dataSource: 'single-fixture',
    })
    console.log('Created self-patient', pRef.id)
  } else {
    console.log('Self-patient already exists:', existing.docs[0].id)
  }

  console.log('\n✓ Single-user fixture ready.')
  console.log('  E2E_SINGLE_USER_EMAIL=' + EMAIL)
  console.log('  E2E_SINGLE_USER_PASSWORD=' + PASSWORD)
  console.log('  uid=' + uid)
}
main().then(()=>process.exit(0)).catch(e=>{console.error(e);process.exit(1)})
