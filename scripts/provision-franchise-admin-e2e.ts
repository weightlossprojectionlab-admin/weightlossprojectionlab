/**
 * Provision a franchise-admin E2E fixture for little-care-bears.
 *
 * Creates (idempotently) a Firebase Auth user with a known password and
 * custom claims { tenantId: <little-care-bears>, tenantRole: 'franchise_admin' },
 * plus a minimal onboarded user doc so the /auth sign-in doesn't bounce to
 * onboarding. Used by e2e/auth-franchise.setup.ts + the chromium-franchise
 * Playwright project to verify the white-label dashboard's appointment views.
 *
 * Unlike a real franchise owner (provisioned via magic link, no password),
 * this fixture has a password so Playwright can sign in headlessly.
 *
 * Run: npx tsx scripts/provision-franchise-admin-e2e.ts
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

const SLUG = 'little-care-bears'
const EMAIL = process.env.E2E_FRANCHISE_ADMIN_EMAIL || 'e2e.franchise@wpl.test'
const PASSWORD = process.env.E2E_FRANCHISE_ADMIN_PASSWORD || 'E2eFranchise!2026'

async function main() {
  // Resolve the tenant.
  const snap = await db.collection('tenants').where('slug', '==', SLUG).limit(1).get()
  if (snap.empty) { console.error(`No tenant "${SLUG}". Run provisioning first.`); process.exit(1) }
  const tenantId = snap.docs[0].id

  // Get-or-create the auth user with a known password.
  let user
  try { user = await admin.auth().getUserByEmail(EMAIL) } catch { user = null }
  if (!user) {
    user = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, emailVerified: true, displayName: 'E2E Franchise Admin' })
    console.log('Created auth user', user.uid)
  } else {
    await admin.auth().updateUser(user.uid, { password: PASSWORD, emailVerified: true })
    console.log('Updated existing auth user', user.uid)
  }
  const uid = user.uid

  // Custom claims — what the dashboard guard checks.
  await admin.auth().setCustomUserClaims(uid, { tenantId, tenantRole: 'franchise_admin' })
  console.log(`Set claims { tenantId: "${tenantId}", tenantRole: "franchise_admin" }`)

  // Minimal onboarded user doc so /auth doesn't redirect to onboarding.
  const now = new Date().toISOString()
  await db.collection('users').doc(uid).set({
    name: 'E2E Franchise Admin',
    email: EMAIL,
    primaryAuthMethod: 'password',
    authProviders: ['password'],
    createdAt: now,
    updatedAt: now,
    profile: { onboardingCompleted: true, onboardingCompletedAt: now, currentOnboardingStep: 'complete' },
    dataSource: 'franchise-admin-fixture',
  }, { merge: true })

  console.log('\n✓ Franchise-admin fixture ready.')
  console.log('  E2E_FRANCHISE_ADMIN_EMAIL=' + EMAIL)
  console.log('  E2E_FRANCHISE_ADMIN_PASSWORD=' + PASSWORD)
  console.log('  tenantId=' + tenantId + '  uid=' + uid)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
