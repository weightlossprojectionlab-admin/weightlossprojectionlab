/**
 * Phase B end-to-end test: Immunization round-trip via the UI.
 *
 * Asserts the same path a caregiver would take:
 *   navigate to a patient → Health Records tab → Add Immunization
 *   → submit → see the row → Delete → confirm → see it gone.
 *
 * Each run uses a timestamped vaccine name so the test can find
 * its own record without colliding with prior runs or real data.
 *
 * Requires E2E_TEST_PATIENT_ID env var (defaults to the
 * smoke-test target). The patient must belong to the authenticated
 * user from auth.setup.ts.
 */

import { test, expect } from '@playwright/test'

const PATIENT_ID =
  process.env.E2E_TEST_PATIENT_ID ?? '0093549d-af9e-4811-b2ec-8f79e594a62a'

test.describe('Health Records — Immunizations', () => {
  test('add then delete a vaccine record', async ({ page }) => {
    const uniqueVaccineName = `Tetanus-E2E-${Date.now()}`
    const administeredAt = '2026-05-10'

    // Land directly on the patient detail page with the Health
    // Records tab pre-selected via query param.
    await page.goto(`/patients/${PATIENT_ID}?tab=health-records`)

    // The Quick Actions sidebar also routes here; if the tab param
    // didn't take, click the button explicitly.
    const healthRecordsButton = page.getByRole('button', { name: /^health records$/i })
    if (await healthRecordsButton.isVisible().catch(() => false)) {
      await healthRecordsButton.click()
    }

    // Heading anchors the section
    await expect(
      page.getByRole('heading', { name: 'Immunizations', exact: true }),
    ).toBeVisible()

    // Open the form
    await page.getByRole('button', { name: '+ Add', exact: true }).click()

    // Modal heading confirms the form opened
    await expect(
      page.getByRole('heading', { name: 'Add Immunization', exact: true }),
    ).toBeVisible()

    // Fill required fields
    await page.getByLabel('Vaccine *').fill(uniqueVaccineName)
    await page.getByLabel('Date administered *').fill(administeredAt)

    // Submit
    await page.getByRole('button', { name: 'Add', exact: true }).click()

    // Modal closes; success toast appears
    await expect(
      page.getByRole('heading', { name: 'Add Immunization', exact: true }),
    ).not.toBeVisible({ timeout: 10_000 })

    // The new row renders with our unique name
    const row = page.getByText(uniqueVaccineName, { exact: false }).first()
    await expect(row).toBeVisible()

    // Delete affordance — scoped to the row containing our vaccine
    // so we never click a Delete button on someone else's record.
    const rowItem = page.locator('li', { hasText: uniqueVaccineName })
    await rowItem.getByRole('button', { name: /^delete/i }).click()

    // Confirm modal — the ConfirmModal has a "Remove" button
    await page.getByRole('button', { name: 'Remove', exact: true }).click()

    // Row is gone
    await expect(page.getByText(uniqueVaccineName, { exact: false })).toHaveCount(0, {
      timeout: 10_000,
    })
  })
})
