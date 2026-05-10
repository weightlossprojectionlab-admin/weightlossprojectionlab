/**
 * Regression: /onboarding qualifying funnel — three scenarios.
 *
 * The 6-screen onboarding flow (role_selection → goals →
 * food_management → logging_preference → automation → family_setup)
 * branches heavily by user mode and goal selection. This spec
 * walks each scenario end-to-end:
 *
 *   1. Solo, fitness-only (myself + body_fitness): minimal path,
 *      family_setup screen hidden, redirects to /dashboard
 *   2. Solo with health-medical (myself + body+nutrition+health):
 *      all goals selected (test account is family_premium so no
 *      upgrade prompt fires), still solo so no family_setup
 *   3. Family + add-now (family + all goals + family_setup=yes):
 *      ends at /patients/new because addFamilyNow is true
 *
 * Each scenario asserts:
 *   - The 6 screens render in order with their question text
 *   - Auto-advance on single-select; Continue on multi-select
 *   - Final URL matches the routing rules in completeOnboarding()
 *   - Firestore at users/{uid}.preferences.onboardingAnswers
 *     reflects the picks
 *
 * The test account's prior onboarding state is overwritten — a
 * snapshot/restore would protect that, but the test account exists
 * for this kind of mutation, so we just write and move on.
 */

import { test, expect, type Page } from './fixtures'

// ============================================================
// Helpers — shared across the three scenarios
// ============================================================

/**
 * Click an option button on the current screen by its display
 * text. Options are rendered with `_` replaced by spaces, e.g.
 * "body_fitness" → button text "body fitness".
 */
async function pickOption(page: Page, optionId: string) {
  const display = optionId.replace(/_/g, ' ')
  await page
    .getByRole('button', { name: new RegExp(`^${display}\\b`, 'i') })
    .first()
    .click()
}

/**
 * Pick one or more options on a multi-select screen, then click
 * Continue. The Select All / Clear All buttons appear above the
 * options on multi-select screens.
 */
async function pickMultiAndContinue(page: Page, optionIds: string[]) {
  for (const id of optionIds) {
    await pickOption(page, id)
  }
  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

/**
 * Wait for the next screen to render by asserting its question
 * heading appears. Question heading is the H2 inside the wizard
 * card.
 */
async function expectQuestion(page: Page, questionText: string) {
  await expect(
    page.getByRole('heading', { name: questionText, level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
}

test.describe('Onboarding qualifying funnel — three scenarios @onboarding', () => {
  // Cold-compile + 6 screens × auto-advance delays. Generous.
  test.setTimeout(8 * 60_000)

  test('solo + fitness-only path → /dashboard', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    // Screen 1: role_selection (single-select, auto-advance)
    await expectQuestion(page, 'Who will you primarily be managing?')
    await pickOption(page, 'myself')

    // Screen 2: goals (multi-select)
    await expectQuestion(page, 'What are your wellness goals?')
    await pickMultiAndContinue(page, ['body_fitness'])

    // Screen 3: food_management (multi-select, options change by role)
    await expectQuestion(page, 'How do you get your food?')
    await pickMultiAndContinue(page, ['i_cook_at_home'])

    // Screen 4: logging_preference (multi-select)
    await expectQuestion(page, 'How do you want to log meals?')
    await pickMultiAndContinue(page, ['photo'])

    // Screen 5: automation (single-select, auto-advance)
    await expectQuestion(page, 'Do you want the app to ask for updates if you forget?')
    await pickOption(page, 'no')

    // family_setup screen is conditional on userMode != 'myself' —
    // for solo, it's skipped, completeOnboarding fires.

    // Final redirect — solo single-mode lands on /dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 })

    // Firestore state
    const userDoc = await firestore.collection('users').doc(ownerUserId).get()
    const onboarding = userDoc.data()?.preferences?.onboardingAnswers
    expect(onboarding?.userMode).toBe('single')
    expect(onboarding?.primaryRole).toBe('myself')
    expect(onboarding?.featurePreferences).toEqual(['body_fitness'])
    expect(onboarding?.kitchenMode).toEqual(['i_cook_at_home'])
    expect(onboarding?.automationLevel).toBe('no')
    expect(onboarding?.addFamilyNow).toBe(false)
    expect(userDoc.data()?.profile?.onboardingCompleted).toBe(true)
  })

  test('solo + all-goals path (medical premium-gated)', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    await expectQuestion(page, 'Who will you primarily be managing?')
    await pickOption(page, 'myself')

    await expectQuestion(page, 'What are your wellness goals?')
    // health_medical requires single_plus or higher; the test account
    // is family_premium, so all three should be selectable.
    await pickMultiAndContinue(page, ['body_fitness', 'nutrition_kitchen', 'health_medical'])

    await expectQuestion(page, 'How do you get your food?')
    await pickMultiAndContinue(page, ['meal_delivery'])

    await expectQuestion(page, 'How do you want to log meals?')
    await pickMultiAndContinue(page, ['both'])

    await expectQuestion(page, 'Do you want the app to ask for updates if you forget?')
    await pickOption(page, 'yes')

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 60_000 })

    const userDoc = await firestore.collection('users').doc(ownerUserId).get()
    const onboarding = userDoc.data()?.preferences?.onboardingAnswers
    expect(onboarding?.userMode).toBe('single')
    expect(onboarding?.featurePreferences).toEqual(
      expect.arrayContaining(['body_fitness', 'nutrition_kitchen', 'health_medical']),
    )
    expect(onboarding?.automationLevel).toBe('yes')
    expect(userDoc.data()?.preferences?.notifications).toBe(true)
  })

  test('family + add-now path → /patients/new', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    await expectQuestion(page, 'Who will you primarily be managing?')
    await pickOption(page, 'family')

    await expectQuestion(page, 'What are your wellness goals?')
    await pickMultiAndContinue(page, [
      'body_fitness',
      'nutrition_kitchen',
      'health_medical',
    ])

    // food_management options branch on role — for family, options
    // are: self / others / shared / i_shop / i_dont_shop / delivery
    // / meal_kits.
    await expectQuestion(page, 'How do you get your food?')
    await pickMultiAndContinue(page, ['i_shop'])

    await expectQuestion(page, 'How do you want to log meals?')
    await pickMultiAndContinue(page, ['photo', 'with_reminders'])

    await expectQuestion(page, 'Do you want the app to ask for updates if you forget?')
    await pickOption(page, 'yes')

    // family_setup IS visible because userMode != 'myself'
    await expectQuestion(page, 'Would you like to add anyone now?')
    await pickOption(page, 'yes')

    // addFamilyNow=yes routes to /patients/new
    await expect(page).toHaveURL(/\/patients\/new/, { timeout: 60_000 })

    const userDoc = await firestore.collection('users').doc(ownerUserId).get()
    const onboarding = userDoc.data()?.preferences?.onboardingAnswers
    expect(onboarding?.userMode).toBe('household')
    expect(onboarding?.primaryRole).toBe('family')
    expect(onboarding?.addFamilyNow).toBe(true)
    expect(onboarding?.kitchenMode).toEqual(['i_shop'])
    expect(onboarding?.mealLoggingMode).toEqual(
      expect.arrayContaining(['photo', 'with_reminders']),
    )
  })
})
