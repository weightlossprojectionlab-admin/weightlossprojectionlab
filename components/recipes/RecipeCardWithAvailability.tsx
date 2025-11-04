'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { MealSuggestion } from '@/lib/meal-suggestions'
import { RecipeAvailabilityBadge } from './RecipeAvailabilityBadge'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { addManualShoppingItem } from '@/lib/shopping-operations'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface RecipeCardWithAvailabilityProps {
  recipe: MealSuggestion
  availabilityScore?: number
  ingredientsFound?: number
  totalIngredients?: number
  estimatedCostMin?: number
  estimatedCostMax?: number
  canMake?: boolean
  showAvailability?: boolean
  onAddToCart?: (recipeId: string) => void
}

export function RecipeCardWithAvailability({
  recipe,
  availabilityScore = 0,
  ingredientsFound = 0,
  totalIngredients = 0,
  estimatedCostMin,
  estimatedCostMax,
  canMake = false,
  showAvailability = true,
  onAddToCart
}: RecipeCardWithAvailabilityProps) {
  const [addingToCart, setAddingToCart] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    const user = auth.currentUser
    if (!user) {
      toast.error('Please sign in to add items to your shopping list')
      return
    }

    setAddingToCart(true)
    try {
      // Add all ingredients to shopping list
      const promises = recipe.ingredients.map(ingredient =>
        addManualShoppingItem(user.uid, ingredient, {
          recipeId: recipe.id,
          quantity: 1
        })
      )

      await Promise.all(promises)
      toast.success(`Added ${recipe.ingredients.length} ingredients to shopping list`)
      onAddToCart?.(recipe.id)
    } catch (error) {
      logger.error('Error adding recipe to cart', error as Error, { recipeId: recipe.id })
      toast.error('Failed to add ingredients to shopping list')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="group block bg-white dark:bg-gray-900 rounded-lg shadow-md hover:shadow-xl transition-all overflow-hidden border border-gray-200 dark:border-gray-700"
    >
      {/* Recipe Header */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800">
        <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 group-hover:text-primary transition-colors line-clamp-2">
          {recipe.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
          {recipe.description}
        </p>
      </div>

      {/* Availability Badges */}
      {showAvailability && availabilityScore > 0 && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
          <RecipeAvailabilityBadge
            availabilityScore={availabilityScore}
            ingredientsFound={ingredientsFound}
            totalIngredients={totalIngredients}
            estimatedCostMin={estimatedCostMin}
            estimatedCostMax={estimatedCostMax}
            canMake={canMake}
            compact={true}
          />
        </div>
      )}

      {/* Quick Stats */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{recipe.prepTime}min</span>
            </span>
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>{recipe.calories} cal</span>
            </span>
            <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{recipe.macros.protein}g protein</span>
            </span>
          </div>
        </div>

        {/* Macros Bar */}
        <div className="flex gap-2 text-xs">
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">C</span>
              <span className="text-gray-900 dark:text-gray-100">{recipe.macros.carbs}g</span>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500" style={{ width: `${(recipe.macros.carbs / (recipe.macros.carbs + recipe.macros.protein + recipe.macros.fat)) * 100}%` }}></div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">P</span>
              <span className="text-gray-900 dark:text-gray-100">{recipe.macros.protein}g</span>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-green-500" style={{ width: `${(recipe.macros.protein / (recipe.macros.carbs + recipe.macros.protein + recipe.macros.fat)) * 100}%` }}></div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">F</span>
              <span className="text-gray-900 dark:text-gray-100">{recipe.macros.fat}g</span>
            </div>
            <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${(recipe.macros.fat / (recipe.macros.carbs + recipe.macros.protein + recipe.macros.fat)) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Dietary Tags */}
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {recipe.dietaryTags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs bg-purple-100 dark:bg-purple-900/30 text-primary px-2 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {recipe.dietaryTags.length > 3 && (
              <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                +{recipe.dietaryTags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleAddToCart}
            disabled={addingToCart}
            className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2"
          >
            {addingToCart ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Adding...</span>
              </>
            ) : (
              <>
                <ShoppingCartIcon className="h-4 w-4" />
                <span>Add to Cart</span>
              </>
            )}
          </button>
          <button className="flex-1 py-2 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors text-sm">
            View Recipe
          </button>
        </div>
      </div>
    </Link>
  )
}
