import { chromium, test, expect, type Page } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Multi-role real-time spec — verifies the caregiver → owner observable
 * contract for Phase 2 (start/done bell fan-out), Phase 3a (active-
 * shoppers strip), and the handoff-note real-time feed.
 *
 * The previous battery exercised each surface in isolation on ONE side.
 * This spec attaches BOTH storage states (owner + caregiver) to a single
 * browser via newContext({ storageState }) so caregiver actions can be
 * asserted against owner observations in the same run.
 *
 * Why a separate Playwright project: this spec needs both `setup`
 * (owner auth → user.json) AND `setup-caregiver` (caregiver auth →
 * caregiver.json) to have completed. The `chromium-multirole` project
 * in playwright.config.ts depends on both setups and runs files
 * matching *.multirole.spec.ts.
 *
 * Cleanup is exhaustive on the owner side — sessions, notifications,
 * handoff notes, seed items, seed roster all wiped in afterAll so test
 * runs don't leave residue on the owner's real dashboard.
 */

// The owner-side fixture (e2e/.auth/user.json) is signed in as
// wellnessprojectionlab@gmail.com → uid z2ejce7nFBXS9upf2unfRlYcPhk2
// ("Percy Rice"). Multi-role testing requires the owner-side context
// to OWN the household where the caregiver acts; otherwise the owner's
// /family/dashboard reads a different household and asserts fail.
// Targeting Percy's household keeps caregiver actions + owner
// observations on the same handoffNotes / shopping_sessions / etc.
const OWNER_UID = 'z2ejce7nFBXS9upf2unfRlYcPhk2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'
const STORAGE_OWNER = 'e2e/.auth/user.json'
const STORAGE_CAREGIVER = 'e2e/.auth/caregiver.json'

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

const STAMP = Date.now()
const SEED_ITEM_ID = `__test_multirole_item_${STAMP}`
const RUN_STARTED_AT = new Date().toISOString()
let originalRoster: string[] | undefined

test.beforeAll(async () => {
  // Owner needs a household roster with Walmart so the caregiver's
  // ?store=walmart URL resolves cleanly. Capture pre-test value so
  // afterAll can restore.
  const userRef = adminDb.collection('users').doc(OWNER_UID)
  const before = await userRef.get()
  originalRoster = Array.isArray(before.data()?.householdStoreIds)
    ? (before.data()!.householdStoreIds as string[])
    : undefined
  await userRef.update({ householdStoreIds: ['walmart'] })

  // One shopping item assigned to Walmart so the active-shoppers
  // strip has a non-zero count in the badge if the implementation
  // reads from the session's items.
  const now = new Date()
  await adminDb.collection('shopping_items').doc(SEED_ITEM_ID).set({
    userId: OWNER_UID,
    householdId: OWNER_UID,
    productName: 'MULTIROLE Seed Item',
    brand: 'TEST',
    imageUrl: '',
    category: 'pantry',
    isManual: true,
    inStock: false,
    needed: true,
    priority: 'medium',
    quantity: 1,
    unit: 'each',
    assignedStoreId: 'walmart',
    purchaseHistory: [],
    createdAt: now,
    updatedAt: now,
  })
})

test.afterAll(async () => {
  // 1. Seed item.
  await adminDb
    .collection('shopping_items')
    .doc(SEED_ITEM_ID)
    .delete()
    .catch(() => {})

  // 2. Restore (or unset) the original roster.
  const userRef = adminDb.collection('users').doc(OWNER_UID)
  if (originalRoster && originalRoster.length > 0) {
    await userRef.update({ householdStoreIds: originalRoster }).catch(() => {})
  } else {
    await userRef.update({ householdStoreIds: [] }).catch(() => {})
  }

  // 3. shopping_sessions created during this run.
  const sessSnap = await adminDb
    .collection('shopping_sessions')
    .where('householdId', '==', OWNER_UID)
    .get()
  const sessions = sessSnap.docs.filter((d) => {
    const startedAtRaw = d.data()?.startedAt
    const startedAt = startedAtRaw?.toDate?.() ?? startedAtRaw
    const iso = startedAt instanceof Date ? startedAt.toISOString() : String(startedAt || '')
    return iso >= RUN_STARTED_AT
  })
  if (sessions.length > 0) {
    const batch = adminDb.batch()
    for (const d of sessions) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }

  // 4. shopping_started/done + handoff_note notifications created
  //    during this run.
  const notifSnap = await adminDb
    .collection('notifications')
    .where('type', 'in', ['shopping_started', 'shopping_done', 'handoff_note'])
    .where('userId', 'in', [OWNER_UID, CAREGIVER_UID])
    .get()
  const recentNotifs = notifSnap.docs.filter((d) => {
    const createdAt = String(d.data()?.createdAt || '')
    return createdAt >= RUN_STARTED_AT
  })
  if (recentNotifs.length > 0) {
    const batch = adminDb.batch()
    for (const d of recentNotifs) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }

  // 5. Handoff notes written during the run (prefix-based to be safe).
  const hnSnap = await adminDb
    .collection('users')
    .doc(OWNER_UID)
    .collection('handoffNotes')
    .get()
  const probeNotes = hnSnap.docs.filter((d) => {
    const body = String(d.data()?.body || '')
    return body.startsWith('multirole probe ')
  })
  if (probeNotes.length > 0) {
    const batch = adminDb.batch()
    for (const d of probeNotes) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }
})

/**
 * Launch two separately-positioned OS windows — caregiver on the left,
 * owner on the right — so the human watching can observe both sides
 * react in real time. Each browser has its own window; --window-position
 * + --window-size only apply when Chrome owns the window (i.e. one
 * window per `chromium.launch`). The two browsers share no state
 * beyond what's in their explicit storageState files.
 *
 * In headless mode (CI), window position is a no-op; the tests still
 * run correctly. In headed mode, the splits are at 0,0 and 960,0
 * matching the global launchOptions in playwright.config.ts.
 */
async function withSplitBrowsers(
  fn: (caregiverPage: Page, ownerPage: Page) => Promise<void>,
): Promise<void> {
  const headless = process.env.HEADLESS === '1'
  const slowMo = process.env.SLOWMO_MS ? parseInt(process.env.SLOWMO_MS, 10) : 1000

  const caregiverBrowser = await chromium.launch({
    headless,
    slowMo,
    args: ['--window-position=0,0', '--window-size=960,1040'],
  })
  const ownerBrowser = await chromium.launch({
    headless,
    slowMo,
    args: ['--window-position=960,0', '--window-size=960,1040'],
  })
  try {
    const caregiverCtx = await caregiverBrowser.newContext({
      storageState: STORAGE_CAREGIVER,
      viewport: { width: 960, height: 940 },
      ignoreHTTPSErrors: true,
    })
    const ownerCtx = await ownerBrowser.newContext({
      storageState: STORAGE_OWNER,
      viewport: { width: 960, height: 940 },
      ignoreHTTPSErrors: true,
    })
    const caregiverPage = await caregiverCtx.newPage()
    const ownerPage = await ownerCtx.newPage()
    await fn(caregiverPage, ownerPage)
  } finally {
    await caregiverBrowser.close().catch(() => {})
    await ownerBrowser.close().catch(() => {})
  }
}

test('Caregiver starts shopping → Owner sees the active-shoppers strip with the right store', async () => {
  await withSplitBrowsers(async (caregiverPage, ownerPage) => {
    // Owner is parked on /family/dashboard. The strip is an onSnapshot
    // listener — it lights up the moment a shopping_session writes.
    await ownerPage.goto('/family/dashboard', { waitUntil: 'domcontentloaded' })

    // Pre-condition: no strip yet. (Race-resistant: the listener may
    // briefly show a stale session before settling; use toBeHidden
    // with a generous timeout if reality bites.)
    const strip = ownerPage.getByTestId('active-shoppers-strip')

    // Caregiver opens /shopping/active with ?store=walmart so the
    // picker resolves automatically and a session starts. This is the
    // moment the contract under test fires.
    await caregiverPage.goto(
      `/shopping/active?ownerId=${OWNER_UID}&store=walmart`,
      { waitUntil: 'domcontentloaded' },
    )

    // Confirm the caregiver-side header read what we expected — the
    // session is live and tied to Walmart. If this fails the test
    // gives a clearer message than "owner didn't see strip" downstream.
    await expect(caregiverPage.getByTestId('active-shopping-title')).toContainText(
      /Shopping at Walmart/i,
      { timeout: 30_000 },
    )

    // ASSERT (owner POV): the strip becomes visible AND names the
    // store the caregiver chose. The listener is real-time so this
    // shouldn't need a long timeout, but Firestore latency under load
    // can spike; 20s is the right ceiling.
    await expect(strip).toBeVisible({ timeout: 20_000 })
    await expect(strip).toContainText(/Walmart/i)
  })
})

test('Caregiver posts a handoff note → Owner sees it in real-time on the dashboard', async () => {
  await withSplitBrowsers(async (caregiverPage, ownerPage) => {
    // Owner-side: navigate to the notes feed (HandoffNotes lives on
    // /family/dashboard?tab=notes). This is what fans out via the
    // owner's notification listener; the same hook also drives the
    // care-log card.
    await ownerPage.goto('/family/dashboard?tab=notes', { waitUntil: 'domcontentloaded' })

    // Caregiver-side: shift view, composer is in the WLP household
    // section's handoff-notes block.
    await caregiverPage.goto(`/caregiver/${OWNER_UID}/shift`, { waitUntil: 'domcontentloaded' })

    const stamp = `multirole probe ${Date.now()}`
    const composer = caregiverPage.locator(
      `[data-testid="handoff-notes-${OWNER_UID}"] [data-testid^="handoff-composer-input-"]`,
    )
    await expect(composer).toBeVisible({ timeout: 30_000 })
    await composer.fill(stamp)

    const submitBtn = caregiverPage
      .getByTestId(`handoff-notes-${OWNER_UID}`)
      .getByRole('button', { name: /Add to log/i })
    await submitBtn.click()

    // ASSERT (caregiver-side): the note appears in the caregiver's own
    // notes container — confirms the write succeeded.
    const caregiverNotes = caregiverPage.getByTestId(`handoff-notes-${OWNER_UID}`)
    await expect(caregiverNotes.getByText(stamp)).toBeVisible({ timeout: 30_000 })

    // ASSERT (owner POV): same note arrives on the owner's dashboard
    // via the notification stream / handoff-notes listener — real-time
    // contract. 30s timeout because the listener and the page hydration
    // both have to settle, but in practice this lands in <5s.
    await expect(ownerPage.getByText(stamp).first()).toBeVisible({ timeout: 30_000 })
  })
})
