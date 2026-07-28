/**
 * Phase-1 two-browser proof ("one account, many seats"): owner and caregiver
 * side by side on the SAME patient, gated by the SAME (owner's) account plan.
 *
 * The caregiver's OWN plan is EXPIRED the entire run; only the OWNER's plan is
 * toggled. Because the read-only banner reads isCachedSubscriptionMirrored() —
 * the very getCachedSubscription cache requireWriteAccess reads — the banner's
 * state IS the caregiver's write capability. So this proves, in real time and
 * permission-independently, that the caregiver seat's ability to write tracks
 * the OWNER's plan, not their own:
 *
 *   PHASE A (owner ACTIVE): caregiver + owner load the patient, no /pricing, no
 *     read-only banner (caregiver despite their own expired plan), no upsell.
 *   PHASE B (flip OWNER → EXPIRED, real-time; caregiver's own plan unchanged):
 *     caregiver goes read-only via the OWNER — the MIRRORED banner, NO
 *     Reactivate; owner sees THEIR OWN banner WITH Reactivate. Positive control
 *     that A wasn't vacuous, and proof the gate follows the owner.
 *   PHASE C (flip OWNER → ACTIVE): both banners clear in real time.
 *
 *   owner browser     = e2e/.auth/user.json      (E2E_TEST_USER = Jimmy's owner)
 *   caregiver browser = e2e/.auth/caregiver.json (percyrice, caregiver of Jimmy)
 *
 * Runs under chromium-multirole. HEADED=1 to watch side by side. Subscriptions
 * are snapshotted and restored.
 */

import { chromium, test, expect, type Page } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as path from 'path'
import * as fs from 'fs'

const PATIENT_ID = 'BCmrfBkkwKDBtJ3OgSaj' // Jimmy
const STORAGE_OWNER = 'e2e/.auth/user.json'
const STORAGE_CAREGIVER = 'e2e/.auth/caregiver.json'

function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

const app = getApps().length ? getApp() : initializeApp({ credential: cert(findServiceAccountPath()) })
const db = getFirestore(app)
const auth = getAuth(app)

test('two-browser: caregiver write-capability tracks the OWNER plan', async () => {
  test.setTimeout(4 * 60_000)

  const allPatients = await db.collectionGroup('patients').get()
  const jimmy = allPatients.docs.find((d) => d.id === PATIENT_ID)
  expect(jimmy, `patient ${PATIENT_ID} should exist`).toBeTruthy()
  const ownerUid = jimmy!.ref.parent.parent!.id

  const ownerFixture = await auth.getUserByEmail(process.env.E2E_TEST_USER_EMAIL as string)
  const caregiverFixture = await auth.getUserByEmail(process.env.E2E_CAREGIVER_USER_EMAIL as string)
  // eslint-disable-next-line no-console
  console.log(`[2b] jimmyOwner=${ownerUid} ownerFixture=${ownerFixture.uid} caregiver=${caregiverFixture.uid}`)
  expect(ownerFixture.uid, 'owner fixture (user.json) must own Jimmy').toBe(ownerUid)

  const ownRef = db.collection('users').doc(ownerUid)
  const cgRef = db.collection('users').doc(caregiverFixture.uid)
  const ownOrig = (await ownRef.get()).data()?.subscription ?? null
  const cgOrig = (await cgRef.get()).data()?.subscription ?? null

  const restore = async () => {
    if (ownOrig !== null) await ownRef.set({ subscription: ownOrig }, { merge: true }).catch(() => {})
    if (cgOrig !== null) await cgRef.set({ subscription: cgOrig }, { merge: true }).catch(() => {})
  }

  const headless = process.env.HEADED !== '1'
  const slowMo = headless ? 0 : Number(process.env.SLOWMO_MS ?? 700)
  const caregiverBrowser = await chromium.launch({ headless, slowMo, args: ['--window-position=0,0', '--window-size=955,1040'] })
  const ownerBrowser = await chromium.launch({ headless, slowMo, args: ['--window-position=965,0', '--window-size=955,1040'] })

  try {
    // Owner ACTIVE, caregiver's OWN plan EXPIRED.
    await ownRef.set({ subscription: { plan: 'family_premium', status: 'active' } }, { merge: true })
    await cgRef.set({ subscription: { plan: 'single', status: 'expired' } }, { merge: true })

    const caregiverPage: Page = await (await caregiverBrowser.newContext({ storageState: STORAGE_CAREGIVER, ignoreHTTPSErrors: true })).newPage()
    const ownerPage: Page = await (await ownerBrowser.newContext({ storageState: STORAGE_OWNER, ignoreHTTPSErrors: true })).newPage()

    await Promise.all([
      caregiverPage.goto(`/patients/${PATIENT_ID}`, { waitUntil: 'domcontentloaded' }),
      ownerPage.goto(`/patients/${PATIENT_ID}`, { waitUntil: 'domcontentloaded' }),
    ])

    // ── PHASE A — owner ACTIVE ─────────────────────────────────────────────
    await expect(caregiverPage.getByText('Quick Actions').first()).toBeVisible({ timeout: 60_000 })
    await expect(ownerPage.getByText('Quick Actions').first()).toBeVisible({ timeout: 60_000 })
    await expect(caregiverPage).not.toHaveURL(/\/pricing/)
    await expect(ownerPage).not.toHaveURL(/\/pricing/)
    // Caregiver: gated by the owner's ACTIVE plan → no banner, no upsell, even
    // though their OWN plan is expired. Owner (active) → no banner.
    await expect(caregiverPage.getByText(/subscription has ended/i)).toHaveCount(0, { timeout: 20_000 })
    await expect(caregiverPage.getByText(/Upgrade to Unlock/i)).toHaveCount(0)
    await expect(ownerPage.getByText(/subscription has ended/i)).toHaveCount(0, { timeout: 20_000 })
    if (!headless) await caregiverPage.waitForTimeout(2500)

    // ── PHASE B — flip only the OWNER to EXPIRED (real-time) ────────────────
    // Caregiver's own plan is UNCHANGED, so any change is driven solely by the
    // OWNER's plan. This is the positive control (banner is not vacuously
    // absent above) and proof the write-gate follows the owner.
    await ownRef.set({ subscription: { plan: 'family_premium', status: 'expired' } }, { merge: true })
    // The owner mirror is a one-shot fetch on load, so reload to re-fetch.
    await Promise.all([
      caregiverPage.reload({ waitUntil: 'domcontentloaded' }),
      ownerPage.reload({ waitUntil: 'domcontentloaded' }),
    ])
    // Caregiver read-only VIA THE OWNER — mirrored copy, NO Reactivate.
    await expect(caregiverPage.getByText(/household.s subscription has ended/i)).toBeVisible({ timeout: 30_000 })
    await expect(caregiverPage.getByRole('link', { name: /Reactivate/i })).toHaveCount(0)
    // Owner sees THEIR OWN read-only banner, WITH Reactivate.
    await expect(ownerPage.getByText(/Your subscription has ended/i)).toBeVisible({ timeout: 30_000 })
    await expect(ownerPage.getByRole('link', { name: /Reactivate/i })).toBeVisible()
    if (!headless) await caregiverPage.waitForTimeout(3500)

    // ── PHASE C — flip the OWNER back to ACTIVE ─────────────────────────────
    await ownRef.set({ subscription: { plan: 'family_premium', status: 'active' } }, { merge: true })
    await Promise.all([
      caregiverPage.reload({ waitUntil: 'domcontentloaded' }),
      ownerPage.reload({ waitUntil: 'domcontentloaded' }),
    ])
    await expect(caregiverPage.getByText(/subscription has ended/i)).toHaveCount(0, { timeout: 30_000 })
    await expect(ownerPage.getByText(/subscription has ended/i)).toHaveCount(0, { timeout: 30_000 })
    if (!headless) await caregiverPage.waitForTimeout(Number(process.env.LINGER_MS ?? 4000))
  } finally {
    await restore()
    await caregiverBrowser.close().catch(() => {})
    await ownerBrowser.close().catch(() => {})
  }
})
