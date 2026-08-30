import { test, expect } from '@playwright/test'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Drives the HOUSEHOLD onboarding end-to-end and asserts the new intent-gated
 * behavior (DOSI legacy cleanup, Phase 1):
 *   - a household owner is setting up for OTHERS, so the self-health block
 *     (own last name / DOB / sex / height / weight / goal / pace) is SKIPPED —
 *     after "your first name" the flow goes straight to the roster. This is the
 *     onboarding-friction fix: care users no longer answer personal weight-loss
 *     metrics. (The self-block runs only for the `just_me` self-logger.)
 *   - the roster persists a human + a pet under /patients
 *   - the household name lands as `familyLastName`
 *   - the flow ends at the roster (no add_now step)
 *
 * Runs as the weightlossprojectionlab fixture (family_basic → canAddPatients).
 * Cleans up every patient it creates.
 */

function findKey(): string {
  let d = __dirname
  for (let i = 0; i < 6; i++) {
    const c = path.join(d, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    d = path.dirname(d)
  }
  throw new Error('service_account_key.json not found')
}
if (!getApps().length) initializeApp({ credential: cert(require(findKey())) })
const db = getFirestore()

const OWNER_EMAIL = 'weightlossprojectionlab@gmail.com'
let uid = ''
const created: string[] = []

test.use({ launchOptions: { slowMo: 150 } })

test.describe.serial('Onboarding — Household path persists correctly', () => {
  test.beforeAll(async () => {
    uid = (await getAuth().getUserByEmail(OWNER_EMAIL)).uid
  })

  test.afterAll(async () => {
    if (!uid) return
    for (const id of created) {
      await db.collection('users').doc(uid).collection('patients').doc(id).delete().catch(() => {})
    }
  })

  test('drive household onboarding + assert persistence', async ({ page }) => {
    test.setTimeout(150_000)
    const patientsCol = db.collection('users').doc(uid).collection('patients')
    const before = new Set((await patientsCol.get()).docs.map((d) => d.id))

    const cont = () => page.getByRole('button', { name: /^Continue/ }).click()

    await page.goto('/onboarding', { waitUntil: 'domcontentloaded' })

    // Q1 archetype (single-select, auto-advance)
    await expect(page.getByText(/Who are you setting up for/i)).toBeVisible({ timeout: 60_000 })
    await page.getByRole('button', { name: /Household/i }).click()

    // member_count
    await expect(page.getByText(/How many family members/i)).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /2 To 5/i }).click()

    // family_last_name (required)
    await expect(page.getByText(/family's last name/i)).toBeVisible({ timeout: 30_000 })
    await page.locator('input[type="text"]').first().fill('House')
    await cont()

    // your_name (first name)
    await expect(page.getByText(/your first name/i)).toBeVisible({ timeout: 30_000 })
    await page.locator('input[type="text"]').first().fill('Testowner')
    await cont()

    // ── Phase 1 friction fix: the self-health block is SKIPPED for household.
    //    The next screen is the roster — NOT the owner's DOB/sex/weight/goal. ──
    await expect(page.getByText(/Who else is in your household/i)).toBeVisible({ timeout: 30_000 })
    // Sanity: none of the self-block screens are on the page.
    await expect(page.getByText(/date of birth/i)).toHaveCount(0)
    await expect(page.getByText(/current weight/i)).toHaveCount(0)
    await expect(page.getByText(/How fast do you want to go/i)).toHaveCount(0)

    // household_roster — add a human + a pet
    await page.getByRole('button', { name: /^Adult$/i }).click()
    await page.getByPlaceholder(/First name/i).fill('Tyler')
    await page.getByRole('button', { name: /Add adult/i }).click()
    await page.getByRole('button', { name: /^Pet$/i }).click()
    await page.getByPlaceholder(/Pet's name/i).fill('Ricky')
    await page.getByPlaceholder(/Species/i).fill('dog')
    await page.getByRole('button', { name: /Add pet/i }).click()
    await cont() // completes onboarding

    // Completion redirects off /onboarding
    await page.waitForURL((u) => !u.pathname.includes('/onboarding'), { timeout: 60_000 })
    await page.waitForTimeout(3500) // let the writes settle

    // ── assert persistence (household path) ──
    const fresh = (await patientsCol.get()).docs.filter((d) => !before.has(d.id))
    fresh.forEach((d) => created.push(d.id))

    const human = fresh.find((d) => d.data().type === 'human' && d.data().relationship !== 'self')
    const pet = fresh.find((d) => d.data().type === 'pet')

    expect(human, 'roster human persisted').toBeTruthy()
    expect(human!.data().requiresProfileCompletion, 'member is a stub').toBe(true)
    expect(pet, 'roster pet persisted').toBeTruthy()
    expect(pet!.data().species, 'pet species').toBe('dog')

    const userDoc = (await db.collection('users').doc(uid).get()).data()
    expect(userDoc?.familyLastName, 'household name stored').toBe('House')

    console.log(`→ household onboarding OK (self-block skipped): human + pet(dog), household=House`)
  })
})
