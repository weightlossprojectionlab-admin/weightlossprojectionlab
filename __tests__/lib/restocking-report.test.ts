/**
 * restocking-report Tests
 *
 * - Financial waste: only discard-state items, grouped by category, summed by
 *   resolved price; unpriced items counted but never fabricated into a cost.
 * - resolveItemPriceCents fallback chain.
 * - Cadence calibration: low-confidence flag when interval spread ≥ mean, and
 *   shakiest predictions sort first.
 */

import {
  buildRestockingReport,
  resolveItemPriceCents,
} from '@/lib/restocking-report'
import type { ShoppingItem } from '@/types/shopping'

const NOW = new Date('2026-06-01T12:00:00.000Z').getTime()
const DAY = 1000 * 60 * 60 * 24

function makeItem(overrides: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: 'i1',
    userId: 'u1',
    productName: 'Item',
    brand: '',
    imageUrl: '',
    category: 'pantry',
    isManual: false,
    inStock: true,
    quantity: 2,
    location: 'pantry',
    isPerishable: false,
    needed: false,
    priority: 'medium',
    purchaseHistory: [],
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  } as ShoppingItem
}

// An expired (discard-state) item: perishable + expiresAt in the past.
const expired = (over: Partial<ShoppingItem>): ShoppingItem =>
  makeItem({ isPerishable: true, expiresAt: new Date(NOW - 2 * DAY), ...over })

describe('resolveItemPriceCents — fallback chain', () => {
  it('prefers expectedPriceCents, then purchase, then unit, then last history price', () => {
    expect(resolveItemPriceCents(makeItem({ expectedPriceCents: 350, purchasePriceCents: 999 }))).toBe(350)
    expect(resolveItemPriceCents(makeItem({ purchasePriceCents: 420, unitPriceCents: 999 }))).toBe(420)
    expect(resolveItemPriceCents(makeItem({ unitPriceCents: 180 }))).toBe(180)
    expect(
      resolveItemPriceCents(
        makeItem({ purchaseHistory: [{ date: new Date(NOW - 9 * DAY), price: 1 }, { date: new Date(NOW), price: 2.5 }] }),
      ),
    ).toBe(250) // dollars → cents, most recent
  })

  it('returns null when no price exists (never fabricates a default)', () => {
    expect(resolveItemPriceCents(makeItem({}))).toBeNull()
  })
})

describe('buildRestockingReport — financial waste', () => {
  const items = [
    expired({ id: 'a', category: 'dairy', expectedPriceCents: 350 }),
    expired({ id: 'b', category: 'dairy', expectedPriceCents: 200 }),
    expired({ id: 'c', category: 'produce' }), // no price → unpriced
    makeItem({ id: 'd', category: 'pantry', isPerishable: true, expiresAt: new Date(NOW + 10 * DAY), expectedPriceCents: 500 }), // not expired
  ]
  const { waste } = buildRestockingReport(items, NOW)

  it('counts only discard-state items', () => {
    expect(waste.itemCount).toBe(3) // a, b, c — d is not yet expired
  })

  it('sums resolved prices and tracks unpriced separately (no fabrication)', () => {
    expect(waste.totalKnownCostCents).toBe(550) // 350 + 200; c is unpriced
    expect(waste.unpricedCount).toBe(1)
  })

  it('groups by category, highest cost first', () => {
    expect(waste.byCategory.map((c) => c.category)).toEqual(['dairy', 'produce'])
    const dairy = waste.byCategory.find((c) => c.category === 'dairy')!
    expect(dairy).toMatchObject({ count: 2, knownCostCents: 550, unpricedCount: 0 })
    const produce = waste.byCategory.find((c) => c.category === 'produce')!
    expect(produce).toMatchObject({ count: 1, knownCostCents: 0, unpricedCount: 1 })
  })
})

describe('buildRestockingReport — cadence calibration', () => {
  // Regular: intervals 7,7 → mean 7, spread 0 → confident.
  const regular = makeItem({
    id: 'reg',
    productName: 'Milk',
    averageDaysBetweenPurchases: 7,
    lastPurchased: new Date(NOW - 7 * DAY),
    purchaseHistory: [
      { date: new Date(NOW - 21 * DAY) },
      { date: new Date(NOW - 14 * DAY) },
      { date: new Date(NOW - 7 * DAY) },
    ],
  })
  // Erratic: intervals 3,14 → mean 8.5, spread 11 (≥ mean) → low confidence.
  const erratic = makeItem({
    id: 'err',
    productName: 'Coffee',
    averageDaysBetweenPurchases: 8,
    lastPurchased: new Date(NOW),
    purchaseHistory: [
      { date: new Date(NOW - 17 * DAY) },
      { date: new Date(NOW - 14 * DAY) },
      { date: new Date(NOW) },
    ],
  })
  // One purchase → no interval → excluded.
  const single = makeItem({ id: 'one', purchaseHistory: [{ date: new Date(NOW - 3 * DAY) }] })

  const { cadence } = buildRestockingReport([regular, single, erratic], NOW)

  it('excludes items with fewer than two purchases', () => {
    expect(cadence.map((c) => c.id)).not.toContain('one')
  })

  it('flags erratic cadence as low-confidence and sorts it first', () => {
    expect(cadence[0].id).toBe('err')
    expect(cadence[0]).toMatchObject({ meanIntervalDays: 9, intervalSpreadDays: 11, lowConfidence: true })
    const reg = cadence.find((c) => c.id === 'reg')!
    expect(reg).toMatchObject({ meanIntervalDays: 7, intervalSpreadDays: 0, lowConfidence: false })
  })
})
