/**
 * LIVE headed demo (real accounts) of the invitation inbox.
 *
 * Owner  = weightlossprojectionlab@gmail.com (has patient "Jimmy"), attached
 *          in-test via user.json to show its notification bell ring.
 * Caregiver = percyricemusic@gmail.com — the signed-in (Google) user of this
 *          project; sees the invite in the in-app inbox and accepts it.
 *
 * Flow: seed an invite owner→caregiver for Jimmy → percyricemusic opens
 * /patients → the inbox card shows WHO/whom/what → Accept → assert the invite
 * flips to accepted AND the owner gets a family_member_joined notification (and
 * show the owner's bell). Real relationship state is snapshotted + restored.
 *
 * Run headed:  npx playwright test --project=chromium-percyricemusic
 * First run opens a window to sign in percyricemusic with Google (one time).
 */

import { Timestamp } from 'firebase-admin/firestore'
import { test, expect } from './fixtures'

// Real UIDs (looked up from Firebase Auth for this environment).
const OWNER_UID = 'TOiDvX0aeccObB4zlRZyDDKg3dA3' // weightlossprojectionlab
const OWNER_STORAGE = 'e2e/.auth/user.json' // weightlossprojectionlab = E2E_TEST_USER
const PATIENT_ID = 'BCmrfBkkwKDBtJ3OgSaj' // Jimmy (under the owner)
const CAREGIVER_UID = '5pCNywOcF1OgbM3ajurr4r0MzDo2' // percyricemusic
const CAREGIVER_EMAIL = 'percyricemusic@gmail.com'

test.describe('Invitation inbox — LIVE @inbox-live', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('percyricemusic accepts an invite from weightlossprojectionlab; owner bell rings', async ({
    page,
    firestore,
    browser,
  }) => {
    const stamp = Date.now()

    // ── Snapshot real relationship state so we can restore it after. ──────────
    const cgRef = firestore.collection('users').doc(CAREGIVER_UID)
    const cgOrigCaregiverOf = (await cgRef.get()).data()?.caregiverOf ?? null
    const memberRef = firestore.collection('users').doc(OWNER_UID).collection('familyMembers').doc(CAREGIVER_UID)
    const memberOrig = (await memberRef.get()).data() ?? null
    const patMemberRef = firestore
      .collection('users').doc(OWNER_UID)
      .collection('patients').doc(PATIENT_ID)
      .collection('familyMembers').doc(CAREGIVER_UID)
    const patMemberOrig = (await patMemberRef.get()).data() ?? null

    // ── Seed the invitation (owner → percyricemusic, for Jimmy). ─────────────
    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode: `LIVEINBOX${stamp}`,
      recipientEmail: CAREGIVER_EMAIL,
      invitedByUserId: OWNER_UID,
      invitedByName: 'Weightloss Projection Lab',
      patientsShared: [PATIENT_ID],
      permissions: {
        viewMedicalRecords: true,
        logVitals: true,
        scheduleAppointments: true,
        editMedications: false,
      },
      familyRole: 'caregiver',
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const cleanup = async () => {
      await invRef.delete().catch(() => {})
      // Restore owner-side member docs to their pre-test state.
      if (memberOrig) await memberRef.set(memberOrig).catch(() => {})
      else await memberRef.delete().catch(() => {})
      if (patMemberOrig) await patMemberRef.set(patMemberOrig).catch(() => {})
      else await patMemberRef.delete().catch(() => {})
      // Restore the caregiver's caregiverOf exactly as it was.
      if (cgOrigCaregiverOf !== null) await cgRef.update({ caregiverOf: cgOrigCaregiverOf }).catch(() => {})
      // Delete the owner-bell notifications this run produced (keyed to the actor).
      const notifs = await firestore
        .collection('notifications')
        .where('userId', '==', OWNER_UID)
        .where('type', '==', 'family_member_joined')
        .get()
      await Promise.all(
        notifs.docs
          .filter((d) => (d.data()?.metadata?.actionByUserId ?? '') === CAREGIVER_UID)
          .map((d) => d.ref.delete().catch(() => {})),
      )
    }

    try {
      // ── Caregiver side: the inbox card, with real decision details. ────────
      await page.goto('/patients', { waitUntil: 'domcontentloaded' })

      const card = page.getByTestId(`invitation-card-${invRef.id}`)
      await expect(card, 'seeded invite should surface in percyricemusic\'s inbox').toBeVisible({ timeout: 60_000 })
      await expect(card).toContainText('Weightloss Projection Lab') // who's asking
      await expect(card).toContainText('Jimmy') // who you'd help (resolved server-side)
      await expect(card).toContainText('View records') // what you could do
      await expect(card).toContainText('Log vitals')
      await expect(card).toContainText('Book appointments')
      await expect(card).not.toContainText('Manage meds') // ungranted → absent
      await page.waitForTimeout(2500) // pause so it's visible in the headed run

      // ── Accept from the inbox. ─────────────────────────────────────────────
      await card.getByRole('button', { name: /^Accept$/ }).click()

      await expect
        .poll(async () => (await invRef.get()).data()?.status, {
          timeout: 30_000,
          message: 'invitation should flip to accepted',
        })
        .toBe('accepted')

      // ── Owner bell must ring: family_member_joined for the owner. ──────────
      await expect
        .poll(
          async () => {
            const snap = await firestore
              .collection('notifications')
              .where('userId', '==', OWNER_UID)
              .where('type', '==', 'family_member_joined')
              .get()
            return snap.docs.some((d) => (d.data()?.metadata?.actionByUserId ?? '') === CAREGIVER_UID)
          },
          { timeout: 30_000, message: 'owner should get a family_member_joined notification' },
        )
        .toBe(true)

      await expect(page).not.toHaveURL(/\/pricing/)

      // ── Show the owner's bell in a second (automated) context. ─────────────
      const ownerCtx = await browser.newContext({ storageState: OWNER_STORAGE, viewport: { width: 960, height: 940 } })
      const ownerPage = await ownerCtx.newPage()
      try {
        await ownerPage.goto('/patients', { waitUntil: 'domcontentloaded' })
        const bell = ownerPage.getByRole('button', { name: 'Notifications' })
        await expect(bell).toBeVisible({ timeout: 60_000 })
        await bell.click()
        // The accept notification should be in the dropdown. Best-effort visual —
        // the hard proof is the Firestore assertion above.
        await expect(ownerPage.getByText(/Invitation accepted|accepted your invitation/i).first())
          .toBeVisible({ timeout: 15_000 })
          .catch(() => {})
        await ownerPage.waitForTimeout(2500)
      } finally {
        await ownerCtx.close()
      }
    } finally {
      await cleanup()
    }
  })
})
