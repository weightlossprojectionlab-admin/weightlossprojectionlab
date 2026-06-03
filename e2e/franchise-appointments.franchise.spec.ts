/**
 * Franchise / white-label dashboard — appointment views.
 *
 * Runs under the chromium-franchise project (baseURL = the little-care-bears
 * subdomain, storageState = a franchise_admin fixture). Verifies the
 * staff-aware appointment surfaces we built:
 *   - "Today's Schedule" grouped by staff member
 *   - the unassigned-visit coverage alert
 *   - "Family Appointments" (member-medical) with the transport chip
 *   - the per-patient deep view (weight + vitals charts + meds)
 *
 * REQUIRES the demo seed to have run TODAY (today's visits are dated to the
 * seed run): npx tsx scripts/seed-lcb-appointments-demo.ts
 * The seed is idempotent (fixed doc IDs).
 */

import { test, expect } from '@playwright/test'

test.describe('Franchise dashboard — appointments', () => {
  test('Today’s Schedule groups by staff, flags unassigned, lists family appointments', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Sanity: we're on the white-label dashboard.
    await expect(page.getByText('Family Health Snapshots')).toBeVisible({ timeout: 90_000 })

    // Stat card flipped to Today's Visits.
    await expect(page.getByText("Today's Visits")).toBeVisible()

    // Today's Schedule section (heading uses a curly apostrophe).
    await expect(page.getByRole('heading', { name: /Today.s Schedule/i })).toBeVisible()

    // Grouped by staff — both seeded staff appear as group headings.
    await expect(page.getByText('Nurse Carla').first()).toBeVisible()
    await expect(page.getByText('Coach Dan').first()).toBeVisible()

    // Unassigned coverage alert + its seeded visit.
    await expect(page.getByText(/Unassigned Visit/i)).toBeVisible()
    await expect(page.getByText('Evening BP check')).toBeVisible()

    // Family Appointments (member-medical) + transport chip.
    await expect(page.getByRole('heading', { name: 'Family Appointments' })).toBeVisible()
    await expect(page.getByText(/needs ride/i).first()).toBeVisible()
  })

  test('per-patient deep view renders weight + vital charts + medications', async ({ page }) => {
    // Direct-nav to the seeded patient (fixed IDs from the seed script).
    await page.goto('/dashboard/families/demo-henderson-lcb/patients/pat-margaret-lcb', {
      waitUntil: 'domcontentloaded',
    })

    // Patient header.
    await expect(page.getByText('Margaret Henderson')).toBeVisible({ timeout: 90_000 })

    // Weight trend + the two seeded vital charts (labels from the page).
    await expect(page.getByRole('heading', { name: 'Weight Trend' })).toBeVisible()
    await expect(page.getByText('Blood Pressure (mmHg)')).toBeVisible()
    await expect(page.getByText('Glucose (mg/dL)')).toBeVisible()

    // Active medications from the seed.
    await expect(page.getByText('Lisinopril')).toBeVisible()
    await expect(page.getByText('Metformin')).toBeVisible()
  })
})
