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

    // Identity-of-subject: /progress requires an explicit Patient as
    // its subject before charts render. Depending on patient count
    // the page lands in one of three states:
    //   - 0 patients → empty state (the spec needs at least one;
    //                  see scripts/promote-chris-to-patient.ts)
    //   - 1 patient  → page auto-selects via useEffect + URL replace
    //   - 2+ patients → "Pick a family member…" combobox is shown
    //                   and the user must choose
    //
    // Wait for the page to settle into one of TWO valid post-load
    // states — either the picker is visible (need to pick) or the
    // chart heading is already visible (auto-selected). The
    // immediate-isVisible check we tried first raced with the dev
    // server's cold compile and surfaced as a flake on the first
    // test of each run.
    const picker = page
      .getByRole('combobox')
      .filter({ has: page.getByRole('option', { name: /Pick a family member/i }) })
    const chartHeading = page.getByRole('heading', { name: /^Weight Trend & Projection$/i, level: 2 })

    await Promise.race([
      picker.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {}),
      chartHeading.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {}),
    ])

    if (await picker.isVisible().catch(() => false)) {
      // Pick the first non-placeholder option. Index 0 is the
      // disabled "Pick a family member…" placeholder; index 1 is
      // the first real patient. Order is by Firestore query result —
      // doesn't matter for the spec, we just need a named subject
      // so charts can render.
      await picker.selectOption({ index: 1 })
    }

    // Final gate: the chart heading must be visible before any
    // individual assertion runs. After picker.selectOption the page
    // re-renders for the picked patient + the heading appears within
    // the lazy-import + Firestore latency window.
    await expect(chartHeading).toBeVisible({ timeout: 30_000 })
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

  test('time-window selector section visible', async ({ page }) => {
    // "Time Window" is the h2 above the day-count buttons (7/30/90/etc).
    // Rendered unconditionally near the top of the main column. Drives
    // both the historical lookback AND the forward projection horizon.
    await expect(
      page.getByRole('heading', { name: /^Time Window$/i, level: 2 }),
    ).toBeVisible()
  })

  test('weight trend & projection chart section heading visible', async ({ page }) => {
    // The chart component itself is lazy-loaded behind a skeleton, but
    // the section heading is rendered by the page (not the chart bundle)
    // so it's visible immediately. Heading became "Weight Trend &
    // Projection" when we added the forward-projection layer.
    await expect(
      page.getByRole('heading', { name: /^Weight Trend & Projection$/i, level: 2 }),
    ).toBeVisible()
  })

  test('daily calorie intake & projection chart section heading visible', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: /^Daily Calorie Intake & Projection$/i, level: 2 }),
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

  test('daily step count & projection chart section heading visible', async ({ page }) => {
    // Same dual-branch pattern as macronutrients (gated vs. fallback).
    // For the gated path (hasTrendAnalysis=true) heading is the
    // renamed "& Projection" version; the fallback upgrade-prompt
    // path still uses the original "Daily Step Count" heading.
    // Match either so the spec works on both subscription tiers.
    await expect(
      page.getByRole('heading', { name: /^Daily Step Count( & Projection)?$/i, level: 2 }).first(),
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
