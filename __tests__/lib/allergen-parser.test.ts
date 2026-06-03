/**
 * allergen-parser Tests — correctness lives at the edges:
 * standard warnings, derivatives, pre-tokenized tags, and (the hard part)
 * false-positive guards + false-negative safety + word-boundary discipline.
 */

import { parseAllergens, normalizeAllergen, allergensFromProductFields } from '@/lib/allergen-parser'

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

describe('parseAllergens — free-from / negation must NOT flag (Nutella smoke-test regression)', () => {
  it('"gluten-free" and "gluten free" disclaim, not declare', () => {
    expect(parseAllergens('Rice flour, sugar. Gluten-free.')).toEqual([])
    expect(parseAllergens('Certified gluten free oats.')).toEqual([])
  })

  it('French "Sans gluten" (the real Nutella label) does not trip wheat_gluten', () => {
    expect(
      parseAllergens('Sucre, huile de palme, cacao maigre, vanilline. Sans gluten.'),
    ).toEqual([])
  })

  it('"no milk" / "dairy-free" / "non-dairy" disclaim milk', () => {
    expect(parseAllergens('Oat drink. Dairy-free, no milk, non-dairy.')).toEqual([])
  })

  it('but a real allergen alongside a free-from claim still flags', () => {
    // contains hazelnuts (tree_nut) AND claims gluten-free → tree_nut only
    expect(parseAllergens('Hazelnuts, sugar. Gluten-free.')).toEqual(['tree_nut'])
  })
})

describe('parseAllergens — OFF canonical allergens_tags (language-independent)', () => {
  it("Nutella's allergens_tags resolve correctly (the fix the live scan needed)", () => {
    // OFF returns these regardless of the product's display language.
    expect(parseAllergens(['en:milk', 'en:nuts', 'en:soybeans'])).toEqual(['milk', 'soy', 'tree_nut'])
  })

  it('the generic "en:nuts" group tag maps to tree_nut', () => {
    expect(parseAllergens(['en:nuts'])).toEqual(['tree_nut'])
    expect(parseAllergens('Contains nuts.')).toEqual(['tree_nut'])
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

describe('allergensFromProductFields — the shared OFF-product → tags helper', () => {
  it('unions the comma-separated `allergens` field with `ingredients_text`', () => {
    // allergens declares milk+soy (locale tokens); ingredients adds wheat.
    expect(
      allergensFromProductFields('en:milk,en:soy', 'Wheat flour, sugar, salt.'),
    ).toEqual(['milk', 'soy', 'wheat_gluten'])
  })

  it('de-duplicates across the two fields', () => {
    expect(allergensFromProductFields('en:peanuts', 'Roasted peanuts, salt.')).toEqual(['peanut'])
  })

  it('returns [] when both fields are absent or empty (parsed, none declared)', () => {
    expect(allergensFromProductFields(undefined, undefined)).toEqual([])
    expect(allergensFromProductFields('', '')).toEqual([])
  })

  it('still parses when only ingredients_text is present (no `allergens` field)', () => {
    expect(allergensFromProductFields(undefined, 'Contains: Sesame.')).toEqual(['sesame'])
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
