/**
 * Shopping Diff - Compare recipe ingredients against inventory
 *
 * Determines which ingredients are missing from inventory
 * and need to be added to shopping list
 */

import type { ShoppingItem, QuantityUnit } from '@/types/shopping'

export interface RecipeIngredient {
  name: string
  quantity: number
  unit?: QuantityUnit
  category?: string
}

export interface IngredientDiff {
  ingredient: RecipeIngredient
  status: 'have' | 'need' | 'partial'
  inStock?: ShoppingItem
  haveQuantity?: number
  haveUnit?: QuantityUnit
  needQuantity?: number
  needUnit?: QuantityUnit
}

/**
 * Normalize product names for comparison
 * (e.g., "whole milk" and "milk" should match)
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(whole|low-fat|skim|organic|fresh)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Check if two ingredients match
 */
function ingredientsMatch(ingredientName: string, productName: string): boolean {
  const normalized1 = normalizeProductName(ingredientName)
  const normalized2 = normalizeProductName(productName)

  // Exact match
  if (normalized1 === normalized2) return true

  // One contains the other
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
    return true
  }

  return false
}

/**
 * Compare recipe ingredients against inventory
 * Returns list of items showing what's available and what's needed
 */
export function compareWithInventory(
  ingredients: RecipeIngredient[],
  inventoryItems: ShoppingItem[]
): IngredientDiff[] {
  return ingredients.map(ingredient => {
    // Find matching item in inventory
    const matchingItem = inventoryItems.find(item =>
      item.inStock && ingredientsMatch(ingredient.name, item.productName)
    )

    if (!matchingItem) {
      // Not in inventory at all
      return {
        ingredient,
        status: 'need',
        needQuantity: ingredient.quantity,
        needUnit: ingredient.unit,
      }
    }

    // Check if we have enough quantity
    const haveQuantity = matchingItem.quantity
    const needQuantity = ingredient.quantity

    // If units match, we can compare quantities
    if (matchingItem.unit === ingredient.unit) {
      if (haveQuantity >= needQuantity) {
        return {
          ingredient,
          status: 'have',
          inStock: matchingItem,
          haveQuantity,
          haveUnit: matchingItem.unit,
        }
      } else {
        return {
          ingredient,
          status: 'partial',
          inStock: matchingItem,
          haveQuantity,
          haveUnit: matchingItem.unit,
          needQuantity: needQuantity - haveQuantity,
          needUnit: ingredient.unit,
        }
      }
    }

    // Units don't match or not specified - assume we have it
    return {
      ingredient,
      status: 'have',
      inStock: matchingItem,
      haveQuantity,
      haveUnit: matchingItem.unit,
    }
  })
}

/**
 * Extract items that need to be added to shopping list
 */
export function getItemsToAdd(diffs: IngredientDiff[]): RecipeIngredient[] {
  return diffs
    .filter(diff => diff.status === 'need' || diff.status === 'partial')
    .map(diff => ({
      name: diff.ingredient.name,
      quantity: diff.needQuantity || diff.ingredient.quantity,
      unit: diff.needUnit || diff.ingredient.unit,
      category: diff.ingredient.category,
    }))
}

/**
 * Merge duplicate ingredients (sum quantities)
 */
export function mergeIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  const merged = new Map<string, RecipeIngredient>()

  ingredients.forEach(ingredient => {
    const key = normalizeProductName(ingredient.name) + '_' + (ingredient.unit || '')

    if (merged.has(key)) {
      const existing = merged.get(key)!
      existing.quantity += ingredient.quantity
    } else {
      merged.set(key, { ...ingredient })
    }
  })

  return Array.from(merged.values())
}
