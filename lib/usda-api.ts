/**
 * USDA FoodData Central API Integration
 *
 * Official USDA food nutrition database
 * API: https://fdc.nal.usda.gov/api-guide.html
 */

import { logger } from '@/lib/logger'

const USDA_API_KEY = process.env.NEXT_PUBLIC_USDA_API_KEY || 'yWQMnRlTqV80igsnpIDcXfiP1pCMj2Qn135JZCgi'
const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1'

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
    cholesterol?: number
    saturated_fat?: number
  }
  ingredients_text?: string
  categories?: string
}

/**
 * Search USDA FoodData Central by barcode (UPC/GTIN)
 */
export async function searchByBarcode(barcode: string): Promise<USDAProductData | null> {
  try {
    logger.info('[USDA API] Searching by barcode', { barcode })

    const response = await fetch(
      `${USDA_API_BASE}/foods/search?query=${barcode}&dataType=Branded&pageSize=1&api_key=${USDA_API_KEY}`
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
  try {
    logger.info('[USDA API] Getting food by ID', { fdcId })

    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`
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
  try {
    logger.info('[USDA API] Searching foods', { query, pageSize })

    const response = await fetch(
      `${USDA_API_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${USDA_API_KEY}`
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
 * Convert USDA food data to our standard format (compatible with OpenFoodFacts format)
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
        break
      case 'fatty acids, total saturated':
      case 'saturated fat':
        acc.saturated_fat = nutrient.value
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
