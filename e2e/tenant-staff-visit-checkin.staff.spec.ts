/**
 * White-label CRM — Staff visit check-in / check-out (EVV phase A, real-outcome).
 *
 * A caregiver verifies each home visit: check in on arrival, check out on
 * departure. The timestamps are the single source for oversight + payroll.
 * Check-in is GATED behind an explicit arrival confirmation (an attestation) —
 * you can't clock in from home in the morning.
 *
 * Asserts the real lifecycle (feedback_hast_assert_real_outcome):
 *   1. "Check in" opens the arrival confirmation; "Not yet" does NOT check in;
 *   2. confirming arrival flips the visit to in-progress (chip + Check out), and
 *      it PERSISTS across a reload (written to Firestore, not just local state);
 *   3. check-out marks it completed.
 *
 * beforeAll re-seeds so visits start 'scheduled' (repeatable). Runs under
 * chromium-franchise-staff.
 */

import { test, expect } from '@playwright/test'
import { execSync } from 'child_process'

test.describe('Staff visit check-in / check-out (EVV phase A)', () => {
  test.setTimeout(5 * 60_000)

  test.beforeAll(() => {
    // Reset the demo visits to 'scheduled' (so no stale in-progress visit blocks
    // the trip), then add a staff visit dated ~now that's always startable
    // regardless of wall-clock.
    execSync('npx tsx scripts/seed-lcb-appointments-demo.ts', { stdio: 'ignore' })
    execSync('npx tsx scripts/seed-lcb-checkin-test.ts', { stdio: 'ignore' })
  })

  test('start trip → arrival-gated check-in → in progress → check-out → completed, persisted', async ({ page }) => {
    // "Start trip" also opens navigation in a new tab — close the popup so it
    // doesn't linger. (The check-in test visit is dated ~now, so it's always
    // inside its start-trip window.)
    page.on('popup', popup => popup.close().catch(() => {}))

    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible({ timeout: 90_000 })

    // A scheduled visit starts with "Start trip" (begins the travel/payroll
    // clock). Click the first ENABLED one — others may be outside their window
    // or blocked because a visit is already active.
    const startBtn = page.locator('button:enabled', { hasText: 'Start trip' }).first()
    await expect(startBtn).toBeVisible({ timeout: 45_000 })
    await startBtn.click()
    // Now en route: "Start visit" appears (exact, so it doesn't match the modal's
    // "I've arrived — start visit") and the "En route" chip shows.
    const startVisit = page.getByRole('button', { name: 'Start visit', exact: true }).first()
    await expect(startVisit).toBeVisible({ timeout: 45_000 })
    await expect(page.getByText(/En route/).first()).toBeVisible()

    // Starting the visit is GATED: tapping it opens the arrival confirmation.
    await startVisit.click()
    await expect(page.getByRole('heading', { name: 'Confirm arrival' })).toBeVisible({ timeout: 15_000 })

    // "Not yet" cancels — the visit does not start (still en route).
    await page.getByRole('button', { name: 'Not yet' }).click()
    await expect(page.getByRole('heading', { name: 'Confirm arrival' })).toHaveCount(0)
    await expect(page.getByText(/In progress/)).toHaveCount(0)

    // Confirm arrival → visit in progress, with an End visit button.
    await page.getByRole('button', { name: 'Start visit', exact: true }).first().click()
    await page.getByRole('button', { name: /I've arrived/ }).click()
    await expect(page.getByText(/In progress/).first()).toBeVisible({ timeout: 45_000 })
    await expect(page.getByRole('button', { name: 'End visit', exact: true }).first()).toBeVisible()

    // Persisted: reload and the in-progress state is still there.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: 'End visit', exact: true }).first()).toBeVisible({ timeout: 90_000 })

    // End visit → completed.
    await page.getByRole('button', { name: 'End visit', exact: true }).first().click()
    await expect(page.getByText(/Completed/).first()).toBeVisible({ timeout: 45_000 })
  })
})
