/**
 * PHAST / e2e gate for the conditions → recipe-engine wiring (eec1bc4).
 *
 * The 29 unit tests in lib/condition-dietary-rules.test.ts prove the ENGINE
 * (normalizeConditions + buildMedicalConstraints + evaluateRecipeSafety). They
 * cannot prove the thing that was actually broken: that the app passes a
 * patient's stored `healthConditions` through the real fetch → engine → render
 * path and paints condition-specific safety badges on screen. That is this
 * spec's only job — the seam a pure-function test can't reach.
 *
 * Design (so it binds to something real, not a vacuous pass):
 *   - Assert a CROSS-CONDITION contrast, not one badge in isolation. A diabetes
 *     patient must show a diabetes badge and NOT a CKD badge; a CKD patient the
 *     reverse. That proves the engine differentiates by the stored condition —
 *     it cannot pass if personalization silently fell back to base recipes
 *     (which carry no safetyResult and thus neither badge).
 *   - Seed the stored Title-case labels the UI actually writes ('Diabetes',
 *     'Kidney Disease') so the normalizer is exercised on real vocabulary.
 *   - Assert only badges that are DETERMINISTIC against the built-in seed
 *     recipes: every breakfast built-in has no `sugars` field and no white
 *     rice/bread, so a diabetes patient earns 'Diabetes-Friendly' on all of
 *     them; sodium is 0 on all of them, so a CKD patient earns 'Low Sodium' /
 *     '✓ CKD-Safe'. We deliberately do NOT assert the sodium-VIOLATION path —
 *     it's unreachable on sodium:0 seed data and would pass vacuously.
 *
 * Surface: /recipes?memberId=<patientId> (app/recipes/page.tsx) — selects the
 * patient purely by URL param and does not require seeded household inventory,
 * unlike the patient-detail Recipes tab (RecipeView).
 *
 * Run headed:  npx playwright test e2e/recipe-condition-safety.spec.ts --project=chromium
 * Run headless: HEADLESS=1 SLOWMO_MS=0 npx playwright test e2e/recipe-condition-safety.spec.ts --project=chromium
 */

import { test, expect, type Page } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

test.describe('conditions reach the recipe UI as condition-specific badges @recipe-safety', () => {
  // Cold compile of /recipes + personalization fetch (profile/meds/vitals) +
  // engine run. Generous, single worker.
  test.setTimeout(5 * 60_000)

  const stamp = Date.now()
  const created: string[] = []

  async function seedPatient(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    name: string,
    healthConditions: string[],
  ): Promise<string> {
    const id = uuidv4()
    const now = new Date().toISOString()
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(id)
      .set({
        id,
        userId: ownerUserId,
        name,
        type: 'human',
        dateOfBirth: '1980-01-01',
        gender: 'male',
        accountStatus: 'member',
        countsAsSeat: true,
        healthConditions, // the stored Title-case labels the UI writes
        addedBy: ownerUserId,
        addedAt: now,
        createdAt: now,
        lastModified: now,
      })
    created.push(id)
    return id
  }

  async function openMemberRecipes(page: Page, patientId: string, name: string) {
    await page.goto(`/recipes?memberId=${patientId}`, { waitUntil: 'domcontentloaded' })
    // Page-ready anchor: the personalized-recipes banner names the member.
    await expect(
      page.getByText(`Personalized Recipes for ${name}`),
    ).toBeVisible({ timeout: 90_000 })
  }

  test.afterAll(async ({ firestore, ownerUserId }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[recipe-safety] KEEP_DATA=1 — leaving patients:', created)
      return
    }
    for (const id of created) {
      await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .delete().catch(() => {})
    }
  })

  test('a Diabetes patient sees the diabetes badge, not the CKD badge', async ({
    page, firestore, ownerUserId,
  }) => {
    const name = `E2E Diabetes ${stamp}`
    const patientId = await seedPatient(firestore, ownerUserId, name, ['Diabetes'])

    await openMemberRecipes(page, patientId, name)

    // Present: proves 'Diabetes' → normalizeConditions → requiresLowGI reached
    // the render. Deterministic — every breakfast built-in is low-GI.
    await expect(page.getByText('Diabetes-Friendly').first()).toBeVisible({ timeout: 60_000 })
    // Absent: proves the badge is condition-specific, not a blanket label, and
    // that we didn't just fall back to base (badge-less) recipes.
    await expect(page.getByText('CKD-Safe')).toHaveCount(0)
  })

  test('a Kidney Disease patient sees the CKD badge, not the diabetes badge', async ({
    page, firestore, ownerUserId,
  }) => {
    const name = `E2E CKD ${stamp}`
    const patientId = await seedPatient(firestore, ownerUserId, name, ['Kidney Disease'])

    await openMemberRecipes(page, patientId, name)

    // Present: proves 'Kidney Disease' → normalizeConditions → sodium+potassium
    // limits reached the render (sodium:0 seed → Low Sodium / CKD-Safe).
    await expect(page.getByText('Low Sodium').first()).toBeVisible({ timeout: 60_000 })
    // Absent: the diabetes-specific badge must NOT appear for a CKD patient.
    await expect(page.getByText('Diabetes-Friendly')).toHaveCount(0)
  })
})
