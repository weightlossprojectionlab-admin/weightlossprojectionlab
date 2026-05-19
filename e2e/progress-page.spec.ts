import { test, expect } from '@playwright/test'

/**
 * Render battery for /progress.
 *
 * NOT a workflow test — the workflow path (add weight → see projection)
 * is covered by weight-tracking.spec.ts. This spec asserts the
 * page's stable visual primitives so a refactor that drops a chart
 * section, breaks the time-range selector, or removes the help/share
 * affordances fails immediately rather than after a user reports it.
 *
 * Assertions are deliberately data-independent: nothing here asserts
 * a particular weight value, calorie count, or step total — those
 * depend on the test user's logged data which changes between runs.
 * We assert the structural surfaces (headings, buttons) that exist
 * regardless of the user's tracking history.
 *
 * Chart components are dynamically imported with `ssr: false` and a
 * skeleton fallback — each chart's heading lives in the parent page
 * (not the chart component), so the heading renders immediately even
 * while the chart bundle is still loading. That's the right thing to
 * assert: the page committed to showing the section.
 */
test.describe('/progress — render battery', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/progress')
    // The page renders the header immediately but gates the chart
    // sections behind `{!loading && ...}` while it subscribes to
    // Firestore for weight + meal data. Wait for the first chart's
    // section heading to appear before each assertion so the rest
    // can use the default 5s timeout reliably. 30s absorbs cold
    // Firestore + lazy-import latency on a dev server.
    await expect(
      page.getByRole('heading', { name: /^Weight Trend$/i, level: 2 }),
    ).toBeVisible({ timeout: 30_000 })
  })

  test('page header — title + share button + help affordance', async ({ page }) => {
    // Title varies by mode (single-user vs family vs patient-scoped) but
    // all variants contain the word "Progress" — match the union with a
    // single regex.
    await expect(
      page.getByRole('heading', { name: /Progress/, level: 1 }).first(),
    ).toBeVisible()

    // ShareButton renders a button labeled "Share" — present in the
    // header actions regardless of data state.
    await expect(page.getByRole('button', { name: /^Share/i }).first()).toBeVisible()
  })

  test('time-range selector section visible', async ({ page }) => {
    // "Time Range" is the h2 above the day-count buttons (7/30/90/etc).
    // Rendered unconditionally near the top of the main column.
    await expect(
      page.getByRole('heading', { name: /^Time Range$/i, level: 2 }),
    ).toBeVisible()
  })

  test('weight trend chart section heading visible', async ({ page }) => {
    // The chart component itself is lazy-loaded behind a skeleton, but
    // the section heading is rendered by the page (not the chart bundle)
    // so it's visible immediately.
    await expect(
      page.getByRole('heading', { name: /^Weight Trend$/i, level: 2 }),
    ).toBeVisible()
  })

  test('daily calorie intake chart section heading visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /^Daily Calorie Intake$/i, level: 2 }),
    ).toBeVisible()
  })

  test('macronutrient distribution chart section heading visible', async ({ page }) => {
    // The page renders this heading in two branches (one for premium
    // users, one for the upgrade-prompt fallback). Either is fine —
    // assert the heading exists somewhere on the page.
    await expect(
      page.getByRole('heading', { name: /^Macronutrient Distribution$/i, level: 2 }).first(),
    ).toBeVisible()
  })

  test('daily step count chart section heading visible', async ({ page }) => {
    // Same dual-branch pattern as macronutrients (gated vs. fallback).
    await expect(
      page.getByRole('heading', { name: /^Daily Step Count$/i, level: 2 }).first(),
    ).toBeVisible()
  })

  test('AI recommendations section heading visible', async ({ page }) => {
    // The section renders one of two headings depending on subscription
    // tier: paid users get the RecommendationsSection component
    // ("AI Appointment Recommendations"); free users get an upgrade
    // prompt with heading "AI Health Recommendations". Match either so
    // the spec doesn't false-fail when the test user's subscription
    // tier changes.
    await expect(
      page
        .getByRole('heading', { name: /AI\s+(Appointment|Health)\s+Recommendations/i, level: 2 })
        .first(),
    ).toBeVisible()
  })
})
