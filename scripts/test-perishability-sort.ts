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
