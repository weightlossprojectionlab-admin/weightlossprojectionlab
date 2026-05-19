/**
 * Auth setup — captures a browser storage state for tests to reuse.
 *
 * Two modes, picked by env var E2E_AUTH_MODE:
 *
 *   "password" (default if E2E_TEST_USER_EMAIL is set)
 *     Fully automated. Fills the /auth form with email + password
 *     from env. Use this when you have a dedicated test account.
 *
 *   "manual" (default otherwise)
 *     Headed-browser one-time sign-in. Playwright opens a window,
 *     navigates to /auth, then pauses. Click "Sign in with Google"
 *     and complete the OAuth flow yourself. When the URL lands on
 *     an authenticated route, the fixture saves storage state and
 *     exits. Subsequent test runs reuse the saved state until
 *     Firebase refresh-token expiry (~30 days), at which point
 *     this setup runs again.
 *
 * Storage state lands at e2e/.auth/user.json (gitignored).
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/user.json'

// Skip setup if storage state already exists and is recent. Firebase
// refresh tokens are valid for ~30 days but we re-auth weekly to be
// safe — also catches sign-out / password-rotation drift early. Set
// FORCE_AUTH=1 to bypass and re-sign-in.
const AUTH_TTL_DAYS = 7

function authStateIsFresh(): boolean {
  if (process.env.FORCE_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

const MODE: 'password' | 'manual' =
  process.env.E2E_AUTH_MODE === 'password'
    ? 'password'
    : process.env.E2E_AUTH_MODE === 'manual'
      ? 'manual'
      : process.env.E2E_TEST_USER_EMAIL
        ? 'password'
        : 'manual'

const AUTHENTICATED_URL = /\/(dashboard|patients|onboarding|caregiver)\b/

setup('sign in', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth.setup] Reusing recent storage state — skipping sign-in.')
    return
  }

  // Both modes get extended timeouts: manual for the human OAuth
  // round-trip, password to absorb Turbopack's first-compile cost
  // on the dev server (cold /auth render can take 30-60s).
  setup.setTimeout(MODE === 'manual' ? 6 * 60_000 : 2 * 60_000)

  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  if (MODE === 'password') {
    const email = process.env.E2E_TEST_USER_EMAIL
    const password = process.env.E2E_TEST_USER_PASSWORD
    if (!email || !password) {
      throw new Error(
        'E2E_AUTH_MODE=password requires E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD in .env.local.',
      )
    }
    // Wait for the form to render — the page shows "Loading..." while
    // Firebase determines auth state.
    const emailInput = page.getByLabel('Email address')
    await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
    await emailInput.fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  } else {
    // Manual mode: leave the page open and wait for the user to
    // complete the Google OAuth flow themselves. Five-minute window
    // is plenty for a human; if it elapses something is stuck.
    console.log(
      '\n[auth.setup] Manual mode — please sign in with Google in the open browser window.\n' +
        '             Playwright will detect the authenticated redirect and save storage state automatically.\n',
    )
  }

  // 30s is enough on a warm dev server but the destination route
  // (/dashboard etc.) cold-compiles on first hit after a server
  // restart — observed 60s+ for /auth itself, similar for /dashboard.
  // Manual mode keeps 5 min for the OAuth human round-trip; password
  // mode gets 2 min to absorb cold-compile cost.
  await page.waitForURL(AUTHENTICATED_URL, { timeout: MODE === 'manual' ? 5 * 60_000 : 2 * 60_000 })
  await expect(page).toHaveURL(AUTHENTICATED_URL)

  await page.context().storageState({ path: AUTH_FILE })
})
