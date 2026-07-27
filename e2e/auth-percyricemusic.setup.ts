/**
 * Auth setup for percyricemusic@gmail.com used by the headed inbox demo.
 *
 * percyricemusic is normally Google-only. For an automated headed run we set a
 * TEMPORARY password via the Admin SDK and sign in with it here (E2E_PMUSIC_*),
 * so no human OAuth is needed. If those env vars are absent, falls back to a
 * manual Google sign-in in the headed window. Storage → percyricemusic.json.
 */

import { test as setup, expect } from '@playwright/test'
import { existsSync, statSync } from 'fs'

const AUTH_FILE = 'e2e/.auth/percyricemusic.json'
const AUTH_TTL_DAYS = 7
const AUTHENTICATED_URL = /\/(dashboard|patients|onboarding|caregiver)\b/

function authStateIsFresh(): boolean {
  if (process.env.FORCE_AUTH === '1') return false
  if (!existsSync(AUTH_FILE)) return false
  const ageMs = Date.now() - statSync(AUTH_FILE).mtimeMs
  return ageMs < AUTH_TTL_DAYS * 24 * 60 * 60 * 1000
}

setup('sign in percyricemusic', async ({ page }) => {
  if (authStateIsFresh()) {
    console.log('[auth-percyricemusic] Reusing recent storage state — skipping sign-in.')
    return
  }

  setup.setTimeout(6 * 60_000)
  await page.goto('/auth', { waitUntil: 'domcontentloaded' })

  const email = process.env.E2E_PMUSIC_EMAIL
  const password = process.env.E2E_PMUSIC_PASSWORD

  if (email && password) {
    // Automated password sign-in (temp password set by the run script).
    const emailInput = page.getByLabel('Email address')
    await emailInput.waitFor({ state: 'visible', timeout: 90_000 })
    // /auth defaults to sign-up — switch to sign-in if needed.
    if (await page.getByRole('button', { name: 'Create account', exact: true }).isVisible().catch(() => false)) {
      await page.getByRole('button', { name: /Switch to sign in/i }).click()
      await page.getByRole('button', { name: 'Sign in', exact: true }).waitFor({ state: 'visible', timeout: 15_000 })
    }
    await emailInput.fill(email)
    await page.getByLabel('Password', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  } else {
    console.log(
      '\n[auth-percyricemusic] Manual mode — sign in with Google as percyricemusic@gmail.com in the open window.\n',
    )
  }

  await page.waitForURL(AUTHENTICATED_URL, { timeout: 5 * 60_000 })
  await expect(page).toHaveURL(AUTHENTICATED_URL)
  await page.context().storageState({ path: AUTH_FILE })
})
