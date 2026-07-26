/**
 * E2E: the guided "complete an existing member" onboarding flow (Option A).
 *
 * Seeds an INCOMPLETE member (identity only — no height/weight, so the Progress page shows the
 * "Needs to Complete Onboarding" banner), then drives the banner's target — /patients/new?patientId=
 * — asserting it opens the wizard straight on the HEALTH step (identity skipped), fills height +
 * weight, submits, and lands back on the member with the health data MERGED onto the existing doc.
 *
 * Owner-side (chromium). Torn down in finally.
 */

import { test, expect } from './fixtures'

test.describe('Complete-existing-member onboarding @complete-member', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('the banner completion flow fills an incomplete member health profile', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const stamp = Date.now()
    const memberId = `complete-me-${stamp}`
    const patientRef = firestore
      .collection('users').doc(ownerUserId).collection('patients').doc(memberId)

    const cleanup = async () => {
      await patientRef.delete().catch(() => {})
    }
    await cleanup()

    try {
      const now = new Date().toISOString()
      // INCOMPLETE member: identity only, no height/weight/goals.
      await patientRef.set({
        id: memberId, userId: ownerUserId, type: 'human',
        name: `Onboard Me ${stamp}`, firstName: 'Onboard',
        dateOfBirth: '1990-04-10T00:00:00.000Z', gender: 'male', relationship: 'sibling',
        createdAt: now, updatedAt: now,
      })

      // The guided completion flow (exactly the banner CTA target).
      await page.goto(`/patients/new?patientId=${memberId}`, { waitUntil: 'domcontentloaded' })

      // Opens straight on the health step — identity steps skipped for an existing member.
      await expect(page.getByText('Height & weight', { exact: false }).first()).toBeVisible({ timeout: 45_000 })

      // Fill height (5'10") + current weight.
      await page.getByPlaceholder('5', { exact: true }).fill('5')
      await page.getByPlaceholder('8', { exact: true }).fill('10')
      await page.locator('label:has-text("Current Weight")').locator('xpath=following::input[1]').first().fill('175')

      // Advance through the remaining steps (food allergies → review) and submit.
      const complete = page.getByRole('button', { name: 'Complete Profile' })
      for (let i = 0; i < 6 && !(await complete.isVisible().catch(() => false)); i++) {
        const none = page.getByRole('button', { name: /no known|no food allerg|^none$/i }).first()
        if (await none.isVisible().catch(() => false)) await none.click().catch(() => {})
        await page.getByRole('button', { name: 'Continue' }).first().click().catch(() => {})
        await page.waitForTimeout(700)
      }
      await complete.click({ timeout: 15_000 })

      // Lands back on the member; the health data is now merged onto the existing doc.
      await page.waitForURL(new RegExp(`/patients/${memberId}`), { timeout: 30_000 }).catch(() => {})
      await expect
        .poll(
          async () => {
            const d = (await patientRef.get()).data() || {}
            return typeof d.height === 'number' && typeof d.currentWeight === 'number'
          },
          { timeout: 20_000, message: 'member should have height + currentWeight after completion' },
        )
        .toBe(true)
      const d = (await patientRef.get()).data()!
      expect(d.height, "5'10\" = 70in").toBe(70)
      expect(d.currentWeight).toBe(175)
      // Original createdAt preserved (merge, not overwrite).
      expect(d.createdAt).toBe(now)
    } finally {
      if (process.env.KEEP_DATA === '1') {
        console.log('[complete-member] KEEP_DATA=1 — leaving seeded member.')
      } else {
        await cleanup()
      }
    }
  })
})
