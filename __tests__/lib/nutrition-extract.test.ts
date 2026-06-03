/**
 * nutrition-extract Tests — the two corrections that matter: unit (g→mg) and
 * basis (per-serving derivation from 100g). Real Nutella numbers anchor it.
 */
import { extractNutrientPanel, parseServingGrams } from '@/lib/nutrition-extract'

describe('parseServingGrams', () => {
  it('parses gram serving sizes, ignores non-gram', () => {
    expect(parseServingGrams('15 g')).toBe(15)
    expect(parseServingGrams('30g')).toBe(30)
    expect(parseServingGrams('30 g (2 tbsp)')).toBe(30)
    expect(parseServingGrams('1 cup (240 ml)')).toBeUndefined()
    expect(parseServingGrams(undefined)).toBeUndefined()
    expect(parseServingGrams('0 g')).toBeUndefined()
  })
})

describe('extractNutrientPanel', () => {
  it('prefers explicit per-serving values; converts sodium/potassium g→mg', () => {
    const p = extractNutrientPanel(
      { sodium_serving: 0.3, sugars_serving: 5, 'saturated-fat_serving': 2, potassium_serving: 0.4 },
      '40 g',
    )!
    expect(p.basis).toBe('serving')
    expect(p.sodium).toBeCloseTo(300) // 0.3 g → 300 mg
    expect(p.potassium).toBeCloseTo(400)
    expect(p.sugars).toBe(5)
    expect(p.saturatedFat).toBe(2)
  })

  it('derives per-serving from 100g × serving grams (real Nutella, 15 g serving)', () => {
    const p = extractNutrientPanel(
      {
        sodium_100g: 0.0428,
        sugars_100g: 56.3,
        'saturated-fat_100g': 10.6,
        fiber_100g: 0,
        proteins_100g: 6.3,
        'energy-kcal_100g': 539,
      },
      '15 g',
    )!
    expect(p.basis).toBe('derived-serving')
    expect(p.sodium).toBeCloseTo(0.0428 * 0.15 * 1000, 2) // ≈ 6.42 mg
    expect(p.sugars).toBeCloseTo(56.3 * 0.15, 2) // ≈ 8.45 g (NOT 56 — the over-penalize trap)
    expect(p.saturatedFat).toBeCloseTo(10.6 * 0.15, 2) // ≈ 1.59 g
    expect(p.calories).toBeCloseTo(539 * 0.15, 1)
  })

  it('falls back to raw 100g (low-confidence basis) when serving size is unknown', () => {
    const p = extractNutrientPanel({ sodium_100g: 0.0428, sugars_100g: 56.3 }, '1 cup (240 ml)')!
    expect(p.basis).toBe('100g')
    expect(p.sodium).toBeCloseTo(42.8) // 0.0428 g → 42.8 mg, per 100g
    expect(p.sugars).toBe(56.3)
  })

  it('weakest basis wins across the panel', () => {
    // sodium has a serving value, sugars only 100g + parseable serving → derived.
    const p = extractNutrientPanel({ sodium_serving: 0.2, sugars_100g: 10 }, '50 g')!
    expect(p.basis).toBe('derived-serving') // weaker of {serving, derived-serving}
  })

  it('returns null when no panel nutrient is present', () => {
    expect(extractNutrientPanel({ 'energy-kcal_100g': undefined }, '15 g')).toBeNull()
    expect(extractNutrientPanel(undefined, '15 g')).toBeNull()
    expect(extractNutrientPanel({}, undefined)).toBeNull()
  })
})
