/**
 * Franchise-STAFF auth setup — signs in the franchise_staff fixture user
 * (provisioned by scripts/provision-franchise-staff-e2e.ts) and saves a separate
 * browser storage state for the chromium-franchise-staff project.
 *
 * Same per-ORIGIN caveat as auth-franchise.setup.ts: the dashboard lives on the
 * tenant subdomain, so sign-in must happen there (the project's baseURL is the
 * subdomain). FORCE_FRANCHISE_STAFF_AUTH=1 to re-auth on demand.
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/franchise-staff.json'
const AUTH_TTL_DAYS = 7

function authStateIsFresh(): boolean {
  if (process.env.FORCE_FRANCHISE_STAFF_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

setup('sign in franchise staff', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth-franchise-staff.setup] Reusing recent storage state — skipping sign-in.')
    return
  }

  setup.setTimeout(6 * 60_000)

  const email = process.env.E2E_FRANCHISE_STAFF_EMAIL
  const password = process.env.E2E_FRANCHISE_STAFF_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Franchise-staff auth setup requires E2E_FRANCHISE_STAFF_EMAIL and ' +
        'E2E_FRANCHISE_STAFF_PASSWORD in .env.local (run scripts/provision-franchise-staff-e2e.ts).',
    )
  }

  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  const emailInput = page.getByLabel('Email address')
  await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
  if (await page.getByRole('button', { name: 'Create account', exact: true }).isVisible().catch(() => false)) {
    await page.getByRole('button', { name: /Switch to sign in/i }).click()
    await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ state: 'visible', timeout: 15_000 })
  }
  await emailInput.fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await page.waitForURL(url => !url.pathname.startsWith('/auth'), { timeout: 90_000 })

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(email).first()).toBeVisible({ timeout: 120_000 })

  await page.context().storageState({ path: AUTH_FILE })
})
