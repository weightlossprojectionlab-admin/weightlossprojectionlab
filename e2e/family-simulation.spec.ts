import { test, expect } from './fixtures'
import {
  type MemberProfile,
  seedMemberProfile,
  seedTimeSeries,
  createHousehold,
  seedDataOnlyCaregiver,
  deleteMember,
} from './helpers/family-sim'

/**
 * Family simulation — FOUNDATION (Phase 1a).
 *
 * Models two UNRELATED households linked by ONE shared (data-only)
 * caregiver — the topology chosen for this simulation. Each member
 * carries a realistic medical profile (chronic disease, special needs,
 * senior multi-morbidity) plus 35 days of data, so the owner-facing
 * surfaces have real cause to render.
 *
 *   Rivera Home (HH-A)
 *     - Maria Rivera   adult, Type 2 Diabetes + Hypertension, shellfish allergy
 *     - Diego Rivera   child, autism/sensory feeding needs, egg + peanut allergy
 *   Okafor Home (HH-B)
 *     - Grace Okafor   senior, heart disease + CKD, walker + glucose monitor
 *   Shared caregiver (data-only, no login)
 *     - Nurse Rosa     spans Maria (HH-A) + Grace (HH-B)
 *
 * This is the FOUNDATION: it proves the family structure + medical
 * complexity + cross-household caregiver render on owner surfaces.
 * The cause→effect chains (missed appt, abnormal vital → alert,
 * overdue chore, shopping/inventory) layer on top in later phases.
 *
 * Run:
 *   npx playwright test e2e/family-simulation.spec.ts --headed
 *   KEEP_DATA=1 to skip cleanup.
 */

const STAMP = String(Date.now()).slice(-5)
const CAREGIVER_UID = `sim-cg-nurse-rosa-${STAMP}`

// Household ids captured at seed time, consumed by the scoping
// regression test (drives the active household via localStorage).
let riveraId = ''
let okaforId = ''

const maria: MemberProfile = {
  key: 'maria', name: `Maria Rivera ${STAMP}`, dob: '1972-04-18', gender: 'female',
  heightInches: 64, currentWeightLbs: 178, startWeight: 195, targetWeight: 150, relationship: 'self',
  healthConditions: ['Diabetes', 'Hypertension'],
  foodAllergies: ['Shellfish'],
  medications: [
    { name: 'Metformin', strength: '500mg', dosageForm: 'tablet', frequency: 'Twice daily', prescribedFor: 'Type 2 Diabetes' },
    { name: 'Lisinopril', strength: '10mg', dosageForm: 'tablet', frequency: 'Once daily', prescribedFor: 'Hypertension' },
  ],
  familyHistory: [{ relativeRelationship: 'mother', condition: 'Type 2 Diabetes', ageOfOnset: 58, isLiving: true }],
  immunizations: [{ vaccineName: 'Influenza', doseNumber: 1, daysAgo: 120, nextDueInDays: 245 }],
}

const diego: MemberProfile = {
  key: 'diego', name: `Diego Rivera ${STAMP}`, dob: '2017-09-12', gender: 'male',
  heightInches: 50, currentWeightLbs: 52, startWeight: 50, relationship: 'child',
  healthConditions: ['Other'],
  foodAllergies: ['Eggs', 'Peanuts'],
  preferredFoods: ['chicken', 'white rice', 'carrots'],
  aversions: ['mushrooms', 'mixed foods'],
  preparationNeeds: { texture: 'soft', cutSize: 'small-cubes', separated: true, notes: 'Autism — foods must not touch; familiar textures only' },
  practiceNotes: 'ASD diagnosis; works with OT on feeding skills.',
  immunizations: [{ vaccineName: 'MMR', doseNumber: 2, daysAgo: 400 }],
}

const grace: MemberProfile = {
  key: 'grace', name: `Grace Okafor ${STAMP}`, dob: '1946-02-03', gender: 'female',
  heightInches: 62, currentWeightLbs: 168, startWeight: 175, targetWeight: 160, relationship: 'self',
  healthConditions: ['Heart Disease', 'Kidney Disease'],
  dietaryRestrictions: ['low-sodium', 'low-potassium'],
  medications: [
    { name: 'Furosemide', strength: '20mg', dosageForm: 'tablet', frequency: 'Once daily', prescribedFor: 'Heart failure / edema' },
    { name: 'Atorvastatin', strength: '40mg', dosageForm: 'tablet', frequency: 'Once daily', prescribedFor: 'High cholesterol' },
  ],
  equipment: [
    { name: 'Walker (Rollator)', type: 'mobility', prescribedBy: 'Dr. Martinez', notes: 'Stability for walking + meal prep' },
    { name: 'Glucose Monitor', type: 'monitoring' },
  ],
  familyHistory: [{ relativeRelationship: 'father', condition: 'Heart Disease', ageOfOnset: 60, isLiving: false }],
  immunizations: [
    { vaccineName: 'Pneumococcal', doseNumber: 1, daysAgo: 300 },
    { vaccineName: 'Influenza', doseNumber: 1, daysAgo: 90, nextDueInDays: 275 },
  ],
}

const ALL = [maria, diego, grace]

test.use({ launchOptions: { slowMo: 400 } })

test.describe.serial('Family simulation — foundation', () => {
  test.setTimeout(180_000)

  test('Seed two households + members (medical complexity) + shared caregiver', async ({ ownerUserId, firestore }) => {
    // Owner display name for the caregiverOf back-link.
    const ownerDoc = await firestore.collection('users').doc(ownerUserId).get()
    const ownerName = ownerDoc.data()?.name || ownerDoc.data()?.email || 'Account Owner'

    // Members + full medical profile (conditions, allergies, equipment,
    // family-history, immunizations) + 35 days of data each.
    for (const m of ALL) {
      await seedMemberProfile(firestore, ownerUserId, m, /* household set below */ '')
      await seedTimeSeries(firestore, ownerUserId, m)
    }

    // Two unrelated households.
    riveraId = await createHousehold(firestore, ownerUserId, `Rivera Home ${STAMP}`, [maria.patientId!, diego.patientId!])
    okaforId = await createHousehold(firestore, ownerUserId, `Okafor Home ${STAMP}`, [grace.patientId!])

    // One shared, data-only caregiver spanning a patient in EACH household.
    await seedDataOnlyCaregiver(
      firestore, ownerUserId,
      { uid: CAREGIVER_UID, name: `Nurse Rosa ${STAMP}`, email: `rosa.${STAMP}@example.com`, relationship: 'caregiver' },
      ownerName,
      [maria.patientId!, grace.patientId!],
    )

    console.log(`→ Seeded: Maria=${maria.patientId} Diego=${diego.patientId} Grace=${grace.patientId}; caregiver=${CAREGIVER_UID}`)
    expect(maria.patientId && diego.patientId && grace.patientId).toBeTruthy()
  })

  test('/family-admin/households shows both households', async ({ page }) => {
    await page.goto('/family-admin/households', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(`Rivera Home ${STAMP}`).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(`Okafor Home ${STAMP}`).first()).toBeVisible({ timeout: 15_000 })
    console.log('→ Households OK: both residences render')
    await page.waitForTimeout(2000)
  })

  test('/patients shows all three members (under "All households")', async ({ page }) => {
    await page.goto('/patients', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
    // With 2+ households the roster now scopes to the active household
    // by default (the switcher fix), so all three members are NOT all
    // visible at once. Switch to "All households" to see the whole
    // roster, then assert every member appears.
    await page.getByRole('button', { name: /^All households/ }).click({ timeout: 30_000 })
    for (const m of ALL) {
      await expect(page.getByText(m.name, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    }
    console.log('→ Roster OK: all three members listed under All households')
    await page.waitForTimeout(2000)
  })

  test('/patients scopes to the active household (regression for the switcher fix)', async ({ page }) => {
    // Race-free proof of the scoping fix, independent of WHICH household
    // is active (which depends on a context-restore timing we don't want
    // to couple this test to):
    //   1. The scope UI ("Showing:" + "All households") renders — it did
    //      NOT exist before the fix.
    //   2. The default scoped view shows FEWER than all 3 members — our
    //      members span two households, so no single household holds all
    //      three. This proves the roster is actually being filtered.
    //   3. "All households" reveals every member.
    await page.goto('/patients', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })

    // (1) The scoping UI exists (2+ households → "Showing:" + chips).
    await expect(page.getByText('Showing:', { exact: false })).toBeVisible({ timeout: 30_000 })
    const allBtn = page.getByRole('button', { name: /^All households/ })
    await expect(allBtn).toBeVisible()

    // (2) Default scope hides at least one member (they span 2 households).
    const names = [maria.name, diego.name, grace.name]
    let visibleByDefault = 0
    for (const n of names) {
      if (await page.getByText(n, { exact: false }).count() > 0) visibleByDefault++
    }
    expect(visibleByDefault, 'scoped view hides the other household\'s members').toBeLessThan(3)

    // (3) "All households" reveals the full roster.
    await allBtn.click()
    for (const n of names) {
      await expect(page.getByText(n, { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    }
    console.log(`→ Scoping OK: scope UI present, default showed ${visibleByDefault}/3, "All households" revealed all 3`)
    await page.waitForTimeout(2000)
  })

  test('Maria info tab — diabetes + hypertension + shellfish allergy', async ({ page }) => {
    await page.goto(`/patients/${maria.patientId}?tab=info`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
    await expect(page.getByRole('heading', { name: /Family Member Information/i }).first()).toBeVisible({ timeout: 30_000 })
    // Health conditions + food allergies render their option LABELS.
    await expect(page.getByText('Diabetes', { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Hypertension', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('Shellfish', { exact: false }).first()).toBeVisible()
    console.log('→ Maria OK: chronic conditions + allergy render')
    await page.waitForTimeout(2000)
  })

  test('Diego info tab — egg/peanut allergy + sensory food profile', async ({ page }) => {
    await page.goto(`/patients/${diego.patientId}?tab=info`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
    await expect(page.getByRole('heading', { name: /Family Member Information/i }).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Eggs', { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Peanuts', { exact: false }).first()).toBeVisible()
    // Sensory food profile: a preferred (safe) food + an aversion.
    await expect(page.getByText('chicken', { exact: false }).first()).toBeVisible()
    await expect(page.getByText('mushrooms', { exact: false }).first()).toBeVisible()
    console.log('→ Diego OK: allergies + sensory food profile render')
    await page.waitForTimeout(2000)
  })

  test('Grace info tab — heart disease + kidney disease', async ({ page }) => {
    await page.goto(`/patients/${grace.patientId}?tab=info`, { waitUntil: 'domcontentloaded' })
    await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
    await expect(page.getByRole('heading', { name: /Family Member Information/i }).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('Heart disease', { exact: false }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Kidney disease', { exact: false }).first()).toBeVisible()
    console.log('→ Grace OK: senior multi-morbidity renders')
    await page.waitForTimeout(2000)
  })

  test('Shared caregiver spans both households (data + roles surface)', async ({ page, ownerUserId, firestore }) => {
    // Data proof: Nurse Rosa's caregiverOf grants access to a patient in
    // EACH household, and the owner's roster + per-patient entries exist.
    const cgDoc = await firestore.collection('users').doc(CAREGIVER_UID).get()
    const caregiverOf = (cgDoc.data()?.caregiverOf ?? []) as Array<{ patientsAccess: string[] }>
    expect(caregiverOf.length, 'caregiverOf entry exists').toBeGreaterThan(0)
    const access = caregiverOf[0].patientsAccess
    expect(access).toContain(maria.patientId)
    expect(access).toContain(grace.patientId)
    const roster = await firestore.collection('users').doc(ownerUserId).collection('familyMembers').doc(CAREGIVER_UID).get()
    expect(roster.exists, 'owner familyMembers roster entry').toBeTruthy()

    // UI proof: the caregiver shows on the family roles surface.
    await page.goto('/family-admin/roles', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(`Nurse Rosa ${STAMP}`, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    console.log('→ Caregiver OK: Nurse Rosa spans both households + renders on roles surface')
    await page.waitForTimeout(2000)
  })

  test('Cleanup — remove members, households, caregiver', async ({ ownerUserId, firestore }) => {
    if (process.env.KEEP_DATA === '1') {
      console.log('[family-sim] KEEP_DATA=1 — keeping the synthetic family')
      return
    }
    for (const m of ALL) {
      if (m.patientId) await deleteMember(firestore, ownerUserId, m.patientId)
    }
    // Households created by this run.
    const hh = await firestore.collection('households')
      .where('primaryCaregiverId', '==', ownerUserId).get()
    for (const d of hh.docs) {
      if (String(d.data().name || '').includes(STAMP)) await d.ref.delete()
    }
    // Owner roster entry + caregiver user doc.
    await firestore.collection('users').doc(ownerUserId).collection('familyMembers').doc(CAREGIVER_UID).delete().catch(() => {})
    await firestore.collection('users').doc(CAREGIVER_UID).delete().catch(() => {})
    console.log('[family-sim] Cleanup done')
  })
})
