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

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

// In-memory cache to reduce API calls
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

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

export interface NutritionData {
  fdcId: number
  name: string
  brandName?: string
  calories: number
  protein: number // grams
  carbs: number // grams
  fat: number // grams
  fiber: number // grams
  servingSize?: string
  servingUnit?: string
  confidence: number // 0-100, how well the match fits the query
  source: 'usda' | 'estimated'
}

/**
 * Search for food items in USDA database
 */
export async function searchUSDAFood(
  query: string,
  maxResults: number = 5
): Promise<NutritionData[]> {
  const apiKey = process.env.USDA_API_KEY

  if (!apiKey) {
    console.warn('⚠️ USDA_API_KEY not set, skipping USDA lookup')
    return []
  }

  // Check cache first
  const cacheKey = `search:${query.toLowerCase()}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const url = `${USDA_API_BASE}/foods/search?` + new URLSearchParams({
      query,
      pageSize: maxResults.toString(),
      dataType: 'Survey (FNDDS),Foundation,SR Legacy,Branded', // All major databases
      api_key: apiKey
    })

    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`)
    }

    const data: USDASearchResult = await response.json()

    // Convert USDA format to our nutrition data format
    const results = data.foods.map(food => convertUSDAToNutrition(food, query))

    // Cache the results
    cache.set(cacheKey, { data: results, timestamp: Date.now() })

    return results
  } catch (error) {
    console.error('USDA API error:', error)
    return []
  }
}

/**
 * Get detailed nutrition info for a specific USDA food ID
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<NutritionData | null> {
  const apiKey = process.env.USDA_API_KEY

  if (!apiKey) {
    console.warn('⚠️ USDA_API_KEY not set, skipping USDA lookup')
    return null
  }

  // Check cache first
  const cacheKey = `food:${fdcId}`
  const cached = cache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  try {
    const url = `${USDA_API_BASE}/food/${fdcId}?api_key=${apiKey}`
    const response = await fetch(url)

    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status}`)
    }

    const food: USDAFoodItem = await response.json()
    const result = convertUSDAToNutrition(food, food.description)

    // Cache the result
    cache.set(cacheKey, { data: result, timestamp: Date.now() })

    return result
  } catch (error) {
    console.error('USDA API error:', error)
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
  // 1008 = Energy (kcal)
  // 1003 = Protein (g)
  // 1005 = Carbohydrate (g)
  // 1004 = Total lipid (fat) (g)
  // 1079 = Fiber, total dietary (g)

  const calories = getNutrient(1008)
  const protein = getNutrient(1003)
  const carbs = getNutrient(1005)
  const fat = getNutrient(1004)
  const fiber = getNutrient(1079)

  // Calculate confidence based on string similarity
  const confidence = calculateMatchConfidence(food.description, searchQuery)

  return {
    fdcId: food.fdcId,
    name: food.description,
    brandName: food.brandName || food.brandOwner,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10, // 1 decimal place
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
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

/**
 * Batch validate multiple food items
 */
export async function batchValidateWithUSDA(
  foodItems: Array<{
    name: string
    portion: string
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
  }>
): Promise<Array<{
  original: any
  validated: NutritionData
  isUSDAVerified: boolean
  message: string
}>> {
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
