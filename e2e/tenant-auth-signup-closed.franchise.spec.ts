/**
 * White-label /auth — self-registration is closed on a tenant subdomain.
 *
 * Runs under the chromium-franchise project (little-care-bears subdomain) but
 * overrides storageState to signed-OUT so the auth form actually renders (the
 * project's default franchise_admin state would redirect an authed user away).
 *
 * Agency-intake model: a stranger must not be able to self-register under the
 * partner's brand (which would drop them into consumer onboarding). The one
 * exception is the invitation flow (?invitation=true) — how an agency-invited
 * family legitimately signs up.
 */

import { test, expect } from '@playwright/test'

// Signed-out context so /auth shows the form instead of redirecting.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Tenant /auth — self-signup closed', () => {
  test.setTimeout(3 * 60_000)

  test('a plain subdomain visit offers sign-in only — no self-signup toggle', async ({ page }) => {
    await page.goto('/auth', { waitUntil: 'domcontentloaded' })

    // The sign-in form renders.
    await expect(page.getByLabel('Email address')).toBeVisible({ timeout: 90_000 })
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()

    // The self-signup affordances must be absent.
    await expect(page.getByRole('button', { name: /Switch to sign up/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toHaveCount(0)

    // And the intake-only note is shown instead.
    await expect(page.getByText(/sets up your account/i)).toBeVisible()
  })

  test('the invitation flow still allows signup (agency-invited family)', async ({ page }) => {
    await page.goto('/auth?invitation=true', { waitUntil: 'domcontentloaded' })

    // Invitation flow defaults to signup — the create-account affordance is present.
    await expect(page.getByRole('button', { name: 'Create account', exact: true })).toBeVisible({
      timeout: 90_000,
    })
    // ...and the intake-only note is NOT shown (signup isn't closed here).
    await expect(page.getByText(/sets up your account/i)).toHaveCount(0)
  })
})
