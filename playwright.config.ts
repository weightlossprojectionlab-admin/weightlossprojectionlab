/**
 * Playwright config for WPL end-to-end tests.
 *
 * Two projects:
 *   - "setup" runs auth.setup.ts once and writes browser storage
 *     state (Firebase IndexedDB + cookies) to e2e/.auth/user.json.
 *   - "chromium" depends on "setup" and reuses that storage state
 *     so every test starts already-signed-in. Sign-in via the UI
 *     is slow (~3-5s) and re-doing it per test would balloon the
 *     suite.
 *
 * Required env vars (typically in .env.local):
 *   E2E_BASE_URL              default: https://localhost:3003
 *   E2E_TEST_USER_EMAIL       account the auth fixture signs in as
 *   E2E_TEST_USER_PASSWORD    that account's password
 *
 * The dev server must be running before tests start (npm run dev).
 * We don't auto-launch it via the webServer option because the
 * project's dev server binds to HTTPS on a custom cert and takes
 * 30+ seconds to compile pages on first request — letting the
 * harness manage that lifecycle costs more than it saves.
 */

import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const baseURL = process.env.E2E_BASE_URL ?? 'https://localhost:3003'

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/node_modules/**'],
  fullyParallel: false, // shared user account — serial keeps writes isolated
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  // Per-test timeout — 2 minutes so Turbopack's first-compile cost
  // on a fresh dev server doesn't fail the test on a cold start.
  timeout: 2 * 60_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: true, // dev server uses self-signed cert
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Watch the suite run by default. Set HEADLESS=1 to flip back.
    headless: process.env.HEADLESS === '1',
    // Slow-motion lets a human watch each action. SLOWMO_MS=0 turns
    // it off (e.g. for CI).
    launchOptions: {
      slowMo: process.env.SLOWMO_MS ? parseInt(process.env.SLOWMO_MS, 10) : 1500,
      // Fixed window position + size so the human watching the run
      // doesn't have to chase a randomly-placed browser window.
      // Pinned to the left half of a 1080p screen so VS Code can
      // own the right half.
      args: ['--window-position=0,0', '--window-size=960,1040'],
    },
    viewport: { width: 960, height: 940 },
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
      // Setup runs headed so the user can complete Google OAuth
      // (or any non-automated auth flow) themselves once. The saved
      // storage state is reused by the chromium project after.
      use: { headless: false },
    },
    {
      // Secondary auth setup for the caregiver-side fixture user.
      // Headless + zero slowMo so it survives the cold-compile of
      // /auth on a fresh dev server without hitting the 2-min cap.
      // (auth.setup.ts is headed because Google OAuth fallback needs
      // a human; this one is pure password — no human needed.)
      name: 'setup-caregiver',
      testMatch: /auth-caregiver\.setup\.ts/,
      use: { headless: true, launchOptions: { slowMo: 0 } },
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
        // Override the viewport that Desktop Chrome sets (1280x720)
        // so it matches the launch args' window size. Otherwise the
        // outer window resizes mid-launch and the human watching
        // sees the browser jump.
        viewport: { width: 960, height: 940 },
      },
      dependencies: ['setup'],
      // Don't pick up either auth setup file in the regular run. Don't
      // pick up caregiver-side specs either — those use a different
      // storage state and run under the chromium-caregiver project.
      testIgnore: [/auth\.setup\.ts/, /auth-caregiver\.setup\.ts/, /\.caregiver\.spec\.ts$/],
    },
    {
      // Caregiver-side specs use the percyrice fixture. Pattern: name
      // the spec *.caregiver.spec.ts and it runs under this project.
      name: 'chromium-caregiver',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/caregiver.json',
        viewport: { width: 960, height: 940 },
      },
      dependencies: ['setup-caregiver'],
      testMatch: /\.caregiver\.spec\.ts$/,
    },
  ],
})
