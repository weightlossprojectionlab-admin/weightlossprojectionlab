/**
 * Product Lookup - Server Side
 *
 * Tries USDA FoodData Central API first, then falls back to OpenFoodFacts
 */

import { logger } from '@/lib/logger'
import { searchByBarcode as usdaSearchByBarcode, type USDAProductData } from './usda-api'

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product'

export interface ProductData {
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
  source: 'usda' | 'openfoodfacts'
}

/**
 * Lookup product by barcode - tries USDA first, then OpenFoodFacts
 */
export async function lookupProductByBarcode(barcode: string): Promise<ProductData | null> {
  logger.info('[Product Lookup] Starting barcode lookup', { barcode })

  // Try USDA first
  try {
    const usdaProduct = await usdaSearchByBarcode(barcode)
    if (usdaProduct) {
      logger.info('[Product Lookup] Found in USDA', { barcode })
      return {
        ...usdaProduct,
        source: 'usda'
      } as ProductData
    }
  } catch (error) {
    logger.warn('[Product Lookup] USDA lookup failed, trying OpenFoodFacts', { error: (error as Error).message, barcode })
  }

  // Fallback to OpenFoodFacts
  try {
    logger.info('[Product Lookup] Trying OpenFoodFacts', { barcode })

    const response = await fetch(`${OPENFOODFACTS_API_URL}/${barcode}.json`, {
      headers: {
        'User-Agent': 'WeightLossProjectLab/1.0'
      }
    })

    if (!response.ok) {
      logger.error('[Product Lookup] OpenFoodFacts API error', new Error(`HTTP ${response.status}`), { barcode })
      return null
    }

    const data = await response.json()

    if (data.status === 0 || !data.product) {
      logger.info('[Product Lookup] Product not found in OpenFoodFacts', { barcode })
      return null
    }

    const product = data.product

    logger.info('[Product Lookup] Found in OpenFoodFacts', {
      barcode,
      name: product.product_name,
      brands: product.brands
    })

    return {
      code: barcode,
      product_name: product.product_name || 'Unknown Product',
      brands: product.brands,
      quantity: product.quantity,
      serving_size: product.serving_size,
      image_url: product.image_url || product.image_front_url,
      nutriments: product.nutriments || {},
      ingredients_text: product.ingredients_text,
      categories: product.categories,
      source: 'openfoodfacts'
    }
  } catch (error) {
    logger.error('[Product Lookup] All lookup methods failed', error as Error, { barcode })
    return null
  }
}
