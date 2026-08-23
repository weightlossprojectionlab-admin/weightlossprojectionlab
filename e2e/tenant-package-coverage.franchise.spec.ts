/**
 * Package coverage toggles + live estimate preview (agency-side, owner-only).
 *
 * In the package builder, toggling a covered category updates the coverage
 * preview live (via the pure estimateVisit function) — so the agency sees the
 * "included vs +$X" impact as they build the plan. Real-outcome:
 *   - a new draft's preview starts at $0 covered;
 *   - toggling "Bathroom cleaning" marks it pressed and moves covered value > $0.
 *
 * Runs under chromium-franchise (franchise_admin session).
 */

import { test, expect } from '@playwright/test'

test.describe('Package coverage preview (owner-only)', () => {
  test.setTimeout(3 * 60_000)

  test('toggling a covered category updates the live estimate', async ({ page }) => {
    await page.goto('/dashboard/packages', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Care packages' })).toBeVisible({ timeout: 90_000 })

    // Open a fresh package draft.
    await page.getByRole('button', { name: '+ Add a package' }).click()
    const preview = page.getByTestId('coverage-preview')
    await expect(preview).toBeVisible({ timeout: 30_000 })
    // Nothing covered yet.
    await expect(preview).toContainText('covers $0')

    // Toggle "Bathroom cleaning" → pressed, and covered value leaves $0.
    const toggle = page.getByRole('button', { name: 'Bathroom cleaning', exact: true })
    await expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await toggle.click()
    await expect(toggle).toHaveAttribute('aria-pressed', 'true')
    await expect(preview).not.toContainText('covers $0')
    await expect(preview).toContainText(/covers \$[1-9]/)
  })
})
