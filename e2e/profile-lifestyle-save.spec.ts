import { test, expect, type ConsoleMessage, type Page } from '@playwright/test'

/**
 * Regression guard for the Lifestyle Factors save flow on /profile.
 *
 * Why a dedicated spec:
 *   The original profile-page.spec.ts is a render battery — it asserts
 *   that sections appear but never exercises a write path. A save flow
 *   that 400s at the network layer is invisible to a render test:
 *   the page still renders, the toast still flashes, and only
 *   `console.error` reveals the failure. This spec captures that
 *   missing signal.
 *
 * What this catches:
 *   - The Phase-1 regression where /api/patients/[id] PUT rejected the
 *     spread of profileData (Timestamp objects on createdAt/etc. failed
 *     `z.string().datetime()`). Fix landed by sending only the diffed
 *     updates instead of the merged document.
 *   - Future schema drift (e.g. adding a required field server-side
 *     that the editor doesn't supply).
 *   - Future regression where the editor stops surfacing for some
 *     subset of users (the prior `hasFeature('health_medical')` gate).
 *
 * What this does NOT assert:
 *   - The persisted value round-trips correctly. That's a server-side
 *     contract test, not a UI spec. The "no console errors after Save"
 *     + "success toast" pair is sufficient to catch the validation
 *     class of bug this spec exists for.
 */

const SUCCESS_TOAST = /health profile updated successfully/i
const PATIENT_PUT_RE = /\/api\/patients\/[^/?]+(\?.*)?$/

/**
 * Console messages that are routine noise from the dev server and
 * Firebase SDK — must not fail the test. Filtered conservatively:
 * each entry needs a clear reason it's never the bug we care about.
 */
const BENIGN_CONSOLE_PATTERNS: RegExp[] = [
  // Next.js + React dev-mode strict-mode double-invocation warnings.
  /Warning: ReactDOM/i,
  /Download the React DevTools/i,
  // Firebase auth heartbeat — fires on every page nav in dev.
  /\[Firebase\]/i,
  // Vercel Speed Insights probe — not relevant to feature behavior.
  /\[Vercel Speed Insights\]/i,
  // The logger.ts pipeline pushes structured DEBUG/INFO through
  // console.log — not console.error — so its lines should never
  // reach the error collector. Belt-and-suspenders pattern in case
  // a logger level is mis-routed.
  /\[DEBUG\]|\[INFO\]/,
]

function isBenign(msg: ConsoleMessage) {
  const text = msg.text()
  return BENIGN_CONSOLE_PATTERNS.some((re) => re.test(text))
}

async function gotoProfile(page: Page) {
  await page.goto('/profile')
  await expect(
    page.getByText('Currently Viewing', { exact: false }),
  ).toBeVisible({ timeout: 60_000 })
  await page
    .getByText(/Loading family members/i)
    .waitFor({ state: 'detached', timeout: 30_000 })
    .catch(() => {})
}

test.describe('/profile — Lifestyle Factors save', () => {
  test('Save Lifestyle Information persists without 400 / console errors', async ({ page }) => {
    // Collect ANY console.error or pageerror across the whole test. The
    // assertion runs after the success-toast gate so we catch errors
    // logged during the save round-trip itself.
    const consoleErrors: string[] = []
    const pageErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !isBenign(msg)) {
        consoleErrors.push(msg.text())
      }
    })
    page.on('pageerror', (err) => {
      pageErrors.push(err.message)
    })

    // Network-level collector — catches the actual 400 even if the
    // client swallows it before logging. PUT to /api/patients/[id] is
    // the load-bearing call; if it fails, the editor is broken.
    const failedPatientPuts: { url: string; status: number }[] = []
    page.on('response', (resp) => {
      const req = resp.request()
      if (req.method() !== 'PUT') return
      if (!PATIENT_PUT_RE.test(resp.url())) return
      if (resp.status() >= 400) {
        failedPatientPuts.push({ url: resp.url(), status: resp.status() })
      }
    })

    await gotoProfile(page)

    // Expand the Lifestyle Factors collapsible. The accordion buttons
    // share a layout pattern — the section heading lives inside the
    // button as a sibling of the chevron icon. Click the heading's
    // ancestor button to toggle the section open.
    const lifestyleHeading = page.getByRole('heading', {
      name: 'Lifestyle Factors',
      level: 3,
    })
    await expect(lifestyleHeading).toBeVisible({ timeout: 30_000 })
    await lifestyleHeading.click()

    // After expansion, the "Smoking Status" label appears. Use it as
    // the gate — the section's content is rendered lazily after the
    // open animation in some browsers.
    await expect(page.getByText('Smoking Status')).toBeVisible({ timeout: 10_000 })

    // Pick a value other than the default "Not specified" so the save
    // path actually mutates state. "Never Smoked" is the safest choice
    // because it (a) is a stable button label, (b) maps to the most
    // permissive analytics state in progress-analytics.ts (no warning
    // generated), and (c) is the canonical "user-said-no" answer the
    // tri-state added in Phase 1 differentiates from 'unknown'.
    const neverSmokedBtn = page.getByRole('button', { name: /^Never Smoked$/ })
    await expect(neverSmokedBtn).toBeVisible()
    await neverSmokedBtn.click()

    // Click Save. The button label flips to "Saving…" during the
    // round-trip and back to its original text on success/failure.
    const saveBtn = page.getByRole('button', { name: /Save Lifestyle Information/ })
    await expect(saveBtn).toBeVisible()
    await saveBtn.click()

    // Success toast is the user-visible signal that the round-trip
    // succeeded. react-hot-toast renders into a portal at the document
    // root, so `getByText` reaches it regardless of where the trigger
    // lives in the tree. The toast disappears on its own after ~4s, so
    // we assert on its appearance, not its duration.
    await expect(page.getByText(SUCCESS_TOAST)).toBeVisible({ timeout: 15_000 })

    // The actual regression assertion. Even with a toast showing, if
    // the request 400'd we'd see a logged console.error. Without this
    // gate, the Phase-1 bug would have silently passed a render-only
    // smoke test.
    expect(
      failedPatientPuts,
      `unexpected non-2xx PUT to /api/patients: ${JSON.stringify(failedPatientPuts)}`,
    ).toEqual([])
    expect(
      consoleErrors,
      `unexpected console.error during save:\n${consoleErrors.join('\n')}`,
    ).toEqual([])
    expect(
      pageErrors,
      `uncaught page error during save:\n${pageErrors.join('\n')}`,
    ).toEqual([])
  })
})
