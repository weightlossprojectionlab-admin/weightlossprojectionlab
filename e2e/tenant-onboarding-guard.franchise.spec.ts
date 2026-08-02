/**
 * Tenant onboarding guard (white-label).
 *
 * Runs under the chromium-franchise project (little-care-bears subdomain,
 * franchise_admin storage state). Asserts a franchise operator who lands on the
 * consumer /onboarding route is bounced to the tenant dashboard — they must
 * never see the consumer "Who are you setting up for?" archetype flow under the
 * agency's brand.
 *
 * On a subdomain /onboarding is deterministic and never the consumer archetype
 * flow: operators/super-admin → /dashboard, managed clients → /patients,
 * unaffiliated users → signed out to /auth. This spec covers the operator case
 * (the one exercisable with the franchise storage state). The unaffiliated
 * sign-out path is logic-level (would need an unaffiliated subdomain session to
 * e2e); the affiliation routing is what keeps anyone from being stranded in a
 * consumer-onboarding loop under the brand.
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
