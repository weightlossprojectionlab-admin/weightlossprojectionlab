/**
 * Unit tests for normalizeStoreNameToCatalogId — the receipt-OCR
 * free-text → catalog id bridge (Phase 0b-0). Pure function, no
 * Firestore / network.
 *
 * Coverage:
 *   - Exact name match → catalog id
 *   - Receipt-style prefixes/suffixes ("WALMART INC #1234") → id
 *   - Case-insensitive matching
 *   - Substring ambiguity broken by longest-name-wins
 *     ("FAMILY DOLLAR" beats "Dollar Tree" containing "Dollar")
 *   - Slug / id match ("aldi.us" / "harris-teeter")
 *   - Whitespace + edge cases (null, empty, no-match)
 *
 * Usage:
 *   npx tsx scripts/test-normalize-store-name.ts
 */

import { normalizeStoreNameToCatalogId } from '../constants/store-roster'

interface Assertion { name: string; fn: () => void }
const assertions: Assertion[] = []
function test(name: string, fn: () => void) { assertions.push({ name, fn }) }
function expect<T>(actual: T) {
  return {
    toBe(expected: T) {
      if (actual !== expected) throw new Error(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    },
  }
}

test('exact name: "Walmart" → walmart', () => {
  expect(normalizeStoreNameToCatalogId('Walmart')).toBe('walmart')
})

test('case-insensitive: "WALMART" → walmart', () => {
  expect(normalizeStoreNameToCatalogId('WALMART')).toBe('walmart')
})

test('receipt-style with prefix/suffix: "WALMART INC #1234" → walmart', () => {
  expect(normalizeStoreNameToCatalogId('WALMART INC #1234')).toBe('walmart')
})

test('receipt-style with location: "WALGREENS STORE 4567" → walgreens', () => {
  expect(normalizeStoreNameToCatalogId('WALGREENS STORE 4567')).toBe('walgreens')
})

test('multi-word name: "Whole Foods Market" → whole-foods', () => {
  expect(normalizeStoreNameToCatalogId('Whole Foods Market')).toBe('whole-foods')
})

test('multi-word receipt: "WHOLE FOODS MARKET 10123" → whole-foods', () => {
  expect(normalizeStoreNameToCatalogId('WHOLE FOODS MARKET 10123')).toBe('whole-foods')
})

test('longest-name-wins: "FAMILY DOLLAR #555" → family-dollar (not dollar-tree)', () => {
  // Both "Family Dollar" and "Dollar Tree" contain "Dollar";
  // longest-name-wins resolves to the more specific match.
  expect(normalizeStoreNameToCatalogId('FAMILY DOLLAR #555')).toBe('family-dollar')
})

test('slug-style id match: "aldi.us" → aldi', () => {
  expect(normalizeStoreNameToCatalogId('aldi.us')).toBe('aldi')
})

test('slug-style id match: "harris-teeter.com" → harris-teeter', () => {
  expect(normalizeStoreNameToCatalogId('harris-teeter.com')).toBe('harris-teeter')
})

test('apostrophe in name: "Trader Joe\'s #123" → trader-joes', () => {
  expect(normalizeStoreNameToCatalogId("Trader Joe's #123")).toBe('trader-joes')
})

test('null / undefined / empty / whitespace-only → null', () => {
  expect(normalizeStoreNameToCatalogId(null)).toBe(null)
  expect(normalizeStoreNameToCatalogId(undefined)).toBe(null)
  expect(normalizeStoreNameToCatalogId('')).toBe(null)
  expect(normalizeStoreNameToCatalogId('   ')).toBe(null)
})

test('unknown chain → null (caller falls back to free-text)', () => {
  expect(normalizeStoreNameToCatalogId('Some Local Co-op')).toBe(null)
  expect(normalizeStoreNameToCatalogId('McDonald\'s')).toBe(null)
})

test('non-string input → null', () => {
  // Defensive — caller might pass anything from an OCR field.
  expect(normalizeStoreNameToCatalogId(123 as any)).toBe(null)
  expect(normalizeStoreNameToCatalogId({} as any)).toBe(null)
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
