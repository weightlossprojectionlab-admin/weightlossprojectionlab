/**
 * Recipe Scaler
 *
 * Scales recipes by serving size, including ingredients, macros, and calories.
 */

import { MealSuggestion } from './meal-suggestions'
import { scaleIngredients } from './ingredient-parser'

export interface ScaledRecipe extends Omit<MealSuggestion, 'servingSize' | 'calories' | 'macros' | 'ingredients'> {
  servingSize: number
  originalServingSize: number
  scaledCalories: number
  scaledMacros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  scaledIngredients: string[]
  scalingMultiplier: number
}

/**
 * Scale a recipe to a new serving size
 */
export function scaleRecipe(
  recipe: MealSuggestion,
  newServingSize: number
): ScaledRecipe {
  const originalServingSize = recipe.servingSize
  const multiplier = newServingSize / originalServingSize

  // Scale ingredients
  const scaledIngredients = scaleIngredients(recipe.ingredients, multiplier)

  // Scale macros (round to 1 decimal)
  const scaledMacros = {
    protein: Math.round(recipe.macros.protein * multiplier * 10) / 10,
    carbs: Math.round(recipe.macros.carbs * multiplier * 10) / 10,
    fat: Math.round(recipe.macros.fat * multiplier * 10) / 10,
    fiber: Math.round(recipe.macros.fiber * multiplier * 10) / 10
  }

  // Scale calories (round to nearest integer)
  const scaledCalories = Math.round(recipe.calories * multiplier)

  return {
    ...recipe,
    servingSize: newServingSize,
    originalServingSize,
    scaledCalories,
    scaledMacros,
    scaledIngredients,
    scalingMultiplier: multiplier
  }
}

/**
 * Get per-serving nutrition info from a scaled recipe
 */
export function getPerServingNutrition(scaledRecipe: ScaledRecipe) {
  return {
    calories: Math.round(scaledRecipe.scaledCalories / scaledRecipe.servingSize),
    macros: {
      protein: Math.round(scaledRecipe.scaledMacros.protein / scaledRecipe.servingSize * 10) / 10,
      carbs: Math.round(scaledRecipe.scaledMacros.carbs / scaledRecipe.servingSize * 10) / 10,
      fat: Math.round(scaledRecipe.scaledMacros.fat / scaledRecipe.servingSize * 10) / 10,
      fiber: Math.round(scaledRecipe.scaledMacros.fiber / scaledRecipe.servingSize * 10) / 10
    }
  }
}

/**
 * Calculate prep time adjustment based on serving size
 * Larger batches don't scale linearly - cooking time increases less than serving size
 */
export function calculateAdjustedPrepTime(
  originalPrepTime: number,
  originalServingSize: number,
  newServingSize: number
): number {
  if (newServingSize === originalServingSize) {
    return originalPrepTime
  }

  const multiplier = newServingSize / originalServingSize

  // Use logarithmic scaling for prep time
  // 2x servings ≈ 1.3x time, 4x servings ≈ 1.6x time
  const timeMultiplier = 1 + (Math.log2(multiplier) * 0.3)

  return Math.round(originalPrepTime * timeMultiplier)
}
