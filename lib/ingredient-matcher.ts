/**
 * Ingredient Matcher Utility
 *
 * Matches recipe ingredient text to inventory items
 * Helps auto-check ingredients user already has in stock
 * Now with quantity-aware matching!
 */

import type { ShoppingItem, QuantityUnit, ProductCategory } from '@/types/shopping'
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
 * Categories whose items must be excluded when matching recipe
 * ingredients. Pet food and pet supplies live alongside human food in
 * product_database (the catalog is shared) but a recipe for tofu must
 * never match a bag of fish skins or any other pet item — fuzzy text
 * matching has no concept of category, so a pet product whose name
 * shares a substring with a recipe ingredient (e.g. "Crisp Cod Fish
 * Skins" overlapping "tofu" via tokenization noise) gets surfaced as
 * a "have" match. Filtering these out before the matcher sees them
 * fixes the issue at the boundary instead of patching the fuzzy
 * algorithm.
 *
 * Add categories here when new non-recipe-relevant ones land (paper
 * goods, cleaning supplies, etc.).
 */
export const EXCLUDED_RECIPE_CATEGORIES: ReadonlyArray<ProductCategory> = [
  'pet-food',
  'pet-supplies',
] as const

/**
 * Strip non-recipe-relevant items from an inventory list before
 * passing to any matcher. Single source of truth for "what can be a
 * recipe ingredient" — every caller that feeds inventory to the
 * matcher should run input through this first.
 */
export function filterRecipeRelevantItems(items: ShoppingItem[]): ShoppingItem[] {
  const excluded = new Set<ProductCategory>(EXCLUDED_RECIPE_CATEGORIES)
  return items.filter((it) => !excluded.has(it.category))
}

/**
 * Categories that don't block "Ready to cook!" when missing.
 *
 * Most users won't onboard their spice rack, salt shaker, or olive
 * oil bottle into the inventory tracker — too many tiny items, often
 * no barcode, low ROI for tracking. So a recipe calling for "1 tsp
 * paprika" or "salt to taste" shouldn't gate cooking on whether
 * those rows exist in inventory. Users will improvise or already
 * have them on hand.
 *
 * Strategy: when an ingredient in one of these categories is missing
 * from inventory, calculateRecipeReadiness still records it as
 * `missing` for visibility but does NOT flip canMake to false. Items
 * in any OTHER category (produce, meat, dairy, etc.) still block
 * the cook button when missing.
 *
 * Add categories here when they represent typical-pantry-staples
 * users won't manually scan.
 */
export const NON_BLOCKING_RECIPE_CATEGORIES: ReadonlyArray<ProductCategory> = [
  'herbs',
  'spices',
  'condiments',
] as const

/**
 * Heuristic match for the legacy "Optional:" prefix on free-text
 * ingredients. The structured RecipeIngredient.optional field is the
 * source of truth, but recipes generated before that field was wired
 * carry the marker in the text only — match it here so existing
 * recipes don't have to be regenerated.
 */
function isTextMarkedOptional(text: string | undefined): boolean {
  if (!text) return false
  return /^\s*optional\b/i.test(text)
}

/**
 * Match a single structured RecipeIngredient against inventory.
 *
 * Prefers exact barcode match when the recipe ingredient was curated
 * via /admin/recipes (which links to product_database via ProductSelector).
 * Falls back to text-based matching for ingredients without a barcode.
 *
 * The structured path is strictly better than the text path:
 *   - Exact match by `inventoryItem.barcode === ingredient.productBarcode`
 *     (no parsing, no synonym fuzziness)
 *   - Recipe quantity + unit are already structured (no regex extraction)
 *   - Same hasEnough math against the inventory row's tracked unit
 *
 * Used by RecipeModal's missing-ingredients block, the /recipes/[id]
 * Start Cooking enable check, and the Phase 2c cooking-session
 * deduction. Behavior for legacy free-text ingredients is unchanged.
 */
export function matchStructuredIngredient(
  ingredient: {
    productBarcode?: string
    productName?: string
    ingredientText?: string
    quantity?: number
    unit?: string
  },
  inventoryItems: ShoppingItem[]
): IngredientMatchResult {
  const displayText = ingredient.ingredientText
    || (ingredient.productName ? `${ingredient.quantity ?? ''} ${ingredient.unit ?? ''} ${ingredient.productName}`.trim() : '')
    || '(unnamed ingredient)'

  // Barcode-linked path — exact inventory match by barcode
  if (ingredient.productBarcode) {
    const match = inventoryItems.find((it) => it.barcode === ingredient.productBarcode) || null
    const result: IngredientMatchResult = {
      ingredient: displayText,
      matched: match !== null,
      item: match || undefined,
      needed: {
        quantity: typeof ingredient.quantity === 'number' ? ingredient.quantity : null,
        unit: ingredient.unit as QuantityUnit | undefined,
      },
      have: { quantity: match?.quantity || 0, unit: match?.unit },
      hasEnough: null,
      comparison: '',
    }

    if (!match) {
      result.comparison = `Don't have ${ingredient.productName || displayText}`
      result.hasEnough = false
      return result
    }

    // Quantityless ingredients ("a pinch of salt") just need presence
    if (typeof ingredient.quantity !== 'number') {
      result.hasEnough = true
      result.comparison = `Have ${match.productName}`
      return result
    }

    // Compare quantities, preferring incompatible-units null over false
    if (!areUnitsCompatible(ingredient.unit as QuantityUnit, match.unit)) {
      result.hasEnough = null
      result.comparison = `Have ${match.productName} but can't compare units (${ingredient.unit} vs ${match.unit})`
      return result
    }
    const enough = hasEnough(
      ingredient.quantity,
      ingredient.unit as QuantityUnit,
      match.quantity,
      match.unit
    )
    result.hasEnough = enough
    result.comparison = formatQuantityComparison(
      ingredient.quantity,
      ingredient.unit as QuantityUnit,
      match.quantity,
      match.unit
    )
    if (!enough) {
      result.deficit = calculateDeficit(
        ingredient.quantity,
        ingredient.unit as QuantityUnit,
        match.quantity,
        match.unit
      )
    }
    return result
  }

  // No barcode link — fall through to text-based matcher.
  return matchIngredientWithQuantity(displayText, inventoryItems)
}

/**
 * Check structured recipe ingredients (ingredientsV2) against inventory.
 * Counterpart to checkIngredientsWithQuantities for the structured path.
 *
 * Prefer this over checkIngredientsWithQuantities anywhere a recipe has
 * `ingredientsV2` populated. The legacy text-array function stays as
 * the fallback for recipes that only have free-text `ingredients[]`.
 */
export function checkStructuredIngredients(
  ingredients: Array<{
    productBarcode?: string
    productName?: string
    ingredientText?: string
    quantity?: number
    unit?: string
  }>,
  inventoryItems: ShoppingItem[]
): IngredientMatchResult[] {
  return ingredients.map((ing) => matchStructuredIngredient(ing, inventoryItems))
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
  ingredients: string[] | Array<{
    productBarcode?: string
    productName?: string
    ingredientText?: string
    quantity?: number
    unit?: string
    /** Recipe-author intent: ingredient is nice-to-have, not required. */
    optional?: boolean
    /**
     * Optional category hint from the recipe. When set, lets us decide
     * blocking vs non-blocking without needing the inventory item
     * (which only exists for matched ingredients). Common pattern:
     * recipe says "1 tsp cumin" → category 'spices' → non-blocking
     * even when missing from inventory.
     */
    category?: ProductCategory
  }>,
  inventoryItems: ShoppingItem[]
): RecipeReadiness {
  // Filter pet-food / pet-supplies once at the readiness boundary so
  // every consumer of this function (RecipeModal badge, member-recipe
  // engine, public recipe pages) gets the same exclusion without
  // having to remember to call filterRecipeRelevantItems first.
  const recipeRelevantInventory = filterRecipeRelevantItems(inventoryItems)

  // Branch on shape: structured ingredient objects use the
  // barcode-aware matcher, raw strings fall through to the legacy
  // text matcher. Same return shape for both.
  const isStructured =
    ingredients.length > 0 && typeof ingredients[0] === 'object'
  const matches = isStructured
    ? checkStructuredIngredients(
        ingredients as Array<{
          productBarcode?: string
          productName?: string
          ingredientText?: string
          quantity?: number
          unit?: string
        }>,
        recipeRelevantInventory
      )
    : checkIngredientsWithQuantities(ingredients as string[], recipeRelevantInventory)

  const nonBlocking = new Set<ProductCategory>(NON_BLOCKING_RECIPE_CATEGORIES)

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

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]
    const sourceIngredient = ingredients[i]

    // Resolve optional + category hints from the source ingredient
    // (structured shape) when available; for legacy string input,
    // detect "Optional:" text-prefix as the fallback signal.
    const isStructuredItem = isStructured && typeof sourceIngredient === 'object'
    const explicitOptional =
      isStructuredItem && (sourceIngredient as { optional?: boolean }).optional === true
    const textOptional = isTextMarkedOptional(
      isStructuredItem
        ? (sourceIngredient as { ingredientText?: string }).ingredientText
        : (sourceIngredient as string)
    )
    const isOptional = explicitOptional || textOptional

    // Determine the ingredient's category for blocking decisions.
    // Prefer the matched inventory item's category (matched ingredient
    // means we've classified it); fall back to a recipe-supplied hint
    // (for missing ingredients we wouldn't otherwise classify).
    const matchedCategory = match.item?.category
    const hintCategory =
      isStructuredItem
        ? (sourceIngredient as { category?: ProductCategory }).category
        : undefined
    const ingredientCategory = matchedCategory ?? hintCategory
    const isNonBlocking =
      ingredientCategory !== undefined && nonBlocking.has(ingredientCategory)

    if (match.matched) {
      result.matchedIngredients++

      if (match.hasEnough === true) {
        result.haveEnough++
      } else if (match.hasEnough === null) {
        // Matched the inventory item but units can't be compared
        // (e.g., recipe wants "1 cup snap peas", inventory tracks
        // count). The user has the ingredient — we just can't verify
        // sufficiency. Treat as effectively-have for the readiness
        // counter; the cooking-block gate already does the same.
        result.haveEnough++
      } else if (match.hasEnough === false) {
        result.insufficient++
        result.insufficientItems.push(match.ingredient)
        // Insufficient still blocks unless the ingredient is optional
        // or in a non-blocking category (you can scrape by with a
        // pinch of salt). Non-blocking + insufficient = "use what
        // you've got" rather than "go shopping."
        if (!isOptional && !isNonBlocking) {
          result.canMake = false
        }
      }
    } else {
      result.missing++
      result.missingItems.push(match.ingredient)
      // Missing only blocks when the ingredient is required AND in
      // a category users actually inventory. Spices, herbs, common
      // condiments — assume the user has the staples even when the
      // tracker doesn't see them.
      if (!isOptional && !isNonBlocking) {
        result.canMake = false
      }
    }
  }

  return result
}
