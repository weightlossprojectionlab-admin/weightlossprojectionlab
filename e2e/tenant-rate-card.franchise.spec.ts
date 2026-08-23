/**
 * Agency rate card — owner-only editor (real-outcome).
 *
 * The rate card prices duty categories a family's package doesn't cover. It's
 * owner-level config (like packages/branding). This asserts the real journey
 * (feedback_hast_assert_real_outcome): the owner sees the card, edits a rate,
 * saves, and the change PERSISTS across a reload (written to the tenant doc).
 *
 * Runs under chromium-franchise (franchise_admin session, subdomain baseURL).
 */

import { test, expect } from '@playwright/test'

test.describe('Agency rate card (owner-only)', () => {
  test.setTimeout(3 * 60_000)

  test('owner sees the rate card, edits a rate, and it persists', async ({ page }) => {
    await page.goto('/dashboard/packages', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Rate card' })).toBeVisible({ timeout: 90_000 })

    // Edit the Bathroom cleaning rate to a known value and save.
    const rate = page.getByLabel(/Bathroom cleaning rate/i)
    await expect(rate).toBeVisible()
    await rate.fill('57')
    await page.getByRole('button', { name: /Save rate card/i }).click()
    await expect(page.getByText('Rate card saved.')).toBeVisible({ timeout: 30_000 })

    // Persisted: reload and the saved value is still there (read from the tenant doc).
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByLabel(/Bathroom cleaning rate/i)).toHaveValue('57', { timeout: 90_000 })
  })
})
