/**
 * White-label CRM — roster PII does NOT leak into the Families-tab payload.
 *
 * Regression for the fix that moved loadManagedFamilies/loadPendingRequests
 * server→client (behind the gated GET /api/tenant/[tenantId]/managed-families).
 * Seeds a managed family + a pending request with distinctive PII, then asserts
 * that PII is NOT in the /dashboard/families response payload, but the authorized
 * owner STILL sees it (client-fetched).
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
const UID = `e2e_leakroster_${stamp}`
const FAM_EMAIL = `leakfam-${stamp}@e2e.test`
const PEND_MSG = `LEAK-PENDING-MSG-${stamp} please manage our family`
let tenantId = ''
let pendingId = ''

test.describe('White-label CRM — roster PII does not leak', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()

    // A managed family (roster row).
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: `Leak Roster Family ${stamp}`, email: FAM_EMAIL, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-leak-roster-fixture',
    })
    await userRef.collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: 'Roster Member', relationship: 'client', status: 'active', createdAt: now,
    })

    // A pending management request.
    const reqRef = await db.collection('tenantManagementRequests').add({
      tenantId, status: 'pending',
      familyName: `Pending Family ${stamp}`, familyEmail: `leakpend-${stamp}@e2e.test`,
      message: PEND_MSG, submittedAt: now, dataSource: 'e2e-leak-roster-fixture',
    })
    pendingId = reqRef.id
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
    if (pendingId) await db.collection('tenantManagementRequests').doc(pendingId).delete().catch(() => {})
  })

  test('family email + pending message are not in the payload, but the owner sees them', async ({ page }) => {
    const resp = await page.goto('/dashboard/families', { waitUntil: 'domcontentloaded' })
    const body = (await resp?.text()) || ''

    expect(body).toContain('Dashboard')
    // Roster PII must NOT be server-rendered into the payload.
    expect(body).not.toContain(FAM_EMAIL)
    expect(body).not.toContain(PEND_MSG)

    // The authorized owner still sees them (fetched client-side after the guard).
    await expect(page.getByText(FAM_EMAIL)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText(PEND_MSG)).toBeVisible()
  })
})
