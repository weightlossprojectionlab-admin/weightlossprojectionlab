/**
 * Auth setup — signs in once via the real /auth UI flow and saves
 * browser storage state for downstream tests to reuse.
 *
 * Why through the UI rather than calling Firebase Auth REST: the
 * app stores the user's session in IndexedDB via the Firebase
 * client SDK plus a server-side session cookie set by /api/auth/
 * callback routes. Reproducing both stores by hand would couple
 * the harness to internals that change. Signing in through the
 * page once gives us a faithful snapshot.
 */

import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'e2e/.auth/user.json'

setup('sign in', async ({ page }) => {
  const email = process.env.E2E_TEST_USER_EMAIL
  const password = process.env.E2E_TEST_USER_PASSWORD
  if (!email || !password) {
    throw new Error(
      'E2E_TEST_USER_EMAIL and E2E_TEST_USER_PASSWORD must be set in .env.local for the Playwright auth fixture.',
    )
  }

  await page.goto('/auth')

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()

  // Successful sign-in lands on /dashboard, /patients, /onboarding,
  // or /caregiver/<id> depending on account state. Wait for any of
  // those rather than locking to one route.
  await page.waitForURL(/\/(dashboard|patients|onboarding|caregiver)\b/, { timeout: 30_000 })
  await expect(page).toHaveURL(/\/(dashboard|patients|onboarding|caregiver)\b/)

  await page.context().storageState({ path: AUTH_FILE })
})
