/**
 * E2E regression coverage for the meal-log features shipped this session.
 *
 * Both tests seed data via the admin SDK, drive the real UI, and assert against
 * Firestore — so they pin the exact bugs that surfaced during development:
 *
 *  1. Editing a meal must PRESERVE its original loggedAt (the "edit shoved the
 *     date to today" scare) — and the edit must target the right doc (the
 *     stored-`id`-field shadowing bug) via the unified manual-entry editor.
 *  2. Logging a SAVED meal (template) must work with string foodItems (the
 *     "expected object, received string" crash) and land in the PATIENT's log
 *     (the scope bug), not the caregiver's own.
 *
 * Owner-side (chromium). Torn down in finally.
 */

import { Timestamp } from 'firebase-admin/firestore'
import { test, expect } from './fixtures'

test.describe('Meal log features @meal-features', () => {
  test.setTimeout(6 * 60_000)
  test.use({
    expectedApiErrorCodes: ['Failed to fetch', 'api_request', 'Unauthorized', 'Error fetching'],
  })

  test('editing a meal preserves its original log date', async ({
    page,
    ownerUserId,
    patientId,
    firestore,
  }) => {
    const stamp = Date.now()
    // Recent enough to sit in the 30-item window, but a fixed past instant so a
    // regression (loggedAt := now on save) would clearly change the value.
    const originalLoggedAt = new Date(stamp - 60 * 60 * 1000).toISOString()
    const name = `E2E date test ${stamp}`
    const editedName = `E2E edited ${stamp}`

    const ref = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('meal-logs').doc()

    await ref.set({
      mealType: 'breakfast',
      title: name,
      description: name,
      foodItems: [name],
      calories: 100,
      protein: 5,
      carbs: 10,
      fat: 2,
      totalCalories: 100,
      macros: { protein: 5, carbs: 10, fat: 2 },
      loggedAt: originalLoggedAt,
      loggedBy: ownerUserId,
      userId: ownerUserId,
      patientId,
      aiAnalyzed: false,
      tags: [],
    })

    try {
      await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })

      // Isolate the seeded meal with the search box, then open its editor.
      const search = page.getByPlaceholder(/search by name/i)
      await expect(search).toBeVisible({ timeout: 90_000 })
      await search.fill(name)
      await expect(page.getByText(name).first()).toBeVisible({ timeout: 30_000 })

      await page.getByRole('button', { name: 'Edit meal' }).first().click()

      // The unified manual-entry form opens, pre-filled — change the name + save.
      const nameInput = page.getByPlaceholder('e.g., Chicken and rice')
      await expect(nameInput).toBeVisible({ timeout: 15_000 })
      await nameInput.fill(editedName)
      await page.getByRole('button', { name: /update meal/i }).click()

      // The name change persisted...
      await expect
        .poll(
          async () => {
            const d = (await ref.get()).data() || {}
            return d.description === editedName || d.title === editedName
          },
          { timeout: 25_000, message: 'edited meal name should persist' },
        )
        .toBe(true)

      // ...and the original log date is UNCHANGED.
      const d = (await ref.get()).data()!
      expect(d.loggedAt, 'original log date must be preserved on edit').toBe(originalLoggedAt)
    } finally {
      await ref.delete().catch(() => {})
    }
  })

  test('logging a saved meal works (string foodItems) and scopes to the patient', async ({
    page,
    ownerUserId,
    patientId,
    firestore,
  }) => {
    const stamp = Date.now()
    const templateName = `E2E saved meal ${stamp}`

    const tmplRef = firestore
      .collection('users').doc(ownerUserId)
      .collection('mealTemplates').doc()

    // String foodItems — exactly the shape that used to crash applyTemplate
    // ("expected object, received string").
    await tmplRef.set({
      name: templateName,
      mealType: 'lunch',
      foodItems: ['2 eggs', '1 cup rice'],
      calories: 350,
      macros: { protein: 20, carbs: 40, fat: 10, fiber: 2 },
      usageCount: 0,
      createdAt: Timestamp.now(),
    })

    const mealsCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('meal-logs')

    try {
      await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })

      // Open the Saved meals panel and wait for the seeded meal to load.
      await page.getByRole('button', { name: 'Use a saved meal' }).click({ timeout: 90_000 })
      await expect(page.getByText(templateName).first()).toBeVisible({ timeout: 30_000 })

      // Log that specific saved meal.
      const card = page
        .locator('div')
        .filter({ hasText: templateName })
        .filter({ has: page.getByRole('button', { name: /log this meal/i }) })
        .first()
      await card.getByRole('button', { name: /log this meal/i }).click()

      // A new PATIENT meal-log is created with the saved meal's name (no crash,
      // right scope).
      await expect
        .poll(
          async () => (await mealsCol.where('description', '==', templateName).get()).size,
          { timeout: 25_000, message: 'a patient meal log should be created' },
        )
        .toBeGreaterThan(0)
    } finally {
      await tmplRef.delete().catch(() => {})
      const created = await mealsCol.where('description', '==', templateName).get()
      await Promise.all(created.docs.map((d) => d.ref.delete().catch(() => {})))
    }
  })

  test('shows a patient-personalized calories line from age/height/weight', async ({
    page,
    ownerUserId,
    patientId,
    firestore,
  }) => {
    const pRef = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
    const original = (await pRef.get()).data() || {}

    // Ensure the profile has the identity fields TDEE needs.
    await pRef.set(
      {
        dateOfBirth: '1985-06-15T00:00:00.000Z',
        gender: 'male',
        height: 70, // inches
        currentWeight: 175, // lbs
        weightUnit: 'lbs',
        activityLevel: 'moderate',
      },
      { merge: true },
    )

    try {
      await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })
      await page
        .getByRole('button', { name: 'Enter meal details manually' })
        .click({ timeout: 90_000 })
      await page.getByPlaceholder('e.g., Chicken and rice').fill(`E2E personalize ${Date.now()}`)
      await page.getByPlaceholder('e.g., 450').fill('400')

      // The personalization line is derived from the patient's TDEE.
      await expect(page.getByText(/of their daily calories/i)).toBeVisible({ timeout: 15_000 })
    } finally {
      await pRef.set(original) // full restore of the shared test patient
    }
  })

  test('estimate macros fills calories + macros (endpoint mocked)', async ({ page, patientId }) => {
    // Mock the Gemini-backed endpoint so this is deterministic.
    await page.route('**/api/meals/estimate-nutrition', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            calories: 420,
            protein: 30,
            carbs: 40,
            fat: 12,
            confidence: 'high',
            note: 'test estimate',
          },
        }),
      }),
    )

    await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Enter meal details manually' }).click({ timeout: 90_000 })
    await page.getByPlaceholder('e.g., Chicken and rice').fill(`E2E estimate ${Date.now()}`)

    // Add an ingredient so the Estimate button appears.
    await page.getByRole('button', { name: /add ingredients/i }).click()
    await page.getByPlaceholder(/2 eggs, 1 tbsp butter/i).fill('2 eggs')
    await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()

    await page.getByRole('button', { name: /estimate from ingredients/i }).click()

    await expect(page.getByPlaceholder('e.g., 450')).toHaveValue('420', { timeout: 15_000 })
    await expect(page.getByText(/high confidence/i)).toBeVisible()
  })

  test('save as meal creates a reusable meal and disables to block duplicates', async ({
    page,
    ownerUserId,
    patientId,
    firestore,
  }) => {
    const mealName = `E2E save-as-meal ${Date.now()}`
    const templates = firestore
      .collection('users').doc(ownerUserId)
      .collection('mealTemplates')

    try {
      await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })
      await page
        .getByRole('button', { name: 'Enter meal details manually' })
        .click({ timeout: 90_000 })
      await page.getByPlaceholder('e.g., Chicken and rice').fill(mealName)
      await page.getByRole('button', { name: /add ingredients/i }).click()
      await page.getByPlaceholder(/2 eggs, 1 tbsp butter/i).fill('2 eggs')
      await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()

      await page.getByRole('button', { name: /save as meal/i }).click()

      await expect
        .poll(async () => (await templates.where('name', '==', mealName).get()).size, {
          timeout: 20_000,
          message: 'a saved meal (template) should be created',
        })
        .toBeGreaterThan(0)

      // Double-submit guard: the button flips to "Saved" and disables.
      const saved = page.getByRole('button', { name: /saved to your meals/i })
      await expect(saved).toBeVisible()
      await expect(saved).toBeDisabled()
    } finally {
      const created = await templates.where('name', '==', mealName).get()
      await Promise.all(created.docs.map((d) => d.ref.delete().catch(() => {})))
    }
  })

  test('manual entry persists the ingredient breakdown', async ({
    page,
    ownerUserId,
    patientId,
    firestore,
  }) => {
    const mealName = `E2E ingredients ${Date.now()}`
    const mealsCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients').doc(patientId)
      .collection('meal-logs')

    try {
      await page.goto(`/log-meal?patientId=${patientId}`, { waitUntil: 'domcontentloaded' })
      await page
        .getByRole('button', { name: 'Enter meal details manually' })
        .click({ timeout: 90_000 })
      await page.getByPlaceholder('e.g., Chicken and rice').fill(mealName)
      await page.getByRole('button', { name: /add ingredients/i }).click()
      await page.getByPlaceholder(/2 eggs, 1 tbsp butter/i).fill('2 eggs, 1 cup rice')
      await page.getByRole('button', { name: 'Add ingredient', exact: true }).click()
      await expect(page.getByText('2 eggs', { exact: true })).toBeVisible()

      await page.getByRole('button', { name: /save meal/i }).click()

      // Ingredients persist as foodItems on the patient meal-log.
      await expect
        .poll(
          async () => {
            const snap = await mealsCol.where('description', '==', mealName).get()
            return (snap.docs[0]?.data()?.foodItems || []).join('|')
          },
          { timeout: 20_000, message: 'ingredients should persist as foodItems' },
        )
        .toContain('2 eggs')
    } finally {
      const created = await mealsCol.where('description', '==', mealName).get()
      await Promise.all(created.docs.map((d) => d.ref.delete().catch(() => {})))
    }
  })
})
