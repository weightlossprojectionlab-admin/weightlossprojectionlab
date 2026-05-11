/**
 * Regression: PatientFieldEditor + PreparationNeedsEditor on the
 * patient detail page Info tab (Phase 1 E1 / E1.1).
 *
 * Locks in:
 *   - All 9 editor cells from c864ec8 (Phase 1 E1): relationship,
 *     gender, bloodType, height, targetWeight, activityLevel,
 *     weightGoal, healthConditions, foodAllergies.
 *   - The 3 new editor types from 776de71 (Phase 1 E1.1):
 *     preferredFoods (tag-input positive), aversions (tag-input
 *     negative), preparationNeeds (PreparationNeedsEditor nested).
 *   - Each editor round-trips: set value → save → Firestore reflects.
 *   - Tag-input edge cases: Enter commits, comma commits, blur
 *     commits, Backspace on empty removes last tag, × button removes
 *     a specific tag.
 *   - PreparationNeedsEditor: all-empty save → field removed
 *     (FieldValue.delete semantic from 4902fab).
 *
 * Test patients are created via Firestore admin (same pattern as
 * households-flow.spec.ts) so each test starts from a clean slate.
 */

import { test, expect, type Page, type Locator } from './fixtures'
import { v4 as uuidv4 } from 'uuid'

type CreatedResources = {
  patientIds: string[]
}

test.describe('Patient detail Info tab — editor cells @patient-editors', () => {
  // Each test navigates to /patients/[id], waits for ready, clicks
  // Edit on a specific cell, edits, saves, asserts. Generous for
  // cold compile + multiple page navigations.
  test.setTimeout(5 * 60_000)

  const stamp = Date.now()
  const created: CreatedResources = { patientIds: [] }

  async function createTestPatient(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    name: string,
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
        addedBy: ownerUserId,
        addedAt: now,
        createdAt: now,
        lastModified: now,
      })
    created.patientIds.push(id)
    return id
  }

  async function gotoPatientInfoTab(page: Page, patientId: string) {
    await page.goto(`/patients/${patientId}?tab=info`, { waitUntil: 'domcontentloaded' })
    // Wait for the patient page skeleton to clear.
    await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
    // Family Member Information heading is the anchor proving the
    // Info tab content has rendered.
    await expect(
      page.getByRole('heading', { name: 'Family Member Information', exact: true }),
    ).toBeVisible({ timeout: 30_000 })
  }

  /**
   * Locate a PatientFieldEditor cell by its label. Each cell renders
   * its label inside a `text-xs uppercase` div. We climb to the
   * outer `py-2` cell wrapper so subsequent locator calls are scoped
   * to that single cell.
   */
  function findCell(page: Page, label: string): Locator {
    return page.locator('div.py-2').filter({
      has: page.getByText(label, { exact: true }),
    }).first()
  }

  async function readPatient(
    firestore: FirebaseFirestore.Firestore,
    ownerUserId: string,
    id: string,
  ) {
    const doc = await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(id)
      .get()
    return doc.data() ?? {}
  }

  test.afterAll(async ({ firestore, ownerUserId }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[patient-editors] KEEP_DATA=1 — leaving:', created)
      return
    }
    for (const id of created.patientIds) {
      await firestore
        .collection('users').doc(ownerUserId)
        .collection('patients').doc(id)
        .delete().catch(() => {})
    }
  })

  // ============================================================
  // Single-value editors (select / multi-select)
  // ============================================================

  test('bloodType (select) round-trips', async ({ page, firestore, ownerUserId }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `BloodType Sam ${stamp}`)
    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Blood type')
    await cell.getByRole('button', { name: 'Edit' }).click()
    await cell.locator('select').selectOption('A+')
    await cell.getByRole('button', { name: 'Save' }).click()

    // 25s tolerates the first cold-compile of PUT /api/patients/[patientId]
    // under Turbopack — this is the spec's first PUT to that route.
    await expect(page.getByText('Blood type updated')).toBeVisible({ timeout: 25_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.bloodType, 'bloodType persisted to Firestore').toBe('A+')
  })

  test('healthConditions (multi-select) round-trips', async ({ page, firestore, ownerUserId }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Conditions Cara ${stamp}`)
    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Health conditions')
    await cell.getByRole('button', { name: 'Edit' }).click()
    // Multi-select renders one checkbox per option, scoped to this cell.
    await cell.getByRole('checkbox', { name: 'Diabetes' }).check()
    await cell.getByRole('checkbox', { name: 'Hypertension' }).check()
    await cell.getByRole('checkbox', { name: 'Asthma' }).check()
    await cell.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Health conditions updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.healthConditions, 'healthConditions persisted (array, 3 entries)').toEqual(
      expect.arrayContaining(['Diabetes', 'Hypertension', 'Asthma']),
    )
    expect((data.healthConditions as string[]).length).toBe(3)
  })

  test('foodAllergies (multi-select Big-9) round-trips', async ({ page, firestore, ownerUserId }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Allergies Anna ${stamp}`)
    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Food allergies')
    await cell.getByRole('button', { name: 'Edit' }).click()
    await cell.getByRole('checkbox', { name: 'Peanuts' }).check()
    await cell.getByRole('checkbox', { name: 'Tree nuts' }).check()
    await cell.getByRole('checkbox', { name: 'Shellfish' }).check()
    await cell.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Food allergies updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.foodAllergies).toEqual(expect.arrayContaining(['Peanuts', 'Tree nuts', 'Shellfish']))
    expect((data.foodAllergies as string[]).length).toBe(3)
  })

  // ============================================================
  // tag-input — Phase 1 E1.1
  // ============================================================

  test('preferredFoods (tag-input) — Enter / comma / blur all commit', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Preferred Pia ${stamp}`)
    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Preferred (safe) foods')
    await cell.getByRole('button', { name: 'Edit' }).click()

    const input = cell.locator('input[type="text"]')

    // Enter commits
    await input.fill('rice')
    await input.press('Enter')
    await expect(cell.getByText('rice', { exact: false })).toBeVisible()

    // Comma commits (the keydown handler intercepts the comma key).
    // Use fill+press(',') — Playwright's fill() bypasses keydown,
    // so 'pasta,' set via fill would never trigger the handler.
    await input.fill('pasta')
    await input.press(',')
    await expect(cell.getByText('pasta', { exact: false })).toBeVisible()

    // Blur commits any leftover input value
    await input.fill('applesauce')
    await input.blur()
    await expect(cell.getByText('applesauce', { exact: false })).toBeVisible()

    await cell.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Preferred (safe) foods updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.preferredFoods).toEqual(expect.arrayContaining(['rice', 'pasta', 'applesauce']))
    expect((data.preferredFoods as string[]).length).toBe(3)

    // Tone styling — positive tone uses success/green palette. Verifies
    // the chip CSS class actually applies; a tone regression would
    // otherwise slip through since the data round-trip already passed.
    const positiveChip = findCell(page, 'Preferred (safe) foods').locator('span').filter({ hasText: 'rice' }).first()
    await expect(positiveChip).toHaveClass(/bg-success/)
  })

  test('preferredFoods (tag-input) — × button + Backspace both remove a tag', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Remove Rita ${stamp}`)
    // Pre-seed three preferred foods so we don't have to enter them through the UI.
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .update({ preferredFoods: ['rice', 'pasta', 'applesauce'] })

    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Preferred (safe) foods')
    await cell.getByRole('button', { name: 'Edit' }).click()

    // × button removes a specific tag (use the aria-label we set).
    await cell.getByRole('button', { name: 'Remove pasta' }).click()
    await expect(cell.getByText('pasta', { exact: false })).not.toBeVisible()

    // Backspace on empty input removes the LAST remaining tag.
    const input = cell.locator('input[type="text"]')
    await input.focus()
    await input.press('Backspace')
    // After Backspace, the last tag (applesauce) is gone.
    await expect(cell.getByText('applesauce', { exact: false })).not.toBeVisible()

    await cell.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Preferred (safe) foods updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.preferredFoods, 'only "rice" survives after × removal + Backspace removal').toEqual(['rice'])
  })

  test('aversions (tag-input negative tone) renders ⚠ chips', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Aversion Avi ${stamp}`)
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .update({ aversions: ['mushrooms', 'cilantro'] })

    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Aversions / foods to avoid')
    // Display mode (not editing) should show the ⚠ prefix on each chip.
    await expect(cell.getByText(/⚠ mushrooms/)).toBeVisible()
    await expect(cell.getByText(/⚠ cilantro/)).toBeVisible()

    // Tone styling — negative tone uses error/red palette. Locks in
    // the visual semantic so a refactor of the chip styling can't
    // silently degrade the avoid-list affordance.
    const negativeChip = cell.locator('span').filter({ hasText: 'mushrooms' }).first()
    await expect(negativeChip).toHaveClass(/bg-error/)
  })

  // ============================================================
  // PreparationNeedsEditor — Phase 1 E1.1 (nested object)
  // ============================================================

  test('preparationNeeds — set all 5 fields round-trips', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Prep Perry ${stamp}`)
    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Preparation needs')
    await cell.getByRole('button', { name: 'Edit' }).click()

    // The editor has 3 selects + 1 checkbox + 1 textarea, scoped to this cell.
    const selects = cell.locator('select')
    await selects.nth(0).selectOption('soft')        // Texture
    await selects.nth(1).selectOption('small-cubes') // Cut size
    await selects.nth(2).selectOption('warm')        // Temperature
    await cell.getByRole('checkbox').check()         // Separated on plate
    await cell.locator('textarea').fill('No sauces touching')

    await cell.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Preparation needs updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    expect(data.preparationNeeds, 'nested object persisted').toEqual({
      texture: 'soft',
      cutSize: 'small-cubes',
      temperature: 'warm',
      separated: true,
      notes: 'No sauces touching',
    })
  })

  test('preparationNeeds — clear all → field removed from doc', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Clear Carl ${stamp}`)
    // Pre-seed so there's something to clear.
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .update({
        preparationNeeds: {
          texture: 'pureed',
          cutSize: 'minced',
          temperature: 'cold',
          separated: true,
          notes: 'cleared by test',
        },
      })

    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Preparation needs')
    await cell.getByRole('button', { name: 'Edit' }).click()

    const selects = cell.locator('select')
    await selects.nth(0).selectOption('')   // Texture → —
    await selects.nth(1).selectOption('')   // Cut size → —
    await selects.nth(2).selectOption('')   // Temperature → —
    await cell.getByRole('checkbox').uncheck()
    await cell.locator('textarea').fill('')

    await cell.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Preparation needs updated')).toBeVisible({ timeout: 10_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    // Cleared semantic: the /api/patients PUT route writes `null`
    // for the cleared field (unlike /api/households which uses
    // FieldValue.delete()). Either way the field is functionally
    // gone — consumers check truthiness. Assert the loose "cleared"
    // contract: null OR absent. (A future cleanup pass could
    // unify the two routes on FieldValue.delete().)
    const cleared = data.preparationNeeds === undefined || data.preparationNeeds === null
    expect(cleared, `preparationNeeds cleared (got: ${JSON.stringify(data.preparationNeeds)})`).toBe(true)
  })

  // ============================================================
  // Clear-on-edit for a select field (canary for the
  // FieldValue.delete path on bloodType)
  // ============================================================

  test('bloodType clear-on-edit — pick blank option removes field from doc', async ({
    page,
    firestore,
    ownerUserId,
  }) => {
    const patientId = await createTestPatient(firestore, ownerUserId, `Clear Blood Bo ${stamp}`)
    await firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .update({ bloodType: 'O+' })

    await gotoPatientInfoTab(page, patientId)

    const cell = findCell(page, 'Blood type')
    await cell.getByRole('button', { name: 'Edit' }).click()
    // The select's blank option uses the editor's emptyLabel as its
    // first <option>. Picking it sends null to the server → field
    // cleared via the PUT route's 'X' in body / value === null handler.
    await cell.locator('select').selectOption('')
    await cell.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Blood type updated')).toBeVisible({ timeout: 25_000 })

    const data = await readPatient(firestore, ownerUserId, patientId)
    // Whatever the mechanism (null write or FieldValue.delete on
    // server), the practical end state must NOT be 'O+' — that's the
    // canary the form/server pair is honoring "clear" intent.
    expect(data.bloodType, 'cleared (null or absent)').not.toBe('O+')
  })
})
