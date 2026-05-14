/**
 * Shared Playwright fixtures for the WPL UI battery.
 *
 * Every spec imports `test` from here instead of '@playwright/test'
 * so the suite gets:
 *   - Pinned viewport — set BEFORE the spec body runs, so the first
 *     screenshot/assertion already sees the right layout.
 *   - Common helpers as injected fixtures (patientId, gotoTab, etc).
 *
 * Add new fixtures here as the battery grows. Don't import these
 * from individual specs — share, don't fork.
 */

import { test as baseTest, expect, type Page } from '@playwright/test'
import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Initialize Admin SDK once per process so specs can verify
// Firestore state without going through the API. Using getApps()
// keeps the singleton safe across test workers.
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}
const adminDb = admin.firestore()

interface AppFixtures {
  /** The patient id every spec writes/reads against. */
  patientId: string
  /** The owner-user id for the test patient (UID, not email). */
  ownerUserId: string
  /** Navigate to the patient detail page on the named tab; resolve when the page header is rendered. */
  gotoPatientTab: (tab: string) => Promise<void>
  /** Wait for the patient detail page's loading skeleton to clear. */
  waitForPatientReady: () => Promise<void>
  /** Direct Firestore handle for asserting persistence (bypasses the API). */
  firestore: admin.firestore.Firestore
  /**
   * Substrings of console.error messages the test EXPECTS to fire (e.g.,
   * deliberate cap-gate 403s). Matching messages are filtered out of the
   * bug-monitor so the post-test teardown doesn't fail an asserted-OK test.
   * Override per-spec via `test.use({ expectedApiErrorCodes: ['FOO', 'BAR'] })`.
   */
  expectedApiErrorCodes: string[]
}

// Viewport + window size + position are pinned globally in
// playwright.config.ts (use.viewport + use.launchOptions.args).
// Don't reset them per-fixture — that fights the launch args
// and ends up resizing the window mid-suite.
export const test = baseTest.extend<AppFixtures>({
  expectedApiErrorCodes: [],

  // Wrap page with bug-monitoring listeners. Every test in the
  // battery automatically catches:
  //   - uncaught page exceptions (window.onerror)
  //   - 5xx HTTP responses (server errors)
  //   - failed network requests (other than expected aborts)
  //   - console.error calls (filtered for known dev-mode noise)
  // The test fails at teardown if any are recorded, so a passing
  // assertion path doesn't mask a backend regression.
  page: async ({ page, expectedApiErrorCodes }, use, testInfo) => {
    const pageErrors: Error[] = []
    const consoleErrors: string[] = []
    const httpErrors: Array<{ url: string; status: number }> = []

    page.on('pageerror', (err) => pageErrors.push(err))

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      // Filter known noise that isn't ours: hot-reload warnings,
      // 3rd-party telemetry blocked by ad-blockers, etc.
      if (
        text.includes('Failed to load resource') ||
        text.includes('Hot Module Replacement') ||
        text.includes('[Fast Refresh]') ||
        text.includes('Download the React DevTools')
      ) return
      // Per-spec opt-out: tests that intentionally trip API caps
      // (HOUSEHOLD_MEMBER_CAP, etc.) declare the codes so the cap
      // 403 is treated as expected, not as a regression.
      if (expectedApiErrorCodes.some((code) => text.includes(code))) return
      consoleErrors.push(text)
    })

    page.on('response', (response) => {
      const status = response.status()
      if (status >= 500 && status < 600) {
        httpErrors.push({ url: response.url(), status })
      }
    })

    await use(page)

    // Attach diagnostics to the test report so failures tell a
    // complete story. Don't throw if the test already failed —
    // the original error is more useful.
    const allBugs = [
      ...pageErrors.map((e) => `pageerror: ${e.message}`),
      ...consoleErrors.map((m) => `console.error: ${m}`),
      ...httpErrors.map((h) => `HTTP ${h.status}: ${h.url}`),
    ]
    if (allBugs.length > 0) {
      await testInfo.attach('bugs-detected.txt', {
        body: allBugs.join('\n'),
        contentType: 'text/plain',
      })
      if (testInfo.status === 'passed') {
        throw new Error(
          `Test asserted-OK but ${allBugs.length} bug(s) detected:\n  ${allBugs.join('\n  ')}`,
        )
      }
    }
  },

  patientId: async ({}, use) => {
    const id = process.env.E2E_TEST_PATIENT_ID
    if (!id) {
      throw new Error('E2E_TEST_PATIENT_ID must be set in .env.local. Run scripts/setup-e2e-test-account.ts.')
    }
    await use(id)
  },

  ownerUserId: async ({}, use) => {
    const email = process.env.E2E_TEST_USER_EMAIL
    if (!email) {
      throw new Error('E2E_TEST_USER_EMAIL must be set in .env.local.')
    }
    const user = await admin.auth().getUserByEmail(email)
    await use(user.uid)
  },

  firestore: async ({}, use) => {
    await use(adminDb)
  },

  gotoPatientTab: async ({ page, patientId }, use) => {
    const fn = async (tab: string) => {
      await page.goto(`/patients/${patientId}?tab=${tab}`, { waitUntil: 'domcontentloaded' })
      await waitForPatientReadyImpl(page)
    }
    await use(fn)
  },

  waitForPatientReady: async ({ page }, use) => {
    await use(() => waitForPatientReadyImpl(page))
  },
})

async function waitForPatientReadyImpl(page: Page) {
  // The patient page renders "Loading your health journey..." while
  // it pulls the profile + applicable vitals + dashboard data. Wait
  // for that to clear before doing anything else. Generous timeout
  // for Turbopack cold-compile.
  await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
  // Quick Actions sidebar header is the first reliable "the page is
  // hydrated" anchor — it's always visible regardless of which tab
  // is active.
  await expect(page.getByRole('heading', { name: 'Quick Actions', exact: true })).toBeVisible({
    timeout: 30_000,
  })
}

export { expect }
