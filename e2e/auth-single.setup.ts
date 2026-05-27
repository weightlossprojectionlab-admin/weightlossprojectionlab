/**
 * Single-plan auth setup — signs in the `single`-plan fixture user
 * (provisioned by scripts/provision-single-user-e2e.ts) and saves a
 * separate browser storage state.
 *
 * Used by the chromium-single Playwright project to verify single-user
 * mode: no household switcher, no /patients scope chips, no /progress
 * member selector (all gated behind 2+ households / 2+ patients, which
 * a single-plan account can't reach).
 *
 * Same skip-if-fresh logic as the other setups. FORCE_SINGLE_AUTH=1 to
 * re-auth on demand.
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/single.json'
const AUTH_TTL_DAYS = 7

function authStateIsFresh(): boolean {
  if (process.env.FORCE_SINGLE_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

const AUTHENTICATED_URL = /\/(dashboard|patients|onboarding)\b/

setup('sign in single-plan user', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth-single.setup] Reusing recent storage state — skipping sign-in.')
    return
  }

  setup.setTimeout(4 * 60_000)

  const email = process.env.E2E_SINGLE_USER_EMAIL
  const password = process.env.E2E_SINGLE_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Single-plan auth setup requires E2E_SINGLE_USER_EMAIL and ' +
        'E2E_SINGLE_USER_PASSWORD in .env.local (run scripts/provision-single-user-e2e.ts).',
    )
  }

  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  const emailInput = page.getByLabel('Email address')
  await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
  await emailInput.fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  await page.waitForURL(AUTHENTICATED_URL, { timeout: 60_000 })
  await expect(page).toHaveURL(AUTHENTICATED_URL)

  await page.context().storageState({ path: AUTH_FILE })
})
