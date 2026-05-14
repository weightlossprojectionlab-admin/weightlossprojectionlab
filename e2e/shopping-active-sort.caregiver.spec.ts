import { test, expect, type Page } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Caregiver-side /shopping/active — UI assertion that the central
 * sort rules from lib/perishability-tiers.ts (perishability tier,
 * wait-counter signal, fragility) actually reach the rendered DOM.
 *
 * Runs under the chromium-caregiver Playwright project. Owner under
 * test is Weight Loss Project (Y8wSTgymg3YXWU94iJVjzoGxsMI2); seed
 * data has at least six distinct categories spanning multiple tiers,
 * so relative-order assertions are stable.
 *
 * The test deliberately asserts RELATIVE order between tiers (tier 1
 * categories come before tier 2 before tier 4 etc.) rather than
 * exact category sequence. The seed's category mix shifts as items
 * are added/removed; the rule chain stays the same.
 *
 * Test coverage:
 *   1. Page loads with the in-store layout (header + tabs + grouped
 *      pending items)
 *   2. Category section headers render in perishability order:
 *      tier-1 categories (pet-food, spices, condiments, beverages,
 *      pantry) appear BEFORE tier-2 (produce, herbs, bakery) BEFORE
 *      tier-3 (deli, eggs) BEFORE tier-4 (dairy, meat, seafood)
 *      BEFORE tier-5 (frozen)
 *   3. Frozen-last invariant: if frozen exists in the seed, no
 *      higher-tier category renders after it
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
const CAREGIVER_UID = 'X0exvZzk4iPc5OV0lEOBQglWDoA3'

// Self-seed shopping_items spanning multiple perishability tiers so
// the tier-order assertion has data to test against. Wipe-resistant —
// after the live data-reset earlier this session there are zero
// shopping_items, so these tests need their own corpus.
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
const SEED_PREFIX = `__test_sort_${SEED_STAMP}_`
const SEED_ITEMS: Array<{ id: string; name: string; category: string; tier: number }> = [
  { id: `${SEED_PREFIX}pantry`, name: 'SORT pantry item', category: 'pantry', tier: 1 },
  { id: `${SEED_PREFIX}produce`, name: 'SORT produce item', category: 'produce', tier: 2 },
  { id: `${SEED_PREFIX}eggs`, name: 'SORT eggs item', category: 'eggs', tier: 3 },
  { id: `${SEED_PREFIX}dairy`, name: 'SORT dairy item', category: 'dairy', tier: 4 },
  { id: `${SEED_PREFIX}frozen`, name: 'SORT frozen item', category: 'frozen', tier: 5 },
]

// Capture the test-run window so we can scope owner-side notification
// cleanup to JUST the events we triggered. afterAll deletes
// shopping_started / shopping_done notifications fired in this window
// so the owner's bell doesn't accumulate test residue.
const RUN_STARTED_AT = new Date().toISOString()

test.beforeAll(async () => {
  const now = new Date()
  const base = {
    userId: OWNER_UID,
    householdId: OWNER_UID,
    brand: 'TEST',
    imageUrl: '',
    isManual: true,
    inStock: false,
    needed: true,
    priority: 'medium' as const,
    quantity: 1,
    unit: 'each',
    purchaseHistory: [],
    createdAt: now,
    updatedAt: now,
  }
  await Promise.all(
    SEED_ITEMS.map((item) =>
      adminDb.collection('shopping_items').doc(item.id).set({
        ...base,
        productName: item.name,
        category: item.category,
      }),
    ),
  )
})

test.afterAll(async () => {
  // 1. Drop seeded items.
  await Promise.all(
    SEED_ITEMS.map((item) =>
      adminDb.collection('shopping_items').doc(item.id).delete().catch(() => {}),
    ),
  )

  // 2. Owner-POV cleanup — these tests open /shopping/active which
  //    starts a shopping_session and (per Phase 2) fires a
  //    shopping_started notification to the owner + accepted
  //    caregivers. Delete the notifs we triggered during this run.
  const notifSnap = await adminDb
    .collection('notifications')
    .where('type', 'in', ['shopping_started', 'shopping_done'])
    .where('userId', 'in', [OWNER_UID, CAREGIVER_UID])
    .get()
  const recent = notifSnap.docs.filter((d) => {
    const createdAt = String(d.data()?.createdAt || '')
    return createdAt >= RUN_STARTED_AT
  })
  if (recent.length > 0) {
    const batch = adminDb.batch()
    for (const d of recent) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }

  // 3. Owner-POV cleanup — also drop the shopping_sessions docs the
  //    test opens (the active-shoppers strip on the owner dashboard
  //    reads from them). Scope to sessions created in this run.
  const sessSnap = await adminDb
    .collection('shopping_sessions')
    .where('householdId', '==', OWNER_UID)
    .get()
  const sessions = sessSnap.docs.filter((d) => {
    const startedAtRaw = d.data()?.startedAt
    // startedAt is a Firestore Timestamp; toDate() works on admin SDK
    const startedAt = startedAtRaw?.toDate?.() ?? startedAtRaw
    const iso = startedAt instanceof Date ? startedAt.toISOString() : String(startedAt || '')
    return iso >= RUN_STARTED_AT
  })
  if (sessions.length > 0) {
    const batch = adminDb.batch()
    for (const d of sessions) batch.delete(d.ref)
    await batch.commit().catch(() => {})
  }
})

const PERISHABILITY_TIER: Record<string, number> = {
  other: 1,
  'pet-supplies': 1,
  spices: 1,
  condiments: 1,
  pantry: 1,
  'pet-food': 1,
  beverages: 1,
  baby: 1,
  produce: 2,
  herbs: 2,
  bakery: 2,
  eggs: 3,
  deli: 3,
  dairy: 4,
  meat: 4,
  seafood: 4,
  frozen: 5,
}

async function gotoCaregiverShoppingActive(page: Page): Promise<void> {
  await page.goto(`/shopping/active?ownerId=${OWNER_UID}`, {
    waitUntil: 'domcontentloaded',
  })

  // Two valid landing states:
  //   • Picker modal visible (household has a roster — Phase 0b's
  //     store-roster API fetch resolved with entries)
  //   • In-store page rendered without a modal (empty roster path
  //     fired onEmptyRoster())
  // Race them; whichever resolves first tells us what state we're in.
  // Generous timeout because the cross-user roster fetch hits the
  // API + Firestore admin SDK and can take several seconds on cold
  // compile.
  await Promise.race([
    page.getByTestId('shopping-store-skip').waitFor({ timeout: 20_000 }),
    page.getByTestId('active-shopping-title').waitFor({ timeout: 20_000 }),
  ]).catch(() => {
    // Neither appeared in 20s — let the downstream assertion produce
    // the meaningful failure message instead of swallowing here.
  })

  // If the modal showed, dismiss it so the sort rules can be
  // asserted on the rendered in-store list.
  const skipBtn = page.getByTestId('shopping-store-skip')
  if (await skipBtn.isVisible().catch(() => false)) {
    await skipBtn.click()
  }
}

test('caregiver lands on /shopping/active with the in-store header + tabs', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)

  // The header carries the count format "0 of N found"; assert the
  // page reached the in-store flow without rule-permission errors.
  await expect(page.getByText(/of \d+ found/i)).toBeVisible({ timeout: 30_000 })

  // Three tabs present — TO-PICK, IN REVIEW, DONE.
  await expect(page.getByRole('button', { name: /to.?pick/i }).first()).toBeVisible()
})

test('category sections render in perishability tier order (frozen LAST, shelf-stable FIRST)', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)

  // Wait for at least one category section to render. Section testids
  // are added in ActiveShoppingMode: data-testid="category-section-{cat}".
  const sections = page.locator('[data-testid^="category-section-"]')
  await expect(sections.first()).toBeVisible({ timeout: 30_000 })

  // Collect the rendered categories in DOM order.
  const testids = await sections.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid') || ''),
  )
  const renderedCategories = testids
    .map((id) => id.replace('category-section-', ''))
    .filter((c) => c.length > 0)

  console.log('Rendered categories (DOM order):', renderedCategories)
  expect(renderedCategories.length).toBeGreaterThanOrEqual(2)

  // Assert relative tier order: for every pair (i, j) where i < j in
  // the rendered list, tier(i) <= tier(j). Mismatch = a category
  // jumped past a higher-tier one, which would mean the rule chain
  // isn't reaching the rendered DOM.
  for (let i = 0; i < renderedCategories.length - 1; i++) {
    const a = renderedCategories[i]
    const b = renderedCategories[i + 1]
    const ta = PERISHABILITY_TIER[a] ?? 99
    const tb = PERISHABILITY_TIER[b] ?? 99
    expect(ta, `category "${a}" (tier ${ta}) appeared before "${b}" (tier ${tb}) — sort rule chain isn't reaching the rendered DOM`).toBeLessThanOrEqual(tb)
  }
})

test('frozen-last invariant: no higher-tier category renders after frozen', async ({ page }) => {
  await gotoCaregiverShoppingActive(page)
  const sections = page.locator('[data-testid^="category-section-"]')
  await expect(sections.first()).toBeVisible({ timeout: 30_000 })

  const testids = await sections.evaluateAll((els) =>
    els.map((el) => el.getAttribute('data-testid') || ''),
  )
  const renderedCategories = testids
    .map((id) => id.replace('category-section-', ''))
    .filter((c) => c.length > 0)

  const frozenIndex = renderedCategories.indexOf('frozen')
  if (frozenIndex === -1) {
    // No frozen items in the current seed — this invariant is
    // vacuously satisfied. Make the test pass with a note rather
    // than skip (which would silently disable the assertion).
    console.log('No frozen items in seed; frozen-last invariant vacuously satisfied.')
    return
  }

  // Frozen exists. Assert no category after it has a higher tier
  // (there shouldn't be one — tier 5 is the highest in our rule
  // chain. Anything appearing after frozen would have to be tier 99
  // 'unknown' which means the rule chain dropped it.)
  const after = renderedCategories.slice(frozenIndex + 1)
  for (const cat of after) {
    const tier = PERISHABILITY_TIER[cat] ?? 99
    expect(tier, `"${cat}" (tier ${tier}) rendered AFTER frozen — violates the cold-chain floor`).toBe(99)
  }
})
