/**
 * inventory-attention Tests
 *
 * Verifies the Phase 0 Attention score / two-clock model:
 * - the four corners (about-to-run-out, about-to-spoil, plentiful, cold-start)
 * - action follows whichever raw clock is sooner (T_empty vs T_spoil)
 * - urgency kernel boundaries (T=0 → ~1, far out → ~0)
 */

import {
  inventoryAttentionScore,
  compareAttention,
  ATTENTION_EPSILON,
} from '@/lib/inventory-attention'
import type { ShoppingItem } from '@/types/shopping'

const NOW = new Date('2026-06-01T12:00:00.000Z').getTime()
const DAY = 1000 * 60 * 60 * 24

function makeItem(overrides: Partial<ShoppingItem>): ShoppingItem {
  return {
    id: 'i1',
    userId: 'u1',
    productName: 'Test Item',
    brand: '',
    imageUrl: '',
    category: 'pantry', // non-perishable by default
    isManual: false,
    inStock: true,
    quantity: 5,
    location: 'pantry',
    isPerishable: false,
    needed: false,
    priority: 'medium',
    purchaseHistory: [],
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    ...overrides,
  }
}

describe('inventoryAttentionScore — four corners', () => {
  it('about to run out: cold-start out-of-stock → score ~1, restock', () => {
    const r = inventoryAttentionScore(makeItem({ quantity: 0 }), NOW)
    expect(r.restockUrgency).toBeCloseTo(1)
    expect(r.score).toBeCloseTo(1)
    expect(r.action).toBe('restock')
  })

  it('about to spoil: perishable expiring today → spoil ~1, use-soon', () => {
    const r = inventoryAttentionScore(
      makeItem({ category: 'produce', isPerishable: true, expiresAt: new Date(NOW), quantity: 5 }),
      NOW,
    )
    expect(r.tSpoil).toBe(0)
    expect(r.spoilUrgency).toBeCloseTo(1)
    expect(r.restockUrgency).toBe(0) // qty above floor, no cadence
    expect(r.action).toBe('use-soon')
  })

  it('plentiful non-perishable: no cadence, well stocked → score ~0, ok', () => {
    const r = inventoryAttentionScore(makeItem({ category: 'pantry', quantity: 10 }), NOW)
    expect(r.restockUrgency).toBe(0)
    expect(r.spoilUrgency).toBe(0)
    expect(r.score).toBeLessThan(ATTENTION_EPSILON)
    expect(r.action).toBe('ok')
  })

  it('cold-start respects a custom lowStockThreshold', () => {
    // qty 3, threshold 4 → at/below floor → restock signal
    const r = inventoryAttentionScore(makeItem({ quantity: 3, lowStockThreshold: 4 }), NOW)
    expect(r.restockUrgency).toBeCloseTo(1)
    expect(r.action).toBe('restock')
  })
})

describe('inventoryAttentionScore — action flips when clocks cross', () => {
  // Cadence: bought 5 days ago, buys every 7 → T_empty = 2.
  const base = {
    category: 'produce' as const,
    isPerishable: true,
    quantity: 5,
    averageDaysBetweenPurchases: 7,
    lastPurchased: new Date(NOW - 5 * DAY),
  }

  it('spoil sooner than empty → use-soon', () => {
    const r = inventoryAttentionScore(
      makeItem({ ...base, expiresAt: new Date(NOW + 1 * DAY) }), // T_spoil = 1 < T_empty = 2
      NOW,
    )
    expect(r.tEmpty).toBe(2)
    expect(r.tSpoil).toBe(1)
    expect(r.action).toBe('use-soon')
  })

  it('empty sooner than spoil → restock', () => {
    const r = inventoryAttentionScore(
      makeItem({ ...base, expiresAt: new Date(NOW + 5 * DAY) }), // T_spoil = 5 > T_empty = 2
      NOW,
    )
    expect(r.tEmpty).toBe(2)
    expect(r.tSpoil).toBe(5)
    expect(r.action).toBe('restock')
  })
})

describe('inventoryAttentionScore — clocks & kernel', () => {
  it('T_empty = averageDaysBetweenPurchases − daysSinceLastPurchase', () => {
    const r = inventoryAttentionScore(
      makeItem({ averageDaysBetweenPurchases: 10, lastPurchased: new Date(NOW - 3 * DAY) }),
      NOW,
    )
    expect(r.tEmpty).toBe(7)
  })

  it('overdue (negative T_empty) clamps urgency to 1', () => {
    const r = inventoryAttentionScore(
      makeItem({ averageDaysBetweenPurchases: 7, lastPurchased: new Date(NOW - 20 * DAY) }),
      NOW,
    )
    expect(r.tEmpty).toBe(-13)
    expect(r.restockUrgency).toBeCloseTo(1)
    expect(r.action).toBe('restock')
  })

  it('perishable with no expiresAt falls back to category default shelf-life', () => {
    // produce default shelf-life = 7 days; bought 2 days ago → T_spoil = 5
    const r = inventoryAttentionScore(
      makeItem({ category: 'produce', isPerishable: true, lastPurchased: new Date(NOW - 2 * DAY) }),
      NOW,
    )
    expect(r.tSpoil).toBe(5)
    expect(r.spoilUrgency).toBeGreaterThan(0)
  })
})

describe('inventoryAttentionScore — expired gets its own discard state', () => {
  it('past-expiry → discard (not use-soon), score pinned at ~1', () => {
    const r = inventoryAttentionScore(
      makeItem({ category: 'dairy', isPerishable: true, expiresAt: new Date(NOW - 3 * DAY), quantity: 2 }),
      NOW,
    )
    expect(r.tSpoil).toBe(-3)
    expect(r.spoilUrgency).toBeCloseTo(1) // negative clock clamps to 1
    expect(r.score).toBeCloseTo(1)
    expect(r.action).toBe('discard')
    expect(r.soonestClock).toBe(-3)
  })
})

describe('compareAttention — composite sort key (score DESC, soonestClock ASC)', () => {
  it('orders equal 1.00 scores by most-overdue first', () => {
    const cadence = (avg: number, daysAgo: number) =>
      inventoryAttentionScore(
        makeItem({
          category: 'pantry',
          averageDaysBetweenPurchases: avg,
          lastPurchased: new Date(NOW - daysAgo * DAY),
        }),
        NOW,
      )
    const overdue12 = cadence(7, 19) // T_empty = −12
    const overdue1 = cadence(7, 8) //  T_empty = −1
    const coldStart = inventoryAttentionScore(makeItem({ quantity: 0 }), NOW) // clock 0

    // all three are pinned at the 1.00 ceiling …
    for (const r of [overdue12, overdue1, coldStart]) expect(r.score).toBeCloseTo(1)
    // … and the comparator still orders them deterministically by how overdue.
    const sorted = [coldStart, overdue1, overdue12].sort(compareAttention)
    expect(sorted.map((r) => r.soonestClock)).toEqual([-12, -1, 0])
  })

  it('a higher score still outranks a more-overdue lower score', () => {
    const out = inventoryAttentionScore(makeItem({ quantity: 0 }), NOW) // score 1.00, clock 0
    const spoilingSoon = inventoryAttentionScore(
      makeItem({ category: 'produce', isPerishable: true, expiresAt: new Date(NOW + 2 * DAY), quantity: 5 }),
      NOW,
    ) // score ~0.67, clock 2
    expect([spoilingSoon, out].sort(compareAttention)[0]).toBe(out)
  })
})

describe('inventoryAttentionScore — health demand wiring (inert until enriched)', () => {
  const runningOut = makeItem({ averageDaysBetweenPurchases: 7, lastPurchased: new Date(NOW - 7 * DAY) }) // tEmpty 0 → restock 1
  const hyper = { id: 'h', conditions: ['hypertension'], allergies: [], dietaryRestrictions: [] }
  const diabetic = { id: 'd', conditions: ['diabetes'], allergies: [], dietaryRestrictions: [] }

  it('no health context → demandWeight 1, no warnings, score unchanged', () => {
    const r = inventoryAttentionScore(runningOut, NOW)
    expect(r.demandWeight).toBe(1)
    expect(r.unsafeFor).toEqual([])
    expect(r.score).toBeCloseTo(1) // == base restock urgency, untouched
  })

  it('context but no item attributes → still neutral (D = 1)', () => {
    const r = inventoryAttentionScore(runningOut, NOW, { members: [hyper], itemHealth: {} })
    expect(r.demandWeight).toBe(1)
    expect(r.score).toBeCloseTo(1)
  })

  it('harmful item suppresses the score (D < 1) without changing the action', () => {
    const withHarm = inventoryAttentionScore(runningOut, NOW, {
      members: [hyper],
      itemHealth: { nutrients: { sodium: 1200 } }, // high → hypertension penalty
    })
    expect(withHarm.demandWeight).toBeLessThan(1)
    expect(withHarm.score).toBeLessThan(inventoryAttentionScore(runningOut, NOW).score)
    expect(withHarm.action).toBe('restock') // it IS running out; action unchanged, just deprioritized
  })

  it('beneficial-but-stocked item is floored onto the radar', () => {
    const stocked = makeItem({ category: 'pantry', quantity: 10 }) // clocks calm → base score 0
    const base = inventoryAttentionScore(stocked, NOW)
    expect(base.score).toBe(0)
    const withFloor = inventoryAttentionScore(stocked, NOW, {
      members: [diabetic],
      itemHealth: { medicalSupplyFor: ['diabetes'] },
    })
    expect(withFloor.score).toBeGreaterThan(0) // health floor lifted it
    expect(withFloor.action).toBe('ok') // floor lifts ranking, not the clock action
  })

  it('propagates unsafeFor from an allergen match', () => {
    const r = inventoryAttentionScore(runningOut, NOW, {
      members: [{ id: 'p', conditions: [], allergies: ['peanuts'], dietaryRestrictions: [] }],
      itemHealth: { allergenTags: ['peanuts'] },
    })
    expect(r.unsafeFor).toContain('p')
  })
})
