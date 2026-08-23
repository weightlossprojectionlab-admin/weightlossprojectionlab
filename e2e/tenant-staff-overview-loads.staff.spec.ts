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

  test('cold-load "My day" renders, not the "Missing authentication token" error', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Staff land on "My day" (not the owner dashboard). The heading renders as
    // soon as the DOM-read tenantId resolves.
    await expect(page.getByRole('heading', { name: 'My Day' })).toBeVisible({ timeout: 90_000 })

    // Wait for the visit fetch to resolve — the spinner detaches on success OR
    // error. Long timeout absorbs dev cold-compile of the stats route.
    await expect(page.getByText(/Loading your day/)).toHaveCount(0, { timeout: 180_000 })

    // The auth-token failure card (the bug) must be absent. On an auth-token
    // error the page renders this error BEFORE the staff branch, so it guards
    // "My day" too — this is still the auth-race regression guard.
    await expect(page.getByText('Missing authentication token')).toHaveCount(0)
    await expect(page.getByText('Error Loading Dashboard')).toHaveCount(0)

    // The agenda rendered: the "Today's visits" section appears once the fetch
    // resolves (whether or not there are visits).
    await expect(
      page.getByRole('heading', { name: /Today.s visits/i })
    ).toBeVisible({ timeout: 30_000 })
  })
})
