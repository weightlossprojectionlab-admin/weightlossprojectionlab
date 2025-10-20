/**
 * Meal Context Utilities
 *
 * Determines the next meal to log based on time of day and already-logged meals.
 * Provides contextual recommendations for meal logging with personalized suggestions.
 */

import { getMealSuggestions, type MealSuggestion } from './meal-suggestions'

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface MealLog {
  mealType: MealType
  totalCalories?: number
}

interface UserPreferences {
  dietaryPreferences?: string[]
  foodAllergies?: string[]
}

interface MealContext {
  nextMealType: MealType
  nextMealLabel: string
  message: string
  remainingCalories: number
  isFirstMeal: boolean
  suggestions: MealSuggestion[]
}

/**
 * Get the current hour in 24-hour format
 */
function getCurrentHour(): number {
  return new Date().getHours()
}

/**
 * Determine which meal types have been logged today
 */
function getLoggedMealTypes(todayMeals: MealLog[]): Set<MealType> {
  return new Set(todayMeals.map(meal => meal.mealType))
}

/**
 * Determine the next meal to log based on time of day
 */
function getMealTypeByTime(hour: number): MealType {
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 20) return 'dinner'
  return 'snack'
}

/**
 * Get contextual information about the next meal to log with personalized suggestions
 */
export function getNextMealContext(
  todayMeals: MealLog[],
  goalCalories: number,
  userPreferences?: UserPreferences,
  userId?: string
): MealContext {
  const currentHour = getCurrentHour()
  const loggedMealTypes = getLoggedMealTypes(todayMeals)
  const consumedCalories = todayMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0)
  const remainingCalories = Math.max(0, goalCalories - consumedCalories)
  const isFirstMeal = todayMeals.length === 0

  // Determine next meal type
  let nextMealType: MealType
  let nextMealLabel: string
  let message: string

  // If no meals logged, suggest based on time
  if (isFirstMeal) {
    nextMealType = getMealTypeByTime(currentHour)
    nextMealLabel = nextMealType.charAt(0).toUpperCase() + nextMealType.slice(1)

    if (nextMealType === 'breakfast') {
      message = "Start your day! Log your breakfast to begin tracking."
    } else if (nextMealType === 'lunch') {
      message = "Time for lunch! Log your meal to start tracking today."
    } else if (nextMealType === 'dinner') {
      message = "Evening meal time! Log your dinner to start tracking."
    } else {
      message = "Log your meal to start tracking today."
    }

    // Generate suggestions for first meal
    const suggestions = getMealSuggestions({
      mealType: nextMealType,
      calorieMax: goalCalories * 0.4, // First meal should be ~40% or less of daily budget
      dietaryPreferences: userPreferences?.dietaryPreferences,
      allergies: userPreferences?.foodAllergies,
      maxResults: 3,
      userId: userId
    })

    return { nextMealType, nextMealLabel, message, remainingCalories, isFirstMeal, suggestions }
  }

  // Check what hasn't been logged yet based on time of day
  if (currentHour < 11 && !loggedMealTypes.has('breakfast')) {
    nextMealType = 'breakfast'
    nextMealLabel = 'Breakfast'
    message = `Time for breakfast! You have ${remainingCalories.toFixed(0)} cal remaining today.`
  } else if (currentHour >= 11 && currentHour < 15 && !loggedMealTypes.has('lunch')) {
    nextMealType = 'lunch'
    nextMealLabel = 'Lunch'
    message = `Ready for lunch? You have ${remainingCalories.toFixed(0)} cal remaining.`
  } else if (currentHour >= 15 && currentHour < 20 && !loggedMealTypes.has('dinner')) {
    nextMealType = 'dinner'
    nextMealLabel = 'Dinner'
    message = `Time for dinner! You have ${remainingCalories.toFixed(0)} cal remaining.`
  } else {
    // All main meals logged or outside meal times - suggest snack or next meal
    const missingMeals: MealType[] = []
    if (!loggedMealTypes.has('breakfast')) missingMeals.push('breakfast')
    if (!loggedMealTypes.has('lunch')) missingMeals.push('lunch')
    if (!loggedMealTypes.has('dinner')) missingMeals.push('dinner')

    if (missingMeals.length > 0) {
      // Suggest first missing meal
      nextMealType = missingMeals[0]
      nextMealLabel = nextMealType.charAt(0).toUpperCase() + nextMealType.slice(1)
      message = `Haven't logged ${nextMealType} yet? Log it now.`
    } else {
      // All meals logged - suggest snack
      nextMealType = 'snack'
      nextMealLabel = 'Snack'
      if (remainingCalories > 100) {
        message = `Room for a snack! You have ${remainingCalories.toFixed(0)} cal remaining.`
      } else {
        message = "Log any additional snacks or drinks."
      }
    }
  }

  // Generate personalized meal suggestions
  const suggestions = getMealSuggestions({
    mealType: nextMealType,
    calorieMin: Math.max(0, remainingCalories * 0.2), // At least 20% of remaining budget
    calorieMax: Math.min(remainingCalories * 1.2, remainingCalories + 200), // Allow 20% over or +200 cal buffer
    dietaryPreferences: userPreferences?.dietaryPreferences,
    allergies: userPreferences?.foodAllergies,
    maxResults: 3,
    userId: userId
  })

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
