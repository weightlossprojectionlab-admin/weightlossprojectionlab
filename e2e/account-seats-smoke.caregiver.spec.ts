/**
 * Phase-1 smoke ("one account, many seats"): a caregiver operating inside an
 * owner's account is gated by the OWNER's plan, never their own.
 *
 * Runs as the caregiver fixture (percyrice, chromium-caregiver storageState).
 * Forces the caregiver's OWN plan to expired and the owner's plan to active,
 * then loads the owner's patient (Jimmy) and asserts the caregiver is NOT
 * paywalled:
 *   - the patient renders, no /pricing redirect
 *   - the read-only "subscription has ended" banner is ABSENT — it reads the
 *     same useSubscription the write-gate does, so its absence proves the
 *     effective plan resolved to the OWNER's (active), not the caregiver's
 *     (expired). Without the phase-1 fix this banner would show.
 *   - no "Upgrade to Unlock" CTA (caregivers never see subscription upsells)
 *
 * Real subscriptions are snapshotted and restored in finally.
 */

import * as admin from 'firebase-admin' // fixtures already initialized the app
import { test, expect } from './fixtures'

// Jimmy — the owner's patient percyrice caregives for (id from the app URL).
const PATIENT_ID = 'BCmrfBkkwKDBtJ3OgSaj'

test.describe('Account-seats phase 1 @account-seats', () => {
  test.setTimeout(5 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('caregiver with an expired own plan is not paywalled on the owner\'s patient', async ({
    page,
    firestore,
  }) => {
    const caregiverEmail = process.env.E2E_CAREGIVER_USER_EMAIL as string
    expect(caregiverEmail, 'E2E_CAREGIVER_USER_EMAIL must be set').toBeTruthy()

    const caregiver = await admin.auth().getUserByEmail(caregiverEmail)

    // Locate the patient by id and derive its OWNER from the doc path.
    const allPatients = await firestore.collectionGroup('patients').get()
    const jimmy = allPatients.docs.find((d) => d.id === PATIENT_ID)
    expect(jimmy, `patient ${PATIENT_ID} should exist`).toBeTruthy()
    const patientId = jimmy!.id
    const ownerUid = jimmy!.ref.parent.parent!.id
    // eslint-disable-next-line no-console
    console.log(`[smoke] patient ${patientId} owner=${ownerUid} caregiver=${caregiver.uid}`)

    const cgRef = firestore.collection('users').doc(caregiver.uid)
    const ownRef = firestore.collection('users').doc(ownerUid)
    const cgOrig = (await cgRef.get()).data()?.subscription ?? null
    const ownOrig = (await ownRef.get()).data()?.subscription ?? null

    const restore = async () => {
      if (cgOrig !== null) await cgRef.set({ subscription: cgOrig }, { merge: true }).catch(() => {})
      else await cgRef.update({ subscription: admin.firestore.FieldValue.delete() }).catch(() => {})
      if (ownOrig !== null) await ownRef.set({ subscription: ownOrig }, { merge: true }).catch(() => {})
      else await ownRef.update({ subscription: admin.firestore.FieldValue.delete() }).catch(() => {})
    }

    try {
      // Caregiver's OWN plan expired; owner's plan active.
      await cgRef.set({ subscription: { plan: 'single', status: 'expired' } }, { merge: true })
      await ownRef.set({ subscription: { plan: 'family_premium', status: 'active' } }, { merge: true })

      await page.goto(`/patients/${patientId}`, { waitUntil: 'domcontentloaded' })

      // Patient detail loads for the caregiver; no bounce to /pricing.
      await expect(page.getByText('Quick Actions').first()).toBeVisible({ timeout: 60_000 })
      await expect(page).not.toHaveURL(/\/pricing/)

      // Write-gate proxy: effective plan = owner's ACTIVE plan → the read-only
      // banner must be absent even though the caregiver's own plan is expired.
      await expect(page.getByText(/subscription has ended/i)).toHaveCount(0, { timeout: 20_000 })
      await expect(page.getByText(/adding new entries is paused/i)).toHaveCount(0)

      // Caregivers never see an upgrade CTA.
      await expect(page.getByText(/Upgrade to Unlock/i)).toHaveCount(0)
    } finally {
      await restore()
    }
  })
})
