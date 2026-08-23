/**
 * White-label CRM — the owner still sees the staff invitations (client-fetched).
 *
 * Pairs with tenant-staff-invitations-no-leak.staff.spec.ts. After moving the
 * invitation fetch server→client, confirm a franchise_admin still loads and sees
 * the invitation list on /dashboard/staff (via the admin-only API). Seeds an
 * invitation and asserts its email renders in the table.
 *
 * Runs under chromium-franchise (franchise_admin session).
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
const INVITE_EMAIL = `admin-sees-${stamp}@e2e.test`
let tenantId = ''
let inviteId = ''

test.describe('Owner actor UI — staff invitations render (client-fetched)', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const ref = await db.collection('tenants').doc(tenantId).collection('invitations').add({
      email: INVITE_EMAIL,
      status: 'pending',
      invitedAt: now,
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitedByEmail: `owner-${stamp}@e2e.test`,
      dataSource: 'e2e-admin-invites',
    })
    inviteId = ref.id
  })

  test.afterAll(async () => {
    if (tenantId && inviteId) {
      await db.collection('tenants').doc(tenantId).collection('invitations').doc(inviteId).delete().catch(() => {})
    }
  })

  test('franchise_admin loads /dashboard/staff and sees the seeded invitation', async ({ page }) => {
    await page.goto('/dashboard/staff', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Staff' })).toBeVisible({ timeout: 90_000 })
    // The client-side admin fetch populates the table with the seeded email.
    await expect(page.getByText(INVITE_EMAIL)).toBeVisible({ timeout: 60_000 })
  })
})
