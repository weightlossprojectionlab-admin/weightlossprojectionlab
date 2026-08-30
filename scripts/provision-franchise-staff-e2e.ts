/**
 * Provision a franchise-STAFF E2E fixture for little-care-bears.
 *
 * Mirror of provision-franchise-admin-e2e.ts, but with custom claims
 * { tenantId, tenantRole: 'franchise_staff' } — a scoped agency worker, NOT an
 * owner. Used by e2e/auth-franchise-staff.setup.ts + the chromium-franchise-staff
 * Playwright project to verify Staff-actor-UI role-gating (e.g. the dashboard
 * tabs hide owner-only sections from staff).
 *
 * Reusable fixture for the whole Staff actor UI, not just this slice.
 *
 * Run: npx tsx scripts/provision-franchise-staff-e2e.ts
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
const EMAIL = process.env.E2E_FRANCHISE_STAFF_EMAIL || 'e2e.staff@wpl.test'
const PASSWORD = process.env.E2E_FRANCHISE_STAFF_PASSWORD || 'E2eStaff!2026'

async function main() {
  const snap = await db.collection('tenants').where('slug', '==', SLUG).limit(1).get()
  if (snap.empty) { console.error(`No tenant "${SLUG}". Run provisioning first.`); process.exit(1) }
  const tenantId = snap.docs[0].id

  let user
  try { user = await admin.auth().getUserByEmail(EMAIL) } catch { user = null }
  if (!user) {
    user = await admin.auth().createUser({ email: EMAIL, password: PASSWORD, emailVerified: true, displayName: 'E2E Franchise Staff' })
    console.log('Created auth user', user.uid)
  } else {
    await admin.auth().updateUser(user.uid, { password: PASSWORD, emailVerified: true })
    console.log('Updated existing auth user', user.uid)
  }
  const uid = user.uid

  await admin.auth().setCustomUserClaims(uid, { tenantId, tenantRole: 'franchise_staff' })
  console.log(`Set claims { tenantId: "${tenantId}", tenantRole: "franchise_staff" }`)

  const now = new Date().toISOString()
  await db.collection('users').doc(uid).set({
    name: 'E2E Franchise Staff',
    email: EMAIL,
    primaryAuthMethod: 'password',
    authProviders: ['password'],
    createdAt: now,
    updatedAt: now,
    profile: { onboardingCompleted: true, onboardingCompletedAt: now, currentOnboardingStep: 'complete' },
    dataSource: 'franchise-staff-fixture',
  }, { merge: true })

  console.log('\n✓ Franchise-staff fixture ready.')
  console.log('  E2E_FRANCHISE_STAFF_EMAIL=' + EMAIL)
  console.log('  E2E_FRANCHISE_STAFF_PASSWORD=' + PASSWORD)
  console.log('  tenantId=' + tenantId + '  uid=' + uid)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
