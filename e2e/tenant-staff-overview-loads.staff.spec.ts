/**
 * White-label CRM — Staff actor UI: the Overview actually loads (real-outcome).
 *
 * Regression guard for the api-client auth-token race. On a COLD dashboard load,
 * useTenantDashboard fires its fetch the instant tenantId is read from the DOM —
 * which used to beat Firebase Auth's session restore. getAuthToken() waited a
 * fixed 200ms, gave up, sent no token, and the Overview rendered
 * "Error Loading Dashboard — Missing authentication token". The fix makes
 * getAuthToken wait on Firebase's first onAuthStateChanged emission instead of a
 * fixed guess, so the token is attached and the Overview loads.
 *
 * This asserts the real outcome (feedback_hast_assert_real_outcome): the Overview
 * renders its data, and the auth-token error is absent. Each test uses a fresh
 * context, so it exercises the cold-load path the bug lived on.
 *
 * Runs under chromium-franchise-staff (franchise_staff session).
 */

import { test, expect } from '@playwright/test'

test.describe('Staff actor UI — Overview loads without the auth-token race', () => {
  // Generous: under `next dev`, the /api/tenant/.../dashboard/stats route is
  // compiled on first hit (Turbopack on-demand), which can add tens of seconds
  // the FIRST time. In a prebuilt app it's fast. The point of the test is the
  // auth error's absence, not latency, so we wait the fetch out.
  test.setTimeout(4 * 60_000)

  test('cold-load Overview renders data, not the "Missing authentication token" error', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Auth has resolved once the (scoped) tab bar renders.
    await expect(page.getByTestId('dashboard-tabs')).toBeVisible({ timeout: 90_000 })

    // Wait for the fetch to actually resolve — the spinner detaches on success
    // OR error. Long timeout absorbs dev cold-compile of the stats route.
    await expect(page.getByText('Loading dashboard...')).toHaveCount(0, { timeout: 180_000 })

    // The auth-token failure card (the bug) must be absent...
    await expect(page.getByText('Missing authentication token')).toHaveCount(0)
    await expect(page.getByText('Error Loading Dashboard')).toHaveCount(0)

    // ...and the real payoff: Overview content rendered. "Family Health Snapshots"
    // only appears once the stats fetch succeeds.
    await expect(
      page.getByRole('heading', { name: /Family Health Snapshots/i })
    ).toBeVisible({ timeout: 30_000 })
  })
})
