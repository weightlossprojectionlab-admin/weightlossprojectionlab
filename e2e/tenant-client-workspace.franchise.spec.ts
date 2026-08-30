/**
 * White-label CRM — single-client workspace overview (CRM P2, slice 1).
 *
 * The client-detail page (/dashboard/families/[userId]) now leads with a
 * household OVERVIEW strip aggregated from the client's members: care-recipient
 * count (humans/pets), total active medications, active-vs-quiet members, and
 * last activity. Per-member health stays in the member cards below.
 *
 * Runs under chromium-franchise. Seeds a client with 2 members (one active with
 * 2 meds, one quiet), opens the workspace, and asserts the aggregates render.
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
const UID = `e2e_workspace_${stamp}`
const CLIENT_NAME = `Workspace Test Family ${stamp}`
let tenantId = ''

test.describe('White-label CRM — client workspace overview', () => {
  test.setTimeout(4 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: CLIENT_NAME, email: `workspace.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-workspace-fixture',
    })
    // Member A — active, 2 meds.
    const a = userRef.collection('patients').doc(`${UID}-a`)
    await a.set({ userId: UID, type: 'human', name: 'Member A', relationship: 'client', status: 'active', createdAt: now })
    await a.collection('meal-logs').doc('m').set({ userId: UID, patientId: a.id, description: 'Lunch', loggedAt: now })
    await a.collection('vitals').doc('v').set({ userId: UID, patientId: a.id, type: 'blood_pressure', recordedAt: now })
    await a.collection('medications').doc('m0').set({ userId: UID, patientId: a.id, name: 'MedA', status: 'active', addedAt: now })
    await a.collection('medications').doc('m1').set({ userId: UID, patientId: a.id, name: 'MedB', status: 'active', addedAt: now })
    // Member B — quiet, no logs/meds.
    await userRef.collection('patients').doc(`${UID}-b`).set({
      userId: UID, type: 'human', name: 'Member B', relationship: 'client', status: 'active', createdAt: now,
    })
    // An upcoming appointment (tomorrow) for the workspace's "Upcoming appointments".
    await userRef.collection('appointments').doc('appt1').set({
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      careContext: 'caregiver-visit', patientName: 'Member A', type: 'wellness_check',
      reason: 'Weekly check-in', status: 'scheduled',
    })
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('workspace leads with a household overview strip aggregated from members', async ({ page }) => {
    await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })

    await expect(page.getByText(CLIENT_NAME)).toBeVisible({ timeout: 90_000 })

    // Overview strip renders with real aggregates:
    await expect(page.getByText('Care recipients').first()).toBeVisible()
    await expect(page.getByText('2 humans')).toBeVisible()          // 2 members, both human
    // exact:true — the member cards below say "Active Medications:" (case-insensitive collision).
    await expect(page.getByText('Active medications', { exact: true })).toBeVisible()
    await expect(page.getByText('across the household')).toBeVisible()
    await expect(page.getByText('Active members')).toBeVisible()
    await expect(page.getByText(/of 2/)).toBeVisible()               // "1 of 2" active (A active, B quiet)

    // Upcoming appointments section (reuses the tenant appointment source).
    await expect(page.getByText('Upcoming appointments')).toBeVisible()
    await expect(page.getByText('Weekly check-in')).toBeVisible()
    await expect(page.getByText('Care visit')).toBeVisible()
  })
})
