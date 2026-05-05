/**
 * USDA FoodData Central API Integration
 *
 * Official USDA food nutrition database
 * API: https://fdc.nal.usda.gov/api-guide.html
 */

import { logger } from '@/lib/logger'

const USDA_API_KEY = process.env.USDA_API_KEY
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

function ensureKey(): string | null {
  if (!USDA_API_KEY) {
    logger.warn('[USDA API] USDA_API_KEY not set; falling back to OpenFoodFacts')
    return null
  }
  return USDA_API_KEY
}

/**
 * Fetch from USDA via api.data.gov with header-based auth.
 *
 * Pass the API key via X-Api-Key header instead of ?api_key=... query string
 * (header is recommended by api.data.gov to keep keys out of URL/proxy logs).
 *
 * Logs the X-RateLimit-Remaining header so we have visibility into the 1,000
 * req/hour quota. Logs api.data.gov's own error.code for invalid-key / over-
 * limit cases so silent fallback to OpenFoodFacts is detectable.
 */
async function usdaFetch(url: string, key: string): Promise<Response> {
  const response = await fetch(url, {
    headers: { 'X-Api-Key': key }
  })

  const remaining = response.headers.get('X-RateLimit-Remaining')
  if (remaining !== null) {
    logger.debug('[USDA API] quota remaining', { remaining })
  }

  if (!response.ok) {
    // Try to surface api.data.gov's structured error code (e.g.
    // API_KEY_INVALID, OVER_RATE_LIMIT) so misconfigurations don't
    // silently fall through to the OpenFoodFacts fallback forever.
    try {
      const body = await response.clone().json()
      const code = body?.error?.code
      if (code) {
        logger.warn('[USDA API] gateway error', { httpStatus: response.status, code, url })
      }
    } catch {
      // Non-JSON response — ignore parse failure
    }
  }

  return response
}

export interface USDANutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  unitName: string
  value: number
}

export interface USDAFood {
  fdcId: number
  description: string
  brandOwner?: string
  brandName?: string
  gtinUpc?: string
  servingSize?: number
  servingSizeUnit?: string
  householdServingFullText?: string
  foodNutrients: USDANutrient[]
  ingredients?: string
  foodCategory?: string
  dataType: 'Branded' | 'Foundation' | 'Survey' | 'SR Legacy'
  /**
   * Flat per-serving label-style nutrients. Populated only on
   * BrandedFoodItem responses when fetched with ?format=full
   * (or via /foods/{fdcId} which returns full by default). Each
   * field is `{ value: number }`. When present, prefer these over
   * the foodNutrients[] dig — they're already per-serving and
   * map 1:1 to a product's nutrition label.
   */
  labelNutrients?: {
    fat?: { value: number }
    saturatedFat?: { value: number }
    transFat?: { value: number }
    cholesterol?: { value: number }
    sodium?: { value: number }
    carbohydrates?: { value: number }
    fiber?: { value: number }
    sugars?: { value: number }
    protein?: { value: number }
    calcium?: { value: number }
    iron?: { value: number }
    potassium?: { value: number }
    calories?: { value: number }
  }
}

export interface USDASearchResult {
  totalHits: number
  currentPage: number
  totalPages: number
  foods: USDAFood[]
}

export interface USDAProductData {
  code: string
  product_name: string
  brands?: string
  quantity?: string
  serving_size?: string
  image_url?: string
  nutriments: {
    'energy-kcal'?: number
    'energy-kcal_100g'?: number
    'energy-kcal_serving'?: number
    proteins?: number
    proteins_100g?: number
    proteins_serving?: number
    carbohydrates?: number
    carbohydrates_100g?: number
    carbohydrates_serving?: number
    fat?: number
    fat_100g?: number
    fat_serving?: number
    fiber?: number
    fiber_100g?: number
    fiber_serving?: number
    sodium?: number
    sodium_100g?: number
    sodium_serving?: number
    sugars?: number
    sugars_100g?: number
    sugars_serving?: number
    cholesterol?: number
    cholesterol_100g?: number
    cholesterol_serving?: number
    saturated_fat?: number
    saturated_fat_100g?: number
    saturated_fat_serving?: number
    calcium?: number
    calcium_100g?: number
    calcium_serving?: number
    iron?: number
    iron_100g?: number
    iron_serving?: number
    potassium?: number
    potassium_100g?: number
    potassium_serving?: number
  }
  ingredients_text?: string
  categories?: string
}

/**
 * Search USDA FoodData Central by barcode (UPC/GTIN)
 */
export async function searchByBarcode(barcode: string): Promise<USDAProductData | null> {
  const key = ensureKey()
  if (!key) return null

  try {
    logger.info('[USDA API] Searching by barcode', { barcode })

    const response = await usdaFetch(
      `${USDA_API_BASE}/foods/search?query=${barcode}&dataType=Branded&pageSize=1`,
      key
    )

    if (!response.ok) {
      logger.error('[USDA API] Search failed', new Error(`HTTP ${response.status}`))
      return null
    }

    const data: USDASearchResult = await response.json()

    if (data.totalHits === 0 || !data.foods || data.foods.length === 0) {
      logger.info('[USDA API] No product found for barcode', { barcode })
      return null
    }

    const food = data.foods[0]

    // Convert USDA format to our standard format
    const productData = convertUSDAToStandardFormat(food, barcode)

    logger.info('[USDA API] Product found', {
      barcode,
      name: productData.product_name,
      fdcId: food.fdcId
    })

    return productData
  } catch (error) {
    logger.error('[USDA API] Error searching by barcode', error as Error, { barcode })
    return null
  }
}

/**
 * Get food details by FDC ID
 */
export async function getFoodById(fdcId: number): Promise<USDAFood | null> {
  const key = ensureKey()
  if (!key) return null

  try {
    logger.info('[USDA API] Getting food by ID', { fdcId })

    const response = await usdaFetch(
      `${USDA_API_BASE}/food/${fdcId}`,
      key
    )

    if (!response.ok) {
      logger.error('[USDA API] Get food failed', new Error(`HTTP ${response.status}`))
      return null
    }

    const food: USDAFood = await response.json()

    logger.info('[USDA API] Food retrieved', { fdcId, name: food.description })
    return food
  } catch (error) {
    logger.error('[USDA API] Error getting food by ID', error as Error, { fdcId })
    return null
  }
}

/**
 * Search foods by query text
 */
export async function searchFoods(query: string, pageSize = 25): Promise<USDAFood[]> {
  const key = ensureKey()
  if (!key) return []

  try {
    logger.info('[USDA API] Searching foods', { query, pageSize })

    const response = await usdaFetch(
      `${USDA_API_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}`,
      key
    )

    if (!response.ok) {
      logger.error('[USDA API] Search failed', new Error(`HTTP ${response.status}`))
      return []
    }

    const data: USDASearchResult = await response.json()

    logger.info('[USDA API] Search results', {
      query,
      totalHits: data.totalHits,
      returned: data.foods?.length || 0
    })

    return data.foods || []
  } catch (error) {
    logger.error('[USDA API] Error searching foods', error as Error, { query })
    return []
  }
}

/**
 * Convert USDA food data to our standard format (compatible with
 * OpenFoodFacts format).
 *
 * Two paths:
 *   1. labelNutrients (BrandedFoodItem with format=full) — flat
 *      per-serving object that maps 1:1 to a product's nutrition
 *      label. Preferred because the values are already per-serving
 *      and match what the customer sees on the package.
 *   2. foodNutrients[] fallback — name-matched extraction. Used
 *      for Foundation / Survey / SR Legacy data, or BrandedFood
 *      responses that came from /foods/search (which returns the
 *      AbridgedFoodNutrient subset, not labelNutrients).
 *
 * Always populates 100g values; serving values get scaled in only
 * when servingSize is present and labelNutrients didn't already
 * supply them. labelNutrients wins for serving values when both
 * are available.
 */
function convertUSDAToStandardFormat(food: USDAFood, barcode: string): USDAProductData {
  // Extract nutrients
  const nutrients = food.foodNutrients.reduce((acc, nutrient) => {
    switch (nutrient.nutrientName.toLowerCase()) {
      case 'energy':
        if (nutrient.unitName.toLowerCase() === 'kcal') {
          acc['energy-kcal'] = nutrient.value
          acc['energy-kcal_100g'] = nutrient.value
        }
        break
      case 'protein':
        acc.proteins = nutrient.value
        acc.proteins_100g = nutrient.value
        break
      case 'carbohydrate, by difference':
      case 'carbohydrates':
        acc.carbohydrates = nutrient.value
        acc.carbohydrates_100g = nutrient.value
        break
      case 'total lipid (fat)':
      case 'fat':
        acc.fat = nutrient.value
        acc.fat_100g = nutrient.value
        break
      case 'fiber, total dietary':
      case 'dietary fiber':
        acc.fiber = nutrient.value
        acc.fiber_100g = nutrient.value
        break
      case 'sodium, na':
      case 'sodium':
        // USDA gives sodium in mg, convert to g for consistency
        acc.sodium = nutrient.value / 1000
        acc.sodium_100g = nutrient.value / 1000
        break
      case 'sugars, total including nlea':
      case 'sugars':
        acc.sugars = nutrient.value
        acc.sugars_100g = nutrient.value
        break
      case 'cholesterol':
        acc.cholesterol = nutrient.value
        acc.cholesterol_100g = nutrient.value
        break
      case 'fatty acids, total saturated':
      case 'saturated fat':
        acc.saturated_fat = nutrient.value
        acc.saturated_fat_100g = nutrient.value
        break
      case 'calcium, ca':
      case 'calcium':
        acc.calcium = nutrient.value
        acc.calcium_100g = nutrient.value
        break
      case 'iron, fe':
      case 'iron':
        acc.iron = nutrient.value
        acc.iron_100g = nutrient.value
        break
      case 'potassium, k':
      case 'potassium':
        acc.potassium = nutrient.value
        acc.potassium_100g = nutrient.value
        break
    }
    return acc
  }, {} as USDAProductData['nutriments'])

  // Calculate per serving values if serving size is available
  if (food.servingSize && food.servingSize > 0) {
    const servingRatio = food.servingSize / 100

    if (nutrients['energy-kcal']) {
      nutrients['energy-kcal_serving'] = nutrients['energy-kcal'] * servingRatio
    }
    if (nutrients.proteins) {
      nutrients.proteins_serving = nutrients.proteins * servingRatio
    }
    if (nutrients.carbohydrates) {
      nutrients.carbohydrates_serving = nutrients.carbohydrates * servingRatio
    }
    if (nutrients.fat) {
      nutrients.fat_serving = nutrients.fat * servingRatio
    }
    if (nutrients.fiber) {
      nutrients.fiber_serving = nutrients.fiber * servingRatio
    }
    if (nutrients.sodium) {
      nutrients.sodium_serving = nutrients.sodium * servingRatio
    }
    if (nutrients.sugars) {
      nutrients.sugars_serving = nutrients.sugars * servingRatio
    }
    if (nutrients.cholesterol) {
      nutrients.cholesterol_serving = nutrients.cholesterol * servingRatio
    }
    if (nutrients.saturated_fat) {
      nutrients.saturated_fat_serving = nutrients.saturated_fat * servingRatio
    }
    if (nutrients.calcium) {
      nutrients.calcium_serving = nutrients.calcium * servingRatio
    }
    if (nutrients.iron) {
      nutrients.iron_serving = nutrients.iron * servingRatio
    }
    if (nutrients.potassium) {
      nutrients.potassium_serving = nutrients.potassium * servingRatio
    }
  }

  // labelNutrients overlay — when present, these are the
  // authoritative per-serving values straight from the package
  // label. They override the foodNutrients-derived _serving values
  // because they're untouched by 100g↔serving rounding and match
  // exactly what the customer sees. 100g values stay derived from
  // foodNutrients (labelNutrients doesn't carry them).
  const ln = food.labelNutrients
  if (ln) {
    if (typeof ln.calories?.value === 'number') {
      nutrients['energy-kcal_serving'] = ln.calories.value
    }
    if (typeof ln.protein?.value === 'number') {
      nutrients.proteins_serving = ln.protein.value
    }
    if (typeof ln.carbohydrates?.value === 'number') {
      nutrients.carbohydrates_serving = ln.carbohydrates.value
    }
    if (typeof ln.fat?.value === 'number') {
      nutrients.fat_serving = ln.fat.value
    }
    if (typeof ln.fiber?.value === 'number') {
      nutrients.fiber_serving = ln.fiber.value
    }
    if (typeof ln.sodium?.value === 'number') {
      // labelNutrients sodium is mg; our nutriments.sodium uses g
      nutrients.sodium_serving = ln.sodium.value / 1000
    }
    if (typeof ln.sugars?.value === 'number') {
      nutrients.sugars_serving = ln.sugars.value
    }
    if (typeof ln.cholesterol?.value === 'number') {
      nutrients.cholesterol_serving = ln.cholesterol.value
    }
    if (typeof ln.saturatedFat?.value === 'number') {
      nutrients.saturated_fat_serving = ln.saturatedFat.value
    }
    if (typeof ln.calcium?.value === 'number') {
      nutrients.calcium_serving = ln.calcium.value
    }
    if (typeof ln.iron?.value === 'number') {
      nutrients.iron_serving = ln.iron.value
    }
    if (typeof ln.potassium?.value === 'number') {
      nutrients.potassium_serving = ln.potassium.value
    }
  }

  return {
    code: barcode || food.gtinUpc || `usda_${food.fdcId}`,
    product_name: food.description,
    brands: food.brandOwner || food.brandName,
    quantity: food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : undefined,
    serving_size: food.householdServingFullText || (food.servingSize ? `${food.servingSize}${food.servingSizeUnit || 'g'}` : undefined),
    nutriments: nutrients,
    ingredients_text: food.ingredients,
    categories: food.foodCategory
  }
}
