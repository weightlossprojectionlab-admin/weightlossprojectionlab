'use client'

/**
 * OpenFoodFacts API Integration
 *
 * Free, open database of food products with barcodes
 * API: https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

export interface OpenFoodFactsProduct {
  code: string
  product_name?: string
  brands?: string
  quantity?: string
  serving_size?: string
  image_url?: string
  image_front_url?: string
  nutriments?: {
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
  }
  categories?: string
  allergens?: string
  ingredients_text?: string
}

export interface OpenFoodFactsResponse {
  code: string
  product?: OpenFoodFactsProduct
  status: number
  status_verbose: string
}

export interface SimplifiedProduct {
  barcode: string
  name: string
  brand: string
  quantity: string
  servingSize: string
  imageUrl: string
  calories: number
  protein: number
  carbs: number
  fat: number
  ingredients: string
  found: boolean
}

/**
 * Lookup product by barcode from OpenFoodFacts
 */
export async function lookupBarcode(barcode: string): Promise<OpenFoodFactsResponse> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
      {
        headers: {
          'User-Agent': 'WeightLossProjectLab/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`OpenFoodFacts API error: ${response.status}`)
    }

    const data: OpenFoodFactsResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching from OpenFoodFacts:', error)
    throw error
  }
}

/**
 * Convert OpenFoodFacts product to simplified format
 */
export function simplifyProduct(response: OpenFoodFactsResponse): SimplifiedProduct {
  if (response.status !== 1 || !response.product) {
    return {
      barcode: response.code,
      name: '',
      brand: '',
      quantity: '',
      servingSize: '',
      imageUrl: '',
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      ingredients: '',
      found: false
    }
  }

  const p = response.product
  const nutriments = p.nutriments || {}

  // Prefer per-serving data, fallback to per-100g
  const calories = nutriments['energy-kcal_serving'] || nutriments['energy-kcal_100g'] || nutriments['energy-kcal'] || 0
  const protein = nutriments.proteins_serving || nutriments.proteins_100g || nutriments.proteins || 0
  const carbs = nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || nutriments.carbohydrates || 0
  const fat = nutriments.fat_serving || nutriments.fat_100g || nutriments.fat || 0

  return {
    barcode: p.code || response.code,
    name: p.product_name || 'Unknown Product',
    brand: p.brands || '',
    quantity: p.quantity || '',
    servingSize: p.serving_size || '',
    imageUrl: p.image_front_url || p.image_url || '',
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    ingredients: p.ingredients_text || '',
    found: true
  }
}

/**
 * Search for products by text
 */
export async function searchProducts(query: string, page: number = 1): Promise<any> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&page=${page}&json=1`,
      {
        headers: {
          'User-Agent': 'WeightLossProjectLab/1.0'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`OpenFoodFacts search error: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error)
    throw error
  }
}
