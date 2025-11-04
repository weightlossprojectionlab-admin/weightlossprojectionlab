'use client'

import { useState, useMemo } from 'react'
import type { MealSuggestion } from '@/lib/meal-suggestions'
import { useRecipeAvailability } from '@/hooks/useRecipeAvailability'
import { RecipeCardWithAvailability } from './RecipeCardWithAvailability'
import { CheckCircleIcon, FunnelIcon } from '@heroicons/react/24/outline'

interface RecipeGridWithAvailabilityProps {
  recipes: MealSuggestion[]
  showAvailability?: boolean
}

export function RecipeGridWithAvailability({
  recipes,
  showAvailability = true
}: RecipeGridWithAvailabilityProps) {
  const [showReadyOnly, setShowReadyOnly] = useState(false)
  const [sortBy, setSortBy] = useState<'default' | 'availability' | 'price'>('default')

  // Fetch availability for all recipes
  const { availability, loading } = showAvailability
    ? useRecipeAvailability(recipes)
    : { availability: new Map(), loading: false }

  // Filter and sort recipes
  const displayedRecipes = useMemo(() => {
    let filtered = [...recipes]

    // Filter by "Ready to Cook"
    if (showReadyOnly && availability.size > 0) {
      filtered = filtered.filter(recipe => {
        const avail = availability.get(recipe.id)
        return avail?.canMake
      })
    }

    // Sort recipes
    if (sortBy === 'availability' && availability.size > 0) {
      filtered.sort((a, b) => {
        const availA = availability.get(a.id)?.availabilityScore || 0
        const availB = availability.get(b.id)?.availabilityScore || 0
        return availB - availA
      })
    } else if (sortBy === 'price' && availability.size > 0) {
      filtered.sort((a, b) => {
        const costA = availability.get(a.id)?.estimatedCostMin || Infinity
        const costB = availability.get(b.id)?.estimatedCostMin || Infinity
        return costA - costB
      })
    }

    return filtered
  }, [recipes, showReadyOnly, sortBy, availability])

  const readyToCookCount = useMemo(() => {
    return Array.from(availability.values()).filter(a => a.canMake).length
  }, [availability])

  return (
    <div>
      {/* Filters */}
      {showAvailability && (
        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white dark:bg-gray-900 rounded-lg shadow p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-4 flex-wrap">
            {/* Ready to Cook Filter */}
            <button
              onClick={() => setShowReadyOnly(!showReadyOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                showReadyOnly
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-700'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              disabled={loading}
            >
              <CheckCircleIcon className="h-4 w-4" />
              <span>Ready to Cook</span>
              {!loading && readyToCookCount > 0 && (
                <span className="bg-green-600 dark:bg-green-500 text-white px-2 py-0.5 rounded-full text-xs font-bold">
                  {readyToCookCount}
                </span>
              )}
            </button>

            {/* Sort Options */}
            <div className="flex items-center gap-2">
              <FunnelIcon className="h-4 w-4 text-gray-500" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                disabled={loading}
              >
                <option value="default">Default Order</option>
                <option value="availability">Most Available</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>
          </div>

          {/* Status */}
          {loading && (
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span>Checking product availability...</span>
            </div>
          )}
        </div>
      )}

      {/* Recipe Grid */}
      {loading && recipes.length > 0 && availability.size === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <RecipeCardWithAvailability
              key={recipe.id}
              recipe={recipe}
              showAvailability={false}
            />
          ))}
        </div>
      ) : displayedRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedRecipes.map(recipe => {
            const avail = availability.get(recipe.id)
            return (
              <RecipeCardWithAvailability
                key={recipe.id}
                recipe={recipe}
                availabilityScore={avail?.availabilityScore}
                ingredientsFound={avail?.ingredientsFound}
                totalIngredients={avail?.totalIngredients}
                estimatedCostMin={avail?.estimatedCostMin}
                estimatedCostMax={avail?.estimatedCostMax}
                canMake={avail?.canMake}
                showAvailability={showAvailability}
              />
            )
          })}
        </div>
      ) : (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <CheckCircleIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            {showReadyOnly ? 'No Ready-to-Cook Recipes' : 'No Recipes Found'}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {showReadyOnly
              ? 'Try adjusting your filters or shop for more ingredients to unlock recipes.'
              : 'Try different search or filter criteria.'}
          </p>
          {showReadyOnly && (
            <button
              onClick={() => setShowReadyOnly(false)}
              className="mt-4 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
            >
              Show All Recipes
            </button>
          )}
        </div>
      )}
    </div>
  )
}
