/**
 * White-label CRM — Staff "My day" agenda (real-outcome).
 *
 * A field caregiver starts the shift needing "who / when / where", not the
 * owner's practice-wide dashboard. So a non-owner staff viewer's /dashboard is
 * the focused "My day" agenda (their own visits, time-ordered, leading with the
 * next one) — and must NOT show the owner-only surfaces (all-family Health
 * Snapshots, the Management Tools grid). Owners keep the full dashboard.
 *
 * This asserts the role-branch contract structurally (independent of whether
 * today's demo visits are seeded): the agenda is present, the owner clutter is
 * not. Runs under chromium-franchise-staff (franchise_staff session).
 */

import { test, expect } from '@playwright/test'

test.describe('Staff actor UI — "My day" agenda replaces the owner dashboard', () => {
  test.setTimeout(3 * 60_000)

  test('staff /dashboard shows "My day", not the owner dashboard', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // The focused staff agenda.
    await expect(page.getByRole('heading', { name: 'My day' })).toBeVisible({ timeout: 90_000 })
    await expect(page.getByRole('heading', { name: /Today.s visits/i })).toBeVisible()

    // Owner-only surfaces must NOT appear for staff.
    await expect(page.getByRole('heading', { name: /Family Health Snapshots/i })).toHaveCount(0)
    await expect(page.getByText('Management Tools')).toHaveCount(0)
  })
})
