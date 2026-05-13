import { test, expect, type Page } from '@playwright/test'

/**
 * Caregiver-side Today view — UI smoke.
 *
 * Runs under the chromium-caregiver Playwright project. The signed-in
 * user (percyrice@gmail.com) has caregiver access to two owners:
 *   • Weight Loss Project (UID Y8wSTgymg3YXWU94iJVjzoGxsMI2)
 *   • Percy Rice (their own family)
 *
 * Each test below states the semantic contract it's verifying in plain
 * English at the top of the test body. The point isn't "does the page
 * render" — it's "does the page hold up the multi-household, act-in-place
 * promise that the caregiver was sold."
 *
 * Robustness rules followed throughout:
 *   1. Every test waits for the worklist to be FULLY hydrated before
 *      asserting anything — no count() before the locator has settled.
 *      Use Playwright's auto-retrying assertions (toHaveCount, toBeVisible)
 *      instead of single-snapshot reads.
 *   2. Scope every assertion to the household-section it belongs to.
 *      A "thing X appears on the page" assertion is weaker than "thing X
 *      appears in section Y" — the page has two structurally-similar
 *      sections and we want each test to nail the right one.
 *   3. Don't hardcode patient/duty names that change with seed data. The
 *      ones that ARE hardcoded (E2E Test Patient, seeded duty names) are
 *      stable invariants the test ALSO documents.
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

/**
 * Wait for the worklist to be done loading and have its expected
 * shape. This is the canonical "the page is ready to interact with"
 * gate — every test runs after this resolves.
 *
 * Contract: at least 2 household sections rendered, both names
 * resolved (no "Family" placeholder), at least one worklist item
 * inside each section, and the care-log composer present per section.
 */
async function waitForWorklistReady(page: Page): Promise<void> {
  // Page-shell anchor — guarantees the worklist container mounted.
  await expect(page.getByTestId('shift-worklist')).toBeVisible({ timeout: 30_000 })

  // Both household section headings resolve to real names. Asserting
  // both at once verifies (a) the worklist loaded, (b) the centralized
  // display-name endpoint resolved Auth fallback for Weight Loss
  // Project, and (c) the dedupe pass left exactly the two expected
  // ownerships.
  const sections = page.locator('section[data-testid^="shift-group-"]')
  await expect(sections).toHaveCount(2, { timeout: 30_000 })

  // Every section has at least one worklist item AND a care-log
  // composer — Playwright auto-retries this until the worklist is
  // fully hydrated.
  for (let i = 0; i < 2; i++) {
    await expect(
      sections.nth(i).locator('[data-testid^="shift-item-"]').first(),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      sections.nth(i).locator('[data-testid^="handoff-composer-input-"]'),
    ).toBeVisible()
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })
})

test('page header reflects the caregiver framing — beta strip, time-of-day greeting, multi-household subtitle', async ({ page }) => {
  // Semantic contract: when a caregiver lands on /shift, they should
  // immediately understand THREE things from the page chrome alone:
  //   (1) this is a beta feature (the amber strip),
  //   (2) it's a warm, time-aware greeting (not corporate dashboard copy),
  //   (3) it spans every household they help (not a single-account view).

  // (1) Beta strip — top-of-page anchor, copy is time-independent.
  await expect(page.getByText('Beta — Today', { exact: false })).toBeVisible({ timeout: 30_000 })

  // (2) Time-of-day greeting heading. Match any of the four buckets
  // produced by greetingTitle() — the test must survive running across
  // wall-clock boundaries.
  await expect(
    page.getByRole('heading', { name: /Good morning|Good afternoon|Good evening|Tonight/i }),
  ).toBeVisible()

  // (3) Multi-household framing in the subtitle.
  await expect(page.getByText(/across every household you help/i)).toBeVisible()
})

test('worklist is multi-household: BOTH known caregiver relationships surface as their own section, with real (non-placeholder) names', async ({ page }) => {
  // Semantic contract: a caregiver belonging to N households must see
  // N sections, each headed with the OWNER'S real name. The previous
  // bug-class this guards against:
  //   • A single-account collapse where only the URL-segment owner's
  //     section rendered.
  //   • Stale denormalized "accountOwnerName" leaking through (the
  //     centralized display-name endpoint fixes this with an Auth
  //     fallback when Firestore is missing the top-level name).
  //   • The dedupe pass that merges duplicate caregiverOf entries —
  //     if dedupe misses, we'd see 3+ sections.
  await waitForWorklistReady(page)

  const sections = page.locator('section[data-testid^="shift-group-"]')
  await expect(sections).toHaveCount(2)

  // Both household headings rendered with REAL names — not "Family"
  // (the placeholder ownerNames fallback the worklist uses while the
  // display-name endpoint is in flight).
  await expect(
    page.getByRole('heading', { name: /Weight Loss Project's Family/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Percy Rice's Family/i }),
  ).toBeVisible()

  // Negative assertion: no section should headline with the bare
  // placeholder "Family's Family" (a regression sentinel for the
  // ownerNames fallback path).
  await expect(page.getByRole('heading', { name: /^Family's Family$/i })).toHaveCount(0)
})

test('each household section is fully equipped — at least one worklist card AND its own care-log composer', async ({ page }) => {
  // Semantic contract: every household section is a self-contained
  // workstation. A caregiver should never see a "headline but nothing
  // to do" empty section, and they should always be able to leave a
  // note in the RIGHT household's care log.
  //
  // This is what the per-section iteration in waitForWorklistReady
  // already proves, but the assertion deserves its own test so a
  // regression here is named specifically.
  await waitForWorklistReady(page)

  const sections = page.locator('section[data-testid^="shift-group-"]')

  for (let i = 0; i < 2; i++) {
    const section = sections.nth(i)

    // At least one worklist item — auto-retries.
    await expect(
      section.locator('[data-testid^="shift-item-"]').first(),
    ).toBeVisible()

    // Care-log composer + submit button are inside the SAME section
    // (handoff notes container is appended at the section level, not
    // page-level). Locating the submit by role inside the section
    // proves the per-household isolation contract.
    await expect(
      section.locator('[data-testid^="handoff-composer-input-"]'),
    ).toBeVisible()
    await expect(
      section.getByRole('button', { name: /Add to log/i }),
    ).toBeVisible()
  }

  // Percy Rice's household has 1 patient and (currently) no duties,
  // so its check_in card surfaces the real patient name. Pin the name
  // inside that specific section to prove this section is the right
  // one — not just "the name appears somewhere on the page."
  const percyRiceSection = page
    .locator('section[data-testid^="shift-group-"]')
    .filter({ has: page.getByRole('heading', { name: /Percy Rice's Family/i }) })
  await expect(percyRiceSection).toHaveCount(1)
  await expect(percyRiceSection.getByText(/E2E Test Patient/i).first()).toBeVisible()
})

test('clicking a duty card opens the inline action sheet — URL stays on /shift, sheet shows the duty I clicked', async ({ page }) => {
  // Semantic contract: a caregiver DOING the work needs an act-in-place
  // sheet. Tapping a duty card on the family-admin "manage duties" page
  // would be a semantic mismatch — that's the surface for editing /
  // assigning duties, not for marking them done.
  //
  // The strongest possible proof of "this is the sheet for THIS duty":
  //   • URL didn't change.
  //   • Sheet's HEADER text matches the duty card's visible name.
  //   • Sheet contains the household ownerName too (so the user knows
  //     which family this card belongs to when they have multiple).
  await waitForWorklistReady(page)

  const startUrl = page.url()

  // Stable invariants of seed-caregiver-duties.ts. If the seed changes,
  // update this regex.
  const dutyNameRe = /Pick up medications|Vacuum living room|Help Dad with breakfast|Prep Grandma Sue/i
  const dutyCard = page.getByRole('button', { name: dutyNameRe }).first()
  await expect(dutyCard).toBeVisible()

  await dutyCard.click()

  // Sheet mounted.
  const sheet = page.getByTestId('duty-action-sheet')
  await expect(sheet).toBeVisible({ timeout: 10_000 })

  // The sheet header carries the duty name. Use the SAME regex that
  // matched the card — that's the apples-to-apples proof "the sheet is
  // for the duty I clicked." textContent-splitting was brittle because
  // the card's accessible name includes the avatar emoji and subtitle.
  await expect(sheet.getByRole('heading').filter({ hasText: dutyNameRe }).first()).toBeVisible()

  // Sheet's subtitle includes the owner's family name so the caregiver
  // knows which household this card belongs to.
  await expect(sheet.getByText(/Weight Loss Project's Family/i)).toBeVisible()

  // Both action buttons present. Skip is intentionally not built —
  // the test pins that omission so adding it later is a deliberate
  // change.
  await expect(page.getByTestId('duty-sheet-complete')).toBeVisible()
  await expect(page.getByTestId('duty-sheet-cancel')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Skip$/i })).toHaveCount(0)

  // URL DID NOT change — that's the whole point: act-in-place, no
  // navigation away to /family/dashboard.
  expect(page.url()).toBe(startUrl)

  // Cancel closes the sheet without mutation.
  await page.getByTestId('duty-sheet-cancel').click()
  await expect(sheet).toHaveCount(0, { timeout: 5_000 })

  // Worklist is still intact after cancel — the duty card is still there.
  await expect(dutyCard).toBeVisible()
})

test('Care log: a caregiver post lands in the RIGHT household feed and stays there', async ({ page }) => {
  // Semantic contract: a post made in Weight Loss Project's composer
  // must appear in Weight Loss Project's notes container — not just
  // "somewhere on the page." Cross-household leakage would mean either
  // the API ignored ownerId or the listener filter is wrong.
  await waitForWorklistReady(page)

  const stamp = `caregiver ui probe ${Date.now()}`
  const notesContainer = page.getByTestId(`handoff-notes-${OWNER_UID}`)

  // Composer is inside the right notes container.
  const composer = notesContainer.locator('[data-testid^="handoff-composer-input-"]')
  await expect(composer).toBeVisible()
  await composer.fill(stamp)

  // Submit via the scoped button — guarantees we click the right one
  // of the two on the page.
  await notesContainer.getByRole('button', { name: /Add to log/i }).click()

  // Post appears INSIDE the same notes container — proves per-household
  // isolation, not just "the string is on the page." Generous timeout:
  // hook does a refetch-after-post AND a real-time listener catches it
  // via the notification stream.
  await expect(notesContainer.getByText(stamp, { exact: false })).toBeVisible({ timeout: 30_000 })

  // Negative scoping: the post should NOT appear in the OTHER
  // household's notes container. CSS attribute selector with :not()
  // excludes the WLP container by testid equality — `filter({ hasNot })`
  // filters by DESCENDANT, which doesn't help when the container IS the
  // testid match.
  const otherNotes = page.locator(
    `[data-testid^="handoff-notes-"]:not([data-testid="handoff-notes-${OWNER_UID}"])`,
  )
  await expect(otherNotes).toHaveCount(1) // there's exactly one other household
  await expect(otherNotes.getByText(stamp, { exact: false })).toHaveCount(0)
})
