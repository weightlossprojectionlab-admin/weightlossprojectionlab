/**
 * AI-Powered Expiration Prediction Service
 *
 * Uses Gemini AI to predict product-specific shelf life
 * Provides intelligent expiration date suggestions based on:
 * - Product type and category
 * - Storage location
 * - Packaging and condition
 * - Historical patterns
 */

import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import type { ProductCategory, StorageLocation } from '@/types/shopping'
import { logger } from '@/lib/logger'
import { CATEGORY_METADATA } from '@/lib/product-categories'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

/**
 * Shelf life prediction result
 */
export interface ShelfLifePrediction {
  productName: string
  category: ProductCategory
  estimatedDays: number
  minDays: number
  maxDays: number
  confidence: number // 0-100
  factors: string[]
  storageRecommendations: string[]
  spoilageIndicators: string[]
}

/**
 * Cache for shelf life predictions
 * Key: `${productName}:${category}:${storageLocation}`
 */
const predictionCache = new Map<string, { prediction: ShelfLifePrediction; timestamp: number }>()
const CACHE_DURATION = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Gemini schema for shelf life prediction
 */
const shelfLifeSchema = {
  type: SchemaType.OBJECT as const,
  properties: {
    estimatedDays: {
      type: SchemaType.NUMBER as const,
      description: 'Most likely shelf life in days'
    },
    minDays: {
      type: SchemaType.NUMBER as const,
      description: 'Minimum shelf life in days (pessimistic)'
    },
    maxDays: {
      type: SchemaType.NUMBER as const,
      description: 'Maximum shelf life in days (optimistic)'
    },
    confidence: {
      type: SchemaType.NUMBER as const,
      description: 'Confidence level 0-100'
    },
    factors: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'Factors affecting shelf life'
    },
    storageRecommendations: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'Storage tips to extend freshness'
    },
    spoilageIndicators: {
      type: SchemaType.ARRAY as const,
      items: { type: SchemaType.STRING as const },
      description: 'Signs that the product has spoiled'
    }
  },
  required: ['estimatedDays', 'minDays', 'maxDays', 'confidence', 'factors']
}

/**
 * Predict shelf life for a specific product using AI
 */
export async function predictShelfLife(
  productName: string,
  category: ProductCategory,
  storageLocation: StorageLocation = 'fridge'
): Promise<ShelfLifePrediction> {
  const cacheKey = `${productName.toLowerCase()}:${category}:${storageLocation}`

  // Check cache first
  const cached = predictionCache.get(cacheKey)
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    logger.info('[AI Expiration] Using cached prediction', { productName, category })
    return cached.prediction
  }

  try {
    logger.info('[AI Expiration] Requesting prediction from Gemini', {
      productName,
      category,
      storageLocation
    })

    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: shelfLifeSchema
      }
    })

    const categoryMeta = CATEGORY_METADATA[category]

    const prompt = `You are a food safety expert. Predict the shelf life for the following product:

Product: ${productName}
Category: ${category} (${categoryMeta.displayName})
Storage Location: ${storageLocation}
Base Shelf Life: ${categoryMeta.defaultShelfLifeDays} days

Provide a detailed shelf life prediction considering:
1. Product perishability and type
2. Optimal storage conditions
3. Common spoilage patterns
4. Food safety guidelines

Be specific for this exact product (e.g., "raspberries" are more perishable than "apples").
Return your prediction in the specified JSON format.

Important:
- estimatedDays should be the most realistic shelf life
- minDays should be conservative (when to start checking closely)
- maxDays should be optimistic (absolute maximum if stored perfectly)
- Include 3-5 practical storage tips
- Include 3-5 clear spoilage indicators`

    const result = await model.generateContent(prompt)
    const response = result.response
    const prediction = JSON.parse(response.text())

    const shelfLifePrediction: ShelfLifePrediction = {
      productName,
      category,
      estimatedDays: prediction.estimatedDays,
      minDays: prediction.minDays,
      maxDays: prediction.maxDays,
      confidence: prediction.confidence,
      factors: prediction.factors || [],
      storageRecommendations: prediction.storageRecommendations || [],
      spoilageIndicators: prediction.spoilageIndicators || []
    }

    // Cache the prediction
    predictionCache.set(cacheKey, {
      prediction: shelfLifePrediction,
      timestamp: Date.now()
    })

    logger.info('[AI Expiration] Prediction successful', {
      productName,
      estimatedDays: prediction.estimatedDays,
      confidence: prediction.confidence
    })

    return shelfLifePrediction
  } catch (error) {
    logger.error('[AI Expiration] Prediction failed', error as Error, {
      productName,
      category
    })

    // Fallback to category default
    return getFallbackPrediction(productName, category, storageLocation)
  }
}

/**
 * Fallback prediction using category defaults
 */
function getFallbackPrediction(
  productName: string,
  category: ProductCategory,
  storageLocation: StorageLocation
): ShelfLifePrediction {
  const categoryMeta = CATEGORY_METADATA[category]
  const estimatedDays = categoryMeta.defaultShelfLifeDays

  return {
    productName,
    category,
    estimatedDays,
    minDays: Math.floor(estimatedDays * 0.7),
    maxDays: Math.ceil(estimatedDays * 1.3),
    confidence: 50, // Medium confidence for fallback
    factors: [
      `Using default ${category} shelf life`,
      `Stored in ${storageLocation}`,
      'AI prediction unavailable'
    ],
    storageRecommendations: getDefaultStorageRecommendations(category),
    spoilageIndicators: getDefaultSpoilageIndicators(category)
  }
}

/**
 * Get default storage recommendations by category
 */
function getDefaultStorageRecommendations(category: ProductCategory): string[] {
  const recommendations: Record<ProductCategory, string[]> = {
    produce: [
      'Store in crisper drawer for humidity control',
      'Keep separate from ethylene-producing fruits',
      'Check for soft spots or mold daily'
    ],
    meat: [
      'Keep at 40°F or below',
      'Store on bottom shelf to prevent drips',
      'Use within 1-2 days or freeze'
    ],
    dairy: [
      'Keep refrigerated at all times',
      'Close containers tightly after use',
      'Store away from strong-smelling foods'
    ],
    bakery: [
      'Store in airtight container at room temperature',
      'Refrigerate only in hot, humid climates',
      'Freeze for longer storage'
    ],
    seafood: [
      'Keep very cold (32-38°F)',
      'Use within 1-2 days',
      'Store on ice if possible'
    ],
    deli: [
      'Wrap tightly to prevent drying',
      'Store in coldest part of fridge',
      'Use within 3-5 days of opening'
    ],
    eggs: [
      'Keep in original carton',
      'Store in main body of fridge, not door',
      'Do not wash before storing'
    ],
    herbs: [
      'Trim stems and place in water like flowers',
      'Cover loosely with plastic bag',
      'Change water every 2 days'
    ],
    frozen: [
      'Maintain freezer at 0°F or below',
      'Avoid refreezing after thawing',
      'Use airtight packaging to prevent freezer burn'
    ],
    beverages: [
      'Store upright to prevent leaks',
      'Keep refrigerated after opening',
      'Check expiration dates regularly'
    ],
    pantry: [
      'Store in cool, dry place',
      'Keep in airtight containers',
      'Check for pests regularly'
    ],
    condiments: [
      'Refrigerate after opening',
      'Wipe jar rims clean',
      'Check for separation or off odors'
    ],
    other: [
      'Follow package instructions',
      'Store in appropriate temperature',
      'Check expiration dates'
    ]
  }

  return recommendations[category] || recommendations.other
}

/**
 * Get default spoilage indicators by category
 */
function getDefaultSpoilageIndicators(category: ProductCategory): string[] {
  const indicators: Record<ProductCategory, string[]> = {
    produce: [
      'Visible mold or fuzzy growth',
      'Soft, mushy, or slimy texture',
      'Off or fermented smell',
      'Unusual discoloration'
    ],
    meat: [
      'Gray or brown color (fresh meat should be red/pink)',
      'Slimy or sticky surface',
      'Sour or ammonia-like smell',
      'Tacky texture'
    ],
    dairy: [
      'Sour or rancid smell',
      'Lumpy or curdled texture',
      'Visible mold',
      'Separation that doesn\'t remix'
    ],
    bakery: [
      'Visible mold (green, white, or black spots)',
      'Stale or cardboard-like smell',
      'Hard, dry texture',
      'Off taste'
    ],
    seafood: [
      'Strong fishy or ammonia smell',
      'Slimy coating',
      'Dull, cloudy eyes (for whole fish)',
      'Discolored flesh'
    ],
    deli: [
      'Slimy surface',
      'Sour or off smell',
      'Rainbow sheen on surface',
      'Visible mold'
    ],
    eggs: [
      'Sulfur or rotten smell',
      'Floats in water (fresh eggs sink)',
      'Runny, watery white',
      'Pink or iridescent discoloration'
    ],
    herbs: [
      'Black or brown wilted leaves',
      'Slimy stems',
      'Moldy appearance',
      'Loss of aroma'
    ],
    frozen: [
      'Freezer burn (dry, grayish spots)',
      'Ice crystals inside packaging',
      'Off smell when thawed',
      'Discoloration'
    ],
    beverages: [
      'Cloudy appearance (if normally clear)',
      'Separated layers that don\'t remix',
      'Off or fermented smell',
      'Unusual taste'
    ],
    pantry: [
      'Pest infestation',
      'Rancid smell',
      'Stale taste',
      'Package bloating or damage'
    ],
    condiments: [
      'Visible mold',
      'Off color or darkening',
      'Unusual smell',
      'Excessive separation'
    ],
    other: [
      'Unusual smell',
      'Visible mold',
      'Texture changes',
      'Off taste'
    ]
  }

  return indicators[category] || indicators.other
}

/**
 * Batch predict shelf life for multiple products
 */
export async function batchPredictShelfLife(
  products: Array<{ name: string; category: ProductCategory; storageLocation?: StorageLocation }>
): Promise<ShelfLifePrediction[]> {
  const predictions = await Promise.all(
    products.map(p =>
      predictShelfLife(p.name, p.category, p.storageLocation || 'fridge')
    )
  )

  return predictions
}

/**
 * Clear prediction cache (useful for testing or manual refresh)
 */
export function clearPredictionCache(): void {
  predictionCache.clear()
  logger.info('[AI Expiration] Prediction cache cleared')
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    size: predictionCache.size,
    products: Array.from(predictionCache.keys())
  }
}
