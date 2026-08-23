/**
 * White-label CRM — owner (franchise_admin) still sees all dashboard tabs.
 *
 * Regression guard for the Staff tab role-gating: the owner-only tabs
 * (Packages / Staff / Branding) must remain visible to an owner-level viewer.
 * Pairs with tenant-staff-tabs.staff.spec.ts (the hidden-for-staff case).
 *
 * Runs under chromium-franchise (franchise_admin session).
 */

import { test, expect } from '@playwright/test'

test.describe('Owner actor UI — full dashboard tabs', () => {
  test.setTimeout(3 * 60_000)

  test('franchise_admin sees all five tabs, including owner-only sections', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const tabs = page.getByTestId('dashboard-tabs')
    for (const label of ['Overview', 'Families', 'Packages', 'Staff', 'Branding']) {
      await expect(tabs.getByRole('link', { name: label })).toBeVisible({ timeout: 90_000 })
    }
  })
})
