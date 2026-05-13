/**
 * Unit-test the perishability comparator + tier exhaustiveness.
 *
 * Pure-function tests, no Firestore / network. Run on the rule baseline
 * before the ML upgrade lands (rule v1; rules v2-v6 + scan-event ML are
 * captured in memory/project_shopping_phase_0b.md).
 *
 * Usage:
 *   npx tsx scripts/test-perishability-sort.ts
 */

import {
  PERISHABILITY_TIER,
  comparePerishability,
  compareFragility,
  isFragile,
  FRAGILE_CATEGORIES,
  compareWaitCounter,
  isWaitCounter,
  WAIT_COUNTER_CATEGORIES,
} from '../lib/perishability-tiers'
import type { ProductCategory } from '../types/shopping'

interface Assertion { name: string; fn: () => void }
const assertions: Assertion[] = []
function test(name: string, fn: () => void) { assertions.push({ name, fn }) }
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
    toEqual(expected: any) {
      const a = JSON.stringify(actual)
      const b = JSON.stringify(expected)
      if (a !== b) throw new Error(`expected ${b}, got ${a}`)
    },
    toBeGreaterThan(n: number) {
      if (typeof actual !== 'number' || actual <= n) throw new Error(`expected > ${n}, got ${JSON.stringify(actual)}`)
    },
    toBeLessThan(n: number) {
      if (typeof actual !== 'number' || actual >= n) throw new Error(`expected < ${n}, got ${JSON.stringify(actual)}`)
    },
  }
}

const ALL_CATEGORIES: ProductCategory[] = [
  'produce', 'meat', 'dairy', 'bakery', 'deli', 'eggs', 'herbs', 'spices',
  'seafood', 'frozen', 'pantry', 'beverages', 'condiments', 'baby',
  'pet-food', 'pet-supplies', 'other',
]

test('every ProductCategory has a tier assigned (no undefined lookups)', () => {
  for (const cat of ALL_CATEGORIES) {
    const tier = PERISHABILITY_TIER[cat]
    if (typeof tier !== 'number') {
      throw new Error(`category ${cat} has no tier`)
    }
  }
})

test('frozen is tier 5 (the highest — picked last)', () => {
  expect(PERISHABILITY_TIER.frozen).toBe(5)
})

test('shelf-stable categories are tier 1 (picked first)', () => {
  const tier1 = ['other', 'pet-supplies', 'spices', 'condiments', 'pantry', 'pet-food', 'beverages', 'baby']
  for (const cat of tier1) {
    expect(PERISHABILITY_TIER[cat as ProductCategory]).toBe(1)
  }
})

test('cold-chain dairy + meat + seafood are tier 4 (after produce)', () => {
  expect(PERISHABILITY_TIER.dairy).toBe(4)
  expect(PERISHABILITY_TIER.meat).toBe(4)
  expect(PERISHABILITY_TIER.seafood).toBe(4)
})

test('produce + herbs + bakery are tier 2 (between shelf-stable and refrigerated)', () => {
  expect(PERISHABILITY_TIER.produce).toBe(2)
  expect(PERISHABILITY_TIER.herbs).toBe(2)
  expect(PERISHABILITY_TIER.bakery).toBe(2)
})

test('comparePerishability: frozen comes AFTER everything else', () => {
  for (const cat of ALL_CATEGORIES) {
    if (cat === 'frozen') continue
    const cmp = comparePerishability({ category: cat }, { category: 'frozen' })
    if (cmp >= 0) throw new Error(`${cat} should sort BEFORE frozen, got cmp=${cmp}`)
  }
})

test('comparePerishability: pantry comes BEFORE everything except other tier-1', () => {
  for (const cat of ALL_CATEGORIES) {
    const cmp = comparePerishability({ category: 'pantry' }, { category: cat })
    if (PERISHABILITY_TIER[cat] === 1) {
      // Same-tier comparison should be 0 from the perishability axis.
      expect(cmp).toBe(0)
    } else {
      // Higher-tier categories should compare AFTER pantry.
      if (cmp >= 0) throw new Error(`pantry should sort BEFORE ${cat}, got cmp=${cmp}`)
    }
  }
})

test('comparePerishability: dairy comes AFTER produce (cold-chain after fresh)', () => {
  const cmp = comparePerishability({ category: 'dairy' }, { category: 'produce' })
  expect(cmp).toBeGreaterThan(0)
})

test('FRAGILE_CATEGORIES: bakery + eggs are flagged fragile', () => {
  expect(isFragile('bakery')).toBe(true)
  expect(isFragile('eggs')).toBe(true)
  expect(FRAGILE_CATEGORIES.size).toBe(2)
})

test('non-fragile categories: produce, dairy, frozen are NOT flagged fragile', () => {
  expect(isFragile('produce')).toBe(false)
  expect(isFragile('dairy')).toBe(false)
  expect(isFragile('frozen')).toBe(false)
  expect(isFragile('meat')).toBe(false)
  expect(isFragile('pantry')).toBe(false)
})

test('compareFragility: non-fragile sorts BEFORE fragile within same tier', () => {
  // produce (tier 2 non-fragile) vs bakery (tier 2 fragile): produce first
  expect(compareFragility({ category: 'produce' }, { category: 'bakery' })).toBe(-1)
  // bakery vs produce: bakery later
  expect(compareFragility({ category: 'bakery' }, { category: 'produce' })).toBe(1)
  // deli (tier 3 non-fragile) vs eggs (tier 3 fragile): deli first
  expect(compareFragility({ category: 'deli' }, { category: 'eggs' })).toBe(-1)
})

test('compareFragility returns 0 for same-fragility pairs', () => {
  expect(compareFragility({ category: 'produce' }, { category: 'herbs' })).toBe(0)
  expect(compareFragility({ category: 'bakery' }, { category: 'eggs' })).toBe(0)
})

test('full chain: perishability dominates fragility — bakery (tier 2 fragile) still sorts BEFORE frozen (tier 5)', () => {
  // Tier comparison: tier 2 - tier 5 = -3 (bakery first)
  // Fragility comparison would say bakery is fragile (1) vs frozen (0), suggesting bakery LATER
  // But tier wins because it's checked first.
  const tierCmp = comparePerishability({ category: 'bakery' }, { category: 'frozen' })
  expect(tierCmp).toBeLessThan(0) // bakery before frozen
})

test('WAIT_COUNTER_CATEGORIES: deli + seafood are flagged wait-counter', () => {
  expect(isWaitCounter('deli')).toBe(true)
  expect(isWaitCounter('seafood')).toBe(true)
  expect(WAIT_COUNTER_CATEGORIES.size).toBe(2)
})

test('non-wait-counter: dairy, meat, produce, pantry are NOT flagged', () => {
  expect(isWaitCounter('dairy')).toBe(false)
  expect(isWaitCounter('meat')).toBe(false)
  expect(isWaitCounter('produce')).toBe(false)
  expect(isWaitCounter('pantry')).toBe(false)
  expect(isWaitCounter('frozen')).toBe(false)
})

test('compareWaitCounter: wait-counter sorts BEFORE non-wait-counter within tier', () => {
  // Tier 4: seafood (wait-counter) vs dairy (not): seafood first.
  expect(compareWaitCounter({ category: 'seafood' }, { category: 'dairy' })).toBe(-1)
  // Reverse: dairy after seafood.
  expect(compareWaitCounter({ category: 'dairy' }, { category: 'seafood' })).toBe(1)
  // Tier 3: deli (wait-counter) vs eggs (not): deli first.
  expect(compareWaitCounter({ category: 'deli' }, { category: 'eggs' })).toBe(-1)
})

test('compareWaitCounter returns 0 for same-class pairs', () => {
  // Two wait-counter items
  expect(compareWaitCounter({ category: 'deli' }, { category: 'seafood' })).toBe(0)
  // Two non-wait-counter items
  expect(compareWaitCounter({ category: 'pantry' }, { category: 'dairy' })).toBe(0)
})

test('full chain: tier 4 within-tier order — seafood (wait-counter) BEFORE dairy + meat', () => {
  // Within tier 4, the chain is: wait-counter → fragility → name.
  // seafood (wait-counter) vs dairy + meat (non-wait, non-fragile).
  // Tier comparator returns 0 (same tier 4); wait-counter wins.
  const seafood = { category: 'seafood' as ProductCategory }
  const dairy = { category: 'dairy' as ProductCategory }
  const meat = { category: 'meat' as ProductCategory }
  // Same tier, so comparePerishability is 0; compareWaitCounter decides.
  expect(comparePerishability(seafood, dairy)).toBe(0)
  expect(compareWaitCounter(seafood, dairy)).toBe(-1) // seafood first
  expect(comparePerishability(seafood, meat)).toBe(0)
  expect(compareWaitCounter(seafood, meat)).toBe(-1) // seafood first
})

test('cross-tier: wait-counter does NOT yank seafood ahead of pantry', () => {
  // seafood is tier 4, pantry is tier 1. Tier dominates.
  expect(comparePerishability({ category: 'seafood' }, { category: 'pantry' })).toBeGreaterThan(0)
  // Even though seafood is wait-counter and pantry isn't, tier wins
  // because the smartSort checks perishability before wait-counter.
})

test('mixed-cart sort: frozen sorts last, pantry first', () => {
  const mix: Array<{ id: string; category: ProductCategory }> = [
    { id: 'a', category: 'frozen' },
    { id: 'b', category: 'produce' },
    { id: 'c', category: 'pantry' },
    { id: 'd', category: 'dairy' },
    { id: 'e', category: 'spices' },
  ]
  const sorted = [...mix].sort(comparePerishability)
  // Pantry + spices (tier 1) first; frozen last.
  expect(sorted[sorted.length - 1].id).toBe('a') // frozen
  // First two should both be tier-1.
  expect(PERISHABILITY_TIER[sorted[0].category]).toBe(1)
  expect(PERISHABILITY_TIER[sorted[1].category]).toBe(1)
})

let passed = 0
let failed = 0
for (const a of assertions) {
  try {
    a.fn()
    console.log(`  ✓ ${a.name}`)
    passed += 1
  } catch (e: any) {
    console.log(`  ✗ ${a.name}`)
    console.log(`      ${e?.message || e}`)
    failed += 1
  }
}
console.log('='.repeat(70))
console.log(`Results: ${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
