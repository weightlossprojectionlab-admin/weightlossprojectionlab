/**
 * Tenant /onboarding — an UNAFFILIATED signed-in user is signed out, not stranded.
 *
 * Covers the affiliation-routing branch that was previously logic-only: a user
 * who is authenticated but has no relationship with THIS tenant (no operator
 * claim, not in managedBy) must NOT be dropped into the consumer archetype flow
 * under the brand — they're signed out to the sign-in-only /auth.
 *
 * Runs under chromium-franchise (little-care-bears subdomain) but with a
 * signed-OUT storage state; the test signs in the standard consumer fixture
 * (unaffiliated with little-care-bears) on the subdomain origin, then hits
 * /onboarding directly to trigger the branch.
 */

import { test, expect } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

test.use({ storageState: { cookies: [], origins: [] } }) // signed-out on the subdomain origin

test.describe('Tenant /onboarding — unaffiliated user', () => {
  test.setTimeout(4 * 60_000)

  test('a signed-in but unaffiliated consumer hitting /onboarding is bounced to sign-in', async ({
    page,
  }) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    test.skip(!email || !password, 'needs E2E_TEST_USER_EMAIL/PASSWORD in .env.local')

    // Sign in as the standard consumer account (unaffiliated with little-care-bears)
    // on the subdomain origin. /auth here is sign-in-only (door #1).
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    const emailInput = page.getByLabel('Email address')
    await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
    await emailInput.fill(email!)
    await page.getByLabel('Password', { exact: true }).fill(password!)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()

    // Sign-in establishes the session and navigates away from /auth (a family-plan
    // consumer lands on their branded /patients).
    await page.waitForURL(url => !url.pathname.startsWith('/auth') && !url.pathname.startsWith('/login'), {
      timeout: 90_000,
    })

    // Now hit /onboarding directly. Unaffiliated → the affiliation routing signs
    // them out to the sign-in-only /auth; the consumer archetype flow never shows.
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })
    await expect(page).toHaveURL(/\/(auth|login)/, { timeout: 90_000 })
    await expect(page.getByText('Who are you setting up for?')).toHaveCount(0)
  })
})
