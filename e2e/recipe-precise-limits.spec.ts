/**
 * PHAST / e2e gate for per-patient PRECISE condition limits (bb8bdb9).
 *
 * The unit tests prove the numeric invariant (a doctor's 1200mg sodium limit
 * beats the 1500 default). This proves the browser-worthy delta a unit test
 * can't claim: that a patient's conditionDetails actually reaches the render
 * and TIGHTENS the on-screen safety verdict.
 *
 * Design — a deterministic, non-vacuous contrast on ONE seeded recipe:
 *   - Seed a probe recipe at sodium 380mg. Every built-in recipe is sodium:0,
 *     so 'High Sodium' is impossible anywhere except this probe, and only when
 *     the limit tightens.
 *   - Patient A (CKD, no conditionDetails): default sodium limit 1500 → per-meal
 *     500, 80% = 400 → 380 is under → probe shows 'Low Sodium'. Assert
 *     'Low Sodium' present (personalization ran) AND 'High Sodium' absent.
 *   - Patient B (CKD, conditionDetails sodium 1200): per-meal 400, 80% = 320 →
 *     380 now exceeds 80% → probe shows 'High Sodium'. Assert it present.
 *   The ONLY difference between A and B is conditionDetails; nothing else can
 *   flip 'High Sodium' on. Both sides assert a positive signal, so a silent
 *   fallback to base (badge-less) recipes fails rather than passes vacuously.
 *
 * Isolation: seeds a doc into the GLOBAL `recipes` collection (mergeRecipesWithMedia
 * appends full recipes to the built-ins). Strictly cleaned up in afterAll. Kept in
 * its own spec file so the probe exists only for this file's serial run.
 *
 * Run headed:  npx playwright test e2e/recipe-precise-limits.spec.ts --project=chromium
 */

import { test, expect, type Page } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

test.describe('conditionDetails tightens the on-screen safety verdict @recipe-precise', () => {
  test.setTimeout(5 * 60_000)

  const stamp = Date.now()
  const probeName = `E2E Sodium Probe ${stamp}`
  const createdPatientIds: string[] = []
  let probeRecipeId = ''

  async function seedPatient(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    name: string,
    conditionDetails?: Record<string, Record<string, unknown>>,
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
        healthConditions: ['Kidney Disease'],
        ...(conditionDetails ? { conditionDetails } : {}),
        addedBy: ownerUserId,
        addedAt: now,
        createdAt: now,
        lastModified: now,
      })
    createdPatientIds.push(id)
    return id
  }

  test.beforeAll(async ({ firestore }) => {
    // A "full" recipe (name + status:'published' + recipeSteps) is appended to
    // the built-ins by mergeRecipesWithMedia. sodium 380 is the tuned value that
    // is safe at the 1500 default but over 80% at the 1200 precise limit.
    probeRecipeId = `e2e-sodium-probe-${uuidv4()}`
    await firestore.collection('recipes').doc(probeRecipeId).set({
      id: probeRecipeId,
      name: probeName,
      status: 'published',
      mealType: 'breakfast',
      mealTypes: ['breakfast'],
      calories: 300,
      macros: { sodium: 380, carbs: 20, protein: 10, fat: 5, fiber: 3 },
      ingredients: ['probe ingredient'],
      recipeSteps: ['Combine and serve.'],
      allergens: [],
      createdAt: new Date().toISOString(),
    })
  })

  test.afterAll(async ({ firestore, ownerUserId }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[recipe-precise] KEEP_DATA=1 — leaving:', { probeRecipeId, createdPatientIds })
      return
    }
    await firestore.collection('recipes').doc(probeRecipeId).delete().catch(() => {})
    for (const id of createdPatientIds) {
      await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .delete().catch(() => {})
    }
  })

  async function openMemberRecipes(page: Page, patientId: string, name: string) {
    await page.goto(`/recipes?memberId=${patientId}`, { waitUntil: 'domcontentloaded' })
    await expect(
      page.getByText(`Personalized Recipes for ${name}`),
    ).toBeVisible({ timeout: 90_000 })
  }

  // Scope to the probe recipe's OWN card — the `recipes` collection holds real
  // admin recipes with nonzero sodium, so a page-level 'High Sodium' count is
  // polluted. The card markup is `<div content><Link><h3>name</h3></Link> …badges…`,
  // so the heading's grandparent (../..) is the content div holding both the
  // name and this recipe's safety badges.
  function probeCard(page: Page) {
    // Deepest div that HAS the probe heading = the card's content div, which
    // also holds this recipe's safety badges.
    return page.locator('div', { has: page.getByRole('heading', { name: probeName }) }).last()
  }

  test('without conditionDetails, the probe is safe at the default 1500mg limit', async ({
    page, firestore, ownerUserId,
  }) => {
    const name = `E2E CKD Default ${stamp}`
    const patientId = await seedPatient(firestore, ownerUserId, name)

    await openMemberRecipes(page, patientId, name)

    // Personalization ran on the probe (CKD → Low Sodium at the 1500 default,
    // per-meal 500, and 380 is under 80% = 400). Proves the probe rendered with
    // a safetyResult, so the absence assertion below can't pass vacuously.
    await expect(probeCard(page).getByText('Low Sodium')).toBeVisible({ timeout: 60_000 })
    // The probe's own warning line is globally unique (380mg — no other recipe
    // has it). Absent at the default limit: the probe is under 80% of 500/meal.
    await expect(page.getByText('High sodium: 380mg')).toHaveCount(0)
  })

  test('with conditionDetails sodium 1200, the SAME probe now flags High Sodium', async ({
    page, firestore, ownerUserId,
  }) => {
    const name = `E2E CKD Precise ${stamp}`
    const patientId = await seedPatient(firestore, ownerUserId, name, {
      'kidney-disease-ckd': { ckd_sodium_limit: 1200 },
    })

    // The doctor's 1200mg limit (per-meal 400, 80% = 320) reached the render and
    // pushed the SAME 380mg probe over 80% → its globally-unique 'High sodium:
    // 380mg' warning. Only conditionDetails changed vs the default patient.
    await openMemberRecipes(page, patientId, name)
    await expect(page.getByText('High sodium: 380mg')).toBeVisible({ timeout: 60_000 })
  })
})
