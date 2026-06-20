import { test, expect } from '@playwright/test'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as fs from 'fs'
import * as path from 'path'

/**
 * BMI guard — a WATCHABLE UI assertion (lib/health-calculations.assessBMI +
 * app/progress BMI render).
 *
 * Seeds a throwaway patient with IMPOSSIBLE height/weight (46 in + 590 lbs →
 * BMI 196) under the e2e fixture account, opens /progress, and asserts the
 * dashboard shows the amber "Check height & weight" warning instead of the
 * nonsense number. Then flips to a plausible-but-severe BMI (~50) and asserts
 * the open-ended red "severe" treatment. Cleans up after.
 *
 * ALSO guards the cross-patient data leak: this patient has one weight log and
 * no meals, so the summary stats must read 0 — not the account-wide aggregate
 * (+370 lbs / 35 meals) that bled in before chart-data-aggregator was scoped
 * by patientId.
 *
 * Watch it run:
 *   npx playwright test e2e/bmi-guard.spec.ts --project=chromium --no-deps --headed
 */

function findServiceAccountPath(): string {
  let dir = __dirname
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    dir = path.dirname(dir)
  }
  throw new Error('service_account_key.json not found')
}
if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const db = getFirestore()

const PATIENT_ID = 'bmi-guard-demo'
let OWNER_UID = ''
let weightLogId = ''

test.use({ launchOptions: { slowMo: 600 } }) // human pace so it's watchable

test.describe.serial('BMI guard — visible in the UI', () => {
  test.beforeAll(async () => {
    OWNER_UID = (await getAuth().getUserByEmail(process.env.E2E_TEST_USER_EMAIL!)).uid
    const userRef = db.collection('users').doc(OWNER_UID)
    // Impossible: 46 in (3'10") + 590 lbs → BMI 196.
    await userRef.collection('patients').doc(PATIENT_ID).set({
      name: 'BMI Guard Demo', firstName: 'BMI', lastName: 'Demo',
      dateOfBirth: '1990-01-01', gender: 'male', relationship: 'self',
      height: 46, heightUnit: 'imperial',
      currentWeight: 590, weightUnit: 'lbs', startingWeight: 590,
      goals: { targetWeight: 531, currentWeight: 590, startingWeight: 590, weeklyWeightLossGoal: 1 },
      hasCompletedOnboarding: true,
      createdAt: Timestamp.now(), updatedAt: Timestamp.now(),
    }, { merge: true })
    const wl = await userRef.collection('weightLogs').add({
      patientId: PATIENT_ID, weight: 590, loggedAt: Timestamp.now(), createdAt: Timestamp.now(),
    })
    weightLogId = wl.id
  })

  test.afterAll(async () => {
    if (!OWNER_UID) return
    const userRef = db.collection('users').doc(OWNER_UID)
    await userRef.collection('patients').doc(PATIENT_ID).delete().catch(() => {})
    if (weightLogId) await userRef.collection('weightLogs').doc(weightLogId).delete().catch(() => {})
  })

  test('impossible BMI (196) → amber "Check height & weight", number suppressed', async ({ page }) => {
    await page.goto(`/progress?patientId=${PATIENT_ID}`, { waitUntil: 'domcontentloaded' })
    await page.keyboard.press('Escape').catch(() => {})
    await expect(page.getByText(/Current BMI/i)).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/Check height/i)).toBeVisible({ timeout: 20_000 })

    // Cross-patient leak guard: 1 weight log, no meals → summary stats read 0,
    // NOT the account-wide aggregate (+370 lbs / 35 meals) that leaked before.
    const weightChange = page.getByText('Weight Change', { exact: true }).locator('xpath=following-sibling::p[1]')
    await expect(weightChange).toHaveText(/^0 lbs$/, { timeout: 20_000 })
    const mealsLogged = page.getByText('Meals Logged', { exact: true }).locator('xpath=following-sibling::p[1]')
    await expect(mealsLogged).toHaveText('0')

    await page.waitForTimeout(4000) // beat so a human can see it
  })

  test('plausible severe BMI (~50) → open-ended red "severe"', async ({ page }) => {
    const userRef = db.collection('users').doc(OWNER_UID)
    // 70 in + 350 lbs → BMI ~50.2 (plausible, severe).
    await userRef.collection('patients').doc(PATIENT_ID).set({ height: 70, currentWeight: 350 }, { merge: true })
    await userRef.collection('weightLogs').doc(weightLogId).set({ weight: 350 }, { merge: true })
    await page.goto(`/progress?patientId=${PATIENT_ID}`, { waitUntil: 'domcontentloaded' })
    await page.keyboard.press('Escape').catch(() => {})
    await expect(page.getByText(/Current BMI/i)).toBeVisible({ timeout: 90_000 })
    await expect(page.getByText(/^severe$/i)).toBeVisible({ timeout: 20_000 })
    await page.waitForTimeout(4000)
  })
})
