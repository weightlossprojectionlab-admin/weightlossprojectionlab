/**
 * Invite modal — recognizes an existing caregiver and marks the patients they
 * already cover (privacy-safe Phase 1: owner's OWN grants only).
 *
 * Real-outcome HAST (per feedback_hast_assert_real_outcome): seed a
 * percyrice@gmail.com caregiver grant covering a seeded "Jimmy" on the logged-in
 * owner's account, open the invite modal, type that email, and assert the actual
 * recognition — banner + "Already has access" badge on Jimmy + his checkbox
 * disabled — while an uncovered patient stays selectable. Negative control: an
 * unrecognized email shows no badge (proves it's email-conditional, not always-on).
 */

import { test, expect } from './fixtures'

test.describe('Invite modal recognizes existing caregiver @invite-recognition', () => {
  test.setTimeout(3 * 60_000)
  test.use({
    // The /family page fires benign fetches that can log before data lands.
    expectedApiErrorCodes: [
      'Failed to fetch', 'api_request', 'not found', 'caregivers', 'family', 'Error fetching',
    ],
  })

  test('typing a known caregiver email marks the patients they already cover', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const jimmy = `e2e_jimmy_${stamp}`
    const mona = `e2e_mona_${stamp}`
    const jimmyName = `Jimmy ${stamp}`
    const monaName = `Mona ${stamp}`
    const knownEmail = 'percyrice@gmail.com'

    const ownerRef = firestore.collection('users').doc(ownerUserId)

    // Two patients on MY account — Jimmy (will be covered) + Mona (not covered).
    await ownerRef.collection('patients').doc(jimmy).set({
      name: jimmyName, relationship: 'parent', type: 'human',
      dateOfBirth: '1970-01-01', gender: 'male', userId: ownerUserId, status: 'active',
    })
    await ownerRef.collection('patients').doc(mona).set({
      name: monaName, relationship: 'parent', type: 'human',
      dateOfBirth: '1972-01-01', gender: 'female', userId: ownerUserId, status: 'active',
    })
    // An accepted caregiver grant to percyrice@gmail.com covering Jimmy only.
    await ownerRef.collection('familyMembers').doc(`e2e_cg_${stamp}`).set({
      userId: `e2e_cg_uid_${stamp}`,
      email: knownEmail,
      name: 'Percy Rice',
      status: 'accepted',
      relationship: 'family',
      patientsAccess: [jimmy],
      permissions: { viewPatientProfile: true, viewMedicalRecords: true, viewVitals: true },
    })

    const cleanup = async () => {
      await Promise.all([
        ownerRef.collection('patients').doc(jimmy).delete(),
        ownerRef.collection('patients').doc(mona).delete(),
        ownerRef.collection('familyMembers').doc(`e2e_cg_${stamp}`).delete(),
      ].map((p) => p.catch(() => {})))
    }

    try {
      await page.goto('/family', { waitUntil: 'domcontentloaded' })

      // Open the invite modal.
      await page.getByRole('button', { name: /Invite Caregiver/i }).first().click()
      const emailInput = page.getByPlaceholder('family.member@example.com')
      await expect(emailInput).toBeVisible({ timeout: 30_000 })

      // Wait until my seeded patients render in the checklist (usePatients loaded).
      await expect(page.getByText(jimmyName)).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(monaName)).toBeVisible()

      const jimmyRow = page.locator('label', { hasText: jimmyName })
      const monaRow = page.locator('label', { hasText: monaName })

      // POSITIVE — type the known caregiver's email. (expect() auto-retries, so
      // this also waits out the /api/family/caregivers fetch.)
      await emailInput.fill(knownEmail)

      await expect(page.getByText(/already a caregiver/i), 'recognition banner shows').toBeVisible({ timeout: 30_000 })
      await expect(jimmyRow.getByText('Already has access'), 'Jimmy is marked covered').toBeVisible()
      await expect(jimmyRow.getByRole('checkbox'), 'covered patient is not re-shareable').toBeDisabled()
      await expect(monaRow.getByRole('checkbox'), 'uncovered patient stays selectable').toBeEnabled()

      // NEGATIVE control — an unrecognized email drops the recognition entirely.
      await emailInput.fill(`stranger.${stamp}@example.com`)
      await expect(page.getByText('Already has access'), 'unknown email → no coverage badge').toHaveCount(0)
      await expect(page.getByText(/already a caregiver/i), 'unknown email → no banner').toHaveCount(0)
      await expect(jimmyRow.getByRole('checkbox'), 'Jimmy selectable again for a stranger').toBeEnabled()
    } finally {
      await cleanup()
    }
  })
})
