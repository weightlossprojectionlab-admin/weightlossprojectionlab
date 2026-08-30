/**
 * Tenant dashboard Overview — no redirect loop (regression).
 *
 * The Overview page read tenantId from a DOM attribute after mount; its auth
 * check could fire while tenantId was still null, fail the claims match, and
 * bounce to /login → the auth router bounced the franchise user back to
 * /dashboard → an infinite loop. Fixed by waiting for tenantId before deciding.
 *
 * Runs under chromium-franchise (franchise_admin). Asserts the operator lands
 * on /dashboard, authorized Overview content renders, and the URL STAYS on
 * /dashboard (doesn't settle on /login/auth) after a beat.
 */

import { test, expect } from '@playwright/test'

test.describe('Tenant dashboard Overview — no redirect loop', () => {
  test.setTimeout(3 * 60_000)

  test('operator lands on /dashboard and stays (no /login bounce loop)', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })

    // Authorized Overview content renders — only shown once the auth check
    // passes (i.e. it didn't bounce to /login).
    await expect(page.getByText('Family Health Snapshots')).toBeVisible({ timeout: 90_000 })

    // Let any loop churn manifest, then confirm we've settled on /dashboard.
    await page.waitForTimeout(3000)
    const url = page.url()
    expect(url, `settled URL: ${url}`).toContain('/dashboard')
    expect(url, `should not be on /login: ${url}`).not.toContain('/login')
    expect(url, `should not be on /auth: ${url}`).not.toContain('/auth')
  })
})
