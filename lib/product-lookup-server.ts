/**
 * Product Lookup - Server Side
 *
 * Tries USDA FoodData Central API first, then falls back to OpenFoodFacts
 */

import { logger } from '@/lib/logger'
import { searchByBarcode as usdaSearchByBarcode, type USDAProductData } from './usda-api'
import { fetchOpenFoodFactsImageOnly } from './openfoodfacts-api'

const OPENFOODFACTS_API_URL = 'https://world.openfoodfacts.org/api/v2/product'

export interface ProductData {
  code: string
  product_name: string
  brands?: string
  quantity?: string
  serving_size?: string
  image_url?: string
  // Nutriments object follows the OpenFoodFacts shape — many possible keys
  // (per-100g, per-serving, hyphenated names like 'saturated-fat_100g',
  // 'vitamin-d_serving', etc.). Index signature keeps the type permissive so
  // callers can read any standard nutrient field without a cast.
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
    [key: string]: number | undefined
  }
  ingredients_text?: string
  categories?: string
  source: 'usda' | 'openfoodfacts' | 'usda+off'
}

/**
 * Hybrid lookup: USDA-first for nutrition, then enrich with OpenFoodFacts image.
 *
 * USDA FoodData Central provides authoritative branded-foods nutrition but no
 * product images at all (verified via OpenAPI schema and live response). When
 * USDA wins on the nutrition lookup, we still ping OFF in parallel just for the
 * image so admin-curated products and end-user scans get a recognizable thumbnail.
 *
 * Source semantics:
 *   - 'usda+off'      = USDA had the nutrition, OFF supplied the image
 *   - 'usda'          = USDA had the nutrition, OFF had no usable image
 *   - 'openfoodfacts' = USDA had nothing, fell back to OFF for everything
 *   - null            = neither source had the barcode
 *
 * Use this for admin curation and end-user lookups where image quality matters.
 * The OFF image-only call is a small extra request; results are cached for 30
 * days in product_database (see app/api/products/lookup/route.ts), so this only
 * runs on cache misses.
 */
export async function lookupProductHybrid(barcode: string): Promise<ProductData | null> {
  logger.info('[Hybrid Lookup] Starting', { barcode })

  // Run USDA + OFF-image-only in parallel — even if USDA wins, we want OFF's image.
  const [usdaProduct, offImage] = await Promise.all([
    usdaSearchByBarcode(barcode).catch((error) => {
      logger.warn('[Hybrid Lookup] USDA call failed', { error: (error as Error).message, barcode })
      return null
    }),
    fetchOpenFoodFactsImageOnly(barcode).catch(() => null)
  ])

  if (usdaProduct) {
    const merged: ProductData = {
      ...usdaProduct,
      image_url: offImage || usdaProduct.image_url,
      source: offImage ? 'usda+off' : 'usda'
    }
    logger.info('[Hybrid Lookup] USDA hit', { barcode, hasImage: !!offImage, source: merged.source })
    return merged
  }

  // USDA had nothing — fall back to a full OFF lookup (with nutrition).
  logger.info('[Hybrid Lookup] USDA miss, full OFF lookup', { barcode })
  return lookupProductByBarcode(barcode)
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
