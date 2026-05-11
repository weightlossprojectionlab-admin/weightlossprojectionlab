/**
 * Nutrition extraction from OFF / USDA payloads.
 *
 * Why a dedicated module: the extraction logic was duplicated between
 * `fetch-nutrition` and `migrate-to-usda` routes, and both had a subtle
 * bug — when only `_100g` values were available (and `_serving` was
 * missing), the routes stored the per-100g number unchanged but the
 * catalog labeled it "per <serving size>". For low-cal drinks this
 * produced absurd numbers like `4.22 calories per bottle`.
 *
 * The fix has three branches per nutrient:
 *   1. `_serving` present → use it (already per-serving)
 *   2. `_100g` present + `serving_quantity` known → convert
 *      (value_100g * serving_quantity / 100) → per-serving
 *   3. `_100g` present, no serving_quantity → use as-is, flag `per: '100g'`
 *
 * The returned object carries a single `per` field describing the entire
 * nutrition row's basis. Mixed bases (some per-serving, some per-100g)
 * collapse to `'100g'` — better to underclaim than to misrepresent.
 *
 * Display layer (Item Details Nutrition panel) reads `per` and labels
 * the panel "per <servingSize>" or "per 100g" accordingly.
 */

export type NutritionPer = 'serving' | '100g'

export interface ExtractedNutrition {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sodium: number
  servingSize: string
  per: NutritionPer
  saturatedFat?: number
  transFat?: number
  sugars?: number
  cholesterol?: number
  vitaminD?: number
  calcium?: number
  iron?: number
  potassium?: number
}

interface OFFLikeProduct {
  product_name?: string
  brands?: string
  serving_size?: string
  /** OFF often returns serving_quantity in grams as a string or number. */
  serving_quantity?: string | number
  quantity?: string
  nutriments?: Record<string, number | undefined>
}

/**
 * Pull a numeric serving quantity (in grams) out of an OFF product if
 * present. OFF returns either a number or a stringified number; both
 * work. Returns null when missing or unparseable.
 */
function readServingQty(product: OFFLikeProduct): number | null {
  const raw = product.serving_quantity
  if (raw === undefined || raw === null) return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw))
  return Number.isFinite(n) && n > 0 ? n : null
}

/**
 * Extract a single nutrient. Returns the value AND which basis it's on.
 * Caller collapses to a single `per` for the whole row.
 */
function extractOne(
  nutriments: Record<string, number | undefined>,
  key: string,
  servingQty: number | null,
): { value: number | undefined; per: NutritionPer | null } {
  const servingVal = nutriments[`${key}_serving`]
  if (servingVal !== undefined && servingVal !== null) {
    return { value: servingVal, per: 'serving' }
  }
  const hundredVal = nutriments[`${key}_100g`] ?? nutriments[key]
  if (hundredVal !== undefined && hundredVal !== null) {
    if (servingQty !== null) {
      // Convert per-100g to per-serving via serving_quantity (in grams).
      return { value: (hundredVal * servingQty) / 100, per: 'serving' }
    }
    // No serving_quantity — return per-100g and flag the basis.
    return { value: hundredVal, per: '100g' }
  }
  return { value: undefined, per: null }
}

/**
 * Build the canonical ExtractedNutrition for a catalog write. Rounds
 * calories to int and macros to 1 decimal. Optional micronutrients
 * (saturatedFat, transFat, etc.) are only included when present.
 *
 * If ANY required nutrient (calories/protein/carbs/fat/fiber/sodium)
 * came from a per-100g value WITHOUT serving_quantity, the whole row
 * is flagged `per: '100g'` so the display layer can label correctly.
 */
export function extractNutritionFromProduct(product: OFFLikeProduct): ExtractedNutrition {
  const n = product.nutriments || {}
  const sq = readServingQty(product)

  const cal = extractOne(n, 'energy-kcal', sq)
  const pro = extractOne(n, 'proteins', sq)
  const car = extractOne(n, 'carbohydrates', sq)
  const fat = extractOne(n, 'fat', sq)
  const fib = extractOne(n, 'fiber', sq)
  const sod = extractOne(n, 'sodium', sq)

  // Collapse mixed bases — if any required field is per-100g, the row is.
  const cores: Array<NutritionPer | null> = [cal.per, pro.per, car.per, fat.per, fib.per, sod.per]
  const anyHundred = cores.some((p) => p === '100g')
  const per: NutritionPer = anyHundred ? '100g' : 'serving'

  const out: ExtractedNutrition = {
    calories: Math.round(cal.value ?? 0),
    protein: Math.round((pro.value ?? 0) * 10) / 10,
    carbs: Math.round((car.value ?? 0) * 10) / 10,
    fat: Math.round((fat.value ?? 0) * 10) / 10,
    fiber: Math.round((fib.value ?? 0) * 10) / 10,
    sodium: Math.round(sod.value ?? 0),
    servingSize: product.serving_size || product.quantity || '',
    per,
  }

  // Optional micronutrients — extract with same logic, only include when present.
  const optionalKeys: Array<[keyof ExtractedNutrition, string]> = [
    ['saturatedFat', 'saturated-fat'],
    ['transFat', 'trans-fat'],
    ['sugars', 'sugars'],
    ['cholesterol', 'cholesterol'],
    ['vitaminD', 'vitamin-d'],
    ['calcium', 'calcium'],
    ['iron', 'iron'],
    ['potassium', 'potassium'],
  ]
  for (const [outKey, sourceKey] of optionalKeys) {
    const e = extractOne(n, sourceKey, sq)
    if (e.value !== undefined) {
      ;(out as unknown as Record<string, number>)[outKey] = Math.round(e.value * 10) / 10
    }
  }

  return out
}
