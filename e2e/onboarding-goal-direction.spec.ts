import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import * as admin from 'firebase-admin'

/**
 * Onboarding goal-direction (Phase 1).
 *
 * The onboarding used to assume weight LOSS for everyone — it asked
 * current weight, goal weight, and pace but never the direction, so a
 * gain or maintain goal produced nonsense downstream ("-200 lbs total
 * goal", "0 lbs/week losing"). We added an explicit goal_direction
 * screen (Lose / Maintain / Gain) and gate the goal-weight + pace
 * screens off for maintain (target = current, pace = 0).
 *
 * This spec asserts the SCREEN-FLOW contract:
 *   - Lose  → goal-weight + pace screens appear
 *   - Gain  → goal-weight + pace screens appear (the case that exposed
 *             the original bug)
 *   - Maintain → both are SKIPPED; onboarding completes straight to
 *                /progress, and the self-Patient persists
 *                goalDirection='maintain', target=current, pace=0
 *
 * Lose/Gain stop before the terminal screen, so they never complete
 * onboarding and never mutate data. Maintain DOES complete (it's the
 * last screen in single mode), so it snapshots and restores the
 * self-Patient + user doc + Auth displayName + any new weigh-in — the
 * shared test account must look untouched afterward.
 */

const GOAL_DIRECTION_HEADING = /What's your weight goal/i
const GOAL_WEIGHT_HEADING = /What's your goal weight/i
const PACE_HEADING = /How fast do you want to go/i

/**
 * Walk the single ("myself") path up to — and stopping on — the
 * goal_direction screen. Order mirrors docs/UNIFIED_PRD.json:
 * role → first name → DOB → height → current weight → goal_direction.
 */
async function walkToGoalDirection(page: Page, currentWeight = '200'): Promise<void> {
  await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

  // role_selection — auto-advances on tap.
  await expect(
    page.getByRole('heading', { name: /Who will you primarily be managing/i }),
  ).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /myself/i }).click()

  // your_name — plain text input + Continue.
  await expect(page.getByRole('heading', { name: /What's your first name/i })).toBeVisible({ timeout: 30_000 })
  await page.locator('input[type="text"]').fill('TempTester')
  await page.getByRole('button', { name: 'Continue' }).click()

  // date_of_birth — native date input.
  await expect(page.getByRole('heading', { name: /date of birth/i })).toBeVisible({ timeout: 15_000 })
  await page.locator('input[type="date"]').fill('1990-01-01')
  await page.getByRole('button', { name: 'Continue' }).click()

  // your_height — paired feet + inches.
  await expect(page.getByRole('heading', { name: /How tall are you/i })).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('5', { exact: true }).fill('5')
  await page.getByPlaceholder('10', { exact: true }).fill('10')
  await page.getByRole('button', { name: 'Continue' }).click()

  // current_weight — number input.
  await expect(page.getByRole('heading', { name: /current weight/i })).toBeVisible({ timeout: 15_000 })
  await page.getByPlaceholder('e.g. 180').fill(currentWeight)
  await page.getByRole('button', { name: 'Continue' }).click()

  await expect(page.getByRole('heading', { name: GOAL_DIRECTION_HEADING })).toBeVisible({ timeout: 15_000 })
}

test.describe('Onboarding — goal direction', () => {
  test('goal_direction screen offers Lose / Maintain / Gain', async ({ page }) => {
    await walkToGoalDirection(page)
    await expect(page.getByRole('button', { name: /Lose weight/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Maintain weight/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Gain weight/i })).toBeVisible()
  })

  test('Lose: goal-weight + pace screens appear', async ({ page }) => {
    await walkToGoalDirection(page)
    await page.getByRole('button', { name: /Lose weight/i }).click()

    await expect(page.getByRole('heading', { name: GOAL_WEIGHT_HEADING })).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('e.g. 160').fill('170')
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByRole('heading', { name: PACE_HEADING })).toBeVisible({ timeout: 15_000 })
    // Stop here — no pace chosen, so onboarding never completes (no mutation).
  })

  test('Gain: goal-weight + pace screens appear', async ({ page }) => {
    await walkToGoalDirection(page)
    await page.getByRole('button', { name: /Gain weight/i }).click()
    await expect(page.getByRole('heading', { name: GOAL_WEIGHT_HEADING })).toBeVisible({ timeout: 15_000 })
    // Stop here — proves gain is NOT treated as maintain. No completion.
  })

  test('Maintain: skips goal-weight + pace, completes, persists direction', async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    const CURRENT_WEIGHT = 200
    const userRef = firestore.collection('users').doc(ownerUserId)
    const patientsCol = userRef.collection('patients')

    const selfSnap = await patientsCol.where('relationship', '==', 'self').limit(1).get()
    expect(selfSnap.size, 'self-patient (relationship==self) exists').toBe(1)
    const selfRef = selfSnap.docs[0].ref

    // Snapshot everything completing onboarding would touch, so we can
    // restore the shared account exactly.
    const selfBefore = selfSnap.docs[0].data()
    const userBefore = (await userRef.get()).data()
    const authBefore = await admin.auth().getUser(ownerUserId)
    const weightLogsCol = userRef.collection('weightLogs')
    const beforeLogIds = new Set(
      (await weightLogsCol.where('patientId', '==', selfRef.id).get()).docs.map((d) => d.id),
    )

    try {
      await walkToGoalDirection(page, String(CURRENT_WEIGHT))
      await page.getByRole('button', { name: /Maintain weight/i }).click()

      // The proof of the skip: with no goal-weight/pace screens left in
      // single mode, goal_direction is terminal → onboarding finalizes
      // and routes straight to /progress. If either screen had shown,
      // we'd be on it instead of /progress.
      await page.waitForURL(/\/progress/, { timeout: 30_000 })
      await expect(page.getByRole('heading', { name: GOAL_WEIGHT_HEADING })).toHaveCount(0)

      // Persisted on the self-Patient: maintain, target = current, pace 0.
      await expect
        .poll(async () => (await selfRef.get()).data()?.goals?.goalDirection, { timeout: 20_000 })
        .toBe('maintain')
      const after = (await selfRef.get()).data()
      expect(after?.goals?.targetWeight).toBe(CURRENT_WEIGHT)
      expect(after?.goals?.weeklyWeightLossGoal).toBe(0)
    } finally {
      // Full restore — overwrite docs back to their snapshots, reset the
      // Auth displayName, and delete only the weigh-in(s) this run added.
      await selfRef.set(selfBefore)
      if (userBefore) await userRef.set(userBefore)
      await admin.auth().updateUser(ownerUserId, { displayName: authBefore.displayName ?? undefined })
      const afterLogs = await weightLogsCol.where('patientId', '==', selfRef.id).get()
      for (const d of afterLogs.docs) {
        if (!beforeLogIds.has(d.id)) await d.ref.delete()
      }
    }
  })
})
