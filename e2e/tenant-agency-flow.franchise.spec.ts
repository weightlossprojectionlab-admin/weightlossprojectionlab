/**
 * White-label agency console — full operator journey (headed HAST).
 *
 * Walks the care-CRM flow end to end as a franchise operator:
 *   roster → triage banner → search → Open a client → single-client workspace
 * asserting the real outcome at each step. Run headed (with slow-mo) to watch:
 *   npx playwright test tenant-agency-flow --project=chromium-franchise --headed
 *
 * Seeds one rich, gone-quiet client (2 members, meds, an upcoming appointment,
 * last active 45 days ago) so triage fires and the workspace has content.
 * Self-contained; cleans up after.
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
const DAY = 24 * 60 * 60 * 1000

const stamp = Date.now()
const UID = `e2e_journey_${stamp}`
const CLIENT_NAME = `The Journey Family ${stamp}`
let tenantId = ''

// Slow the headed run down so the journey is watchable.
test.use({ launchOptions: { slowMo: 350 } })

test.describe('White-label agency console — operator journey', () => {
  test.setTimeout(5 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id

    const staleIso = new Date(Date.now() - 45 * DAY).toISOString() // gone quiet
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: CLIENT_NAME, email: `journey.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: staleIso, joinedPlatformAt: new Date(Date.now() - 200 * DAY).toISOString(),
      createdAt: new Date(Date.now() - 200 * DAY).toISOString(),
      profile: { onboardingCompleted: true }, dataSource: 'e2e-journey-fixture',
    })
    // Member 1 — 2 active meds, stale (45d) health.
    const p1 = userRef.collection('patients').doc(`${UID}-p1`)
    await p1.set({ userId: UID, type: 'human', name: 'Grandpa Journey', relationship: 'client', status: 'active', createdAt: staleIso })
    await p1.collection('meal-logs').doc('m').set({ userId: UID, patientId: p1.id, description: 'Soup', loggedAt: staleIso })
    await p1.collection('vitals').doc('v').set({ userId: UID, patientId: p1.id, type: 'blood_pressure', recordedAt: staleIso })
    await p1.collection('medications').doc('m0').set({ userId: UID, patientId: p1.id, name: 'Lisinopril', status: 'active', addedAt: staleIso })
    await p1.collection('medications').doc('m1').set({ userId: UID, patientId: p1.id, name: 'Metformin', status: 'active', addedAt: staleIso })
    // Member 2 — name only.
    await userRef.collection('patients').doc(`${UID}-p2`).set({
      userId: UID, type: 'human', name: 'Auntie Journey', relationship: 'client', status: 'active', createdAt: staleIso,
    })
    // Upcoming appointment (tomorrow) — the agency scheduled a check-in.
    await userRef.collection('appointments').doc('a1').set({
      dateTime: new Date(Date.now() + DAY).toISOString(),
      careContext: 'caregiver-visit', patientName: 'Grandpa Journey', type: 'wellness_check',
      reason: 'Monthly wellness visit', status: 'scheduled',
    })
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('roster → triage → search → open client → workspace', async ({ page }) => {
    // 1. Roster loads.
    await page.goto('/dashboard/families', { waitUntil: 'domcontentloaded' })
    await expect(page.getByPlaceholder('Search clients by name or email')).toBeVisible({ timeout: 90_000 })

    // 2. Triage rollup is present (this client, and the demo seed, are gone quiet).
    await expect(page.getByText(/no activity in 30\+ days/)).toBeVisible()

    // 3. Search narrows the roster to our client (household card shows a member name).
    await page.getByPlaceholder('Search clients by name or email').fill(CLIENT_NAME)
    await expect(page.getByText(CLIENT_NAME)).toBeVisible()
    await expect(page.getByText(/Grandpa Journey/)).toBeVisible() // member-name preview on the household card

    // 4. Open the client from the roster.
    await page.getByRole('link', { name: /Open/ }).first().click()
    await expect(page).toHaveURL(new RegExp(`/dashboard/families/${UID}`), { timeout: 60_000 })

    // 5. Workspace — overview strip (household aggregates).
    await expect(page.getByText(CLIENT_NAME)).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('2 humans')).toBeVisible()
    await expect(page.getByText('Active medications', { exact: true })).toBeVisible()
    await expect(page.getByText(/of 2/)).toBeVisible()

    // 6. Workspace — upcoming appointments.
    await expect(page.getByText('Upcoming appointments')).toBeVisible()
    await expect(page.getByText('Monthly wellness visit')).toBeVisible()

    // 7. Workspace — per-member card (individual health lives here).
    // .first() — "Grandpa Journey" also appears in the appointment row above.
    await expect(page.getByText('Grandpa Journey').first()).toBeVisible()
    await expect(page.getByText('Auntie Journey')).toBeVisible()
  })
})
