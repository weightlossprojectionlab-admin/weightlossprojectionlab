/**
 * Caregiver-side auth setup — signs in the secondary fixture user
 * (percyrice@gmail.com, who is configured as caregiver-only) and saves
 * a separate browser storage state.
 *
 * Lives alongside auth.setup.ts so the suite can run BOTH:
 *   - Owner-side specs reuse e2e/.auth/user.json (the original fixture)
 *   - Caregiver-side specs declare test.use({ storageState: 'e2e/.auth/caregiver.json' })
 *
 * Same skip-if-fresh logic as the owner setup — Firebase refresh tokens
 * last ~30 days, we re-sign-in weekly. Set FORCE_CAREGIVER_AUTH=1 to
 * bypass and re-auth on demand.
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/caregiver.json'
const AUTH_TTL_DAYS = 7

function authStateIsFresh(): boolean {
  if (process.env.FORCE_CAREGIVER_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

const AUTHENTICATED_URL = /\/(dashboard|patients|onboarding|caregiver)\b/

setup('sign in caregiver', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth-caregiver.setup] Reusing recent storage state — skipping sign-in.')
    return
  }

  // Cold-compile on a fresh dev server can be slow; give the form
  // time to render even when /auth is on its first request.
  setup.setTimeout(4 * 60_000)

  const email = process.env.E2E_CAREGIVER_USER_EMAIL
  const password = process.env.E2E_CAREGIVER_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Caregiver auth setup requires E2E_CAREGIVER_USER_EMAIL and ' +
        'E2E_CAREGIVER_USER_PASSWORD in .env.local.',
    )
  }

  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  const emailInput = page.getByLabel('Email address')
  await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
  await emailInput.fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  // Sign-in + Firebase Auth round-trip + auth-router useEffect + push
  // can take a beat, especially on a cold dev server. 60s is the right
  // ceiling — anything longer indicates a real failure, not slowness.
  await page.waitForURL(AUTHENTICATED_URL, { timeout: 60_000 })
  await expect(page).toHaveURL(AUTHENTICATED_URL)

  await page.context().storageState({ path: AUTH_FILE })
})
