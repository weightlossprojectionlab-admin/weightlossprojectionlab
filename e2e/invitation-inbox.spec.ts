/**
 * E2E for the in-app invitation inbox (the caregiver-side surface added so a
 * caregiver acts on invites in-app instead of hunting through email, and so
 * new-patient assignments to an existing caregiver don't re-onboard by email).
 *
 * Runs as the signed-in E2E user (E2E_TEST_USER_EMAIL) = the RECIPIENT. Seeds a
 * pending invitation to them from a throwaway owner (with a named patient +
 * specific permissions) and asserts:
 *   1. the inbox card renders WHO is asking (inviter email fallback), WHO you'd
 *      help (patient name resolved server-side), and WHAT you could do
 *      (permission chips) — enough to decide.
 *   2. accepting from the inbox flips the invite to 'accepted' AND rings the
 *      OWNER's notification bell (a `family_member_joined` notification doc).
 *
 * Throwaway owner/patient, the seeded invite, the caregiverOf entry, the
 * owner-side member docs, and the notification are all torn down in finally.
 */

import { Timestamp } from 'firebase-admin/firestore'
import { test, expect } from './fixtures'

test.describe('Invitation inbox @invitation-inbox', () => {
  test.setTimeout(5 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('inbox card shows who is asking, who you\'d help, and what you could do', async ({
    page,
    firestore,
  }) => {
    const stamp = Date.now()
    const recipientEmail = process.env.E2E_TEST_USER_EMAIL as string
    expect(recipientEmail, 'E2E_TEST_USER_EMAIL must be set').toBeTruthy()

    const fakeOwner = `e2e-inboxowner-${stamp}`
    const fakePatient = `e2e-inboxpatient-${stamp}`
    const ownerEmail = `e2e-owner-${stamp}@example.com`
    const patientName = `Aria-${stamp}` // unique so we can target this exact card

    // Owner doc (email → resolved as the inviter fallback) + a named patient.
    await firestore.collection('users').doc(fakeOwner).set({
      email: ownerEmail,
      profile: { onboardingCompleted: true, displayName: 'E2E Inbox Owner' },
    })
    await firestore
      .collection('users').doc(fakeOwner)
      .collection('patients').doc(fakePatient)
      .set({ name: patientName, userId: fakeOwner })

    // invitedByName is the generic placeholder on purpose → card must fall back
    // to the inviter's email. Permissions: view + log vitals granted, meds NOT.
    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode: `E2EINBOX${stamp}`,
      recipientEmail,
      invitedByUserId: fakeOwner,
      invitedByName: 'A family member',
      patientsShared: [fakePatient],
      permissions: { viewMedicalRecords: true, logVitals: true, editMedications: false },
      familyRole: 'caregiver',
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const cleanup = async () => {
      await invRef.delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('patients').doc(fakePatient).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).delete().catch(() => {})
    }

    try {
      await page.goto('/patients', { waitUntil: 'domcontentloaded' })

      const card = page.getByTestId(`invitation-card-${invRef.id}`)
      await expect(card, 'the seeded invite should surface in the inbox').toBeVisible({ timeout: 60_000 })

      // WHO is asking — generic stored name falls back to the owner's email.
      await expect(card).toContainText(ownerEmail)
      // WHO you'd help — patient name resolved server-side from the owner's doc.
      await expect(card).toContainText(patientName)
      // WHAT you could do — granted permissions shown, ungranted absent.
      await expect(card).toContainText('View records')
      await expect(card).toContainText('Log vitals')
      await expect(card).not.toContainText('Manage meds')
    } finally {
      await cleanup()
    }
  })

  test('accepting from the inbox flips the invite and rings the owner\'s bell', async ({
    page,
    ownerUserId, // signed-in E2E user = the RECIPIENT here
    firestore,
  }) => {
    const stamp = Date.now()
    const recipientUid = ownerUserId
    const recipientEmail = process.env.E2E_TEST_USER_EMAIL as string
    expect(recipientEmail, 'E2E_TEST_USER_EMAIL must be set').toBeTruthy()

    const fakeOwner = `e2e-notifyowner-${stamp}`
    const fakePatient = `e2e-notifypatient-${stamp}`
    const patientName = `Bram-${stamp}`

    await firestore.collection('users').doc(fakeOwner).set({
      email: `e2e-notify-${stamp}@example.com`,
      profile: { onboardingCompleted: true, displayName: 'E2E Notify Owner' },
    })
    await firestore
      .collection('users').doc(fakeOwner)
      .collection('patients').doc(fakePatient)
      .set({ name: patientName, userId: fakeOwner })

    const invRef = firestore.collection('familyInvitations').doc()
    await invRef.set({
      inviteCode: `E2ENOTIFY${stamp}`,
      recipientEmail,
      invitedByUserId: fakeOwner,
      invitedByName: 'E2E Notify Owner',
      patientsShared: [fakePatient],
      permissions: { viewMedicalRecords: true, logVitals: true },
      familyRole: 'caregiver',
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: new Date(stamp + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })

    const cleanup = async () => {
      await invRef.delete().catch(() => {})
      // Owner-side member docs the accept route creates.
      await firestore.collection('users').doc(fakeOwner).collection('familyMembers').doc(recipientUid).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('patients').doc(fakePatient).collection('familyMembers').doc(recipientUid).delete().catch(() => {})
      await firestore.collection('users').doc(fakeOwner).collection('patients').doc(fakePatient).delete().catch(() => {})
      // The owner-bell notifications produced by the accept.
      const notifs = await firestore.collection('notifications').where('userId', '==', fakeOwner).get()
      await Promise.all(notifs.docs.map((d) => d.ref.delete().catch(() => {})))
      await firestore.collection('users').doc(fakeOwner).delete().catch(() => {})
      // Remove the caregiverOf entry we added (leave any others intact).
      const uref = firestore.collection('users').doc(recipientUid)
      const data = (await uref.get()).data() || {}
      const cg = Array.isArray(data.caregiverOf) ? data.caregiverOf : []
      const filtered = cg.filter((c: any) => c?.accountOwnerId !== fakeOwner)
      if (filtered.length !== cg.length) await uref.update({ caregiverOf: filtered }).catch(() => {})
    }

    try {
      await page.goto('/patients', { waitUntil: 'domcontentloaded' })

      const card = page.getByTestId(`invitation-card-${invRef.id}`)
      await expect(card).toBeVisible({ timeout: 60_000 })
      await card.getByRole('button', { name: /^Accept$/ }).click()

      // The accept route flips the invite...
      await expect
        .poll(async () => (await invRef.get()).data()?.status, {
          timeout: 30_000,
          message: 'invitation should flip to accepted',
        })
        .toBe('accepted')

      // ...and rings the OWNER's bell with a family_member_joined notification.
      await expect
        .poll(
          async () => {
            const snap = await firestore
              .collection('notifications')
              .where('userId', '==', fakeOwner)
              .where('type', '==', 'family_member_joined')
              .get()
            return snap.size
          },
          { timeout: 30_000, message: 'owner should get a family_member_joined notification' },
        )
        .toBeGreaterThan(0)

      await expect(page).not.toHaveURL(/\/pricing/)
    } finally {
      await cleanup()
    }
  })
})
