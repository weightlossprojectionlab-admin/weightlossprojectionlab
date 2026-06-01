/**
 * OpenFoodFacts/USDA nutriments → a PER-SERVING nutrient panel for the inventory
 * health-demand weight D (lib/health-demand.ts).
 *
 * Why this exists / the two corrections it makes:
 *   1. UNITS. The demand-weight ref_n is in mg for sodium/potassium, but OFF
 *      stores those in GRAMS (sodium_unit: "g"). We convert g→mg.
 *   2. BASIS. ref_n is PER SERVING, but many products (e.g. Nutella) carry only
 *      `_100g` values. Using 100g as if it were a serving wildly over-states
 *      calorie-dense foods (56g sugar/100g vs ~8g per 15g serving). So we derive
 *      per-serving from `_100g × servingGrams/100` when an explicit `_serving`
 *      value is absent but `serving_size` is a parseable gram weight.
 *
 * `basis` records how each panel was obtained so the eventual ref_n calibration
 * can down-weight low-confidence ('100g') rows. Pure + isomorphic.
 */

/** Loose OFF/USDA nutriments bag — many optional keys, hyphenated for the fats. */
export type Nutriments = Record<string, number | undefined>

/** Per-serving, engine-facing. Units: sodium/potassium mg; the rest grams (kcal for calories). */
export interface NutrientPanel {
  sodium?: number // mg
  sugars?: number // g (total — proxy for addedSugar)
  saturatedFat?: number // g
  transFat?: number // g
  fiber?: number // g
  protein?: number // g
  potassium?: number // mg
  calories?: number // kcal
  /** How the values were derived — quality signal for calibration. */
  basis: 'serving' | 'derived-serving' | '100g'
}

/** Parse "15 g" / "15g" / "30 g (2 tbsp)" → grams; undefined for ml/non-gram/unparseable. */
export function parseServingGrams(servingSize: string | undefined): number | undefined {
  if (!servingSize) return undefined
  const m = servingSize.match(/([\d.]+)\s*g\b/i)
  if (!m) return undefined
  const g = parseFloat(m[1])
  return Number.isFinite(g) && g > 0 ? g : undefined
}

/**
 * Pull one nutrient as a per-serving value, preferring an explicit `_serving`,
 * then deriving from `_100g × servingGrams/100`, then raw `_100g` as a last
 * resort. Returns the value + the basis used (or undefined if no data).
 */
function pickPerServing(
  n: Nutriments,
  base: string,
  servingGrams: number | undefined,
): { value: number; basis: NutrientPanel['basis'] } | undefined {
  const s = n[`${base}_serving`]
  if (typeof s === 'number' && s >= 0) return { value: s, basis: 'serving' }

  const h = n[`${base}_100g`] ?? n[base]
  if (typeof h === 'number' && h >= 0) {
    if (servingGrams) return { value: h * (servingGrams / 100), basis: 'derived-serving' }
    return { value: h, basis: '100g' }
  }
  return undefined
}

const G_TO_MG = 1000

/**
 * Build the per-serving nutrient panel. Returns null when NONE of the panel
 * nutrients are present (so the caller stores nothing and D stays neutral).
 * The overall `basis` is the WEAKEST basis any included nutrient used (so a
 * single 100g fallback marks the whole panel low-confidence).
 */
export function extractNutrientPanel(
  nutriments: Nutriments | undefined,
  servingSize?: string,
): NutrientPanel | null {
  if (!nutriments) return null
  const g = parseServingGrams(servingSize)

  // base key → [panel field, gram→mg conversion?]
  const SPEC: Array<[string, keyof NutrientPanel, boolean]> = [
    ['sodium', 'sodium', true],
    ['sugars', 'sugars', false],
    ['saturated-fat', 'saturatedFat', false],
    ['trans-fat', 'transFat', false],
    ['fiber', 'fiber', false],
    ['proteins', 'protein', false],
    ['potassium', 'potassium', true],
    ['energy-kcal', 'calories', false],
  ]

  const rank = { serving: 0, 'derived-serving': 1, '100g': 2 } as const
  const panel: NutrientPanel = { basis: 'serving' }
  let any = false
  let weakest: NutrientPanel['basis'] = 'serving'

  for (const [base, field, toMg] of SPEC) {
    const got = pickPerServing(nutriments, base, g)
    if (!got) continue
    any = true
    ;(panel[field] as number) = toMg ? got.value * G_TO_MG : got.value
    if (rank[got.basis] > rank[weakest]) weakest = got.basis
  }

  if (!any) return null
  panel.basis = weakest
  return panel
}
