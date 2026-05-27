import { test, expect } from '@playwright/test'

/**
 * Visual demo: navigate to /progress for Percy's patient and assert
 * the projection rendering at human pace, leaving the browser open
 * at the end for manual inspection.
 *
 * Companion to scripts/seed-percy-weight-trend.ts which seeds 35
 * days of weight log data first. With that data:
 *   - Banner-vs-main mutex: banner must be hidden, chart visible.
 *   - Projection legend ("Projected (if trend continues)") must
 *     appear, confirming the dashed forward line is drawn.
 *
 * Run with:
 *   npx playwright test e2e/projection-visual-demo.spec.ts --headed
 *
 * The test ends with a 10-minute wait so the browser stays open
 * for visual review. Ctrl-C in the terminal to stop early.
 */

const PERCY_PATIENT_ID = 'Qhp2iCGuD0Vpzh8HOKy0'

// Slow each action down so the run is watchable. Headed mode is set
// via CLI (`--headed`); slowMo here adds a pause between actions.
test.use({ launchOptions: { slowMo: 400 } })

test('projection chart renders with seeded 35-day history', async ({ page }) => {
  // Give the dev server a generous compile budget for the first
  // request — Turbopack first-load can be 20-30s on a cold start.
  test.setTimeout(180_000)

  console.log('→ navigating to /progress for Percy')
  await page.goto(`/progress?patientId=${PERCY_PATIENT_ID}`)

  // Wait for the chart heading — that's the "page rendered" signal
  // beforeEach in progress-page.spec.ts also uses.
  const chartHeading = page.getByRole('heading', {
    name: /^Weight Trend & Projection$/i,
    level: 2,
  })
  console.log('→ waiting for Weight Trend chart heading')
  await expect(chartHeading).toBeVisible({ timeout: 60_000 })

  // INVARIANT 1: banner-vs-main mutex.
  // When the chart heading is visible, "Needs to Complete Onboarding"
  // MUST be hidden. Both hidden = blank-page regression.
  console.log('→ asserting onboarding banner is hidden (mutex)')
  await expect(
    page.getByRole('heading', { name: /Needs to Complete Onboarding/i, level: 3 }),
  ).toBeHidden()

  // INVARIANT 2: forward projection dashed line exists.
  // The WeightTrendChart renders the projection legend literal
  // "Projected (if trend continues)" iff hasProjection is true.
  console.log('→ asserting forward projection legend visible')
  await expect(page.getByText(/Projected \(if trend continues\)/i)).toBeVisible({
    timeout: 30_000,
  })

  // INVARIANT 3: weight-goal ETA chip carries a known status.
  // Already covered by progress-page.spec.ts; re-asserted here so a
  // demo viewer sees the chip state inline.
  const chip = page.getByTestId('weight-goal-eta')
  await expect(chip).toBeVisible()
  const status = await chip.getAttribute('data-status')
  console.log(`→ weight-goal ETA status = "${status}"`)
  expect(['achieved', 'on-pace', 'slipping', 'off-track']).toContain(status)

  // Scroll through the page slowly so the viewer can see each
  // section render. The progress page is long — these scrolls
  // surface the macronutrient + step + AI sections.
  console.log('→ scrolling page for visual review')
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }))
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollBy({ top: 600, behavior: 'smooth' }))
  await page.waitForTimeout(2000)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await page.waitForTimeout(2000)

  // Leave the browser open for inspection. 10 minutes is enough to
  // hover the chart, tweak the time-window selector, etc. Ctrl-C in
  // the terminal to stop sooner.
  console.log('→ ASSERTIONS PASSED — leaving browser open for 10 minutes for inspection')
  console.log('   (Ctrl-C in the terminal to stop sooner)')
  await page.waitForTimeout(600_000)
})
