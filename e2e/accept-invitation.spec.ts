/**
 * E2E for accepting a family invitation (the caregiver side).
 *
 * Seeds a pending invitation addressed to the signed-in E2E user (from a
 * throwaway "owner"), drives the real accept UI (verify → Accept → HIPAA →
 * Accept & Continue), and asserts the relationship the accept route creates:
 *   - familyInvitation flips to 'accepted'
 *   - users/{owner}/familyMembers/{invitee uid} exists (keyed by uid)
 *   - the invitee's caregiverOf gains an entry for that owner
 *
 * Also surfaces any accept-time error (the bug-monitor fails on console errors),
 * which is the "it threw an error and showed pricing" symptom.
 *
 * The throwaway owner + the caregiverOf entry are torn down in finally.
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { test, expect } from './fixtures'

test.describe('Accept family invitation @accept-invite', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('accepting a caregiver invite creates the relationship (no error, no pricing)', async ({
    page,
    ownerUserId, // the signed-in E2E user = the INVITEE here
    firestore,
  }) => {
    const stamp = Date.now()
    const inviteeUid = ownerUserId
    const inviteeEmail = process.env.E2E_TEST_USER_EMAIL as string
    expect(inviteeEmail, 'E2E_TEST_USER_EMAIL must be set').toBeTruthy()

    const fakeOwner = `e2e-owner-${stamp}`
    const fakePatient = `e2e-patient-${stamp}`
    const inviteCode = `E2EACCEPT${stamp}`

    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode,
      recipientEmail: inviteeEmail,
      invitedByUserId: fakeOwner,
      invitedByName: 'E2E Owner',
      patientsShared: [fakePatient],
      permissions: { viewMedicalRecords: true, logVitals: true },
      familyRole: 'caregiver',
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const cleanup = async () => {
      await invRef.delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('familyMembers').doc(inviteeUid).delete().catch(() => {})
      await firestore
        .collection('users').doc(fakeOwner)
        .collection('patients').doc(fakePatient)
        .collection('familyMembers').doc(inviteeUid).delete().catch(() => {})
      // Remove the caregiverOf entry we added (leave any others intact).
      const uref = firestore.collection('users').doc(inviteeUid)
      const data = (await uref.get()).data() || {}
      const cg = Array.isArray(data.caregiverOf) ? data.caregiverOf : []
      const filtered = cg.filter((c: any) => c?.accountOwnerId !== fakeOwner)
      if (filtered.length !== cg.length) await uref.update({ caregiverOf: filtered })
    }

    try {
      await page.goto(`/accept-invitation?code=${inviteCode}`, { waitUntil: 'domcontentloaded' })

      // Verify auto-runs from the ?code — the invitation details render.
      const acceptBtn = page.getByRole('button', { name: /accept invitation/i })
      await expect(acceptBtn).toBeVisible({ timeout: 90_000 })
      await acceptBtn.click()

      // HIPAA modal → acknowledge → Accept & Continue.
      const ack = page.getByRole('checkbox')
      await expect(ack).toBeVisible({ timeout: 15_000 })
      await ack.check()
      await page.getByRole('button', { name: /accept & continue/i }).click()

      // Relationship created — and no redirect to /pricing.
      await expect
        .poll(
          async () => (await invRef.get()).data()?.status,
          { timeout: 25_000, message: 'invitation should flip to accepted' },
        )
        .toBe('accepted')

      const memberDoc = await firestore
        .collection('users').doc(fakeOwner)
        .collection('familyMembers').doc(inviteeUid).get()
      expect(memberDoc.exists, 'owner-side familyMembers doc keyed by invitee uid').toBe(true)

      const cg = (await firestore.collection('users').doc(inviteeUid).get()).data()?.caregiverOf || []
      expect(
        cg.some((c: any) => c?.accountOwnerId === fakeOwner),
        'invitee caregiverOf gains the owner',
      ).toBe(true)

      await expect(page).not.toHaveURL(/\/pricing/, { timeout: 5_000 })
    } finally {
      await cleanup()
    }
  })

  // The regression: an owner-caregiver whose OWN plan is expired must still be
  // able to accept — the accept is a relationship join gated by the OWNER's
  // plan server-side, not the caller's personal subscription. Before the
  // decoupling this paywalled the accept POST → /pricing and the relationship
  // never persisted.
  test('an expired own-plan owner can still accept (no paywall, lands on caregiver surface)', async ({
    page,
    ownerUserId, // signed-in E2E user = the INVITEE (an owner with their own account)
    firestore,
  }) => {
    const stamp = Date.now()
    const inviteeUid = ownerUserId
    const inviteeEmail = process.env.E2E_TEST_USER_EMAIL as string
    expect(inviteeEmail, 'E2E_TEST_USER_EMAIL must be set').toBeTruthy()

    const fakeOwner = `e2e-xowner-${stamp}`
    const fakePatient = `e2e-xpatient-${stamp}`
    const inviteCode = `E2EEXPIRED${stamp}`

    // A well-formed throwaway owner with an ACTIVE plan + one patient, so the
    // caregiver dashboard renders cleanly once we land on it.
    await firestore.collection('users').doc(fakeOwner).set({
      profile: { onboardingCompleted: true, displayName: 'E2E Expired-Test Owner' },
      subscription: { plan: 'family_premium', status: 'active' },
    })
    await firestore
      .collection('users').doc(fakeOwner)
      .collection('patients').doc(fakePatient)
      .set({ name: 'E2E Care Recipient', userId: fakeOwner })

    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode,
      recipientEmail: inviteeEmail,
      invitedByUserId: fakeOwner,
      invitedByName: 'E2E Expired-Test Owner',
      patientsShared: [fakePatient],
      permissions: { viewMedicalRecords: true, logVitals: true },
      familyRole: 'caregiver',
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    // Force the invitee's OWN plan to expired for the duration of the test.
    const uref = firestore.collection('users').doc(inviteeUid)
    const originalSub = (await uref.get()).data()?.subscription ?? null
    await uref.update({ subscription: { plan: 'single', status: 'expired' } })

    const cleanup = async () => {
      // Restore the invitee's real subscription.
      await uref
        .update({ subscription: originalSub === null ? FieldValue.delete() : originalSub })
        .catch(() => {})
      // Remove the caregiverOf entry we added (leave any others intact).
      const data = (await uref.get()).data() || {}
      const cg = Array.isArray(data.caregiverOf) ? data.caregiverOf : []
      const filtered = cg.filter((c: any) => c?.accountOwnerId !== fakeOwner)
      if (filtered.length !== cg.length) await uref.update({ caregiverOf: filtered }).catch(() => {})
      // Tear down the throwaway owner + invite.
      await invRef.delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('familyMembers').doc(inviteeUid).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('patients').doc(fakePatient).collection('familyMembers').doc(inviteeUid).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('patients').doc(fakePatient).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).delete().catch(() => {})
    }

    try {
      await page.goto(`/accept-invitation?code=${inviteCode}`, { waitUntil: 'domcontentloaded' })

      const acceptBtn = page.getByRole('button', { name: /accept invitation/i })
      await expect(acceptBtn).toBeVisible({ timeout: 90_000 })
      await acceptBtn.click()

      const ack = page.getByRole('checkbox')
      await expect(ack).toBeVisible({ timeout: 15_000 })
      await ack.check()
      await page.getByRole('button', { name: /accept & continue/i }).click()

      // The relationship persists despite the expired personal plan...
      await expect
        .poll(async () => (await invRef.get()).data()?.status, {
          timeout: 25_000,
          message: 'invitation should flip to accepted even with an expired own plan',
        })
        .toBe('accepted')

      const cg = (await uref.get()).data()?.caregiverOf || []
      expect(
        cg.some((c: any) => c?.accountOwnerId === fakeOwner),
        'invitee caregiverOf gains the owner',
      ).toBe(true)

      // ...and we land on the subscription-free caregiver surface, never /pricing.
      await expect(page).toHaveURL(new RegExp(`/caregiver/${fakeOwner}`), { timeout: 20_000 })
      await expect(page).not.toHaveURL(/\/pricing/)
    } finally {
      await cleanup()
    }
  })
})
