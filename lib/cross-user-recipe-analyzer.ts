/**
 * Cross-User Recipe Analyzer
 *
 * Analyzes shopping items and inventory data across all users to:
 * - Identify trending ingredients
 * - Calculate recipe viability based on community inventory
 * - Generate insights for recipe recommendations
 * - Power ML-driven recipe suggestions
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { ShoppingItem } from '@/types/shopping'

export interface IngredientTrend {
  barcode: string
  productName: string
  brand?: string
  category?: string
  householdCount: number // Number of households with this item
  totalQuantity: number // Total quantity across all households
  inStockCount: number // Number of households with this in stock
  percentageOfHouseholds: number // Percentage of all households
}

export interface RecipeViability {
  recipeId: string
  recipeName: string
  totalIngredients: number
  availableIngredients: number // Based on community inventory
  availabilityScore: number // 0-100
  householdCanMake: number // Number of households that can make this
  percentageCanMake: number // Percentage of households
}

export interface CommunityInsights {
  totalHouseholds: number
  totalItems: number
  totalInStockItems: number
  trendingIngredients: IngredientTrend[]
  popularCategories: Array<{
    category: string
    count: number
    percentage: number
  }>
  analyzedAt: Date
}

/**
 * Fetch all shopping items across all users
 */
export async function fetchAllShoppingItems(filters?: {
  inStock?: boolean
  needed?: boolean
}): Promise<ShoppingItem[]> {
  try {
    logger.info('[fetchAllShoppingItems] Fetching items from all users...')

    let query = adminDb.collection('shopping_items')

    if (filters?.inStock !== undefined) {
      query = query.where('inStock', '==', filters.inStock) as any
    }
    if (filters?.needed !== undefined) {
      query = query.where('needed', '==', filters.needed) as any
    }

    const snapshot = await query.get()

    const items: ShoppingItem[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as ShoppingItem))

    logger.info(`[fetchAllShoppingItems] Found ${items.length} items across database`)
    return items
  } catch (error) {
    logger.error('[fetchAllShoppingItems] Error fetching items', error as Error)
    throw error
  }
}

/**
 * Analyze trending ingredients across all households
 */
export async function analyzeTrendingIngredients(
  options: {
    minHouseholds?: number // Minimum households to be considered trending
    limit?: number // Max results to return
  } = {}
): Promise<IngredientTrend[]> {
  const { minHouseholds = 2, limit = 50 } = options

  try {
    logger.info('[analyzeTrendingIngredients] Starting analysis...')

    // Fetch all in-stock items
    const items = await fetchAllShoppingItems({ inStock: true })

    // Get unique household IDs
    const allHouseholds = new Set<string>()
    items.forEach(item => {
      if (item.householdId) allHouseholds.add(item.householdId)
      if (item.userId) allHouseholds.add(item.userId)
    })
    const totalHouseholds = allHouseholds.size

    logger.info(`[analyzeTrendingIngredients] Analyzing ${items.length} items from ${totalHouseholds} households`)

    // Group by barcode
    const ingredientMap = new Map<string, {
      productName: string
      brand?: string
      category?: string
      households: Set<string>
      totalQuantity: number
      inStockCount: number
    }>()

    items.forEach(item => {
      if (!item.barcode) return

      const householdId = item.householdId || item.userId
      if (!householdId) return

      if (!ingredientMap.has(item.barcode)) {
        ingredientMap.set(item.barcode, {
          productName: item.productName || 'Unknown',
          brand: item.brand,
          category: item.category,
          households: new Set(),
          totalQuantity: 0,
          inStockCount: 0
        })
      }

      const ingredient = ingredientMap.get(item.barcode)!
      ingredient.households.add(householdId)
      ingredient.totalQuantity += item.quantity || 1
      if (item.inStock) {
        ingredient.inStockCount += 1
      }
    })

    // Convert to trends array
    const trends: IngredientTrend[] = []
    ingredientMap.forEach((data, barcode) => {
      const householdCount = data.households.size

      if (householdCount >= minHouseholds) {
        trends.push({
          barcode,
          productName: data.productName,
          brand: data.brand,
          category: data.category,
          householdCount,
          totalQuantity: data.totalQuantity,
          inStockCount: data.inStockCount,
          percentageOfHouseholds: totalHouseholds > 0
            ? (householdCount / totalHouseholds) * 100
            : 0
        })
      }
    })

    // Sort by household count (most popular first)
    trends.sort((a, b) => b.householdCount - a.householdCount)

    const result = limit > 0 ? trends.slice(0, limit) : trends

    logger.info(`[analyzeTrendingIngredients] Found ${result.length} trending ingredients`)
    return result
  } catch (error) {
    logger.error('[analyzeTrendingIngredients] Error analyzing trends', error as Error)
    throw error
  }
}

/**
 * Analyze recipe viability based on community inventory
 */
export async function analyzeRecipeViability(
  recipeId: string
): Promise<RecipeViability | null> {
  try {
    logger.info(`[analyzeRecipeViability] Analyzing recipe: ${recipeId}`)

    // Fetch recipe
    const recipeDoc = await adminDb.collection('recipes').doc(recipeId).get()
    if (!recipeDoc.exists) {
      logger.warn(`[analyzeRecipeViability] Recipe not found: ${recipeId}`)
      return null
    }

    const recipe = recipeDoc.data()!
    const recipeName = recipe.name || 'Unknown Recipe'
    const ingredients = recipe.ingredientsV2 || recipe.ingredients || []

    if (ingredients.length === 0) {
      logger.warn(`[analyzeRecipeViability] Recipe has no ingredients: ${recipeId}`)
      return {
        recipeId,
        recipeName,
        totalIngredients: 0,
        availableIngredients: 0,
        availabilityScore: 0,
        householdCanMake: 0,
        percentageCanMake: 0
      }
    }

    // Fetch all in-stock items
    const items = await fetchAllShoppingItems({ inStock: true })

    // Group items by household
    const householdInventories = new Map<string, Set<string>>()
    items.forEach(item => {
      const householdId = item.householdId || item.userId
      if (!householdId || !item.barcode) return

      if (!householdInventories.has(householdId)) {
        householdInventories.set(householdId, new Set())
      }
      householdInventories.get(householdId)!.add(item.barcode)
    })

    const totalHouseholds = householdInventories.size

    // Extract required barcodes from recipe
    const requiredBarcodes = new Set<string>()
    ingredients.forEach((ing: any) => {
      if (ing.barcode) {
        requiredBarcodes.add(ing.barcode)
      }
    })

    const totalIngredients = requiredBarcodes.size

    // Calculate how many households can make this recipe
    let householdCanMake = 0
    let totalAvailableIngredients = 0

    householdInventories.forEach((inventory, householdId) => {
      let hasAllIngredients = true
      let availableCount = 0

      requiredBarcodes.forEach(barcode => {
        if (inventory.has(barcode)) {
          availableCount++
        } else {
          hasAllIngredients = false
        }
      })

      if (hasAllIngredients) {
        householdCanMake++
      }
      totalAvailableIngredients += availableCount
    })

    // Calculate average availability across all households
    const avgAvailableIngredients = totalHouseholds > 0
      ? totalAvailableIngredients / totalHouseholds
      : 0

    const availabilityScore = totalIngredients > 0
      ? (avgAvailableIngredients / totalIngredients) * 100
      : 0

    const percentageCanMake = totalHouseholds > 0
      ? (householdCanMake / totalHouseholds) * 100
      : 0

    logger.info(`[analyzeRecipeViability] Recipe ${recipeName}: ${householdCanMake}/${totalHouseholds} households can make it`)

    return {
      recipeId,
      recipeName,
      totalIngredients,
      availableIngredients: Math.round(avgAvailableIngredients),
      availabilityScore: Math.round(availabilityScore * 100) / 100,
      householdCanMake,
      percentageCanMake: Math.round(percentageCanMake * 100) / 100
    }
  } catch (error) {
    logger.error('[analyzeRecipeViability] Error analyzing recipe', error as Error)
    throw error
  }
}

/**
 * Get comprehensive community insights
 */
export async function getCommunityInsights(): Promise<CommunityInsights> {
  try {
    logger.info('[getCommunityInsights] Generating insights...')

    const items = await fetchAllShoppingItems()
    const inStockItems = items.filter(item => item.inStock)

    // Get unique households
    const households = new Set<string>()
    items.forEach(item => {
      const householdId = item.householdId || item.userId
      if (householdId) households.add(householdId)
    })

    // Analyze trending ingredients
    const trendingIngredients = await analyzeTrendingIngredients({ limit: 30 })

    // Analyze popular categories
    const categoryMap = new Map<string, number>()
    inStockItems.forEach(item => {
      const category = item.category || 'other'
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1)
    })

    const popularCategories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: inStockItems.length > 0
          ? (count / inStockItems.length) * 100
          : 0
      }))
      .sort((a, b) => b.count - a.count)

    logger.info('[getCommunityInsights] Insights generated successfully')

    return {
      totalHouseholds: households.size,
      totalItems: items.length,
      totalInStockItems: inStockItems.length,
      trendingIngredients,
      popularCategories,
      analyzedAt: new Date()
    }
  } catch (error) {
    logger.error('[getCommunityInsights] Error generating insights', error as Error)
    throw error
  }
}

/**
 * Find recipes that most households can make
 */
export async function findMostViableRecipes(options: {
  limit?: number
  minAvailabilityScore?: number
} = {}): Promise<RecipeViability[]> {
  const { limit = 20, minAvailabilityScore = 50 } = options

  try {
    logger.info('[findMostViableRecipes] Finding most viable recipes...')

    // Fetch all published recipes
    const recipesSnapshot = await adminDb
      .collection('recipes')
      .where('status', '==', 'published')
      .limit(100) // Analyze top 100 recipes
      .get()

    const viabilityPromises = recipesSnapshot.docs.map(doc =>
      analyzeRecipeViability(doc.id)
    )

    const viabilityResults = await Promise.all(viabilityPromises)

    // Filter and sort
    const viable = viabilityResults
      .filter((result): result is RecipeViability =>
        result !== null && result.availabilityScore >= minAvailabilityScore
      )
      .sort((a, b) => b.householdCanMake - a.householdCanMake)

    const result = limit > 0 ? viable.slice(0, limit) : viable

    logger.info(`[findMostViableRecipes] Found ${result.length} viable recipes`)
    return result
  } catch (error) {
    logger.error('[findMostViableRecipes] Error finding recipes', error as Error)
    throw error
  }
}
