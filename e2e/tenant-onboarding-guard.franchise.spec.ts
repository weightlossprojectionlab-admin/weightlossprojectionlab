/**
 * Tenant onboarding guard (white-label).
 *
 * Runs under the chromium-franchise project (little-care-bears subdomain,
 * franchise_admin storage state). Asserts a franchise operator who lands on the
 * consumer /onboarding route is bounced to the tenant dashboard — they must
 * never see the consumer "Who are you setting up for?" archetype flow under the
 * agency's brand.
 *
 * There's deliberately no client-facing gate: agency clients are intaked by
 * their agency (onboardingCompleted=true) and are never routed to /onboarding,
 * so a client has no path to it. This guard covers the one real case — an
 * operator arriving via a stale link.
 */

import { test, expect } from '@playwright/test'

test.describe('Tenant onboarding guard', () => {
  test.setTimeout(3 * 60_000)

  test('a franchise operator is redirected off /onboarding to the dashboard', async ({ page }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    // The auth router bounces franchise users off consumer entry points.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 90_000 })

    // And the consumer archetype gate must not be present.
    await expect(page.getByText('Who are you setting up for?')).toHaveCount(0)
  })
})
