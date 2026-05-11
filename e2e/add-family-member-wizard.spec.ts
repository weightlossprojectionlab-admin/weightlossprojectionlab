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

  // Relationship select (the only remaining select on basic_info
  // after the 2026-05-11 slim — bloodType was moved to the
  // patient detail page Info tab editor).
  await page.locator('select').first().selectOption(p.relationship)

  await page.getByRole('button', { name: p.gender, exact: true }).click()

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

async function fillAdultVitals(page: Page, p: AdultPersona) {
  await expect(
    page.getByRole('heading', { name: 'Current weight', level: 2 }),
  ).toBeVisible({ timeout: 30_000 })

  // Slim vitals step: only currentWeight is collected at the wizard.
  // Height, activity level, weight goal, target weight all moved to
  // the patient detail page Info tab (PatientFieldEditor) — edited
  // post-onboarding when the caregiver has time to fill them in.
  await page.getByPlaceholder('150', { exact: true }).fill(p.weightLbs)

  await page.getByRole('button', { name: 'Continue', exact: true }).click()
}

// The conditions step was removed from the wizard in the 2026-05-11
// slim. Health conditions are now edited via the multi-select cell
// on the patient detail page Info tab. The personas' `conditions`
// metadata stays in the fixture (documents semantic intent) but is
// no longer asserted as wizard-captured.

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
      expect(created.relationship).toBe(p.relationship)
      expect(created.type).toBe('human')
      expect(typeof created.currentWeight).toBe('number')
      expect(created.currentWeight).toBe(parseFloat(p.weightLbs))

      // Fields NOT asserted (intentionally — wizard no longer collects):
      //  - bloodType: moved to patient detail Info tab editor.
      //  - healthConditions: same.
      //  - height / activityLevel / weightGoal / targetWeight: same.
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
