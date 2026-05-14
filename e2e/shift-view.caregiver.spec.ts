import { test, expect, type Page } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Caregiver-side Today view — UI smoke.
 *
 * Runs under the chromium-caregiver Playwright project. The signed-in
 * user (percyrice@gmail.com) has caregiver access to two owners:
 *   • Weight Loss Project (UID Y8wSTgymg3YXWU94iJVjzoGxsMI2)
 *   • Percy Rice (their own family)
 *
 * Each test below states the semantic contract it's verifying in plain
 * English at the top of the test body. The point isn't "does the page
 * render" — it's "does the page hold up the multi-household, act-in-place
 * promise that the caregiver was sold."
 *
 * Robustness rules followed throughout:
 *   1. Every test waits for the worklist to be FULLY hydrated before
 *      asserting anything — no count() before the locator has settled.
 *      Use Playwright's auto-retrying assertions (toHaveCount, toBeVisible)
 *      instead of single-snapshot reads.
 *   2. Scope every assertion to the household-section it belongs to.
 *      A "thing X appears on the page" assertion is weaker than "thing X
 *      appears in section Y" — the page has two structurally-similar
 *      sections and we want each test to nail the right one.
 *   3. Don't hardcode patient/duty names that change with seed data. The
 *      ones that ARE hardcoded (E2E Test Patient, seeded duty names) are
 *      stable invariants the test ALSO documents.
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const PERCY_UID = 'z2ejce7nFBXS9upf2unfRlYcPhk2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'
const WLP_HOUSEHOLD_DOC_ID = '29GCzfnQ9GvJ58QQo1DB'

// Self-seed Firestore state so this spec is wipe-resistant. The two
// tests that read seed-dependent data ('each household section is
// fully equipped' and 'clicking a duty card opens the inline action
// sheet') need:
//   • Percy section: a worklist item carrying the patient name
//     "E2E Test Patient" so the per-section assertion can pin it.
//   • WLP section: a non-shopping duty assigned to the caregiver
//     ("Vacuum living room") so the duty-card → action-sheet path
//     under test has something to click.
// Both arrive via household_duties — duty cards always carry the
// patient name (`title = ${duty.name} — ${patientName}`), and the
// duty-claim spec already proved the same seed pattern works.
function findServiceAccountPath(): string {
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    const c = path.join(dir, 'service_account_key.json')
    if (fs.existsSync(c)) return c
    const p = path.dirname(dir)
    if (p === dir) break
    dir = p
  }
  throw new Error('service_account_key.json not found')
}

if (getApps().length === 0) {
  initializeApp({ credential: cert(require(findServiceAccountPath())) })
}
const adminDb = getFirestore(getApp())

const SEED_STAMP = Date.now()
const SEED_IDS = {
  percyPatient: `__test_shiftview_patient_${SEED_STAMP}`,
  percyDuty: `__test_shiftview_percy_duty_${SEED_STAMP}`,
  wlpDuty: `__test_shiftview_wlp_vacuum_${SEED_STAMP}`,
}

// Remember the original patientsAccess values so afterAll can restore.
let originalPercyAccess: string[] | undefined

test.beforeAll(async () => {
  const now = new Date().toISOString()
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowIso = tomorrow.toISOString()

  // 1. Patient on Percy's account so the worklist hook can resolve
  //    "E2E Test Patient" by id from /users/{percy}/patients.
  await adminDb
    .collection('users')
    .doc(PERCY_UID)
    .collection('patients')
    .doc(SEED_IDS.percyPatient)
    .set({
      id: SEED_IDS.percyPatient,
      userId: PERCY_UID,
      name: 'E2E Test Patient',
      type: 'human',
      relationship: 'self',
      dateOfBirth: '1990-01-01',
      createdAt: now,
    })

  // 2. Patch the OWNER-side familyMembers.patientsAccess so the GET
  //    /patients endpoint surfaces this seeded patient to the caregiver.
  //    Post-S4 migrations key familyMembers docs by the caregiver uid,
  //    so we can address the doc directly.
  const fmRef = adminDb
    .collection('users')
    .doc(PERCY_UID)
    .collection('familyMembers')
    .doc(CAREGIVER_UID)
  const fmSnap = await fmRef.get()
  originalPercyAccess = Array.isArray(fmSnap.data()?.patientsAccess)
    ? (fmSnap.data()!.patientsAccess as string[])
    : undefined
  await fmRef.update({ patientsAccess: [SEED_IDS.percyPatient] })

  // 3. Percy-household duty referencing that patient — gives Percy's
  //    section a worklist item AND surfaces the patient name in the
  //    card title via `${duty.name} — ${patientName}`.
  const baseDuty = {
    category: 'personal_care' as const,
    isCustom: false,
    assignedBy: PERCY_UID,
    assignedAt: now,
    frequency: 'daily' as const,
    priority: 'medium' as const,
    status: 'pending' as const,
    completionCount: 0,
    skipCount: 0,
    notifyOnCompletion: false,
    notifyOnOverdue: false,
    reminderEnabled: false,
    createdAt: now,
    createdBy: PERCY_UID,
    lastModified: now,
    isActive: true,
    nextDueDate: tomorrowIso,
  }
  await adminDb.collection('household_duties').doc(SEED_IDS.percyDuty).set({
    ...baseDuty,
    householdId: PERCY_UID, // Percy has no households doc; use uid as householdId
    userId: PERCY_UID,
    name: 'Daily check',
    forPatientId: SEED_IDS.percyPatient,
    assignedTo: [CAREGIVER_UID],
    claimedBy: CAREGIVER_UID,
    claimedAt: now,
  })

  // 4. WLP-household duty: non-shopping category so the duty-card click
  //    opens the inline action sheet (the contract under test).
  await adminDb.collection('household_duties').doc(SEED_IDS.wlpDuty).set({
    ...baseDuty,
    householdId: WLP_HOUSEHOLD_DOC_ID,
    userId: OWNER_UID,
    name: 'Vacuum living room',
    category: 'cleaning_living_areas',
    assignedBy: OWNER_UID,
    createdBy: OWNER_UID,
    assignedTo: [CAREGIVER_UID],
    claimedBy: CAREGIVER_UID,
    claimedAt: now,
  })
})

test.afterAll(async () => {
  // 1. Drop seed patient + duties.
  await Promise.all([
    adminDb
      .collection('users')
      .doc(PERCY_UID)
      .collection('patients')
      .doc(SEED_IDS.percyPatient)
      .delete()
      .catch(() => {}),
    adminDb.collection('household_duties').doc(SEED_IDS.percyDuty).delete().catch(() => {}),
    adminDb.collection('household_duties').doc(SEED_IDS.wlpDuty).delete().catch(() => {}),
  ])

  // 2. Restore Percy's familyMembers.patientsAccess to whatever it
  //    was before — usually [], but if a future change populates it,
  //    we don't want to clobber that.
  await adminDb
    .collection('users')
    .doc(PERCY_UID)
    .collection('familyMembers')
    .doc(CAREGIVER_UID)
    .update({ patientsAccess: originalPercyAccess ?? [] })
    .catch(() => {})

  // 3. Owner-POV cleanup — the care-log test writes a handoffNote on
  //    /users/{WLP}/handoffNotes/, which surfaces in the owner's care
  //    log forever otherwise. Delete every handoff note whose body
  //    starts with "caregiver ui probe " (the test stamp prefix).
  const probeNotes = await adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('handoffNotes')
    .get()
  const toDelete = probeNotes.docs.filter((d) => {
    const body = String(d.data()?.body || '')
    return body.startsWith('caregiver ui probe ')
  })
  if (toDelete.length > 0) {
    const batch = adminDb.batch()
    for (const d of toDelete) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }

  // 4. Owner-POV cleanup — handoff-note fanouts spawn `handoff_note`
  //    notifications on the owner + accepted caregivers. Match by
  //    metadata if the dispatcher stamps the source body, else by
  //    type + recent timestamp. Conservative: only delete notifs
  //    whose message contains the probe stamp prefix so we never
  //    nuke real handoff notifications.
  const notifSnap = await adminDb
    .collection('notifications')
    .where('type', '==', 'handoff_note')
    .where('userId', 'in', [OWNER_UID, CAREGIVER_UID])
    .get()
  const probeNotifs = notifSnap.docs.filter((d) => {
    const message = String(d.data()?.message || '')
    return message.includes('caregiver ui probe ')
  })
  if (probeNotifs.length > 0) {
    const batch = adminDb.batch()
    for (const d of probeNotifs) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }
})

/**
 * Wait for the worklist to be done loading and have its expected
 * shape. This is the canonical "the page is ready to interact with"
 * gate — every test runs after this resolves.
 *
 * Contract: at least 2 household sections rendered, both names
 * resolved (no "Family" placeholder), at least one worklist item
 * inside each section, and the care-log composer present per section.
 */
async function waitForWorklistReady(page: Page): Promise<void> {
  // Page-shell anchor — guarantees the worklist container mounted.
  await expect(page.getByTestId('shift-worklist')).toBeVisible({ timeout: 30_000 })

  // Both household section headings resolve to real names. Asserting
  // both at once verifies (a) the worklist loaded, (b) the centralized
  // display-name endpoint resolved Auth fallback for Weight Loss
  // Project, and (c) the dedupe pass left exactly the two expected
  // ownerships.
  const sections = page.locator('section[data-testid^="shift-group-"]')
  await expect(sections).toHaveCount(2, { timeout: 30_000 })

  // Every section has at least one worklist item AND a care-log
  // composer — Playwright auto-retries this until the worklist is
  // fully hydrated.
  for (let i = 0; i < 2; i++) {
    await expect(
      sections.nth(i).locator('[data-testid^="shift-item-"]').first(),
    ).toBeVisible({ timeout: 30_000 })
    await expect(
      sections.nth(i).locator('[data-testid^="handoff-composer-input-"]'),
    ).toBeVisible()
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })
})

test('page header reflects the caregiver framing — beta strip, time-of-day greeting, multi-household subtitle', async ({ page }) => {
  // Semantic contract: when a caregiver lands on /shift, they should
  // immediately understand THREE things from the page chrome alone:
  //   (1) this is a beta feature (the amber strip),
  //   (2) it's a warm, time-aware greeting (not corporate dashboard copy),
  //   (3) it spans every household they help (not a single-account view).

  // (1) Beta strip — top-of-page anchor, copy is time-independent.
  await expect(page.getByText('Beta — Today', { exact: false })).toBeVisible({ timeout: 30_000 })

  // (2) Time-of-day greeting heading. Match any of the four buckets
  // produced by greetingTitle() — the test must survive running across
  // wall-clock boundaries.
  await expect(
    page.getByRole('heading', { name: /Good morning|Good afternoon|Good evening|Tonight/i }),
  ).toBeVisible()

  // (3) Multi-household framing in the subtitle.
  await expect(page.getByText(/across every household you help/i)).toBeVisible()
})

test('worklist is multi-household: BOTH known caregiver relationships surface as their own section, with real (non-placeholder) names', async ({ page }) => {
  // Semantic contract: a caregiver belonging to N households must see
  // N sections, each headed with the OWNER'S real name. The previous
  // bug-class this guards against:
  //   • A single-account collapse where only the URL-segment owner's
  //     section rendered.
  //   • Stale denormalized "accountOwnerName" leaking through (the
  //     centralized display-name endpoint fixes this with an Auth
  //     fallback when Firestore is missing the top-level name).
  //   • The dedupe pass that merges duplicate caregiverOf entries —
  //     if dedupe misses, we'd see 3+ sections.
  await waitForWorklistReady(page)

  const sections = page.locator('section[data-testid^="shift-group-"]')
  await expect(sections).toHaveCount(2)

  // Both household headings rendered with REAL names — not "Family"
  // (the placeholder ownerNames fallback the worklist uses while the
  // display-name endpoint is in flight).
  await expect(
    page.getByRole('heading', { name: /Weight Loss Project's Family/i }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: /Percy Rice's Family/i }),
  ).toBeVisible()

  // Negative assertion: no section should headline with the bare
  // placeholder "Family's Family" (a regression sentinel for the
  // ownerNames fallback path).
  await expect(page.getByRole('heading', { name: /^Family's Family$/i })).toHaveCount(0)
})

test('each household section is fully equipped — at least one worklist card AND its own care-log composer', async ({ page }) => {
  // Semantic contract: every household section is a self-contained
  // workstation. A caregiver should never see a "headline but nothing
  // to do" empty section, and they should always be able to leave a
  // note in the RIGHT household's care log.
  //
  // This is what the per-section iteration in waitForWorklistReady
  // already proves, but the assertion deserves its own test so a
  // regression here is named specifically.
  await waitForWorklistReady(page)

  const sections = page.locator('section[data-testid^="shift-group-"]')

  for (let i = 0; i < 2; i++) {
    const section = sections.nth(i)

    // At least one worklist item — auto-retries.
    await expect(
      section.locator('[data-testid^="shift-item-"]').first(),
    ).toBeVisible()

    // Care-log composer + submit button are inside the SAME section
    // (handoff notes container is appended at the section level, not
    // page-level). Locating the submit by role inside the section
    // proves the per-household isolation contract.
    await expect(
      section.locator('[data-testid^="handoff-composer-input-"]'),
    ).toBeVisible()
    await expect(
      section.getByRole('button', { name: /Add to log/i }),
    ).toBeVisible()
  }

  // Percy Rice's household has 1 patient and (currently) no duties,
  // so its check_in card surfaces the real patient name. Pin the name
  // inside that specific section to prove this section is the right
  // one — not just "the name appears somewhere on the page."
  const percyRiceSection = page
    .locator('section[data-testid^="shift-group-"]')
    .filter({ has: page.getByRole('heading', { name: /Percy Rice's Family/i }) })
  await expect(percyRiceSection).toHaveCount(1)
  await expect(percyRiceSection.getByText(/E2E Test Patient/i).first()).toBeVisible()
})

test('clicking a duty card opens the inline action sheet — URL stays on /shift, sheet shows the duty I clicked', async ({ page }) => {
  // Semantic contract: a caregiver DOING the work needs an act-in-place
  // sheet. Tapping a duty card on the family-admin "manage duties" page
  // would be a semantic mismatch — that's the surface for editing /
  // assigning duties, not for marking them done.
  //
  // The strongest possible proof of "this is the sheet for THIS duty":
  //   • URL didn't change.
  //   • Sheet's HEADER text matches the duty card's visible name.
  //   • Sheet contains the household ownerName too (so the user knows
  //     which family this card belongs to when they have multiple).
  await waitForWorklistReady(page)

  const startUrl = page.url()

  // Use a NON-shopping-category duty so the action sheet path
  // applies. Shopping-ish duties (grocery_shopping, errands,
  // medication, medication_pickup) route to /shopping/active
  // instead of opening the sheet — covered by the
  // shopping-active-sort spec. The candidates here are vacuum
  // (household), breakfast (meals), and lunch (meals) — all stable
  // seed entries.
  const dutyNameRe = /Vacuum living room|Help Dad with breakfast|Prep Grandma Sue/i
  const dutyCard = page.getByRole('button', { name: dutyNameRe }).first()
  await expect(dutyCard).toBeVisible()

  await dutyCard.click()

  // Sheet mounted.
  const sheet = page.getByTestId('duty-action-sheet')
  await expect(sheet).toBeVisible({ timeout: 10_000 })

  // The sheet header carries the duty name. Use the SAME regex that
  // matched the card — that's the apples-to-apples proof "the sheet is
  // for the duty I clicked." textContent-splitting was brittle because
  // the card's accessible name includes the avatar emoji and subtitle.
  await expect(sheet.getByRole('heading').filter({ hasText: dutyNameRe }).first()).toBeVisible()

  // Sheet's subtitle includes the owner's family name so the caregiver
  // knows which household this card belongs to.
  await expect(sheet.getByText(/Weight Loss Project's Family/i)).toBeVisible()

  // Both action buttons present. Skip is intentionally not built —
  // the test pins that omission so adding it later is a deliberate
  // change.
  await expect(page.getByTestId('duty-sheet-complete')).toBeVisible()
  await expect(page.getByTestId('duty-sheet-cancel')).toBeVisible()
  await expect(page.getByRole('button', { name: /^Skip$/i })).toHaveCount(0)

  // URL DID NOT change — that's the whole point: act-in-place, no
  // navigation away to /family/dashboard.
  expect(page.url()).toBe(startUrl)

  // Cancel closes the sheet without mutation.
  await page.getByTestId('duty-sheet-cancel').click()
  await expect(sheet).toHaveCount(0, { timeout: 5_000 })

  // Worklist is still intact after cancel — the duty card is still there.
  await expect(dutyCard).toBeVisible()
})

test('Care log: a caregiver post lands in the RIGHT household feed and stays there', async ({ page }) => {
  // Semantic contract: a post made in Weight Loss Project's composer
  // must appear in Weight Loss Project's notes container — not just
  // "somewhere on the page." Cross-household leakage would mean either
  // the API ignored ownerId or the listener filter is wrong.
  await waitForWorklistReady(page)

  const stamp = `caregiver ui probe ${Date.now()}`
  const notesContainer = page.getByTestId(`handoff-notes-${OWNER_UID}`)

  // Composer is inside the right notes container.
  const composer = notesContainer.locator('[data-testid^="handoff-composer-input-"]')
  await expect(composer).toBeVisible()
  await composer.fill(stamp)

  // Submit via the scoped button — guarantees we click the right one
  // of the two on the page.
  await notesContainer.getByRole('button', { name: /Add to log/i }).click()

  // Post appears INSIDE the same notes container — proves per-household
  // isolation, not just "the string is on the page." Generous timeout:
  // hook does a refetch-after-post AND a real-time listener catches it
  // via the notification stream.
  await expect(notesContainer.getByText(stamp, { exact: false })).toBeVisible({ timeout: 30_000 })

  // Negative scoping: the post should NOT appear in the OTHER
  // household's notes container. CSS attribute selector with :not()
  // excludes the WLP container by testid equality — `filter({ hasNot })`
  // filters by DESCENDANT, which doesn't help when the container IS the
  // testid match.
  const otherNotes = page.locator(
    `[data-testid^="handoff-notes-"]:not([data-testid="handoff-notes-${OWNER_UID}"])`,
  )
  await expect(otherNotes).toHaveCount(1) // there's exactly one other household
  await expect(otherNotes.getByText(stamp, { exact: false })).toHaveCount(0)
})
