import { test, expect, type Page } from '@playwright/test'

/**
 * Render battery for /profile.
 *
 * /profile is the single-page hub for: own-account info, subscription,
 * biometrics, app settings, vital reminders, privacy. It's also the
 * surface where you switch between "your own" profile and a family
 * member's profile via a top-of-page selector, which then conditionally
 * shows/hides several sections (Account Info, Subscription, Biometrics
 * are own-only; Pet Reminders vs Vital Reminders are species-aware).
 *
 * Assertions stay data-independent:
 *  - The hero "Currently Viewing" card always renders
 *  - When the test user has 1+ patients, the family-member selector
 *    is present and switching members updates the H1 + reveals the
 *    "Family Member" badge
 *  - When viewing self, Account Information renders
 *
 * Anything subscription-tier, biometric-capability, or onboarding-gated
 * is deliberately NOT asserted — those conditional sections come and go
 * based on env / account state that this spec shouldn't fight.
 */

async function gotoProfile(page: Page) {
  await page.goto('/profile')
  // Hero card is the most stable above-the-fold anchor — it renders
  // in every state (own profile, family-member, no-members, loading).
  await expect(
    page.getByText('Currently Viewing', { exact: false }),
  ).toBeVisible({ timeout: 30_000 })

  // Wait for usePatients() to resolve so the selector / empty-state /
  // loading shimmer has settled. Without this gate, `isVisible()`
  // checks below race the patients fetch and silently skip tests.
  // The "Loading family members…" message vanishes once the fetch
  // returns; once gone, one of two end-states is rendered.
  const loadingMessage = page.getByText(/Loading family members/i)
  await loadingMessage.waitFor({ state: 'detached', timeout: 30_000 }).catch(() => {})
}

test.describe('/profile — render battery', () => {
  test.beforeEach(async ({ page }) => {
    await gotoProfile(page)
  })

  test('page header — back link + own-profile title', async ({ page }) => {
    // Header H1 is "Your Profile & Settings" when viewing self, or
    // "{Name}'s Profile" when viewing a family member. The selector
    // defaults to the first family member on mount IF the patients
    // list resolves before we read; settle on whichever is showing.
    const title = page.getByRole('heading', { level: 1 })
    await expect(title).toBeVisible()
    const titleText = await title.innerText()
    expect(
      /Your Profile & Settings/.test(titleText) || /'s Profile/.test(titleText),
      `unexpected H1 text: ${titleText}`,
    ).toBe(true)

    // Back-to-dashboard affordance is the only "leave this page" path
    // surfaced in the header.
    await expect(page.getByRole('link', { name: /Back to dashboard/i })).toBeVisible()
  })

  test('family-member selector renders with self + members', async ({ page }) => {
    // The selector only appears when the user has 1+ patients. The
    // e2e test account is provisioned with 2 patients, so this should
    // always render — but if a fresh run somehow has 0, skip gracefully
    // rather than failing on shape.
    // Wait up to 10s for the selector label OR the empty-state copy
    // to materialize. The beforeEach gate already waited for the
    // loading shimmer to detach; whichever of these two states the
    // page lands in tells us whether to assert or skip.
    const selectorLabel = page.getByText(/Switch to Different Profile/i)
    await selectorLabel.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    const hasSelector = await selectorLabel.isVisible().catch(() => false)
    test.skip(!hasSelector, 'no family members provisioned — selector hidden')

    // The dropdown sits right under the label. It contains "Me / My
    // Profile" plus one option per patient.
    const dropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    await expect(dropdown).toBeVisible()

    const optionCount = await dropdown.locator('option').count()
    expect(optionCount, 'expected self + at least one family member').toBeGreaterThanOrEqual(2)
  })

  test('switching to a family member updates the header + shows badge', async ({ page }) => {
    // Wait up to 10s for the selector label OR the empty-state copy
    // to materialize. The beforeEach gate already waited for the
    // loading shimmer to detach; whichever of these two states the
    // page lands in tells us whether to assert or skip.
    const selectorLabel = page.getByText(/Switch to Different Profile/i)
    await selectorLabel.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {})
    const hasSelector = await selectorLabel.isVisible().catch(() => false)
    test.skip(!hasSelector, 'no family members provisioned — cannot switch')

    const dropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    const options = dropdown.locator('option')
    const optionTexts = await options.allInnerTexts()

    // Find the first non-self option (self is the one labeled "(My Profile)").
    const memberOptionIndex = optionTexts.findIndex(t => !/\(My Profile\)/i.test(t))
    test.skip(memberOptionIndex < 0, 'only self option present')

    // Map index → value attribute so we select by value (selectOption
    // by index can drift if options re-order).
    const memberOption = options.nth(memberOptionIndex)
    const memberValue = await memberOption.getAttribute('value')
    const memberLabel = (await memberOption.innerText()).trim()
    expect(memberValue, 'option missing value attr').toBeTruthy()

    await dropdown.selectOption(memberValue!)

    // After switch: the H1 becomes "{Name}'s Profile" and the
    // "Family Member" pill becomes visible. Extract the bare name
    // from the option label "👥 Chris (child)" — strip emoji + paren.
    const nameMatch = memberLabel.match(/[^\s👥🙋]+(?:\s+[^\s(]+)?/)
    const memberName = nameMatch?.[0].trim() ?? ''
    expect(memberName.length).toBeGreaterThan(0)

    const memberTitle = page.getByRole('heading', { level: 1 })
    await expect(memberTitle).toContainText(`'s Profile`, { timeout: 15_000 })

    // The "Family Member" pill on the hero card is the visible signal
    // that we successfully landed on someone-else's profile. It's
    // hidden when viewing your own.
    await expect(page.getByText(/^Family Member$/)).toBeVisible({ timeout: 10_000 })

    // Account Information should be hidden when viewing a family
    // member — it's own-profile-only.
    await expect(
      page.getByRole('heading', { name: 'Account Information' }),
    ).toHaveCount(0)
  })

  test('Account Information visible when viewing own profile', async ({ page }) => {
    // If the selector auto-picked a family member, switch back to self
    // first. The "Me / My Profile" option always exists.
    const dropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    if (await dropdown.isVisible().catch(() => false)) {
      const selfOption = dropdown.locator('option', { hasText: /\(My Profile\)/i }).first()
      const selfValue = await selfOption.getAttribute('value')
      if (selfValue) await dropdown.selectOption(selfValue)
    }

    // Title back to own-profile form
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      /Your Profile & Settings/,
      { timeout: 15_000 },
    )

    // Account Information renders for own profile only
    await expect(
      page.getByRole('heading', { name: 'Account Information' }),
    ).toBeVisible({ timeout: 10_000 })
  })
})
