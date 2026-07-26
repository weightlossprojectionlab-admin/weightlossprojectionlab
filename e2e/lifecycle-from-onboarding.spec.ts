import { test, expect } from './fixtures'
import type { Locator } from '@playwright/test'
import type { Firestore } from 'firebase-admin/firestore'
import { Timestamp } from 'firebase-admin/firestore'

/**
 * Full platform lifecycle starting from onboarding — MULTI-MEMBER.
 *
 * Semantic intent: simulate a real household from day-zero (first click
 * "Add Family Member") through 35 days of accumulated data + every
 * surface that renders it. We onboard several adults via the wizard UI,
 * setting a target weight for some via the BMI "Set target" suggestion
 * (some members can have NO target — see MEMBERS[].setTarget), then for
 * EACH member: seed 35 days of data and navigate all 9 surfaces.
 *
 * Per member:
 *   Stage 0  Onboard via wizard UI (Person → name/DOB/gender →
 *            height+weight → optionally Set Target → allergies → create)
 *   Stage 1  Direct-seed 35 days of data (admin SDK)
 *   Stage 2  /progress — trend + projection (+ ETA chip if setTarget)
 *   Stage 3  /patients/[id]?tab=vitals — small-multiples grid
 *   Stage 4  /patients/[id]?tab=meals — logger + seeded history readable
 *   Stage 5  /patients/[id]?tab=medications — meds list
 *   Stage 6  /patients/[id]?tab=appointments — past + future appts
 *   Stage 7  /patients/[id]?tab=info — health summary + family info
 *   Stage 8  /dashboard — aggregate
 *   Stage 9  /weight-history — full series
 * Then once for the whole household:
 *   Wrap-up  /patients shows every member → 90s review pause → cleanup
 *
 * Run:
 *   npx playwright test e2e/lifecycle-from-onboarding.spec.ts --headed
 *
 * KEEP_DATA=1 to skip cleanup at the end.
 */

const TEST_STAMP = String(Date.now()).slice(-5)

interface Member {
  key: string
  /** Believable name; suffixed with TEST_STAMP for per-run uniqueness. */
  name: string
  dob: string
  gender: 'Male' | 'Female'
  heightInches: number
  /** Current weight entered in the wizard (lbs) = where the 35-day series ends. */
  currentWeightLbs: number
  /** Where the 35-day weight series starts (lbs). */
  startWeight: number
  /** Goal weight (lbs) — only persisted/used when setTarget is true. */
  targetWeight: number
  /** Whether this member sets a target weight during onboarding. */
  setTarget: boolean
  /** Populated by Stage 0 after the wizard creates the patient. */
  patientId?: string
}

// 3 distinct adults. All set a target weight (per the chosen config) —
// flip any `setTarget` to false to model a goal-less member; Stage 2's
// ETA assertion keys off this flag so that variation just works.
const MEMBERS: Member[] = [
  { key: 'adam',   name: `Adam Carter ${TEST_STAMP}`,    dob: '1970-11-23', gender: 'Male',   heightInches: 70, currentWeightLbs: 198, startWeight: 220, targetWeight: 185, setTarget: true },
  { key: 'bella',  name: `Bella Nguyen ${TEST_STAMP}`,   dob: '1985-06-15', gender: 'Female', heightInches: 64, currentWeightLbs: 165, startWeight: 182, targetWeight: 150, setTarget: true },
  { key: 'carlos', name: `Carlos Mendez ${TEST_STAMP}`,  dob: '1992-03-08', gender: 'Male',   heightInches: 72, currentWeightLbs: 205, startWeight: 225, targetWeight: 190, setTarget: true },
]

// Real humans type ~40-45 wpm. At 5 chars/word that's ~3.5 chars/sec,
// so ~280ms between keystrokes reads as natural typing rather than a
// paste. page.fill() sets the value instantly (a paste); use
// pressSequentially with this delay so a watching human sees the form
// fill at a believable pace.
const HUMAN_TYPE_DELAY_MS = 280

/**
 * Type a value at human pace, then verify + self-correct.
 *
 * Scrolls the field into view and focuses it (the way a person works
 * down a form), types char-by-char at ~43 wpm for a believable visual,
 * then reads the committed value back. React controlled inputs (e.g.
 * NameInput, which commits on blur) intermittently DROP characters
 * during per-keystroke typing — observed turning "Demo Patient 47291"
 * into "Demo47291". If the typed result doesn't match, fall back to
 * fill() so the seeded data is always exactly what we intend while the
 * common path still shows real typing.
 */
async function humanType(field: Locator, text: string): Promise<void> {
  await field.scrollIntoViewIfNeeded()
  await field.click()
  await field.pressSequentially(text, { delay: HUMAN_TYPE_DELAY_MS })
  await field.blur()
  const got = (await field.inputValue()).trim()
  if (got !== text.trim()) {
    await field.fill(text)
    await field.blur()
  }
}

/**
 * Seed 35 days of varied platform data for one member. Each write
 * mirrors the shape its canonical API writer produces, so every read
 * surface (which each query a different path/field) renders the data:
 *   - weightLogs        users/{uid}/weightLogs            (patientId field)
 *   - mealLogs          users/{uid}/mealLogs              (/progress calorie chart)
 *   - meal-logs         users/{uid}/patients/{id}/meal-logs (patient detail)
 *   - vitals            users/{uid}/patients/{id}/vitals  (recordedAt)
 *   - medications       users/{uid}/patients/{id}/medications (addedAt — orderBy field!)
 *   - appointments      users/{uid}/appointments          (USER-level, dateTime, patientId)
 */
async function seedMemberData(
  firestore: Firestore,
  ownerUserId: string,
  member: Member,
): Promise<void> {
  const patientId = member.patientId!
  const userRef = firestore.collection('users').doc(ownerUserId)
  const patientRef = userRef.collection('patients').doc(patientId)

  // Profile: height + goals. targetWeight only when this member set one.
  await patientRef.set({
    height: member.heightInches,
    heightUnit: 'imperial',
    goals: {
      startWeight: member.startWeight,
      weeklyWeightLossGoal: 1,
      ...(member.setTarget ? { targetWeight: member.targetWeight } : {}),
    },
  }, { merge: true })

  // Deterministic-but-distinct RNG per member.
  let rngSeed = 1337 + member.key.length * 101 + member.currentWeightLbs
  const random = () => {
    rngSeed = (rngSeed * 9301 + 49297) % 233280
    return rngSeed / 233280
  }

  const today = new Date()
  const slopePerDay = (member.currentWeightLbs - member.startWeight) / 35

  const mealVariants = [
    { type: 'breakfast', hour: 7, items: ['Oatmeal', 'Banana'], cal: 380, p: 12, c: 70, f: 6 },
    { type: 'lunch', hour: 12, items: ['Chicken salad'], cal: 480, p: 38, c: 22, f: 22 },
    { type: 'dinner', hour: 19, items: ['Salmon', 'Sweet potato'], cal: 620, p: 42, c: 50, f: 20 },
  ] as const

  for (let i = 0; i < 35; i++) {
    const daysAgo = 34 - i
    const date = new Date(today)
    date.setDate(date.getDate() - daysAgo)
    date.setHours(8, 0, 0, 0)

    // Weight (every day): startWeight → currentWeightLbs with light noise.
    const w = Math.round((member.startWeight + slopePerDay * i + (random() - 0.5) * 1.4) * 10) / 10
    await userRef.collection('weightLogs').add({
      patientId,
      userId: ownerUserId,
      loggedBy: ownerUserId,
      weight: w,
      unit: 'lbs',
      loggedAt: Timestamp.fromDate(date),
      dataSource: 'lifecycle-seed',
    })

    // 3 meals/day, seeded to BOTH meal locations (see helper docstring).
    for (const m of mealVariants) {
      const md = new Date(date)
      md.setHours(m.hour, Math.floor(random() * 30), 0, 0)
      // (1) user-level — /progress calorie chart
      await userRef.collection('mealLogs').add({
        patientId,
        userId: ownerUserId,
        loggedBy: ownerUserId,
        mealType: m.type,
        foodItems: m.items,
        totalCalories: m.cal,
        totalProtein: m.p,
        totalCarbs: m.c,
        totalFat: m.f,
        loggedAt: Timestamp.fromDate(md),
        dataSource: 'lifecycle-seed',
      })
      // (2) patient subcollection — patient detail Meals tab / sidebar
      await patientRef.collection('meal-logs').add({
        patientId,
        userId: ownerUserId,
        loggedBy: ownerUserId,
        mealType: m.type,
        foodItems: m.items,
        calories: m.cal,
        protein: m.p,
        carbs: m.c,
        fat: m.f,
        loggedAt: md.toISOString(),
        tags: [],
        aiAnalyzed: false,
        dataSource: 'lifecycle-seed',
      })
    }

    // Vitals on varied cadence.
    if (daysAgo % 2 === 0) {
      const elevated = daysAgo % 7 === 0
      await patientRef.collection('vitals').add({
        type: 'blood_pressure',
        value: {
          systolic: elevated ? 132 + Math.floor(random() * 6) : 115 + Math.floor(random() * 10),
          diastolic: elevated ? 86 + Math.floor(random() * 4) : 75 + Math.floor(random() * 8),
        },
        unit: 'mmHg',
        recordedAt: date.toISOString(),
        loggedAt: date.toISOString(),
        loggedBy: ownerUserId,
        takenBy: ownerUserId,
        method: 'manual',
        approvalStatus: 'approved',
        dataSource: 'lifecycle-seed',
      })
    }
    if (daysAgo % 3 === 0) {
      await patientRef.collection('vitals').add({
        type: 'temperature',
        value: Math.round((97.6 + random() * 1.4) * 10) / 10,
        unit: '°F',
        recordedAt: date.toISOString(),
        loggedAt: date.toISOString(),
        loggedBy: ownerUserId,
        takenBy: ownerUserId,
        method: 'manual',
        approvalStatus: 'approved',
        dataSource: 'lifecycle-seed',
      })
    }
    if (daysAgo % 5 === 0) {
      await patientRef.collection('vitals').add({
        type: 'pulse_oximeter',
        value: { spo2: 96 + Math.floor(random() * 3), pulseRate: 65 + Math.floor(random() * 20) },
        unit: 'SpO₂% / bpm',
        recordedAt: date.toISOString(),
        loggedAt: date.toISOString(),
        loggedBy: ownerUserId,
        takenBy: ownerUserId,
        method: 'manual',
        approvalStatus: 'approved',
        dataSource: 'lifecycle-seed',
      })
    }
    if (daysAgo % 4 === 0) {
      await patientRef.collection('vitals').add({
        type: 'blood_sugar',
        value: 95 + Math.floor(random() * 30),
        unit: 'mg/dL',
        recordedAt: date.toISOString(),
        loggedAt: date.toISOString(),
        loggedBy: ownerUserId,
        takenBy: ownerUserId,
        method: 'manual',
        approvalStatus: 'approved',
        dataSource: 'lifecycle-seed',
      })
    }
  }

  // 2 medications. Mirror /api/patients/[id]/medications POST: the
  // reader uses orderBy('addedAt','desc') and Firestore EXCLUDES docs
  // missing the orderBy field — so `addedAt` is mandatory.
  const medNow = new Date().toISOString()
  for (const med of [
    { name: 'Lisinopril', strength: '10mg', dosageForm: 'tablet', frequency: 'Once daily', prescribedFor: 'Blood pressure management' },
    { name: 'Metformin', strength: '500mg', dosageForm: 'tablet', frequency: 'Twice daily', prescribedFor: 'Blood sugar management' },
  ]) {
    await patientRef.collection('medications').add({
      patientId,
      userId: ownerUserId,
      ...med,
      active: true,
      startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      addedAt: medNow,
      addedBy: ownerUserId,
      lastModified: medNow,
      dataSource: 'lifecycle-seed',
    })
  }

  // 5 appointments — USER-level (users/{uid}/appointments), ordered by
  // `dateTime`, filtered client-side by `patientId`. Mirror the
  // /api/appointments POST shape.
  const apptNow = new Date().toISOString()
  for (const a of [
    { daysOffset: -28, providerName: 'Dr. Chen', specialty: 'Primary Care', reason: 'Annual physical', type: 'check-up' },
    { daysOffset: -14, providerName: 'Dr. Patel', specialty: 'Endocrinology', reason: 'Diabetes management', type: 'follow-up' },
    { daysOffset: -7, providerName: 'Dr. Chen', specialty: 'Primary Care', reason: 'BP follow-up', type: 'follow-up' },
    { daysOffset: 7, providerName: 'Dr. Chen', specialty: 'Primary Care', reason: 'Quarterly review', type: 'follow-up' },
    { daysOffset: 21, providerName: 'Dr. Patel', specialty: 'Endocrinology', reason: 'A1C check', type: 'lab-work' },
  ]) {
    const dt = new Date()
    dt.setDate(dt.getDate() + a.daysOffset)
    dt.setHours(10, 0, 0, 0)
    await userRef.collection('appointments').add({
      userId: ownerUserId,
      patientId,
      patientName: member.name,
      dateTime: dt.toISOString(),
      type: a.type,
      status: a.daysOffset < 0 ? 'completed' : 'scheduled',
      providerName: a.providerName,
      specialty: a.specialty,
      reason: a.reason,
      requiresDriver: false,
      driverStatus: 'not-needed',
      createdAt: apptNow,
      createdBy: ownerUserId,
      updatedAt: apptNow,
      updatedBy: ownerUserId,
      dataSource: 'lifecycle-seed',
    })
  }

  // Sync currentWeight to the most-recent log so dashboard cards read
  // from the same source-of-truth.
  const latestSnap = await userRef.collection('weightLogs')
    .where('patientId', '==', patientId).get()
  const latest = latestSnap.docs
    .map(d => ({ w: d.data().weight, t: d.data().loggedAt?.toDate?.()?.getTime?.() ?? 0 }))
    .sort((a, b) => b.t - a.t)[0]
  if (latest) {
    await patientRef.set({ currentWeight: latest.w }, { merge: true })
  }
}

test.use({ launchOptions: { slowMo: 400 } })

// One serial block per member: onboard → seed → navigate every surface.
// IMPORTANT: the describe/test titles must be STATIC. Playwright loads
// this module twice (once to collect tests, once in the worker); a
// title built from a per-load value like Date.now() differs between the
// two loads, and the worker then can't find the test ("Test not found
// in the worker process"). So the title uses the static `member.key`,
// while the stamped `member.name` lives only in the seeded data.
for (const member of MEMBERS) {
  test.describe.serial(`Lifecycle — ${member.key}`, () => {
    test.setTimeout(180_000)

    test('Stage 0 — onboard via the wizard UI', async ({ page, ownerUserId, firestore }) => {
      console.log(`→ Onboarding "${member.name}" (setTarget=${member.setTarget})`)
      await page.goto('/patients/new', { waitUntil: 'domcontentloaded' })

      // Type selection: "Person" (adult human).
      await expect(
        page.getByRole('heading', { name: 'Who are you adding?', level: 2 }),
      ).toBeVisible({ timeout: 30_000 })
      await page.getByRole('button').filter({ hasText: 'Person' }).first().click()

      // Step 1/4: name + DOB + gender.
      await expect(
        page.getByRole('heading', { name: 'Who is this person?', level: 2 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/^Step 1 of 4$/)).toBeVisible()
      await humanType(page.getByPlaceholder('Enter name'), member.name)
      // Date inputs are segmented — a person uses the picker, so .fill()
      // is the realistic analog (slowMo still spaces it out).
      await page.locator('input[type="date"]').first().fill(member.dob)
      await page.getByRole('button', { name: member.gender, exact: true }).click()
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      // Step 2/4: Height & weight (adult humans require both).
      await expect(
        page.getByRole('heading', { name: 'Height & weight', level: 2 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/^Step 2 of 4$/)).toBeVisible()
      await humanType(page.getByPlaceholder('5', { exact: true }), String(Math.floor(member.heightInches / 12)))
      await humanType(page.getByPlaceholder('8', { exact: true }), String(member.heightInches % 12))
      await humanType(page.getByPlaceholder('150', { exact: true }), String(member.currentWeightLbs))

      // Optionally set a target weight via the BMI "Set target to X"
      // suggestion (appears once height+weight yield an off-target BMI).
      if (member.setTarget) {
        const setTargetBtn = page.getByRole('button', { name: /^Set target to / })
        await expect(setTargetBtn).toBeVisible({ timeout: 10_000 })
        await setTargetBtn.scrollIntoViewIfNeeded()
        await setTargetBtn.click()
        // Button flips to a "✓ Target set to X" confirmation.
        await expect(page.getByRole('button', { name: /Target set to/ })).toBeVisible({ timeout: 5_000 })
      }
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      // Step 3/4: food allergies — "None".
      await expect(
        page.getByRole('heading', { name: 'Any food allergies?', level: 2 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/^Step 3 of 4$/)).toBeVisible()
      await page.getByRole('button', { name: /^✓ None$/ }).click()
      await page.getByRole('button', { name: 'Continue', exact: true }).click()

      // Step 4/4: review + create.
      await expect(
        page.getByRole('heading', { name: 'Review & create', level: 2 }),
      ).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/^Step 4 of 4$/)).toBeVisible()
      await expect(page.getByText(member.name, { exact: false })).toBeVisible()
      await page.getByRole('button', { name: /^Create Family Member$/ }).click()

      // Capture the new patient's Firestore ID by name lookup.
      await expect(page).not.toHaveURL(/\/patients\/new/, { timeout: 60_000 })
      const patientsCol = firestore.collection('users').doc(ownerUserId).collection('patients')
      const snap = await patientsCol.where('name', '==', member.name).get()
      expect(snap.size, `one patient created with name ${member.name}`).toBe(1)
      member.patientId = snap.docs[0].id
      console.log(`→ Stage 0 OK: ${member.name} created with ID = ${member.patientId}`)
    })

    test('Stage 1 — seed 35 days of varied data', async ({ ownerUserId, firestore }) => {
      expect(member.patientId, 'patientId from Stage 0').toBeTruthy()
      console.log(`→ Seeding 35 days for ${member.name} (${member.patientId})`)
      await seedMemberData(firestore, ownerUserId, member)
      console.log(`→ Stage 1 OK: data seeded for ${member.name}`)
    })

    test('Stage 2 — /progress trend + projection (+ ETA if target)', async ({ page }) => {
      await page.goto(`/progress?patientId=${member.patientId}`, { waitUntil: 'domcontentloaded' })
      // /progress is a heavy recharts route; on a cold Turbopack compile
      // the chart card (heading + projection legend + ETA chip) lands
      // 20-40s after the page shell. The dev overlay shows "Compiling..."
      // meanwhile. Use a generous timeout on the heading (the "chart
      // compiled + rendered" signal); once it's up the legend + chip are
      // in the same card and follow quickly.
      await expect(
        page.getByRole('heading', { name: /^Weight Trend & Projection$/i, level: 2 }),
      ).toBeVisible({ timeout: 60_000 })
      await expect(page.getByText(/Projected \(if trend continues\)/i)).toBeVisible({ timeout: 25_000 })
      const chip = page.getByTestId('weight-goal-eta')
      if (member.setTarget) {
        // A target weight is what drives the ETA chip — it must render.
        await expect(chip).toBeVisible({ timeout: 20_000 })
        const status = await chip.getAttribute('data-status')
        expect(['achieved', 'on-pace', 'slipping', 'off-track']).toContain(status)
        console.log(`→ Stage 2 OK: projection + ETA status="${status}" for ${member.name}`)
      } else {
        // No target → no ETA chip; the projection still renders.
        await expect(chip).toHaveCount(0)
        console.log(`→ Stage 2 OK: projection (no ETA, no target) for ${member.name}`)
      }
      await page.waitForTimeout(2500)
    })

    test('Stage 3 — Vitals tab small-multiples grid (5 cards)', async ({ page }) => {
      // /patients/[id] + vitals API cold-compile in dev (~6-15s); wait
      // for the real fetch rather than racing a fixed timeout.
      const vitalsResponse = page.waitForResponse(
        (r) => r.url().includes(`/api/patients/${member.patientId}/vitals`) && r.status() === 200,
        { timeout: 90_000 },
      )
      await page.goto(`/patients/${member.patientId}?tab=vitals`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
      await expect(page.getByRole('heading', { name: 'Quick Actions', exact: true })).toBeVisible({ timeout: 30_000 })
      await vitalsResponse
      await page.evaluate(() => window.scrollBy({ top: 1200, behavior: 'instant' as ScrollBehavior }))
      await page.waitForTimeout(800)
      const trends = ['blood pressure', 'temperature', 'pulse oximeter', 'blood sugar', 'weight']
      for (const t of trends) {
        await expect(
          page.getByRole('heading', { name: new RegExp(`^${t}\\s+trend$`, 'i'), level: 3 }),
        ).toBeVisible({ timeout: 15_000 })
      }
      console.log(`→ Stage 3 OK: 5 vital-trend cards visible for ${member.name}`)
      await page.waitForTimeout(2500)
    })

    test('Stage 4 — Meals tab logs + seeded history readable', async ({ page }) => {
      // ?tab=meals is a meal-LOGGING surface ("Log Meals"); history lives
      // in the Recent Meals sidebar (CSS-hidden here at 960px). Assert
      // the logging surface + that seeded meals read back via the API.
      const mealsResponse = page.waitForResponse(
        (r) => r.url().includes(`/api/patients/${member.patientId}/meal-logs`) && r.status() === 200,
        { timeout: 90_000 },
      )
      await page.goto(`/patients/${member.patientId}?tab=meals`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
      await expect(page.getByRole('heading', { name: 'Quick Actions', exact: true })).toBeVisible({ timeout: 30_000 })
      await expect(page.getByRole('heading', { name: /^Log Meals$/i, level: 2 })).toBeVisible({ timeout: 15_000 })
      const resp = await mealsResponse
      const body = await resp.json()
      const count = Array.isArray(body?.data) ? body.data.length : 0
      expect(count, 'patient meal-logs returned by the API').toBeGreaterThan(0)
      console.log(`→ Stage 4 OK: Log Meals + meal-logs API returned ${count} for ${member.name}`)
      await page.waitForTimeout(2500)
    })

    test('Stage 5 — Medications tab shows Lisinopril + Metformin', async ({ page }) => {
      await page.goto(`/patients/${member.patientId}?tab=medications`)
      await expect(page.getByText(/Lisinopril/i).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/Metformin/i).first()).toBeVisible()
      console.log(`→ Stage 5 OK: 2 meds visible for ${member.name}`)
      await page.waitForTimeout(2500)
    })

    test('Stage 6 — Appointments tab shows past + future', async ({ page }) => {
      await page.goto(`/patients/${member.patientId}?tab=appointments`)
      await expect(page.getByText(/Dr\.\s*Chen/i).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/Dr\.\s*Patel/i).first()).toBeVisible()
      console.log(`→ Stage 6 OK: appointments visible for ${member.name}`)
      await page.waitForTimeout(2500)
    })

    test('Stage 7 — Info tab renders health summary + family info', async ({ page }) => {
      await page.goto(`/patients/${member.patientId}?tab=info`, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('Loading your health journey...')).toBeHidden({ timeout: 90_000 })
      await expect(
        page.getByRole('heading', { name: /Family Member Information/i }).first(),
      ).toBeVisible({ timeout: 30_000 })
      await expect(
        page.getByText(/Health Summary|Unlock AI Health Reports/i).first(),
      ).toBeVisible({ timeout: 15_000 })
      console.log(`→ Stage 7 OK: info + health summary for ${member.name}`)
      await page.waitForTimeout(2500)
    })

    test('Stage 8 — /dashboard renders', async ({ page }) => {
      await page.goto(`/dashboard`)
      await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
      console.log(`→ Stage 8 OK: dashboard rendered (during ${member.name})`)
      await page.waitForTimeout(2500)
    })

    test('Stage 9 — /weight-history shows seeded series', async ({ page }) => {
      await page.goto(`/weight-history?patientId=${member.patientId}`)
      await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText(/[12]\d\d/).first()).toBeVisible({ timeout: 15_000 })
      console.log(`→ Stage 9 OK: weight series visible for ${member.name}`)
      await page.waitForTimeout(2500)
    })
  })
}

// Wrap-up runs last (file order): show the whole household, hold for a
// visual review, then clean up every member we created.
test.describe.serial('Wrap-up — household review + cleanup', () => {
  test.setTimeout(180_000)

  test('Household appears on /patients, then review + cleanup', async ({ page, ownerUserId, firestore }) => {
    const created = MEMBERS.filter(m => m.patientId)
    expect(created.length, 'at least one member was created').toBeGreaterThan(0)

    await page.goto('/patients', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('main').first()).toBeVisible({ timeout: 30_000 })
    // Every created member should be listed in the family roster.
    for (const m of created) {
      await expect(page.getByText(m.name, { exact: false }).first()).toBeVisible({ timeout: 30_000 })
    }
    console.log(`→ Household shows ${created.length} member(s): ${created.map(m => m.name).join(', ')}`)
    console.log(`   Browser stays open 90s for review. Ctrl-C to exit sooner.`)
    await page.waitForTimeout(90_000)

    if (process.env.KEEP_DATA === '1') {
      console.log(`[lifecycle] KEEP_DATA=1 — keeping ${created.length} member(s)`)
      return
    }

    console.log(`[lifecycle] Cleaning up ${created.length} member(s) + all their data`)
    const userRef = firestore.collection('users').doc(ownerUserId)
    for (const m of created) {
      const patientRef = userRef.collection('patients').doc(m.patientId!)
      for (const subcol of ['vitals', 'medications', 'meal-logs']) {
        const snap = await patientRef.collection(subcol).get()
        for (const d of snap.docs) await d.ref.delete()
      }
      for (const col of ['weightLogs', 'mealLogs', 'appointments']) {
        const snap = await userRef.collection(col).where('patientId', '==', m.patientId!).get()
        for (const d of snap.docs) await d.ref.delete()
      }
      await patientRef.delete()
      console.log(`[lifecycle]   deleted ${m.name} (${m.patientId})`)
    }
    console.log(`[lifecycle] Cleanup done`)
  })
})
