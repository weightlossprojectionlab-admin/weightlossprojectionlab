/**
 * Provision a franchise owner manually (bypass Stripe webhook).
 *
 * Mirrors the exact owner-provisioning logic from the Stripe webhook
 * (`handleFranchiseSetupPaid` in `app/api/webhooks/stripe/route.ts`) but
 * runs standalone — useful for:
 *  - Testing the franchise dashboard end-to-end without paying $3,000
 *  - Bootstrapping admin/internal demo tenants that skipped checkout
 *  - Re-provisioning an owner if the original webhook run failed
 *
 * What it does:
 *  1. Looks up the tenant by slug from Firestore
 *  2. Reads tenant.contact.adminEmail
 *  3. Gets-or-creates the Firebase Auth user (idempotent)
 *  4. Sets custom claims { tenantId, tenantRole: 'franchise_admin' }
 *  5. Writes ownerUid + ownerProvisionedAt back to the tenant doc
 *  6. Generates a one-time magic sign-in link
 *  7. Prints the magic link URL to stdout
 *
 * Usage:
 *   npx tsx scripts/provision-tenant-owner.ts <tenant-slug>
 *
 * Example:
 *   npx tsx scripts/provision-tenant-owner.ts little-care-bears
 *
 * The magic link is printed to your terminal — copy it into a browser
 * to log in as the franchise owner. Same handshake the webhook would
 * have triggered if a real Stripe payment had landed.
 *
 * IMPORTANT: requires the same Firebase Admin env vars the rest of the
 * server uses (FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL,
 * FIREBASE_ADMIN_PRIVATE_KEY) loaded from .env.local.
 *
 * Also: the action URL (the /auth/finish-sign-in page on the tenant
 * subdomain) must be in Firebase Console → Authentication → Authorized
 * domains, otherwise generateSignInWithEmailLink throws
 * auth/unauthorized-continue-uri.
 */

// Load .env.local for Firebase Admin credentials
import { config as loadEnv } from 'dotenv'
loadEnv({ path: '.env.local' })

import { adminDb, getAdminAuth, createUser } from '../lib/firebase-admin'

async function main() {
  const slug = process.argv[2]
  if (!slug) {
    console.error('Usage: npx tsx scripts/provision-tenant-owner.ts <tenant-slug>')
    console.error('Example: npx tsx scripts/provision-tenant-owner.ts little-care-bears')
    process.exit(1)
  }

  console.log(`\n[provision-tenant-owner] Looking up tenant by slug: "${slug}"`)

  const snap = await adminDb
    .collection('tenants')
    .where('slug', '==', slug)
    .limit(1)
    .get()

  if (snap.empty) {
    console.error(`\n❌ No tenant found with slug "${slug}"`)
    console.error('   Check the slug in Firebase Console → Firestore → tenants collection.')
    process.exit(1)
  }

  const tenantDoc = snap.docs[0]
  const tenantId = tenantDoc.id
  const tenant = tenantDoc.data()

  console.log(`✓ Found tenant: ${tenant.name} (id: ${tenantId})`)
  console.log(`  status: ${tenant.status}`)
  console.log(`  practiceType: ${tenant.practiceType || '(none)'}`)

  const adminEmail = tenant.contact?.adminEmail
  if (!adminEmail) {
    console.error('\n❌ Tenant has no contact.adminEmail. Cannot provision owner.')
    process.exit(1)
  }
  const adminName = tenant.contact?.adminName || tenant.name

  console.log(`\n[provision-tenant-owner] Provisioning owner for ${adminEmail}`)

  const auth = getAdminAuth()

  // Get-or-create — idempotent. Same logic as the webhook.
  let ownerUid: string
  try {
    const existing = await auth.getUserByEmail(adminEmail)
    ownerUid = existing.uid
    console.log(`✓ Owner already exists in Firebase Auth: ${ownerUid}`)
  } catch (err: any) {
    if (err?.code === 'auth/user-not-found') {
      const created = await createUser({
        email: adminEmail,
        displayName: adminName,
        emailVerified: true,
      })
      ownerUid = created.uid
      console.log(`✓ Created new Firebase Auth user: ${ownerUid}`)
    } else {
      throw err
    }
  }

  // Set custom claims so firestore.rules isTenantAdmin() recognizes them.
  await auth.setCustomUserClaims(ownerUid, {
    tenantId,
    tenantRole: 'franchise_admin',
  })
  console.log(`✓ Set custom claims: { tenantId: "${tenantId}", tenantRole: "franchise_admin" }`)

  // Write back to tenant doc
  const nowIso = new Date().toISOString()
  await tenantDoc.ref.update({
    ownerUid,
    ownerProvisionedAt: nowIso,
  })
  console.log(`✓ Updated tenant doc: ownerUid + ownerProvisionedAt`)

  // Generate the magic sign-in link.
  // IMPORTANT: do NOT put `email` in the continueUrl. Firebase double-encodes
  // the entire continueUrl when wrapping it in its own action URL, which turns
  // ?email=foo@bar into ?email%3Dfoo%2540bar — broken on the receiving page.
  // Instead, the finish-sign-in page reads the email from localStorage OR
  // prompts the user as a bulletproof fallback (the Firebase-recommended
  // production pattern).
  // Canonical apex URL — mirrors the Stripe webhook. Only
  // www.wellnessprojectionlab.com needs to be in Firebase Authorized Domains.
  const finishUrl = `https://www.wellnessprojectionlab.com/auth/finish-sign-in?tenant=${encodeURIComponent(tenant.slug)}`
  const magicLinkUrl = await auth.generateSignInWithEmailLink(adminEmail, {
    url: finishUrl,
    handleCodeInApp: true,
  })

  console.log('\n' + '='.repeat(80))
  console.log('✅ MAGIC SIGN-IN LINK (one-time use, ~1 hour expiry):')
  console.log('='.repeat(80))
  console.log()
  console.log(magicLinkUrl)
  console.log()
  console.log('='.repeat(80))
  console.log()
  console.log('Open that URL in a browser to sign in as the franchise owner.')
  console.log()
  console.log(`When the page loads, it will prompt you for an email address.`)
  console.log(`Enter EXACTLY this email when prompted:`)
  console.log(`  ${adminEmail}`)
  console.log()
  console.log(`After sign-in you\u2019ll land at:`)
  console.log(`  https://${tenant.slug}.wellnessprojectionlab.com/dashboard`)
  console.log()
  console.log('NOTE: the action URL must be in Firebase Console → Authentication →')
  console.log('Authorized domains, otherwise the link will fail with')
  console.log('auth/unauthorized-continue-uri when you click it.')
  console.log()

  process.exit(0)
}

main().catch(err => {
  console.error('\n[provision-tenant-owner] Failed:', err)
  process.exit(1)
})
