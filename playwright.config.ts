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
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    ignoreHTTPSErrors: true, // dev server uses self-signed cert
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
})
