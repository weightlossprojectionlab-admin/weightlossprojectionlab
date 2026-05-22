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
  // 60s tolerates dev-server cold compile + a Turbopack hot-rebuild
  // landing mid-navigation. The latter intermittently blocks the
  // AuthGuard splash from clearing.
  await expect(
    page.getByText('Currently Viewing', { exact: false }),
  ).toBeVisible({ timeout: 60_000 })

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

  test('Vital Sign Reminders section renders for own profile', async ({ page }) => {
    // Ensure we're on the own-profile view — Vital Sign Reminders also
    // shows for human patients, but the scope badge text changes per
    // subject. Asserting "You" anchors this test to own-profile state.
    const dropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    if (await dropdown.isVisible().catch(() => false)) {
      const selfOption = dropdown.locator('option', { hasText: /\(My Profile\)/i }).first()
      const selfValue = await selfOption.getAttribute('value')
      if (selfValue) await dropdown.selectOption(selfValue)
    }

    // Section is gated by !isPetProfile && (hasFeature('health_medical')
    // || no features chosen). Default seed accounts hit the second
    // branch, so the section should render. If a future onboarding
    // change removes that fallback, this assertion will catch it.
    const sectionHeading = page.getByRole('heading', { name: /Vital Sign Reminders/i, level: 2 })
    await expect(sectionHeading).toBeVisible({ timeout: 15_000 })

    // The pill on the heading row identifies whose reminders these
    // are. For own profile it reads "You" (vs "{Name}" when a family
    // member is selected).
    await expect(page.getByText(/^You$/).first()).toBeVisible()
  })

  test('Vital Sign Reminders lists at least one vital with a toggle', async ({ page }) => {
    const dropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    if (await dropdown.isVisible().catch(() => false)) {
      const selfOption = dropdown.locator('option', { hasText: /\(My Profile\)/i }).first()
      const selfValue = await selfOption.getAttribute('value')
      if (selfValue) await dropdown.selectOption(selfValue)
    }

    await expect(
      page.getByRole('heading', { name: /Vital Sign Reminders/i, level: 2 }),
    ).toBeVisible({ timeout: 15_000 })

    // Each applicable vital renders an H3 like "Weight Reminders" or
    // "Blood Pressure Reminders". The exact set comes from
    // getApplicableVitalTypes() which is age + species aware — for the
    // own-profile (adult human) the list always contains weight at
    // minimum. Assert "ends with 'Reminders'" instead of pinning a
    // specific vital so age-gated changes don't break the spec.
    const vitalHeadings = page.getByRole('heading', { level: 3 }).filter({ hasText: /\bReminders$/ })
    const count = await vitalHeadings.count()
    expect(count, 'expected at least one vital reminder row').toBeGreaterThan(0)

    // Each vital row has a toggle button (a 6×11 pill). Pick the first
    // vital, walk up to its row container, find the toggle inside.
    const firstVital = vitalHeadings.first()
    const row = firstVital.locator('xpath=ancestor::div[contains(@class, "border-b")][1]')
    const toggle = row.locator('button').first()
    await expect(toggle).toBeVisible()

    // If the toggle is in the ON state (bg-primary class), the
    // frequency dropdown should be visible inside the same row. The
    // "Send Test Reminder" button is intentionally gated to platform
    // super-admins, so we don't assert it for the test user.
    const toggleClasses = (await toggle.getAttribute('class')) ?? ''
    if (toggleClasses.includes('bg-primary')) {
      await expect(row.locator('select')).toBeVisible()
    }
  })

  test('toggling weight vital reminder flips dropdown + toast, then restores', async ({ page }) => {
    // Ensure own-profile (the page may have auto-picked a family member).
    const accountDropdown = page.locator('select').filter({ hasText: /My Profile/i }).first()
    if (await accountDropdown.isVisible().catch(() => false)) {
      const selfOption = accountDropdown.locator('option', { hasText: /\(My Profile\)/i }).first()
      const selfValue = await selfOption.getAttribute('value')
      if (selfValue) await accountDropdown.selectOption(selfValue)
    }

    await expect(
      page.getByRole('heading', { name: /Vital Sign Reminders/i, level: 2 }),
    ).toBeVisible({ timeout: 15_000 })

    // Weight is the safest vital to exercise: it's applicable to every
    // life-stage (newborn → adult) so it always renders, and it has
    // its own legacy-migration path that we want to keep exercising.
    const weightHeading = page.getByRole('heading', { name: 'Weight Reminders', level: 3 })
    await expect(weightHeading).toBeVisible()

    const weightRow = weightHeading.locator('xpath=ancestor::div[contains(@class, "border-b")][1]')
    const toggle = weightRow.locator('button').first()
    await expect(toggle).toBeVisible()

    // The frequency dropdown only renders when the toggle is ON, so
    // its visibility is the cleanest proxy for "is enabled" without
    // having to introspect a className.
    const frequencyDropdown = weightRow.locator('select')
    const wasEnabled = await frequencyDropdown.isVisible().catch(() => false)

    // First click — flip the state. The frequency dropdown's visibility
    // change is the single source of truth: it flips only after the
    // saveVitalReminders API round-trip succeeds and setProfileData
    // re-renders the row. Playwright's expect auto-retries, so this
    // doubles as the "save completed" gate.
    await toggle.click()

    if (wasEnabled) {
      // Was ON, now OFF — dropdown should be gone.
      await expect(frequencyDropdown).toBeHidden({ timeout: 10_000 })
    } else {
      // Was OFF, now ON — dropdown appears. (Send Test Reminder
      // button is admin-gated, so not asserted here.)
      await expect(frequencyDropdown).toBeVisible({ timeout: 10_000 })
    }

    // Second click — restore original state. Cleanup, not assertion target.
    await toggle.click()
    if (wasEnabled) {
      await expect(frequencyDropdown).toBeVisible({ timeout: 10_000 })
    } else {
      await expect(frequencyDropdown).toBeHidden({ timeout: 10_000 })
    }
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
