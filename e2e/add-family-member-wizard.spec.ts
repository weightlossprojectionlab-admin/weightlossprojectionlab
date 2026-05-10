/**
 * Regression: FamilyMemberOnboardingWizard at /patients/new.
 *
 * Walks the 5-step wizard (type_selection → basic_info → vitals →
 * conditions → review) for several persona archetypes. After each
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
  /** Optional weight goal — fills the goals subsection. */
  weightGoal?: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'
  /** Optional target weight (lbs). Only filled when weightGoal != maintain-weight. */
  targetWeightLbs?: string
  /** Conditions to multi-select on the conditions step. Empty = skip. */
  conditions?: string[]
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
      weightGoal: 'maintain-weight',
      notes: 'Adult spouse, no chronic conditions, active lifestyle, baseline persona.',
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
      weightGoal: 'improve-health',
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
      weightGoal: 'gain-muscle',
      targetWeightLbs: '170',
      conditions: ['Other'],
      notes: 'Senior grandparent (~86) — special-needs (Alzheimer\'s). Sedentary + gain-muscle to exercise targetWeight wiring; "Other" condition.',
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

  // NameInput is blur-commit; fill then blur explicitly.
  await page.getByPlaceholder('Enter name').fill(p.name)
  await page.getByPlaceholder('Enter name').blur()

  // The single date input on basic_info is DOB.
  await page.locator('input[type="date"]').first().fill(p.dateOfBirth)

  // First select on basic_info is relationship; second is bloodType.
  await page.locator('select').first().selectOption(p.relationship)

  await page.getByRole('button', { name: p.gender, exact: true }).click()

  if (p.bloodType) {
    await page.locator('select').nth(1).selectOption(p.bloodType)
  }

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function fillAdultVitals(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Health vitals', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  // Height (imperial) + weight.
  await page.getByPlaceholder('5', { exact: true }).fill(p.heightFeet)
  await page.getByPlaceholder('8', { exact: true }).fill(p.heightInches)
  await page.getByPlaceholder('150', { exact: true }).fill(p.weightLbs)

  // Activity Level. Note the select order on this step:
  //   .nth(0) → weight-unit selector beside the weight input
  //   .nth(1) → Activity Level
  //   .nth(2) → Weight Goal (when showGoals=true)
  await page.locator('select').nth(1).selectOption(p.activityLevel)

  // Optional Goals subsection — only shown for humans (showGoals=true).
  if (p.weightGoal) {
    await page.locator('select').nth(2).selectOption(p.weightGoal)

    // Target Weight only renders when weightGoal != maintain-weight.
    if (p.targetWeightLbs && p.weightGoal !== 'maintain-weight') {
      // Target weight input has placeholder "140" (for lbs). Use
      // exact match so it doesn't collide with the current-weight
      // placeholder "150".
      await page.getByPlaceholder('140', { exact: true }).fill(p.targetWeightLbs)
    }
  }

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function pickConditionsOrSkip(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Health conditions', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  for (const condition of p.conditions ?? []) {
    // Conditions render as toggle buttons with the condition text.
    await page.getByRole('button', { name: condition, exact: true }).click()
  }

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function reviewAndCreate(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Review & create', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })
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
      await pickConditionsOrSkip(page, p)
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
      expect(created.relationship).toBe(p.relationship)
      expect(created.type).toBe('human')
      if (p.bloodType) expect(created.bloodType).toBe(p.bloodType)
      expect(typeof created.currentWeight).toBe('number')
      expect(created.currentWeight).toBe(parseFloat(p.weightLbs))
      // Conditions: the wizard stores selected condition keys on
      // healthConditions. Each selected condition should appear.
      if (p.conditions?.length) {
        for (const c of p.conditions) {
          expect(created.healthConditions, `${c} in healthConditions`).toEqual(
            expect.arrayContaining([c]),
          )
        }
      }

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
