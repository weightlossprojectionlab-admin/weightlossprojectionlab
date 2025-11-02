'use client'

/**
 * OpenFoodFacts API Integration
 *
 * Free, open database of food products with barcodes
 * API: https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 */

import { logger } from '@/lib/logger'

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

    // Handle 404 - product not found (return empty response instead of throwing)
    if (response.status === 404) {
      logger.debug(`Product not found in OpenFoodFacts: ${barcode}`)
      return {
        code: barcode,
        status: 0,
        status_verbose: 'product not found'
      }
    }

    if (!response.ok) {
      logger.warn(`OpenFoodFacts API returned ${response.status} for barcode ${barcode}`)
      // Return empty response for other HTTP errors too
      return {
        code: barcode,
        status: 0,
        status_verbose: `API error: ${response.status}`
      }
    }

    const data: OpenFoodFactsResponse = await response.json()
    return data
  } catch (error: any) {
    console.error('[OpenFoodFacts] Detailed error:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      barcode,
      fullError: error
    })
    logger.error('Error fetching from OpenFoodFacts', error as Error, { barcode })

    // Return empty response instead of throwing (network errors, JSON parse errors, etc.)
    return {
      code: barcode,
      status: 0,
      status_verbose: `Error: ${error?.message || 'Unknown error'}`
    }
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
  } catch (error: any) {
    console.error('[OpenFoodFacts Search] Detailed error:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      query,
      fullError: error
    })
    logger.error('Error searching OpenFoodFacts', error as Error, { query })
    throw error
  }
}
