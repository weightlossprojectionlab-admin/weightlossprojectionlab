/**
 * Owner-side flow: add a new family member via the wizard, then invite
 * percyricemusic@gmail.com to them from the family dashboard.
 *
 * Runs headless (HEADLESS=1) as the owner fixture (weightlossprojectionlab).
 * Asserts:
 *   - the new patient persists at users/{owner}/patients/{id}
 *   - an invitation to percyricemusic for THAT patient is created (pending)
 *   - because percyricemusic is already an accepted caregiver of this owner,
 *     the invite is auto-delivered in-app (deliveryMethod === 'in_app'), i.e.
 *     it lands in their inbox with no email re-onboarding (Phase B).
 *
 * The new patient + the invitation are torn down in finally.
 */

import { test, expect } from './fixtures'

test.describe('Add family member + invite percyricemusic @add-invite', () => {
  test.setTimeout(8 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('owner adds a member and invites percyricemusic to them', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const name = `Casey Rivers ${stamp}` // space-separated → capitalizeName is a no-op
    const email = 'percyricemusic@gmail.com'
    let newPatientId: string | undefined

    const cleanup = async () => {
      const invs = await firestore
        .collection('familyInvitations')
        .where('invitedByUserId', '==', ownerUserId)
        .where('recipientEmail', '==', email)
        .get()
      await Promise.all(
        invs.docs
          .filter((d) => newPatientId && (d.data().patientsShared || []).includes(newPatientId))
          .map((d) => d.ref.delete().catch(() => {})),
      )
      if (newPatientId) {
        await firestore.collection('users').doc(ownerUserId).collection('patients').doc(newPatientId).delete().catch(() => {})
      }
    }

    try {
      // ── 1. Add a new family member via the /patients/new wizard. ───────────
      await page.goto('/patients/new', { waitUntil: 'domcontentloaded' })

      await expect(page.getByRole('heading', { name: 'Who are you adding?', level: 2 })).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button').filter({ hasText: 'Person' }).first().click()

      await expect(page.getByRole('heading', { name: 'Who is this person?', level: 2 })).toBeVisible({ timeout: 30_000 })
      await page.getByPlaceholder('Enter name').fill(name)
      await page.getByPlaceholder('Enter name').blur()
      await page.locator('input[type="date"]').first().fill('1985-04-12')
      await page.getByRole('button', { name: 'Female', exact: true }).click()
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      // Step 2 "Height & weight" — Skip it (opens a confirm modal) to keep the
      // test focused on member-creation + invite, not the vitals form.
      await expect(page.getByRole('heading', { name: 'Height & weight', level: 2 })).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: 'Skip', exact: true }).click()
      await page.getByRole('button', { name: 'Skip anyway', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Any food allergies?', level: 2 })).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: /^✓ None$/ }).click()
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      await expect(page.getByRole('heading', { name: 'Review & create', level: 2 })).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button', { name: /^Create Family Member$/ }).click()

      // New patient persists — capture its id.
      await expect
        .poll(
          async () => {
            const snap = await firestore
              .collection('users').doc(ownerUserId)
              .collection('patients').where('name', '==', name).get()
            if (!snap.empty) newPatientId = snap.docs[0].id
            return snap.size
          },
          { timeout: 30_000, message: 'new family member should persist in Firestore' },
        )
        .toBeGreaterThan(0)

      // ── 2. Invite percyricemusic to the new member. ────────────────────────
      await page.goto('/family/dashboard?tab=members', { waitUntil: 'domcontentloaded' })
      await page.getByRole('button', { name: /invite caregiver/i }).first().click({ timeout: 90_000 })
      await page.getByPlaceholder('family.member@example.com').first().fill(email)
      await page.getByRole('checkbox', { name }).first().check()
      await page.getByRole('button', { name: /send invitation/i }).click()

      // ── 3. Assert the invitation exists for percyricemusic + this patient. ─
      await expect
        .poll(
          async () => {
            const snap = await firestore
              .collection('familyInvitations')
              .where('invitedByUserId', '==', ownerUserId)
              .where('recipientEmail', '==', email)
              .get()
            return snap.docs.some((d) => (d.data().patientsShared || []).includes(newPatientId))
          },
          { timeout: 30_000, message: 'invitation to percyricemusic for the new member should exist' },
        )
        .toBe(true)

      // Already-accepted caregiver → in-app delivery (no email re-onboarding).
      const snap = await firestore
        .collection('familyInvitations')
        .where('invitedByUserId', '==', ownerUserId)
        .where('recipientEmail', '==', email)
        .get()
      const inv = snap.docs.find((d) => (d.data().patientsShared || []).includes(newPatientId))
      expect(inv?.data().deliveryMethod, 'existing caregiver → in-app delivery').toBe('in_app')
    } finally {
      await cleanup()
    }
  })
})
