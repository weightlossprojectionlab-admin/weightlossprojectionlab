/**
 * Inventory-Based Recipe Generator
 *
 * Generates NEW recipes dynamically from on-hand kitchen inventory
 * No external AI - uses inventory data as the intelligence source
 */

import type { ShoppingItem } from '@/types/shopping'
import type { MealSuggestion, MealType } from '@/lib/meal-suggestions'

interface RecipeGenerationOptions {
  mealType: MealType
  minIngredients?: number
  maxIngredients?: number
  preferExpiring?: boolean
}

// Cooking method templates
const COOKING_METHODS = [
  { method: 'sauté', temp: 'medium-high', time: '5-7 minutes', equipment: 'skillet' },
  { method: 'roast', temp: '400°F', time: '20-25 minutes', equipment: 'oven' },
  { method: 'simmer', temp: 'low', time: '15-20 minutes', equipment: 'pot' },
  { method: 'stir-fry', temp: 'high', time: '8-10 minutes', equipment: 'wok or large skillet' },
  { method: 'bake', temp: '350°F', time: '25-30 minutes', equipment: 'oven' },
  { method: 'grill', temp: 'medium-high', time: '10-15 minutes', equipment: 'grill or grill pan' },
]

// Recipe name generators based on ingredients
function generateRecipeName(ingredients: ShoppingItem[]): string {
  const categories = ingredients.map(i => i.category).filter(Boolean)
  const uniqueCategories = [...new Set(categories)]

  // Find the "star" ingredient (protein or main)
  const protein = ingredients.find(i =>
    ['meat', 'dairy', 'protein'].includes(i.category?.toLowerCase() || '')
  )
  const veggie = ingredients.find(i =>
    i.category?.toLowerCase().includes('produce') ||
    i.category?.toLowerCase().includes('vegetable')
  )

  if (protein && veggie) {
    return `${protein.productName} with ${veggie.productName}`
  } else if (protein) {
    return `${protein.productName} Delight`
  } else if (veggie) {
    return `Fresh ${veggie.productName} Bowl`
  } else {
    return `Kitchen Inventory ${uniqueCategories[0] || 'Mix'}`
  }
}

// Generate cooking instructions from ingredients
function generateInstructions(ingredients: ShoppingItem[], cookingMethod: typeof COOKING_METHODS[0]): string[] {
  const instructions: string[] = []

  // Prep step
  const prepItems = ingredients.map(i => i.productName.toLowerCase()).join(', ')
  instructions.push(`Prepare ingredients: wash and chop ${prepItems} as needed.`)

  // Cooking steps based on method
  if (cookingMethod.equipment.includes('oven')) {
    instructions.push(`Preheat ${cookingMethod.equipment} to ${cookingMethod.temp}.`)
  }

  instructions.push(`Heat ${cookingMethod.equipment} over ${cookingMethod.temp} heat.`)

  // Main cooking
  const mainIngredient = ingredients[0]?.productName || 'ingredients'
  instructions.push(`${cookingMethod.method.charAt(0).toUpperCase() + cookingMethod.method.slice(1)} ${mainIngredient} for ${cookingMethod.time}.`)

  // Combine
  if (ingredients.length > 1) {
    const remaining = ingredients.slice(1).map(i => i.productName.toLowerCase()).join(', ')
    instructions.push(`Add ${remaining} and continue cooking for another 5 minutes until well combined.`)
  }

  instructions.push('Season to taste and serve hot.')

  return instructions
}

// Estimate nutritional values based on ingredient categories or actual nutrition data
function estimateNutrition(ingredients: ShoppingItem[]): {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
} {
  let calories = 0
  let protein = 0
  let carbs = 0
  let fat = 0
  let fiber = 0

  ingredients.forEach(item => {
    // If we have actual nutrition data from product_database, use it!
    if (item.nutrition) {
      calories += item.nutrition.calories || 0
      protein += item.nutrition.protein || 0
      carbs += item.nutrition.carbs || 0
      fat += item.nutrition.fat || 0
      fiber += item.nutrition.fiber || 0
      return
    }

    // Otherwise fall back to category-based estimates
    const category = item.category?.toLowerCase() || ''

    // Rough estimates by category
    if (category.includes('meat') || category.includes('protein')) {
      calories += 200
      protein += 25
      fat += 10
    } else if (category.includes('dairy')) {
      calories += 150
      protein += 8
      carbs += 12
      fat += 8
    } else if (category.includes('produce') || category.includes('vegetable')) {
      calories += 50
      carbs += 10
      fiber += 3
    } else if (category.includes('grain') || category.includes('bread')) {
      calories += 150
      carbs += 30
      fiber += 3
    } else if (category.includes('snack') || category.includes('pantry')) {
      calories += 100
      carbs += 15
      fat += 5
    } else {
      // Generic estimate
      calories += 80
      carbs += 15
    }
  })

  return { calories, protein, carbs, fat, fiber }
}

// Generate difficulty based on number of ingredients and cooking method
function estimateDifficulty(ingredientCount: number, cookingMethod: string): 'easy' | 'medium' | 'hard' {
  if (ingredientCount <= 3 && ['sauté', 'simmer'].includes(cookingMethod)) return 'easy'
  if (ingredientCount <= 5) return 'medium'
  return 'hard'
}

// Determine dietary tags from ingredients
function determineDietaryTags(ingredients: ShoppingItem[]): string[] {
  const tags: string[] = []
  const categories = ingredients.map(i => i.category?.toLowerCase() || '')

  const hasMeat = categories.some(c => c.includes('meat'))
  const hasDairy = categories.some(c => c.includes('dairy'))
  const hasGluten = categories.some(c => c.includes('bread') || c.includes('grain'))

  if (!hasMeat) tags.push('vegetarian')
  if (!hasMeat && !hasDairy) tags.push('vegan')
  if (!hasGluten) tags.push('gluten-free')

  // Add based on nutrition
  const nutrition = estimateNutrition(ingredients)
  if (nutrition.protein > 25) tags.push('high-protein')
  if (nutrition.fiber > 8) tags.push('high-fiber')
  if (nutrition.calories < 400) tags.push('low-calorie')

  return tags
}

/**
 * Generate a new recipe from on-hand inventory items
 * This is our "AI" - using the inventory data itself to create recipes
 */
export function generateRecipeFromInventory(
  inventory: ShoppingItem[],
  options: RecipeGenerationOptions
): MealSuggestion | null {
  // Filter to in-stock items only
  const availableItems = inventory.filter(i => i.inStock)

  if (availableItems.length === 0) {
    return null
  }

  // Prioritize expiring items if requested
  let selectedItems = availableItems
  if (options.preferExpiring) {
    const expiringItems = availableItems.filter(item => {
      if (!item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      return expiryDate <= sevenDaysFromNow
    })

    // Use expiring items first, fill with regular items if needed
    if (expiringItems.length > 0) {
      selectedItems = [
        ...expiringItems,
        ...availableItems.filter(item => !expiringItems.includes(item))
      ]
    }
  }

  // Select ingredients for recipe (3-6 items)
  const minIngredients = options.minIngredients || 3
  const maxIngredients = Math.min(options.maxIngredients || 6, selectedItems.length)
  const ingredientCount = Math.floor(Math.random() * (maxIngredients - minIngredients + 1)) + minIngredients
  const recipeIngredients = selectedItems.slice(0, ingredientCount)

  // Select cooking method
  const cookingMethod = COOKING_METHODS[Math.floor(Math.random() * COOKING_METHODS.length)]

  // Generate recipe components
  const name = generateRecipeName(recipeIngredients)
  const instructions = generateInstructions(recipeIngredients, cookingMethod)
  const nutrition = estimateNutrition(recipeIngredients)

  // Validate nutrition data
  if (!nutrition || typeof nutrition.calories !== 'number' || isNaN(nutrition.calories)) {
    console.warn('[Inventory Recipe Generator] Invalid nutrition data:', nutrition)
    // Provide safe defaults
    nutrition.calories = nutrition?.calories || 0
    nutrition.protein = nutrition?.protein || 0
    nutrition.carbs = nutrition?.carbs || 0
    nutrition.fat = nutrition?.fat || 0
    nutrition.fiber = nutrition?.fiber || 0
  }

  const difficulty = estimateDifficulty(recipeIngredients.length, cookingMethod.method)
  const dietaryTags = determineDietaryTags(recipeIngredients) as any

  // Build ingredient list with quantities
  const ingredientsList = recipeIngredients.map(item => {
    const quantity = item.quantity || 1
    const unit = item.unit || 'piece'
    return `${quantity} ${unit} ${item.productName}`
  })

  // Create the recipe
  const recipe: MealSuggestion = {
    id: `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    mealType: options.mealType,
    calories: nutrition.calories,
    macros: {
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sodium: 500 // Default estimate
    },
    ingredients: ingredientsList
  } as MealSuggestion

  return recipe
}
