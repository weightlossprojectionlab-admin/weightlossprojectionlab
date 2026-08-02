/**
 * White-label CRM — Staff actor UI: dashboard tabs are role-gated (real-outcome).
 *
 * A franchise_STAFF viewer sees only the SHARED sections (Overview + Families),
 * not the owner-only ones (Packages / Staff / Branding). This asserts the real
 * journey (feedback_hast_assert_real_outcome):
 *   1. staff sees Overview + Families tabs, and NOT the owner-only tabs;
 *   2. staff can actually LOAD the Families surface (not bounced) — this is the
 *      slice's own goal and guards against the FamiliesAuthGuard regression;
 *   3. staff hitting an owner-only page BY URL is bounced to /login — proving
 *      the hidden tabs correspond to a real page-level gate, not just cosmetics.
 *
 * Runs under chromium-franchise-staff (franchise_staff session).
 */

import { test, expect } from '@playwright/test'

test.describe('Staff actor UI — role-gated dashboard tabs', () => {
  test.setTimeout(3 * 60_000)

  test('staff sees only the shared tabs; owner-only tabs hidden', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    const tabs = page.getByTestId('dashboard-tabs')
    await expect(tabs.getByRole('link', { name: 'Overview' })).toBeVisible({ timeout: 90_000 })
    await expect(tabs.getByRole('link', { name: 'Families' })).toBeVisible()

    await expect(tabs.getByRole('link', { name: 'Packages' })).toHaveCount(0)
    await expect(tabs.getByRole('link', { name: 'Staff' })).toHaveCount(0)
    await expect(tabs.getByRole('link', { name: 'Branding' })).toHaveCount(0)
  })

  test('staff can load the Families surface (not bounced)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    const tabs = page.getByTestId('dashboard-tabs')
    await expect(tabs.getByRole('link', { name: 'Families' })).toBeVisible({ timeout: 90_000 })
    await tabs.getByRole('link', { name: 'Families' }).click()

    // Lands on Families and stays there (the guard authorizes staff) — NOT /login.
    await expect(page).toHaveURL(/\/dashboard\/families/, { timeout: 60_000 })
    await expect(page.getByTestId('dashboard-tabs')).toBeVisible()
  })

  test('staff hitting an owner-only page by URL is bounced to /login', async ({ page }) => {
    await page.goto('/dashboard/staff', { waitUntil: 'domcontentloaded' })
    // The owner-only page guard (StaffAuthGuard, admin-only) bounces staff.
    await expect(page).toHaveURL(/\/login/, { timeout: 60_000 })
  })
})
