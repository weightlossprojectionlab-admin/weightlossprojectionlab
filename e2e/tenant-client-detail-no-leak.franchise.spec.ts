/**
 * White-label CRM — client PII/PHI does NOT leak into the workspace payload.
 *
 * Regression for the fix that moved the client-detail load server→client (behind
 * the gated GET /api/tenant/[tenantId]/clients/[userId]). Seeds a managed client
 * with distinctive practice notes + email, then:
 *   1. asserts those do NOT appear in the /dashboard/families/{userId} response
 *      payload (not server-rendered) — before the fix, loadClientDetail put them
 *      straight into the RSC payload behind the client-only guard;
 *   2. asserts the authorized owner STILL sees them (client-fetched) — so the fix
 *      didn't break the workspace.
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
const UID = `e2e_leakclient_${stamp}`
const LEAK_EMAIL = `leak-client-${stamp}@e2e.test`
const LEAK_NOTES = `CONFIDENTIAL-NOTES-${stamp} monitoring BP after med change`

test.describe('White-label CRM — client detail PII/PHI does not leak', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    const tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: `Leak Check Family ${stamp}`, email: LEAK_EMAIL, phone: '+15555550000', managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-leak-client-fixture',
    })
    // practiceNotes is read off a patient doc by loadClientDetail.
    await userRef.collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: 'Leak Member', relationship: 'client', status: 'active',
      practiceNotes: LEAK_NOTES, createdAt: now,
    })
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('practice notes + email are not in the payload, but the owner still sees them', async ({ page }) => {
    const resp = await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })
    const body = (await resp?.text()) || ''

    // Sanity: we received the dashboard document (no trivial empty-body false-pass).
    expect(body).toContain('Dashboard')
    // The sensitive fields must NOT be server-rendered into the payload.
    expect(body).not.toContain(LEAK_NOTES)
    expect(body).not.toContain(LEAK_EMAIL)

    // The authorized owner still sees them (fetched client-side after the guard).
    await expect(page.getByText(LEAK_NOTES)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(LEAK_EMAIL)).toBeVisible()
  })
})
