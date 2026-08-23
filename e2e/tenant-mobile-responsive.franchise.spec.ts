/**
 * White-label agency console — phone-viewport layout integrity (mobile HAST).
 *
 * The operator/staff use phones as a primary device, so the CRM surfaces must
 * fit a phone width. This asserts the ONE mobile-unique property the desktop
 * journey can't: no horizontal page overflow (the tab bar, appointment rows,
 * card footers all fit) — plus that the primary "Open workspace" tap target is
 * present. Runs at 390x844 (small phone). Self-contained: seeds one 2-member
 * client, cleans up.
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
const UID = `e2e_mobile_${stamp}`
let tenantId = ''

// Small-phone viewport (overrides the project's desktop viewport).
test.use({ viewport: { width: 390, height: 844 } })

test.describe('White-label console — phone layout', () => {
  test.setTimeout(4 * 60_000)

  test.beforeAll(async () => {
    const snap = await db.collection('tenants').where('slug', '==', TENANT_SLUG).limit(1).get()
    if (snap.empty) throw new Error(`Tenant "${TENANT_SLUG}" not found`)
    tenantId = snap.docs[0].id
    const now = new Date().toISOString()
    const userRef = db.collection('users').doc(UID)
    await userRef.set({
      name: `Mobile Test Family ${stamp}`, email: `mobile.${stamp}@e2e.test`, managedBy: [tenantId],
      lastActiveAt: now, joinedPlatformAt: now, createdAt: now,
      profile: { onboardingCompleted: true }, dataSource: 'e2e-mobile-fixture',
    })
    await userRef.collection('patients').doc(`${UID}-a`).set({
      userId: UID, type: 'human', name: 'Mobile Member A', relationship: 'client', status: 'active', createdAt: now,
    })
    await userRef.collection('patients').doc(`${UID}-b`).set({
      userId: UID, type: 'human', name: 'Mobile Member B', relationship: 'client', status: 'active', createdAt: now,
    })
    await userRef.collection('appointments').doc('a1').set({
      dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      careContext: 'caregiver-visit', patientName: 'Mobile Member A', type: 'wellness_check',
      reason: 'Monthly wellness visit', status: 'scheduled',
    })
  })

  test.afterAll(async () => {
    await db.recursiveDelete(db.collection('users').doc(UID)).catch(() => {})
  })

  // Horizontal overflow = the page is wider than the phone → a real mobile bug.
  // On failure, report the offending elements (widest that spill past the edge).
  const assertNoHorizontalOverflow = async (page: import('@playwright/test').Page) => {
    const info = await page.evaluate(() => {
      const vw = window.innerWidth
      const offenders: string[] = []
      document.querySelectorAll('*').forEach(el => {
        const r = (el as HTMLElement).getBoundingClientRect()
        if (r.right > vw + 1 && r.width > 0) {
          const cls = String((el as any).className || '').slice(0, 70)
          offenders.push(`<${el.tagName.toLowerCase()} class="${cls}"> right=${Math.round(r.right)} w=${Math.round(r.width)}`)
        }
      })
      return { overflow: document.documentElement.scrollWidth - vw, vw, offenders: offenders.slice(0, 6) }
    })
    expect(
      info.overflow,
      `overflow ${info.overflow}px at ${info.vw}w. Offenders:\n${info.offenders.join('\n')}`,
    ).toBeLessThanOrEqual(2)
  }

  test('roster fits a phone width', async ({ page }) => {
    await page.goto('/dashboard/families', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('link', { name: /Open workspace/ }).first()).toBeVisible({ timeout: 90_000 })
    await assertNoHorizontalOverflow(page)
  })

  test('client workspace fits a phone width', async ({ page }) => {
    await page.goto(`/dashboard/families/${UID}`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Care recipients').first()).toBeVisible({ timeout: 60_000 })
    await expect(page.getByText('Upcoming appointments')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })
})
