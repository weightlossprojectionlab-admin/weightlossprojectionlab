/**
 * Ingredient Matcher Utility
 *
 * Matches recipe ingredient text to inventory items
 * Helps auto-check ingredients user already has in stock
 * Now with quantity-aware matching!
 */

import type { ShoppingItem, QuantityUnit } from '@/types/shopping'
import { parseIngredient } from './ingredient-parser'
import { hasEnough, calculateDeficit, formatQuantityComparison, areUnitsCompatible } from './unit-converter'

/**
 * Parse ingredient string to extract the core ingredient name
 * Examples:
 * - "2 cups milk" → "milk"
 * - "1 lb ground beef" → "ground beef"
 * - "salt and pepper to taste" → "salt"
 */
export function extractIngredientName(ingredient: string): string {
  // Remove common measurements and quantities
  const cleaned = ingredient
    .toLowerCase()
    .replace(/^\d+[\s\/\.]*/g, '') // Remove leading numbers
    .replace(/\b(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons)\b/gi, '')
    .replace(/\b(oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|ml|l|liter|liters)\b/gi, '')
    .replace(/\b(to taste|optional|fresh|dried|frozen|chopped|diced|sliced|minced)\b/gi, '')
    .replace(/[,()]/g, '')
    .trim()

  return cleaned
}

/**
 * Check if ingredient matches inventory item
 * Uses keyword-based matching (brand-agnostic) for flexibility
 */
export function matchIngredientToItem(
  ingredientText: string,
  inventoryItem: ShoppingItem
): boolean {
  const ingredientName = extractIngredientName(ingredientText)
  const itemName = inventoryItem.productName.toLowerCase()
  const category = inventoryItem.category

  // Direct keyword match (ignore brand)
  if (itemName.includes(ingredientName) || ingredientName.includes(itemName)) {
    return true
  }

  // Category-aware matching (users can switch brands)
  const categoryMatches: Record<string, string[]> = {
    dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'sour cream'],
    meat: ['chicken', 'beef', 'pork', 'turkey', 'lamb', 'sausage', 'bacon', 'ground meat'],
    produce: ['lettuce', 'tomato', 'onion', 'pepper', 'carrot', 'celery', 'potato', 'spinach', 'garlic'],
    pantry: ['rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'bread', 'cereal'],
    frozen: ['ice cream', 'frozen vegetables', 'frozen fruit', 'frozen meal'],
    beverages: ['juice', 'soda', 'water', 'coffee', 'tea'],
    condiments: ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'sauce', 'dressing', 'salsa']
  }

  // Check if ingredient keyword matches category
  const categoryKeywords = categoryMatches[category] || []
  for (const keyword of categoryKeywords) {
    if (ingredientName.includes(keyword)) {
      // Verify item name also contains the keyword
      if (itemName.includes(keyword)) {
        return true
      }
    }
  }

  // Expanded keyword synonyms for common ingredients
  const specialMatches: Record<string, string[]> = {
    milk: ['whole milk', '2% milk', 'skim milk', 'low-fat milk', 'milk', 'dairy milk', 'cow milk'],
    cheese: ['cheddar', 'mozzarella', 'parmesan', 'swiss', 'american cheese', 'cheese blend'],
    butter: ['unsalted butter', 'salted butter', 'margarine'],
    chicken: ['chicken breast', 'chicken thigh', 'whole chicken', 'chicken drumstick', 'rotisserie chicken'],
    beef: ['ground beef', 'steak', 'beef roast', 'chuck roast', 'sirloin', 'ribeye'],
    egg: ['eggs', 'large eggs', 'medium eggs', 'dozen eggs'],
    tomato: ['tomatoes', 'roma tomato', 'cherry tomato', 'grape tomato', 'heirloom tomato'],
    onion: ['yellow onion', 'white onion', 'red onion', 'sweet onion', 'vidalia onion'],
    pepper: ['bell pepper', 'red pepper', 'green pepper', 'yellow pepper', 'orange pepper'],
    pasta: ['spaghetti', 'penne', 'macaroni', 'noodles', 'linguine', 'fettuccine', 'rotini'],
    rice: ['white rice', 'brown rice', 'basmati', 'jasmine', 'long grain', 'instant rice'],
    bread: ['loaf', 'rolls', 'baguette', 'sandwich bread', 'wheat bread', 'white bread'],
    oil: ['vegetable oil', 'olive oil', 'canola oil', 'cooking oil', 'sunflower oil'],
    salt: ['table salt', 'sea salt', 'kosher salt', 'himalayan salt'],
    sugar: ['white sugar', 'cane sugar', 'granulated sugar', 'brown sugar']
  }

  for (const [key, variations] of Object.entries(specialMatches)) {
    if (ingredientName.includes(key)) {
      for (const variation of variations) {
        if (itemName.includes(variation)) {
          return true
        }
      }
    }
  }

  // Word-level matching for compound ingredients (e.g., "ground beef" matches "beef")
  const ingredientWords = ingredientName.split(/\s+/)
  const itemWords = itemName.split(/\s+/)

  for (const ingredientWord of ingredientWords) {
    if (ingredientWord.length > 3) { // Avoid short words like "of", "to"
      for (const itemWord of itemWords) {
        if (itemWord.includes(ingredientWord) || ingredientWord.includes(itemWord)) {
          return true
        }
      }
    }
  }

  return false
}

/**
 * Find matching inventory item for a recipe ingredient
 */
export function findMatchingInventoryItem(
  ingredientText: string,
  inventoryItems: ShoppingItem[]
): ShoppingItem | null {
  // Only check in-stock items
  const inStockItems = inventoryItems.filter(item => item.inStock)

  for (const item of inStockItems) {
    if (matchIngredientToItem(ingredientText, item)) {
      return item
    }
  }

  return null
}

/**
 * Check multiple ingredients against inventory
 * Returns map of ingredient index to matched item
 */
export function checkIngredientsAgainstInventory(
  ingredients: string[],
  inventoryItems: ShoppingItem[]
): Map<number, ShoppingItem> {
  const matches = new Map<number, ShoppingItem>()

  ingredients.forEach((ingredient, index) => {
    const match = findMatchingInventoryItem(ingredient, inventoryItems)
    if (match) {
      matches.set(index, match)
    }
  })

  return matches
}

/**
 * Get match confidence score (0-100)
 * Higher score = better match
 */
export function getMatchConfidence(
  ingredientText: string,
  inventoryItem: ShoppingItem
): number {
  const ingredientName = extractIngredientName(ingredientText)
  const itemName = inventoryItem.productName.toLowerCase()

  // Exact match
  if (ingredientName === itemName) {
    return 100
  }

  // Ingredient fully contains item name
  if (ingredientName.includes(itemName)) {
    return 90
  }

  // Item name fully contains ingredient
  if (itemName.includes(ingredientName)) {
    return 85
  }

  // Partial word match
  const ingredientWords = ingredientName.split(/\s+/)
  const itemWords = itemName.split(/\s+/)
  const matchingWords = ingredientWords.filter(word =>
    itemWords.some(itemWord => itemWord.includes(word) || word.includes(itemWord))
  )

  if (matchingWords.length > 0) {
    return Math.min(80, (matchingWords.length / ingredientWords.length) * 80)
  }

  return 0
}

/**
 * Find best matching inventory item with confidence score
 */
export function findBestMatch(
  ingredientText: string,
  inventoryItems: ShoppingItem[]
): { item: ShoppingItem; confidence: number } | null {
  const inStockItems = inventoryItems.filter(item => item.inStock)

  let bestMatch: { item: ShoppingItem; confidence: number } | null = null

  for (const item of inStockItems) {
    const confidence = getMatchConfidence(ingredientText, item)
    if (confidence > 60 && (!bestMatch || confidence > bestMatch.confidence)) {
      bestMatch = { item, confidence }
    }
  }

  return bestMatch
}

/**
 * Ingredient match result with quantity information
 */
export interface IngredientMatchResult {
  ingredient: string // Original ingredient text
  matched: boolean // Whether a match was found
  item?: ShoppingItem // Matched inventory item
  needed: {
    quantity: number | null
    unit: QuantityUnit | undefined
  }
  have: {
    quantity: number
    unit: QuantityUnit | undefined
  }
  hasEnough: boolean | null // true if have enough, false if not, null if can't compare
  deficit?: {
    quantity: number
    unit: QuantityUnit
  } | null
  comparison: string // Human-readable comparison
}

/**
 * Match ingredient with quantity awareness
 * Returns detailed information about whether we have enough
 */
export function matchIngredientWithQuantity(
  ingredientText: string,
  inventoryItems: ShoppingItem[]
): IngredientMatchResult {
  // Parse the ingredient to extract quantity, unit, and name
  const parsed = parseIngredient(ingredientText)

  // Find matching inventory item
  const match = findMatchingInventoryItem(ingredientText, inventoryItems)

  // Base result
  const result: IngredientMatchResult = {
    ingredient: ingredientText,
    matched: match !== null,
    item: match || undefined,
    needed: {
      quantity: parsed.quantity,
      unit: parsed.unit as QuantityUnit | undefined
    },
    have: {
      quantity: match?.quantity || 0,
      unit: match?.unit
    },
    hasEnough: null,
    comparison: ''
  }

  // If no match found
  if (!match) {
    result.comparison = `Don't have ${parsed.ingredient}`
    result.hasEnough = false
    return result
  }

  // If ingredient has no quantity (e.g., "salt to taste"), just check if we have it
  if (parsed.quantity === null || !parsed.scalable) {
    result.hasEnough = true
    result.comparison = `Have ${match.productName}`
    return result
  }

  // Check if units are compatible
  if (!areUnitsCompatible(parsed.unit as QuantityUnit, match.unit)) {
    result.hasEnough = null
    result.comparison = `Have ${match.productName} but can't compare units (${parsed.unit} vs ${match.unit})`
    return result
  }

  // Compare quantities
  const enough = hasEnough(
    parsed.quantity,
    parsed.unit as QuantityUnit,
    match.quantity,
    match.unit
  )

  result.hasEnough = enough

  if (enough) {
    result.comparison = formatQuantityComparison(
      parsed.quantity,
      parsed.unit as QuantityUnit,
      match.quantity,
      match.unit
    )
  } else {
    const deficit = calculateDeficit(
      parsed.quantity,
      parsed.unit as QuantityUnit,
      match.quantity,
      match.unit
    )
    result.deficit = deficit
    result.comparison = formatQuantityComparison(
      parsed.quantity,
      parsed.unit as QuantityUnit,
      match.quantity,
      match.unit
    )
  }

  return result
}

/**
 * Check all recipe ingredients with quantity awareness
 * Returns array of match results
 */
export function checkIngredientsWithQuantities(
  ingredients: string[],
  inventoryItems: ShoppingItem[]
): IngredientMatchResult[] {
  return ingredients.map(ingredient =>
    matchIngredientWithQuantity(ingredient, inventoryItems)
  )
}

/**
 * Get recipe readiness summary
 */
export interface RecipeReadiness {
  totalIngredients: number
  matchedIngredients: number
  haveEnough: number
  missing: number
  insufficient: number
  canMake: boolean
  missingItems: string[]
  insufficientItems: string[]
}

/**
 * Calculate whether a recipe can be made with current inventory
 */
export function calculateRecipeReadiness(
  ingredients: string[],
  inventoryItems: ShoppingItem[]
): RecipeReadiness {
  const matches = checkIngredientsWithQuantities(ingredients, inventoryItems)

  const result: RecipeReadiness = {
    totalIngredients: ingredients.length,
    matchedIngredients: 0,
    haveEnough: 0,
    missing: 0,
    insufficient: 0,
    canMake: true,
    missingItems: [],
    insufficientItems: []
  }

  for (const match of matches) {
    if (match.matched) {
      result.matchedIngredients++

      if (match.hasEnough === true) {
        result.haveEnough++
      } else if (match.hasEnough === false) {
        result.insufficient++
        result.insufficientItems.push(match.ingredient)
        result.canMake = false
      }
    } else {
      result.missing++
      result.missingItems.push(match.ingredient)
      result.canMake = false
    }
  }

  return result
}
