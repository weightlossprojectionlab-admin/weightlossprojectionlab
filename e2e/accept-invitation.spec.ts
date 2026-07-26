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

import { Timestamp } from 'firebase-admin/firestore'
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
})
