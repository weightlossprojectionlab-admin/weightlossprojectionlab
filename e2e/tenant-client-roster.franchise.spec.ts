/**
 * White-label CRM — client roster search actually filters (real-outcome HAST).
 *
 * Runs under chromium-franchise (little-care-bears subdomain, franchise_admin
 * session). Seeds two managed clients, loads the operator's Clients roster
 * (/dashboard/families), asserts BOTH render, then types one client's name into
 * the roster search and asserts the OTHER card is filtered out — proving the
 * search does real work, not just that the control renders.
 *
 * Seeds via firebase-admin (managedBy array-contains tenantId is all
 * loadManagedFamilies reads); cleans up after. Creating user docs directly
 * doesn't touch tenant seat billing (only the intake API does).
 */

import { test, expect } from '@playwright/test'
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
const TENANT_SLUG = 'little-care-bears'

const stamp = Date.now()
const ALPHA = { uid: `e2e_roster_alpha_${stamp}`, name: `Alpha Roster ${stamp}`, email: `alpha.${stamp}@e2e.test` }
const BRAVO = { uid: `e2e_roster_bravo_${stamp}`, name: `Bravo Roster ${stamp}`, email: `bravo.${stamp}@e2e.test` }

let tenantId = ''

test.describe('White-label CRM — client roster search filters', () => {
  test.setTimeout(4 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    for (const c of [ALPHA, BRAVO]) {
      await db.collection('users').doc(c.uid).set({
        name: c.name,
        email: c.email,
        managedBy: [tenantId],
        lastActiveAt: now,
        joinedPlatformAt: now,
        createdAt: now,
        profile: { onboardingCompleted: true },
        dataSource: 'e2e-roster-fixture',
      })
    }
  })

  test.afterAll(async () => {
    await Promise.all([ALPHA, BRAVO].map(c => db.collection('users').doc(c.uid).delete().catch(() => {})))
  })

  test('typing a client name filters the roster to matches only', async ({ page }) => {
    await page.goto('/dashboard/families', { waitUntil: 'domcontentloaded' })

    // Both seeded clients render in the roster.
    await expect(page.getByText(ALPHA.name)).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(BRAVO.name)).toBeVisible()

    // Search for one — the other must drop out (real client-side filtering).
    await page.getByRole('searchbox', { name: /Search clients/i }).fill(ALPHA.name)
    await expect(page.getByText(ALPHA.name)).toBeVisible()
    await expect(page.getByText(BRAVO.name)).toHaveCount(0)

    // Clearing the search brings the other back.
    await page.getByRole('searchbox', { name: /Search clients/i }).fill('')
    await expect(page.getByText(BRAVO.name)).toBeVisible()
  })
})
