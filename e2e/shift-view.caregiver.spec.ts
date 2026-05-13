import { test, expect } from '@playwright/test'

/**
 * Caregiver-side Today (shift) view — UI smoke.
 *
 * Runs under the chromium-caregiver Playwright project (signs in as
 * percyrice@gmail.com via auth-caregiver.setup.ts, which writes
 * e2e/.auth/caregiver.json). The caregiver has caregiver access to
 * two owners — Weight Loss Project and Percy Rice — and should see
 * each one as its own section on /caregiver/[ownerId]/shift.
 *
 * Doesn't import e2e/fixtures.ts because that fixture's `ownerUserId`
 * is keyed off E2E_TEST_USER_EMAIL (the owner). Caregiver specs
 * use the standard Playwright `test` import.
 */

// Weight Loss Project owner's UID. Stable across this dataset; the
// caregiver has access to it via caregiverOf.
const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

test.beforeEach(async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })
})

test('caregiver lands on the Today view with the Beta strip + page title', async ({ page }) => {
  // The amber beta strip is the most stable top-of-page anchor.
  await expect(page.getByText('Beta — Today', { exact: false })).toBeVisible({ timeout: 30_000 })

  // Page title.
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible()

  // Subtitle that explains the multi-household framing.
  await expect(
    page.getByText("What's due across every household you help.", { exact: false }),
  ).toBeVisible()
})

test('worklist renders both households as separate sections', async ({ page }) => {
  // Two known caregiver relationships for percyrice → two group headers.
  // Heading copy is "{ownerName}'s Family" — Weight Loss Project is
  // resolved via the display-name endpoint's Auth fallback (Firestore
  // top-level name unset).
  await expect(
    page.getByRole('heading', { name: /Weight Loss Project's Family/i }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(
    page.getByRole('heading', { name: /Percy Rice's Family/i }),
  ).toBeVisible()
})

test('each household section renders at least one worklist card + a Care log composer', async ({ page }) => {
  // Don't hardcode specific patient names — the worklist suppresses
  // check_in cards when real duties exist for a household, so the
  // visible items shift as the owner assigns/completes duties. What
  // MUST always hold: every household section has at least one card
  // (a duty OR a check_in) and its own care-log composer.
  const sections = page.locator('section[data-testid^="shift-group-"]')
  await expect(sections.first()).toBeVisible({ timeout: 30_000 })
  const sectionCount = await sections.count()
  expect(sectionCount).toBeGreaterThanOrEqual(2)

  for (let i = 0; i < sectionCount; i++) {
    const section = sections.nth(i)
    // At least one worklist item (duty or check_in).
    const items = section.locator('[data-testid^="shift-item-"]')
    expect(await items.count()).toBeGreaterThanOrEqual(1)
    // The household's care-log composer is here too.
    const composer = section.locator('[data-testid^="handoff-composer-input-"]')
    await expect(composer).toBeVisible()
  }

  // Percy Rice's household has 1 patient and (currently) no duties,
  // so its check_in card surfaces the real patient name. Pin that as
  // a regression check — if the visible-name rename breaks, we'd lose
  // this string.
  await expect(page.getByText('E2E Test Patient', { exact: false }).first()).toBeVisible()
})

test('caregiver can post to the Care log and see it appear in the feed', async ({ page }) => {
  const stamp = `caregiver ui probe ${Date.now()}`
  const composer = page.getByPlaceholder(/Share what's happening with Weight Loss Project's family care/i)
  await composer.waitFor({ state: 'visible', timeout: 30_000 })
  await composer.fill(stamp)

  // The post button is "Add to log" after the rename. There are two on
  // the page (one per household); locate the one nearest to the composer
  // we just filled by chaining locator scoping.
  await page
    .getByTestId(`handoff-notes-${OWNER_UID}`)
    .getByRole('button', { name: /Add to log/i })
    .click()

  // Hook does a refetch-after-post AND a real-time listener subscribes
  // to the notification stream — either path puts the new note in the
  // DOM. Generous timeout for cold compile.
  await expect(page.getByText(stamp, { exact: false })).toBeVisible({ timeout: 30_000 })
})
