/**
 * Tenant /patients — WPL consumer plan/seat UI is hidden under a partner brand.
 *
 * A client of an agency isn't a WPL subscriber (the agency is), so the WPL plan
 * badge + "N of M" seat cap + progress bar (the "Member Limit Indicator") must
 * not render on a tenant surface — it's a positioning leak.
 *
 * Runs under chromium-franchise (little-care-bears subdomain) with a signed-OUT
 * state; signs in the standard consumer fixture (which HAS a subscription, so
 * the indicator WOULD show absent the tenant gate) on the subdomain, then
 * asserts the indicator is absent while the page itself rendered.
 */

import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test.use({ storageState: { cookies: [], origins: [] } }) // signed-out on the subdomain origin

test.describe('Tenant /patients — no WPL consumer plan UI', () => {
  test.setTimeout(4 * 60_000)

  test('the WPL plan/seat indicator is hidden on a tenant surface', async ({ page }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'needs E2E_TEST_USER_EMAIL/PASSWORD in .env.local')

    // Sign in the standard consumer account (has a subscription) on the subdomain.
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    const emailInput = page.getByLabel('Email address')
    await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
    await emailInput.fill(email!)
    await page.getByLabel('Password', { exact: true }).fill(password!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
    await page.waitForURL(url => !url.pathname.startsWith('/auth') && !url.pathname.startsWith('/login'), {
      timeout: 90_000,
    })

    await page.goto('/patients', { waitUntil: 'domcontentloaded' })

    // Page rendered (stable control) — so an absent indicator is meaningful, not
    // a failed load.
    await expect(page.getByRole('link', { name: /Add Family Member/i }).first()).toBeVisible({
      timeout: 90_000,
    })

    // The WPL consumer plan/seat indicator must NOT be shown under the brand.
    await expect(page.getByTestId('plan-seat-indicator')).toHaveCount(0)
  })
})
