/**
 * OpenFoodFacts API Integration - Server Side
 *
 * Server-safe version for use in API routes and server components
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
    'saturated-fat'?: number
    'saturated-fat_100g'?: number
    'saturated-fat_serving'?: number
    'trans-fat'?: number
    'trans-fat_100g'?: number
    'trans-fat_serving'?: number
    fiber?: number
    fiber_100g?: number
    fiber_serving?: number
    sugars?: number
    sugars_100g?: number
    sugars_serving?: number
    sodium?: number
    sodium_100g?: number
    sodium_serving?: number
    cholesterol?: number
    cholesterol_100g?: number
    cholesterol_serving?: number
    'vitamin-d'?: number
    'vitamin-d_100g'?: number
    'vitamin-d_serving'?: number
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

/**
 * Lookup product by barcode from OpenFoodFacts (Server-side)
 */
export async function lookupBarcodeServer(barcode: string): Promise<OpenFoodFactsResponse> {
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
    console.error('[OpenFoodFacts Server] Detailed error:', {
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
