/**
 * allergen-parser Tests — correctness lives at the edges:
 * standard warnings, derivatives, pre-tokenized tags, and (the hard part)
 * false-positive guards + false-negative safety + word-boundary discipline.
 */

import { parseAllergens, normalizeAllergen } from '@/lib/allergen-parser'

describe('parseAllergens — the four standard cases', () => {
  it('1. parses a "Contains:" warning', () => {
    expect(parseAllergens('Ingredients: Potatoes, Vegetable Oil. Contains: Milk and Soy.')).toEqual(['milk', 'soy'])
  })

  it('2. resolves derivatives (whey → milk, wheat → wheat_gluten)', () => {
    expect(parseAllergens('Organic whole wheat flour, whey protein, natural flavors.')).toEqual(['milk', 'wheat_gluten'])
  })

  it('3. normalizes pre-tokenized catalog tags', () => {
    expect(parseAllergens(['en:tree-nuts', 'en:sesame-seeds'])).toEqual(['sesame', 'tree_nut'])
  })

  it('4. no false positive on coconut / citric acid', () => {
    expect(parseAllergens('Coconut water, citric acid.')).toEqual([])
  })
})

describe('parseAllergens — guarded ambiguous staples', () => {
  it('almond flour + cocoa butter → tree_nut only (flour/butter guards fire)', () => {
    // 'almond' → tree_nut; "almond flour" ≠ wheat; "cocoa butter" ≠ milk
    expect(parseAllergens('Almond flour, cocoa butter.')).toEqual(['tree_nut'])
  })

  it('but enriched wheat flour + (dairy) butter still flag — no false negatives', () => {
    expect(parseAllergens('Enriched wheat flour, butter, sugar.')).toEqual(['milk', 'wheat_gluten'])
  })
})

describe('parseAllergens — word-boundary discipline & safety folding', () => {
  it('eggplant / soylent / coconut do NOT trip egg / soy / tree_nut', () => {
    expect(parseAllergens('Eggplant, soylent water, coconut.')).toEqual([])
  })

  it('folds "may contain" in for safety (do-no-harm)', () => {
    expect(parseAllergens('Corn chips. May contain tree nuts.')).toEqual(['tree_nut'])
  })
})

describe('normalizeAllergen — one shared vocabulary for the member side', () => {
  it('maps member allergy terms to canonical tokens', () => {
    expect(normalizeAllergen('peanuts')).toBe('peanut')
    expect(normalizeAllergen('Dairy')).toBe('milk')
    expect(normalizeAllergen('shellfish')).toBe('crustacean_shellfish')
    expect(normalizeAllergen('en:tree-nuts')).toBe('tree_nut')
  })

  it('returns null for a non-allergen term', () => {
    expect(normalizeAllergen('rice')).toBeNull()
  })
})
