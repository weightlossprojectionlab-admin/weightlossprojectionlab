/**
 * White-label CRM — patient PHI does NOT leak into the patient-detail payload.
 *
 * Regression for the fix that moved loadPatientDetail server→client (behind the
 * gated GET .../clients/[userId]/patients/[patientId]). Seeds a patient with a
 * distinctive active medication, then asserts the med name is NOT in the page's
 * response payload (not server-rendered), but the authorized owner STILL sees it
 * (client-fetched).
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
const UID = `e2e_leakpatient_${stamp}`
const PID = `${UID}-p`
const LEAK_MED = `Zorbaxifen-${stamp}`

test.describe('White-label CRM — patient PHI does not leak', () => {
  test.setTimeout(3 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    const tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: `Leak Patient Family ${stamp}`, email: `leakpt.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-leak-patient-fixture',
    })
    const patientRef = userRef.collection('patients').doc(PID)
    await patientRef.set({
      userId: UID, type: 'human', name: 'Leak Patient', relationship: 'client', status: 'active', createdAt: now,
    })
    await patientRef.collection('medications').doc(`${PID}-m`).set({
      name: LEAK_MED, dosage: '10mg', frequency: 'once daily', status: 'active', createdAt: now,
    })
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  test('the active medication is not in the payload, but the owner still sees it', async ({ page }) => {
    const resp = await page.goto(`/dashboard/families/${UID}/patients/${PID}`, { waitUntil: 'domcontentloaded' })
    const body = (await resp?.text()) || ''

    expect(body).toContain('Dashboard')
    // PHI must NOT be server-rendered into the payload.
    expect(body).not.toContain(LEAK_MED)

    // The authorized owner still sees it (fetched client-side after the guard).
    await expect(page.getByText(LEAK_MED)).toBeVisible({ timeout: 60_000 })
  })
})
