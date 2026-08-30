/**
 * White-label CRM — Staff interactive login must not loop (real-outcome).
 *
 * Regression guard for the /auth ↔ /dashboard reload loop after a fresh franchise
 * sign-in. The dashboard Overview reads tenantId from the DOM AFTER mount, so it
 * transitions '' → real id. useTenantRole('') resolved to checked:true /
 * isTenantMember:false; for one render after tenantId flipped, the guard saw that
 * stale "not a member" verdict and bounced a VALID staff member to /login →
 * /auth → (AuthRouter: franchise user → /dashboard) → bounced again. Infinite.
 * The fix: useTenantRole reports not-checked while the tenant is unknown / being
 * re-evaluated, so no guard acts on a stale verdict.
 *
 * This does a REAL sign-in (not the shared storage state, which skips the login
 * flow the bug lived in) and asserts the viewer lands on /dashboard, sees real
 * content, and is NOT cycling through /login. Uses a signed-OUT context.
 *
 * Runs under chromium-franchise-staff. Skips if the staff password isn't in env.
 */

import { test, expect } from '@playwright/test'

const EMAIL = process.env.E2E_FRANCHISE_STAFF_EMAIL || 'e2e.staff@wpl.test'
const PW = process.env.E2E_FRANCHISE_STAFF_PASSWORD || ''

test.describe('Staff interactive login — no /auth ↔ /dashboard loop', () => {
  // Start SIGNED OUT — override the project's franchise-staff storage state so we
  // exercise the actual login flow the loop lived in.
  test.use({ storageState: { cookies: [], origins: [] } })
  test.setTimeout(3 * 60_000)

  test('signing in on /auth lands on /dashboard and stays (no reload loop)', async ({ page }) => {
    test.skip(!PW, 'E2E_FRANCHISE_STAFF_PASSWORD not set — cannot exercise interactive login')

    const path = () => new URL(page.url()).pathname
    const seen: string[] = []
    page.on('framenavigated', f => {
      if (f === page.mainFrame()) seen.push(new URL(f.url()).pathname)
    })

    await page.goto('/auth', { waitUntil: 'domcontentloaded' })
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 30_000 })
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PW)
    await page.getByRole('button', { name: /^sign in$/i }).click()

    // Lands on the dashboard and renders real content — not bounced to /login.
    // Staff land on the "My Day" agenda (not the owner dashboard).
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 })
    await expect(
      page.getByRole('heading', { name: 'My Day' })
    ).toBeVisible({ timeout: 90_000 })

    // Settle, then confirm it stayed put — the loop's signature is bouncing back
    // off /dashboard to /login. There should be no such post-login bounce.
    await page.waitForTimeout(5000)
    expect(path()).toMatch(/\/dashboard/)
    const loginVisits = seen.filter(p => p.startsWith('/login')).length
    expect(loginVisits, `nav path: ${seen.join(' → ')}`).toBeLessThanOrEqual(1)
  })
})
