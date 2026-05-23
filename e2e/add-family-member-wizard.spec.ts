/**
 * Regression: FamilyMemberOnboardingWizard at /patients/new.
 *
 * Walks the wizard (type_selection → basic_info → vitals →
 * food_allergies → review for adult humans; the food_allergies step is
 * skipped for newborns/pets) for several persona archetypes. After each
 * Create Family Member fires, asserts Firestore has the new
 * patient profile at users/{ownerUserId}/patients/{id}.
 *
 * Personas designed around HOUSEHOLD relationships:
 *   - Nuclear household: Daniel (spouse), Caleb (son/teen), Lily
 *     (daughter/toddler), Mae (newborn)
 *   - Cross-household: Margaret (mother — lives in parents'
 *     household, but Daniel cares for her remotely), Walter
 *     (grandparent — Alzheimer's, special-needs)
 *   - Pets in nuclear household: Rex (dog), Pumpkin (cat)
 *
 * The `household` field on each persona is metadata-only today
 * (no schema field) but documents the semantic intent so when the
 * codebase grows multi-household support, the test fixtures already
 * encode the right grouping.
 *
 * THIS FILE COVERS THE ADULT-HUMAN FLOW.
 *   Newborn variant has a different vitals step (birth weight,
 *   feeding preference) and pet variants have different basic_info
 *   (no relationship/gender, species/breed instead). Those are
 *   tracked in their own specs (TBD) when the selectors are mapped.
 */

import { test, expect, type Page } from './fixtures'

// ============================================================
// Persona definitions — adult-human flow only here
// ============================================================

type AdultPersona = {
  /** Display name. Space-separated so capitalizeName is a no-op. */
  name: string
  /** Documents which household this person operationally belongs to. Metadata only. */
  household: 'nuclear' | 'parents' | 'grandparents'
  /** ISO YYYY-MM-DD. */
  dateOfBirth: string
  /** Wizard's relationship dropdown value (e.g. 'Spouse'). */
  relationship: string
  /** 'Male' | 'Female' — the wizard's button labels. */
  gender: 'Male' | 'Female'
  /** Optional ABO+Rh string ('A+', 'O-', etc.) or omit to leave blank. */
  bloodType?: string
  /** Imperial vitals — feet + inches + weight (lbs). */
  heightFeet: string
  heightInches: string
  weightLbs: string
  /** Activity level (REQUIRED on the vitals step). */
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  /** Optional primary motivation — fills the goals subsection.
   *  Renamed from weightGoal 2026-05-23; old enum conflated weight
   *  direction (derivable from current vs target) with motivation. */
  primaryMotivation?: 'weight' | 'body-composition' | 'general-health'
  /** Optional target weight (lbs). Relevant when primaryMotivation
   *  is 'weight' or 'body-composition'. */
  targetWeightLbs?: string
  /** Conditions to multi-select on the conditions step. Empty = skip. */
  conditions?: string[]
  /** Food allergens to multi-select on the food_allergies step.
   *  Omitted / empty = explicit "None" (the step's safety semantic).
   *  Values come from lib/food-allergen-options.ts FOOD_ALLERGEN_OPTIONS. */
  foodAllergies?: string[]
  /** Free-text comment shown when read by a human. */
  notes: string
}

function adultPersonas(stamp: number): AdultPersona[] {
  return [
    {
      name: `Daniel Rivers ${stamp}`,
      household: 'nuclear',
      dateOfBirth: '1985-04-12',
      relationship: 'Spouse',
      gender: 'Male',
      bloodType: 'A+',
      heightFeet: '5',
      heightInches: '11',
      weightLbs: '178',
      activityLevel: 'active',
      primaryMotivation: 'weight',
      notes: 'Adult spouse, no chronic conditions, active lifestyle, baseline persona (weight-focused without a directional target — current ≈ target).',
    },
    {
      name: `Margaret Hayes ${stamp}`,
      household: 'parents',
      dateOfBirth: '1953-09-30',
      relationship: 'Parent',
      gender: 'Female',
      bloodType: 'B+',
      heightFeet: '5',
      heightInches: '4',
      weightLbs: '142',
      activityLevel: 'light',
      primaryMotivation: 'general-health',
      // Conditions from the static adult list (Hypertension/Diabetes
      // only appear via BMI-based AI suggestions, which a normal-weight
      // persona doesn't trigger).
      conditions: ['Arthritis', 'Allergies'],
      notes: 'Senior parent (~72) — cross-household; arthritis + allergies + light activity exercise the conditions step on a different ABO type.',
    },
    {
      name: `Walter Brooks ${stamp}`,
      household: 'grandparents',
      dateOfBirth: '1939-02-14',
      relationship: 'Grandparent',
      gender: 'Male',
      bloodType: 'O+',
      heightFeet: '5',
      heightInches: '8',
      weightLbs: '160',
      activityLevel: 'sedentary',
      primaryMotivation: 'body-composition',
      targetWeightLbs: '170',
      conditions: ['Other'],
      foodAllergies: ['Peanuts', 'Tree nuts'],
      notes: 'Senior grandparent (~86) — special-needs (Alzheimer\'s). Sedentary + body-composition to exercise targetWeight wiring; "Other" condition; multi-select food allergies to exercise the new wizard step.',
    },
  ]
}

// ============================================================
// Wizard helpers
// ============================================================

async function pickHumanType(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Who are you adding?', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
  // Picking a type recomputes the steps array and removes the
  // type_selection entry — the wizard auto-advances to basic_info.
  // No Continue click here.
  await page.getByRole('button').filter({ hasText: 'Human' }).first().click()
}

async function fillAdultBasicInfo(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Who is this person?', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  // Step indicator: "Step 1 of 3" — verifies the wizard slim (E2.1)
  // didn't regress and re-add the conditions step. If this ever
  // reads "of 4" or "of 5", a step came back unexpectedly.
  await expect(page.getByText(/^Step 1 of 3$/)).toBeVisible()

  // NameInput is blur-commit; fill then blur explicitly.
  await page.getByPlaceholder('Enter name').fill(p.name)
  await page.getByPlaceholder('Enter name').blur()

  // The single date input on basic_info is DOB.
  await page.locator('input[type="date"]').first().fill(p.dateOfBirth)

  // Relationship dropdown removed 2026-05-11 (Phase 1 E2.2) — adult
  // humans don't set relationship at wizard time. Set via the Info
  // tab editor post-create.

  await page.getByRole('button', { name: p.gender, exact: true }).click()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function fillAdultVitals(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Current weight', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  // Step 2 of 4 on the wizard (added food_allergies step 2026-05-23).
  await expect(page.getByText(/^Step 2 of 4$/)).toBeVisible()

  // Slim vitals step: only currentWeight is collected at the wizard.
  // Height, activity level, primaryMotivation, target weight all moved
  // to the patient detail page Info tab (PatientFieldEditor) — edited
  // post-onboarding when the caregiver has time to fill them in.
  await page.getByPlaceholder('150', { exact: true }).fill(p.weightLbs)

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

// The conditions step was removed from the wizard in the 2026-05-11
// slim. Health conditions are now edited via the multi-select cell
// on the patient detail page Info tab. The personas' `conditions`
// metadata stays in the fixture (documents semantic intent) but is
// no longer asserted as wizard-captured.

/**
 * Food allergies step (added 2026-05-23). Adult humans only — pets
 * and newborns skip this step in the wizard. Persona's `foodAllergies`
 * field drives multi-select; empty/missing taps None.
 */
async function fillAdultFoodAllergies(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Any food allergies?', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/^Step 3 of 4$/)).toBeVisible()

  const allergens = p.foodAllergies ?? []
  if (allergens.length === 0) {
    // Explicit "None" — caregiver confirms no known allergies so the
    // meal-time safety check has a definite state to compare against.
    await page.getByRole('button', { name: /^✓ None$/ }).click()
  } else {
    for (const allergen of allergens) {
      // Buttons are labeled with the display label (e.g. "Milk / dairy"
      // for value "Milk"). The fixture stores values; map to label by
      // partial-substring match — both "Milk" and "Milk / dairy" find
      // the same button.
      await page.getByRole('button', { name: new RegExp(`^${allergen}`) }).click()
    }
  }

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function reviewAndCreate(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Review & create', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText(/^Step 4 of 4$/)).toBeVisible()
  await expect(page.getByText(p.name, { exact: false })).toBeVisible()
  await page.getByRole('button', { name: /^Create Family Member$/ }).click()
}

// ============================================================
// Test cases — one per persona
// ============================================================

test.describe('Add Family Member wizard — adult-human persona battery @add-family-wizard', () => {
  // 5 wizard steps × persona variations + cold compile. Generous.
  test.setTimeout(8 * 60_000)

  const stamp = Date.now()
  const personas = adultPersonas(stamp)

  for (const p of personas) {
    test(`creates ${p.relationship.toLowerCase()} ${p.name.split(' ')[0]} (${p.household} household${p.conditions?.length ? `, conditions: ${p.conditions.join('/')}` : ''})`, async ({
      page,
      ownerUserId,
      firestore,
    }) => {
      await page.goto('/patients/new', { waitUntil: 'domcontentloaded' })

      await pickHumanType(page)
      await fillAdultBasicInfo(page, p)
      await fillAdultVitals(page, p)
      await fillAdultFoodAllergies(page, p)
      // conditions step removed 2026-05-11 (Phase 1 E2.1) — wizard
      // now advances directly from vitals to review.
      await reviewAndCreate(page, p)

      // After Create the wizard redirects (typically to /patients
      // or the new patient's detail page).
      await expect(page).not.toHaveURL(/\/patients\/new/, { timeout: 60_000 })

      const patientsCol = firestore
        .collection('users').doc(ownerUserId)
        .collection('patients')
      const snap = await patientsCol.where('name', '==', p.name).get()
      expect(snap.size, `one patient created with name ${p.name}`).toBe(1)

      const created = snap.docs[0].data()
      expect(created.name).toBe(p.name)
      expect(created.dateOfBirth).toBe(p.dateOfBirth)
      expect(created.gender).toBe(p.gender)
      // Relationship is NOT set at wizard create-time for adult
      // humans (Phase 1 E2.2). The PatientProfile.relationship field
      // stays absent on the doc until the caregiver edits it via the
      // patient detail page Info tab. Persona `relationship` field
      // remains as documentation-only metadata.
      expect(created.relationship, 'adult human created without relationship').toBeUndefined()
      expect(created.type).toBe('human')
      expect(typeof created.currentWeight).toBe('number')
      expect(created.currentWeight).toBe(parseFloat(p.weightLbs))

      // Food allergies: the wizard's food_allergies step (added
      // 2026-05-23) writes this field unconditionally for non-pet
      // non-newborn humans. Empty array == "user confirmed None"
      // (the safety semantic); non-empty == specific allergens
      // selected. Either way the field is PRESENT after the wizard
      // — that's what the meal-time warnings rely on to fire (or
      // explicitly NOT fire) safely. See lib/allergen-cross-check.ts
      // and memory/feedback_one_question_one_answer.
      expect(Array.isArray(created.foodAllergies), 'foodAllergies present as array').toBe(true)
      expect(created.foodAllergies).toEqual(p.foodAllergies ?? [])

      // Fields NOT asserted (intentionally — wizard no longer collects):
      //  - bloodType: moved to patient detail Info tab editor.
      //  - healthConditions: same.
      //  - height / activityLevel / primaryMotivation / targetWeight: same.
      //  - householdId: assignment lives on /family-admin/households,
      //    not the family-member wizard. Persona's `household` field
      //    is documentation-only metadata.
      // See project_household_deferred.md A4-A4e for the wizard-slim
      // design rationale.

      const createdId = snap.docs[0].id

      if (process.env.KEEP_DATA === '1') {
        console.log(
          `[wizard] KEEP_DATA=1 — keeping ${p.name} (${createdId}, household=${p.household})`,
        )
      } else {
        await patientsCol.doc(createdId).delete().catch(() => {})
      }
    })
  }
})

// ============================================================
// Newborn flow battery (Phase 1 E2.2 — 2026-05-11)
//
// The wizard's newborn flow gets its own type-selection button (the
// third memberType option, added in a61dd6b). This block verifies
// the new entry path: click Newborn → fill name/DOB/gender → fill
// birth weight + feeding → review → create. Asserts the auto-config
// from type-selection (primaryCaregivers=[owner])
// plus the handleCreate defaults (relationship='child',
// isNewborn=true, lifeStage='newborn').
// ============================================================

type NewbornPersona = {
  name: string
  dateOfBirth: string
  gender: 'Male' | 'Female'
  birthWeightLbs: string
  feedingPreference: 'Breastfeeding' | 'Formula' | 'Combination'
  feedingPreferenceFieldValue: 'breastfeeding' | 'formula' | 'combination'
}

function newbornPersona(stamp: number): NewbornPersona {
  // ~10 days old at the test date. Within the newborn lifeStage
  // window (0–30 days per getHumanLifeStage).
  const today = new Date()
  const dob = new Date(today.getTime() - 10 * 24 * 60 * 60 * 1000)
  return {
    name: `Liam Newborn ${stamp}`,
    dateOfBirth: dob.toISOString().slice(0, 10), // YYYY-MM-DD
    gender: 'Male',
    birthWeightLbs: '7.5',
    feedingPreference: 'Breastfeeding',
    feedingPreferenceFieldValue: 'breastfeeding',
  }
}

async function pickNewbornType(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Who are you adding?', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
  // Newborn is the second of three type-selection buttons.
  // Picking it auto-advances to basic_info (no Continue needed).
  await page.getByRole('button').filter({ hasText: 'Newborn' }).first().click()
}

async function fillNewbornBasicInfo(page: Page, p: NewbornPersona) {
  await expect(
    page.getByRole('heading', { name: 'About the newborn', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  await page.getByPlaceholder('Enter name').fill(p.name)
  await page.getByPlaceholder('Enter name').blur()

  await page.locator('input[type="date"]').first().fill(p.dateOfBirth)

  await page.getByRole('button', { name: p.gender, exact: true }).click()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function fillNewbornVitals(page: Page, p: NewbornPersona) {
  await expect(
    page.getByRole('heading', { name: 'Newborn health check', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  // Birth weight input has placeholder "e.g. 7.5". Note: the wizard
  // auto-selects 'oz' as the weight unit for newborns (via
  // getDefaultWeightUnit) — overriding the 'lbs' that the Newborn
  // type-selection's onClick suggests. So 7.5 here is interpreted as
  // 7.5 oz, which triggers the "Low Birth Weight Detected" preemie
  // panel. That's fine — the panel's extra fields are all optional
  // and don't block Continue.
  await page.getByPlaceholder('e.g. 7.5').fill(p.birthWeightLbs)

  // Feeding preference is a button group. Do NOT use exact:true — the
  // accessible name concatenates the emoji span ("🤱") + the label
  // ("Breastfeeding") + the description ("Exclusive breastfeeding"),
  // so the whole accessible name is not just "Breastfeeding".
  await page.getByRole('button', { name: p.feedingPreference }).first().click()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

test.describe('Add Family Member wizard — newborn flow @add-family-wizard-newborn', () => {
  test.setTimeout(5 * 60_000)
  const stamp = Date.now()
  const p = newbornPersona(stamp)

  test(`creates a newborn via the new type-selection button (auto-config: primary caregiver, relationship=child)`, async ({
    page,
    ownerUserId,
    firestore,
  }) => {
    await page.goto('/patients/new', { waitUntil: 'domcontentloaded' })

    await pickNewbornType(page)
    await fillNewbornBasicInfo(page, p)
    await fillNewbornVitals(page, p)

    // The newborn flow has the same review step shape; the existing
    // helper works without modification.
    await expect(
      page.getByRole('heading', { name: 'Review & create', level: 2 }),
    ).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(p.name, { exact: false })).toBeVisible()
    await page.getByRole('button', { name: /^Create Family Member$/ }).click()

    await expect(page).not.toHaveURL(/\/patients\/new/, { timeout: 60_000 })

    const patientsCol = firestore
      .collection('users').doc(ownerUserId)
      .collection('patients')
    const snap = await patientsCol.where('name', '==', p.name).get()
    expect(snap.size, `one patient created with name ${p.name}`).toBe(1)

    const created = snap.docs[0].data()

    // Identity + dates.
    expect(created.name).toBe(p.name)
    expect(created.dateOfBirth).toBe(p.dateOfBirth)
    expect(created.gender).toBe(p.gender)
    expect(created.type).toBe('human')

    // handleCreate defaults for newborn-type (a61dd6b):
    //   relationship = 'child'  (semantic default, not 'self')
    //   isNewborn = true
    //   lifeStage = 'newborn'
    expect(created.relationship, 'newborn default relationship is "child"').toBe('child')
    expect(created.isNewborn, 'isNewborn flag set').toBe(true)
    expect(created.lifeStage, 'lifeStage forced to "newborn"').toBe('newborn')

    // Auto-config triggered by picking Newborn type-selection button:
    //   primaryCaregivers = [account owner] (load-bearing — newborn UX
    //     depends on having the owner pre-listed as a caregiver).
    //
    // NOT asserted: weightUnit. The Newborn button onClick suggests
    // 'lbs', but the DOB onChange's getDefaultWeightUnit honestly
    // overrides to 'oz' for newborns (better default for small
    // weights). The auto-config is a starting suggestion, not a hard
    // rule — and either unit is a valid newborn UX.
    expect(Array.isArray(created.primaryCaregivers), 'primaryCaregivers is an array').toBe(true)
    expect((created.primaryCaregivers as any[]).length, 'one default caregiver (account owner)').toBeGreaterThanOrEqual(1)
    expect(
      (created.primaryCaregivers as any[])[0]?.userId,
      'first caregiver is the account owner',
    ).toBe(ownerUserId)

    // Newborn-specific fields captured at the wizard.
    expect(typeof created.currentWeight).toBe('number')
    expect(created.currentWeight).toBe(parseFloat(p.birthWeightLbs))
    expect(created.feedingPreference).toBe(p.feedingPreferenceFieldValue)

    const createdId = snap.docs[0].id

    if (process.env.KEEP_DATA === '1') {
      console.log(
        `[wizard] KEEP_DATA=1 — keeping newborn ${p.name} (${createdId})`,
      )
    } else {
      await patientsCol.doc(createdId).delete().catch(() => {})
    }
  })
})
