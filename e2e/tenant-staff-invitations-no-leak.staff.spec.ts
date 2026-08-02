/**
 * White-label CRM — staff-invitation PII does NOT leak to franchise_staff.
 *
 * Regression for the fix that moved the invitation fetch server→client (behind
 * the admin-only GET /api/tenant/[tenantId]/invitations). Seeds an invitation
 * with a distinctive email, then loads /dashboard/staff as a franchise_staff
 * viewer and asserts the seeded email is NOT present in the page's response
 * payload — i.e. the PII was never server-rendered into what staff receive.
 * Before the fix, the server-rendered table (inside the client guard) put the
 * email straight into the RSC/HTML payload.
 *
 * Runs under chromium-franchise-staff (franchise_staff session).
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
const LEAK_EMAIL = `leak-check-${stamp}@e2e.test`
let tenantId = ''
let inviteId = ''

test.describe('Staff actor UI — invitation PII does not leak to staff', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const ref = await db.collection('tenants').doc(tenantId).collection('invitations').add({
      email: LEAK_EMAIL,
      status: 'pending',
      invitedAt: now,
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      invitedByEmail: `owner-${stamp}@e2e.test`,
      dataSource: 'e2e-leak-check',
    })
    inviteId = ref.id
  })

  test.afterAll(async () => {
    if (tenantId && inviteId) {
      await db.collection('tenants').doc(tenantId).collection('invitations').doc(inviteId).delete().catch(() => {})
    }
  })

  test('the /dashboard/staff payload sent to staff contains no invitation email', async ({ page }) => {
    const resp = await page.goto('/dashboard/staff', { waitUntil: 'domcontentloaded' })
    const body = (await resp?.text()) || ''

    // Sanity: we actually received the dashboard document (forecloses a trivial
    // false-pass where body is empty and "not.toContain" passes for free).
    expect(body).toContain('Dashboard')
    // The seeded invitation email must NOT be server-rendered into what staff receive.
    expect(body).not.toContain(LEAK_EMAIL)

    // Defense-in-depth: staff are also bounced from the page by StaffAuthGuard.
    await expect(page).toHaveURL(/\/login/, { timeout: 60_000 })
  })
})
