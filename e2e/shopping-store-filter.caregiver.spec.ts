import { test, expect } from '@playwright/test'
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Caregiver-side Phase 0b assertion — the full per-item-store
 * assignment loop, in the actually-rendered UI.
 *
 * Flow under test:
 *   1. Owner has a household roster (Walmart + Walgreens) and items
 *      assigned to specific stores via `assignedStoreId`.
 *   2. Caregiver opens /shopping/active?ownerId=X — the "Which store?"
 *      picker shows count badges per tile.
 *   3. Caregiver taps Walmart — page filters to just Walmart-assigned
 *      items + unassigned ("any store").
 *   4. Header reads "Shopping at Walmart" (visual confirmation).
 *   5. Walgreens-only items are NOT visible.
 *
 * Pre-test seed via admin SDK; cleanup deletes everything seeded.
 * The owner's real items are untouched — we add 3 SEED items with
 * the `__test_phase0b_` prefix and remove them in afterAll.
 */

const OWNER_UID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'

// Initialize admin SDK at module level so beforeAll/afterAll can share it.
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

const stamp = Date.now()
const SEED_IDS = {
  walmartA: `__test_phase0b_walmart_a_${stamp}`,
  walmartB: `__test_phase0b_walmart_b_${stamp}`,
  walgreensA: `__test_phase0b_walgreens_a_${stamp}`,
}
let originalRoster: string[] | undefined

test.beforeAll(async () => {
  // 1. Seed the household roster — at minimum, Walmart + Walgreens.
  //    Capture pre-test roster so afterAll can restore.
  const userRef = adminDb.collection('users').doc(OWNER_UID)
  const before = await userRef.get()
  const beforeIds = before.data()?.householdStoreIds
  originalRoster = Array.isArray(beforeIds) ? beforeIds : undefined
  await userRef.update({
    householdStoreIds: ['walmart', 'walgreens'],
  })

  // 2. Seed 3 shopping_items with explicit assignedStoreId, all needed.
  const base = {
    userId: OWNER_UID,
    householdId: OWNER_UID,
    brand: 'TEST',
    imageUrl: '',
    category: 'pantry',
    isManual: true,
    inStock: false,
    needed: true,
    priority: 'medium',
    quantity: 1,
    unit: 'each',
    purchaseHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  await Promise.all([
    adminDb.collection('shopping_items').doc(SEED_IDS.walmartA).set({
      ...base,
      productName: 'PHASE0B Walmart Item A',
      assignedStoreId: 'walmart',
    }),
    adminDb.collection('shopping_items').doc(SEED_IDS.walmartB).set({
      ...base,
      productName: 'PHASE0B Walmart Item B',
      assignedStoreId: 'walmart',
    }),
    adminDb.collection('shopping_items').doc(SEED_IDS.walgreensA).set({
      ...base,
      productName: 'PHASE0B Walgreens Item A',
      assignedStoreId: 'walgreens',
    }),
  ])
})

test.afterAll(async () => {
  // Delete every seeded item.
  await Promise.all(
    Object.values(SEED_IDS).map((id) =>
      adminDb.collection('shopping_items').doc(id).delete().catch(() => {}),
    ),
  )
  // Restore the owner's roster (or remove field if was unset).
  const userRef = adminDb.collection('users').doc(OWNER_UID)
  if (originalRoster) {
    await userRef.update({ householdStoreIds: originalRoster })
  } else {
    await userRef.update({
      householdStoreIds: (await import('firebase-admin/firestore')).FieldValue.delete(),
    })
  }
})

test('caregiver picker shows per-store item counts (Walmart 2, Walgreens 1)', async ({ page }) => {
  await page.goto(`/shopping/active?ownerId=${OWNER_UID}`, {
    waitUntil: 'domcontentloaded',
  })

  // Picker should appear with both tiles. The Walmart tile must
  // carry a count badge of 2 (the two seeded items) at minimum.
  // The owner's real items may push the count higher — we assert
  // ≥ seed expectations to stay stable across data drift.
  const walmartTile = page.getByTestId('shopping-store-pick-walmart')
  const walgreensTile = page.getByTestId('shopping-store-pick-walgreens')

  await expect(walmartTile).toBeVisible({ timeout: 30_000 })
  await expect(walgreensTile).toBeVisible()

  const walmartCount = parseInt(
    (await walmartTile.getAttribute('data-item-count')) || '0',
    10,
  )
  const walgreensCount = parseInt(
    (await walgreensTile.getAttribute('data-item-count')) || '0',
    10,
  )
  expect(walmartCount).toBeGreaterThanOrEqual(2)
  expect(walgreensCount).toBeGreaterThanOrEqual(1)
})

test('caregiver taps Walmart → page filters to Walmart items + unassigned (no Walgreens-only)', async ({ page }) => {
  await page.goto(`/shopping/active?ownerId=${OWNER_UID}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByTestId('shopping-store-pick-walmart').click({ timeout: 30_000 })

  // Header should read "Shopping at Walmart" — visual confirmation.
  await expect(
    page.getByTestId('active-shopping-title'),
  ).toContainText(/Shopping at Walmart/i, { timeout: 30_000 })

  // Both Walmart-assigned items render; Walgreens-only does NOT.
  await expect(page.getByText('PHASE0B Walmart Item A')).toBeVisible()
  await expect(page.getByText('PHASE0B Walmart Item B')).toBeVisible()
  await expect(page.getByText('PHASE0B Walgreens Item A')).not.toBeVisible()
})

test('caregiver taps Skip → sees all items (no store filter, header is generic)', async ({ page }) => {
  await page.goto(`/shopping/active?ownerId=${OWNER_UID}`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByTestId('shopping-store-skip').click({ timeout: 30_000 })

  // Header back to plain "Shopping" since no store was picked.
  await expect(page.getByTestId('active-shopping-title')).toHaveText('Shopping', {
    timeout: 30_000,
  })

  // ALL seeded items visible (no filter applied).
  await expect(page.getByText('PHASE0B Walmart Item A')).toBeVisible()
  await expect(page.getByText('PHASE0B Walgreens Item A')).toBeVisible()
})
