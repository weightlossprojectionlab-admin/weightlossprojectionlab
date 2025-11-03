/**
 * Meal Context Utilities
 *
 * Determines the next meal to log based on user's personalized meal schedule or time of day.
 * Provides contextual recommendations for meal logging with personalized suggestions.
 * Now with inventory-aware recipe suggestions!
 */

import { getMealSuggestions, type MealSuggestion } from './meal-suggestions'
import { checkIngredientsWithQuantities } from './ingredient-matcher'
import type { ShoppingItem } from '@/types/shopping'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface MealLog {
  mealType: MealType
  totalCalories?: number
}

interface MealSchedule {
  breakfastTime: string  // e.g., "07:00"
  lunchTime: string      // e.g., "12:00"
  dinnerTime: string     // e.g., "18:00"
  hasSnacks: boolean
  snackWindows?: string[]
}

interface UserPreferences {
  dietaryPreferences?: string[]
  foodAllergies?: string[]
  mealSchedule?: MealSchedule
}

interface MealContext {
  nextMealType: MealType
  nextMealLabel: string
  message: string
  remainingCalories: number
  isFirstMeal: boolean
  suggestions: MealSuggestion[]
}

interface InventoryStatus {
  hasAllIngredients: boolean
  availableCount: number
  totalCount: number
  matchPercentage: number
  missingIngredients: string[]
}

/**
 * Get the current hour in 24-hour format
 */
function getCurrentHour(): number {
  return new Date().getHours()
}

/**
 * Get current hour and minutes as decimal (e.g., 14:30 = 14.5)
 */
function getCurrentTimeDecimal(): number {
  const now = new Date()
  return now.getHours() + (now.getMinutes() / 60)
}

/**
 * Convert time string to decimal hours (e.g., "14:30" = 14.5)
 */
function timeStringToDecimal(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + (minutes / 60)
}

/**
 * Determine which meal types have been logged today
 */
function getLoggedMealTypes(todayMeals: MealLog[]): Set<MealType> {
  return new Set(todayMeals.map(meal => meal.mealType))
}

/**
 * Determine the next meal to log based on time of day (fallback when no meal schedule)
 */
function getMealTypeByTime(hour: number): MealType {
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'  // Extended to 9 PM
  return 'snack'
}

/**
 * Determine next meal based on user's personalized schedule
 */
function getMealTypeBySchedule(currentTime: number, mealSchedule: MealSchedule, loggedMealTypes: Set<MealType>): {
  mealType: MealType
  reason: 'in-window' | 'missed' | 'late' | 'snack'
} {
  const breakfastTime = timeStringToDecimal(mealSchedule.breakfastTime)
  const lunchTime = timeStringToDecimal(mealSchedule.lunchTime)
  const dinnerTime = timeStringToDecimal(mealSchedule.dinnerTime)

  // Define meal windows (±2 hours)
  const WINDOW = 2

  const breakfastWindow = { start: breakfastTime - WINDOW, end: breakfastTime + WINDOW }
  const lunchWindow = { start: lunchTime - WINDOW, end: lunchTime + WINDOW }
  const dinnerWindow = { start: dinnerTime - WINDOW, end: dinnerTime + WINDOW }

  // Check if we're in a meal window
  if (currentTime >= breakfastWindow.start && currentTime <= breakfastWindow.end && !loggedMealTypes.has('breakfast')) {
    return { mealType: 'breakfast', reason: 'in-window' }
  }
  if (currentTime >= lunchWindow.start && currentTime <= lunchWindow.end && !loggedMealTypes.has('lunch')) {
    return { mealType: 'lunch', reason: 'in-window' }
  }
  if (currentTime >= dinnerWindow.start && currentTime <= dinnerWindow.end && !loggedMealTypes.has('dinner')) {
    return { mealType: 'dinner', reason: 'in-window' }
  }

  // After dinner window closes (past dinner + 2 hours)
  if (currentTime > dinnerWindow.end) {
    // If dinner not logged, still suggest it (late dinner)
    if (!loggedMealTypes.has('dinner')) {
      return { mealType: 'dinner', reason: 'late' }
    }
    // All main meals done, suggest snack
    return { mealType: 'snack', reason: 'snack' }
  }

  // Between windows - suggest next upcoming meal if not logged
  if (currentTime < lunchWindow.start && !loggedMealTypes.has('breakfast')) {
    return { mealType: 'breakfast', reason: 'missed' }
  }
  if (currentTime < dinnerWindow.start && !loggedMealTypes.has('lunch')) {
    return { mealType: 'lunch', reason: 'missed' }
  }
  if (!loggedMealTypes.has('dinner')) {
    return { mealType: 'dinner', reason: 'missed' }
  }

  // Default to snack
  return { mealType: 'snack', reason: 'snack' }
}

/**
 * Check ingredient availability for a recipe against inventory
 */
function checkRecipeInventoryStatus(
  recipe: MealSuggestion,
  inventoryItems: ShoppingItem[]
): InventoryStatus {
  if (!recipe.ingredients || recipe.ingredients.length === 0) {
    return {
      hasAllIngredients: false,
      availableCount: 0,
      totalCount: 0,
      matchPercentage: 0,
      missingIngredients: []
    }
  }

  const results = checkIngredientsWithQuantities(
    recipe.ingredients,
    inventoryItems
  )

  const availableCount = results.filter(r =>
    r.matched && r.hasEnough === true
  ).length

  const totalCount = recipe.ingredients.length
  const matchPercentage = (availableCount / totalCount) * 100

  const missingIngredients = results
    .filter(r => !r.matched || r.hasEnough === false)
    .map(r => r.ingredient)

  return {
    hasAllIngredients: matchPercentage === 100,
    availableCount,
    totalCount,
    matchPercentage,
    missingIngredients
  }
}

/**
 * Get contextual information about the next meal to log with personalized suggestions
 */
export function getNextMealContext(
  todayMeals: MealLog[],
  goalCalories: number,
  userPreferences?: UserPreferences,
  userId?: string,
  recipes?: MealSuggestion[], // Optional: use custom recipe array (e.g., with Firestore media)
  inventoryItems?: ShoppingItem[] // Optional: check ingredient availability
): MealContext {
  const currentHour = getCurrentHour()
  const currentTime = getCurrentTimeDecimal()
  const loggedMealTypes = getLoggedMealTypes(todayMeals)
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0)
  const remainingCalories = Math.max(0, goalCalories - consumedCalories)
  const isFirstMeal = todayMeals.length === 0

  // Determine next meal type
  let nextMealType: MealType
  let nextMealLabel: string
  let message: string
  let mealReason: 'in-window' | 'missed' | 'late' | 'snack' | 'default' = 'default'

  // Use personalized meal schedule if available
  if (userPreferences?.mealSchedule) {
    const result = getMealTypeBySchedule(currentTime, userPreferences.mealSchedule, loggedMealTypes)
    nextMealType = result.mealType
    mealReason = result.reason
  } else {
    // Fallback to time-based detection
    nextMealType = getMealTypeByTime(currentHour)
  }

  nextMealLabel = nextMealType.charAt(0).toUpperCase() + nextMealType.slice(1)

  // Generate contextual message based on reason and state
  if (isFirstMeal) {
    if (nextMealType === 'breakfast') {
      message = "Start your day! Log your breakfast to begin tracking."
    } else if (nextMealType === 'lunch') {
      message = "Time for lunch! Log your meal to start tracking today."
    } else if (nextMealType === 'dinner') {
      message = "Evening meal time! Log your dinner to start tracking."
    } else {
      message = "Log your meal to start tracking today."
    }
  } else {
    // Generate smart messages based on meal reason
    const schedule = userPreferences?.mealSchedule
    if (mealReason === 'in-window' && schedule) {
      const mealTime = schedule[`${nextMealType}Time` as keyof MealSchedule] as string
      message = `Time for ${nextMealType}! (You usually eat at ${mealTime})`
    } else if (mealReason === 'late' && schedule) {
      const mealTime = schedule[`${nextMealType}Time` as keyof MealSchedule] as string
      message = `Running late on ${nextMealType}? You usually eat at ${mealTime}. Ready to log?`
    } else if (mealReason === 'missed') {
      message = `Haven't logged ${nextMealType} yet? Log it now.`
    } else if (mealReason === 'snack') {
      if (remainingCalories > 100) {
        message = `Room for a snack! You have ${remainingCalories.toFixed(0)} cal remaining.`
      } else {
        message = "Log any additional snacks or drinks."
      }
    } else {
      // Default messages
      if (!loggedMealTypes.has(nextMealType) && nextMealType !== 'snack') {
        message = `Ready for ${nextMealType}? You have ${remainingCalories.toFixed(0)} cal remaining.`
      } else if (nextMealType === 'snack') {
        message = `Room for a snack! You have ${remainingCalories.toFixed(0)} cal remaining.`
      } else {
        message = `Log your ${nextMealType}! You have ${remainingCalories.toFixed(0)} cal remaining.`
      }
    }
  }

  // Generate personalized meal suggestions
  let suggestions = getMealSuggestions({
    mealType: nextMealType,
    calorieMin: isFirstMeal ? 0 : Math.max(0, remainingCalories * 0.2),
    calorieMax: isFirstMeal ? goalCalories * 0.4 : Math.min(remainingCalories * 1.2, remainingCalories + 200),
    dietaryPreferences: userPreferences?.dietaryPreferences,
    allergies: userPreferences?.foodAllergies,
    maxResults: 3,
    userId: userId,
    recipes: recipes // Pass through custom recipes (with media) if provided
  })

  // If inventory provided, check ingredient availability for each suggestion
  if (inventoryItems && inventoryItems.length > 0) {
    suggestions = suggestions.map(suggestion => ({
      ...suggestion,
      inventoryStatus: checkRecipeInventoryStatus(suggestion, inventoryItems)
    }))

    // Sort by match percentage (recipes user can make NOW appear first!)
    suggestions.sort((a, b) => {
      const aMatch = a.inventoryStatus?.matchPercentage || 0
      const bMatch = b.inventoryStatus?.matchPercentage || 0
      return bMatch - aMatch // Descending order
    })
  }

  return { nextMealType, nextMealLabel, message, remainingCalories, isFirstMeal, suggestions }
}

/**
 * Generate a contextual CTA for meal logging
 */
export function getMealCTA(context: MealContext): string {
  if (context.isFirstMeal) {
    return `Log ${context.nextMealLabel}`
  }

  if (context.remainingCalories > 100) {
    return `Log ${context.nextMealLabel} (${context.remainingCalories.toFixed(0)} cal left)`
  }

  return `Log ${context.nextMealLabel}`
}
