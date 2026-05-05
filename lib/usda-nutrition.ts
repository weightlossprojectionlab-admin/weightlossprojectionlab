/**
 * USDA FoodData Central API Integration
 *
 * Provides accurate nutrition data from the USDA FoodData Central database.
 * This is the primary source of truth for nutrition values, used to validate
 * and enhance AI-generated food analysis.
 *
 * API Documentation: https://fdc.nal.usda.gov/api-guide.html
 * Sign up for API key: https://fdc.nal.usda.gov/api-key-signup.html
 *
 * Data is public domain (CC0 1.0 Universal)
 */

import { logger } from './logger'

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

interface USDANutrient {
  nutrientId: number
  nutrientName: string
  value: number
  unitName: string
}

interface USDAFoodItem {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: USDANutrient[]
  brandName?: string
  brandOwner?: string
}

interface USDASearchResult {
  foods: USDAFoodItem[]
  totalHits: number
  currentPage: number
  totalPages: number
}

// In-memory cache to reduce API calls
const cache = new Map<string, { data: NutritionData | NutritionData[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

export interface NutritionData {
  fdcId: number
  name: string
  brandName?: string
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
  /**
   * Extended nutrient set — all optional. Populated when USDA
   * returns the nutrient in foodNutrients[]. Drives medical-
   * condition caps in lib/portion-recommendation.ts (sodium for
   * hypertension/renal, saturated fat / cholesterol for heart
   * health, potassium for renal, calcium / iron for clinical
   * monitoring), and richer label-style display surfaces.
   *
   * Units are USDA's defaults: milligrams for sodium / cholesterol /
   * calcium / iron / potassium, grams for sugars / saturatedFat.
   */
  sodium?: number // mg
  sugars?: number // g
  saturatedFat?: number // g
  cholesterol?: number // mg
  calcium?: number // mg
  iron?: number // mg
  potassium?: number // mg
  servingSize?: string
  servingUnit?: string
  confidence: number // 0-100, how well the match fits the query
  source: 'usda' | 'estimated'
}

/**
 * Fetch from USDA via api.data.gov with header-based auth.
 *
 * Mirrors lib/usda-api.ts's usdaFetch — passes the key via X-Api-Key
 * header (recommended; keeps key out of URL/proxy logs), surfaces the
 * X-RateLimit-Remaining counter, and pulls api.data.gov's structured
 * error.code (API_KEY_INVALID, OVER_RATE_LIMIT, etc.) when the response
 * isn't OK so silent failure modes show up as warnings in the log.
 *
 * Logs the http status code on failure so we can tell rate-limit (429)
 * from auth (401/403) from upstream outages (5xx) without grepping
 * raw stack traces.
 */
async function usdaFetch(url: string, key: string, op: string): Promise<Response> {
  const response = await fetch(url, { headers: { 'X-Api-Key': key } })

  const remaining = response.headers.get('X-RateLimit-Remaining')
  if (remaining !== null) {
    logger.debug('[USDA Nutrition] quota remaining', { remaining })
  }

  if (!response.ok) {
    let code: string | undefined
    let message: string | undefined
    try {
      const body = await response.clone().json()
      code = body?.error?.code
      message = body?.error?.message
    } catch {
      // Non-JSON response — fine, fall through
    }
    logger.warn('[USDA Nutrition] gateway error', {
      op,
      httpStatus: response.status,
      code,
      message,
    })
  }

  return response
}

/**
 * Search for food items in USDA database
 */
export async function searchUSDAFood(
  query: string,
  maxResults: number = 5
): Promise<NutritionData[]> {
  const apiKey = process.env.USDA_API_KEY

  // Check if API key is missing or is a placeholder
  if (!apiKey || apiKey.startsWith('your-') || apiKey.includes('api-key') || apiKey === 'DEMO_KEY') {
    logger.warn('USDA_API_KEY not configured (get free key at: https://fdc.nal.usda.gov/api-key-signup/)')
    return []
  }

  // Defensive guard: USDA's /foods/search returns 400 when query is
  // empty, whitespace, or undefined. Some upstream code paths (recipe
  // generation fallback, meal-suggestion sweeps) were passing through
  // empty strings and producing recurring 400 pairs every couple of
  // minutes — pure log noise. Bail early instead of round-tripping the
  // bad request.
  const trimmedQuery = (query || '').trim()
  if (trimmedQuery.length === 0) {
    return []
  }

  // Check cache first
  const cacheKey = `search:${trimmedQuery.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as NutritionData[]
  }

  try {
    const url = `${USDA_API_BASE}/foods/search?` + new URLSearchParams({
      query: trimmedQuery,
      pageSize: maxResults.toString(),
      dataType: 'Survey (FNDDS),Foundation,SR Legacy,Branded', // All major databases
    })

    const response = await usdaFetch(url, apiKey, 'searchUSDAFood')

    if (!response.ok) {
      // usdaFetch already logged the structured error; return empty so
      // callers fall back to whatever's downstream (cached nutrition,
      // OpenFoodFacts, manual entry).
      return []
    }

    const data: USDASearchResult = await response.json()

    // Convert USDA format to our nutrition data format
    const results = data.foods.map(food => convertUSDAToNutrition(food, query))

    // Cache the results
    cache.set(cacheKey, { data: results, timestamp: Date.now() })

    return results
  } catch (error) {
    logger.error('USDA API error', error as Error, { op: 'searchUSDAFood' })
    return []
  }
}

/**
 * Get detailed nutrition info for a specific USDA food ID
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<NutritionData | null> {
  const apiKey = process.env.USDA_API_KEY

  // Check if API key is missing or is a placeholder
  if (!apiKey || apiKey.startsWith('your-') || apiKey.includes('api-key') || apiKey === 'DEMO_KEY') {
    logger.warn('USDA_API_KEY not configured (get free key at: https://fdc.nal.usda.gov/api-key-signup/)')
    return null
  }

  // Check cache first
  const cacheKey = `food:${fdcId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as NutritionData
  }

  try {
    const url = `${USDA_API_BASE}/food/${fdcId}`
    const response = await usdaFetch(url, apiKey, 'getUSDAFoodDetails')

    if (!response.ok) {
      // usdaFetch already logged structured error
      return null
    }

    const food: USDAFoodItem = await response.json()
    const result = convertUSDAToNutrition(food, food.description)

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error) {
    logger.error('USDA API error', error as Error, { op: 'getUSDAFoodDetails', fdcId })
    return null
  }
}

/**
 * Convert USDA food item to our nutrition data format
 */
function convertUSDAToNutrition(food: USDAFoodItem, searchQuery: string): NutritionData {
  const nutrients = food.foodNutrients

  // Extract specific nutrients (USDA uses nutrient IDs)
  const getNutrient = (nutrientId: number): number => {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId)
    return nutrient?.value || 0
  }

  // USDA Nutrient IDs:
  //   1008 = Energy (kcal)
  //   1003 = Protein (g)
  //   1005 = Carbohydrate, by difference (g)
  //   1004 = Total lipid (fat) (g)
  //   1079 = Fiber, total dietary (g)
  //   1093 = Sodium, Na (mg)
  //   2000 = Sugars, total including NLEA (g)
  //   1258 = Fatty acids, total saturated (g)
  //   1253 = Cholesterol (mg)
  //   1087 = Calcium, Ca (mg)
  //   1089 = Iron, Fe (mg)
  //   1092 = Potassium, K (mg)

  const calories = getNutrient(1008)
  const protein = getNutrient(1003)
  const carbs = getNutrient(1005)
  const fat = getNutrient(1004)
  const fiber = getNutrient(1079)
  const sodium = getNutrient(1093)
  const sugars = getNutrient(2000)
  const saturatedFat = getNutrient(1258)
  const cholesterol = getNutrient(1253)
  const calcium = getNutrient(1087)
  const iron = getNutrient(1089)
  const potassium = getNutrient(1092)

  // Calculate confidence based on string similarity
  const confidence = calculateMatchConfidence(food.description, searchQuery)

  /**
   * Round optional nutrients to 1 decimal and only include them
   * when USDA actually returned a non-zero value. Spread-omits
   * absent fields so consumers can `?? fallback` cleanly without
   * the "0 means absent or actually zero?" ambiguity.
   */
  const optionalNutrients: Partial<
    Pick<
      NutritionData,
      'sodium' | 'sugars' | 'saturatedFat' | 'cholesterol' | 'calcium' | 'iron' | 'potassium'
    >
  > = {}
  if (sodium > 0) optionalNutrients.sodium = Math.round(sodium * 10) / 10
  if (sugars > 0) optionalNutrients.sugars = Math.round(sugars * 10) / 10
  if (saturatedFat > 0) optionalNutrients.saturatedFat = Math.round(saturatedFat * 10) / 10
  if (cholesterol > 0) optionalNutrients.cholesterol = Math.round(cholesterol * 10) / 10
  if (calcium > 0) optionalNutrients.calcium = Math.round(calcium * 10) / 10
  if (iron > 0) optionalNutrients.iron = Math.round(iron * 10) / 10
  if (potassium > 0) optionalNutrients.potassium = Math.round(potassium * 10) / 10

  return {
    fdcId: food.fdcId,
    name: food.description,
    brandName: food.brandName || food.brandOwner,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10, // 1 decimal place
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    ...optionalNutrients,
    confidence,
    source: 'usda'
  }
}

/**
 * Calculate how well a USDA food name matches the search query
 * Returns confidence score 0-100
 */
function calculateMatchConfidence(usdaName: string, query: string): number {
  const usdaLower = usdaName.toLowerCase()
  const queryLower = query.toLowerCase()

  // Exact match
  if (usdaLower === queryLower) return 100

  // Contains exact query
  if (usdaLower.includes(queryLower)) return 90

  // Word-by-word matching
  const queryWords = queryLower.split(/\s+/)
  const usdaWords = usdaLower.split(/\s+/)

  const matchingWords = queryWords.filter(qw =>
    usdaWords.some(uw => uw.includes(qw) || qw.includes(uw))
  )

  const wordMatchPercent = (matchingWords.length / queryWords.length) * 100

  // Penalize if USDA name has many extra words
  const lengthPenalty = Math.max(0, (usdaWords.length - queryWords.length) * 5)

  return Math.max(50, Math.min(85, wordMatchPercent - lengthPenalty))
}

/**
 * Validate AI-generated nutrition data against USDA database
 * Returns USDA data if found, otherwise returns AI data with lower confidence
 */
export async function validateWithUSDA(
  foodName: string,
  aiNutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  },
  portion?: string
): Promise<{
  nutrition: NutritionData
  validated: boolean
  message: string
}> {
  // Search USDA database
  const usdaResults = await searchUSDAFood(foodName, 3)

  if (usdaResults.length === 0) {
    // No USDA match found - use AI estimate with lower confidence
    return {
      nutrition: {
        fdcId: 0,
        name: foodName,
        ...aiNutrition,
        confidence: 50,
        source: 'estimated' as const
      },
      validated: false,
      message: 'No USDA match found - using AI estimate'
    }
  }

  // Get best match (highest confidence)
  const bestMatch = usdaResults.reduce((best, current) =>
    current.confidence > best.confidence ? current : best
  )

  // If confidence is high enough (>70), use USDA data
  if (bestMatch.confidence >= 70) {
    return {
      nutrition: {
        ...bestMatch,
        servingSize: portion
      },
      validated: true,
      message: `✅ USDA Verified: ${bestMatch.name}`
    }
  }

  // Low confidence match - prefer AI estimate but note USDA alternative
  return {
    nutrition: {
      fdcId: 0,
      name: foodName,
      ...aiNutrition,
      confidence: 60,
      source: 'estimated' as const
    },
    validated: false,
    message: `⚠️ Low USDA match confidence (${bestMatch.confidence}%), using AI estimate`
  }
}

interface FoodItemInput {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface ValidationResult {
  original: FoodItemInput
  validated: NutritionData
  isUSDAVerified: boolean
  message: string
}

/**
 * Batch validate multiple food items
 */
export async function batchValidateWithUSDA(
  foodItems: FoodItemInput[]
): Promise<ValidationResult[]> {
  const results = await Promise.all(
    foodItems.map(async (item) => {
      const { nutrition, validated, message } = await validateWithUSDA(
        item.name,
        {
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          fiber: item.fiber
        },
        item.portion
      )

      return {
        original: item,
        validated: nutrition,
        isUSDAVerified: validated,
        message
      }
    })
  )

  return results
}
