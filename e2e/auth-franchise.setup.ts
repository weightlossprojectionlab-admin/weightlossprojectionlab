/**
 * Franchise-admin auth setup — signs in the franchise fixture user
 * (provisioned by scripts/provision-franchise-admin-e2e.ts) and saves a
 * separate browser storage state for the chromium-franchise project.
 *
 * CRITICAL: Firebase auth persistence is per-ORIGIN. The white-label
 * dashboard lives on the tenant subdomain (little-care-bears.localhost),
 * which is a different origin from the apex localhost the other fixtures
 * sign in on. So this setup must sign in ON THE SUBDOMAIN — the project's
 * baseURL is set to the subdomain in playwright.config.ts, so the relative
 * /auth navigation lands there and the saved state is valid for /dashboard.
 *
 * Same skip-if-fresh logic as the other setups. FORCE_FRANCHISE_AUTH=1 to
 * re-auth on demand.
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/franchise.json'
const AUTH_TTL_DAYS = 7

function authStateIsFresh(): boolean {
  if (process.env.FORCE_FRANCHISE_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

setup('sign in franchise admin', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth-franchise.setup] Reusing recent storage state — skipping sign-in.')
    return
  }

  setup.setTimeout(6 * 60_000)

  const email = process.env.E2E_FRANCHISE_ADMIN_EMAIL
  const password = process.env.E2E_FRANCHISE_ADMIN_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Franchise auth setup requires E2E_FRANCHISE_ADMIN_EMAIL and ' +
        'E2E_FRANCHISE_ADMIN_PASSWORD in .env.local (run scripts/provision-franchise-admin-e2e.ts).',
    )
  }

  // /auth is not rewritten to tenant-shell (only /, /dashboard, /about are),
  // so it renders the apex auth form — but on the subdomain origin, which is
  // what we need for Firebase to persist auth there.
  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  const emailInput = page.getByLabel('Email address')
  await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
  await emailInput.fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  // Sign-in succeeds when we navigate away from /auth. The destination
  // doesn't matter here — we just need authenticated state persisted on
  // this origin; the spec navigates to /dashboard itself.
  await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 90_000 })

  // Confirm we're AUTHORIZED on the franchise dashboard before trusting the
  // state. Assert an auth signal that renders immediately (the signed-in
  // user's email in the sidebar) — NOT data-loaded content like "Family
  // Health Snapshots", which waits on a cold-compiled API and would make
  // the setup race the data fetch. The spec asserts the data once routes
  // are warm.
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText('e2e.franchise@wpl.test').first()).toBeVisible({ timeout: 120_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
