'use client'

/**
 * Recipe Suggestions Component
 *
 * Suggests recipes based on expiring items to reduce waste
 * Features:
 * - Matches recipes with expiring ingredients
 * - Shows expiration urgency (days remaining)
 * - Recipe card with image and details
 * - Link to full recipe view
 * - Filters by days until expiration
 */

import { useMemo, useState } from 'react'
import { ClockIcon, FireIcon } from '@heroicons/react/24/outline'
import type { ShoppingItem } from '@/types/shopping'
import Link from 'next/link'

interface RecipeSuggestionsProps {
  items: ShoppingItem[]
  recipes?: Recipe[]
  className?: string
}

interface Recipe {
  id: string
  name: string
  imageUrl?: string
  cookTime?: number
  servings?: number
  ingredients: string[]
  category?: string
}

interface RecipeMatch {
  recipe: Recipe
  matchingItems: ShoppingItem[]
  urgency: 'critical' | 'high' | 'medium'
  daysUntilExpiry: number
}

export function RecipeSuggestions({
  items,
  recipes = DEMO_RECIPES,
  className = ''
}: RecipeSuggestionsProps) {
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all')

  /**
   * Find recipes matching expiring items
   */
  const recipeMatches = useMemo((): RecipeMatch[] => {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Get items expiring within 7 days
    const expiringItems = items.filter(item => {
      if (!item.inStock || !item.expiresAt) return false
      const expiryDate = new Date(item.expiresAt)
      return expiryDate <= sevenDaysFromNow
    })

    if (expiringItems.length === 0) return []

    // Match recipes with expiring items
    const matches: RecipeMatch[] = []

    recipes.forEach(recipe => {
      const matchingItems: ShoppingItem[] = []

      // Check if recipe ingredients match expiring items
      recipe.ingredients.forEach(ingredient => {
        const normalizedIngredient = ingredient.toLowerCase()

        expiringItems.forEach(item => {
          const normalizedProduct = item.productName.toLowerCase()

          // Simple matching: check if product name is in ingredient or vice versa
          if (
            normalizedIngredient.includes(normalizedProduct) ||
            normalizedProduct.includes(normalizedIngredient)
          ) {
            if (!matchingItems.find(m => m.id === item.id)) {
              matchingItems.push(item)
            }
          }
        })
      })

      // Only include recipes with at least 1 matching expiring item
      if (matchingItems.length > 0) {
        // Calculate urgency based on earliest expiring item
        const earliestExpiry = matchingItems.reduce((earliest, item) => {
          if (!item.expiresAt) return earliest
          const expiryDate = new Date(item.expiresAt)
          return !earliest || expiryDate < earliest ? expiryDate : earliest
        }, null as Date | null)

        if (!earliestExpiry) return

        const daysUntilExpiry = Math.ceil((earliestExpiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

        let urgency: 'critical' | 'high' | 'medium' = 'medium'
        if (daysUntilExpiry <= 1) urgency = 'critical'
        else if (daysUntilExpiry <= 3) urgency = 'high'

        matches.push({
          recipe,
          matchingItems,
          urgency,
          daysUntilExpiry: Math.max(0, daysUntilExpiry)
        })
      }
    })

    // Sort by urgency (critical first) then by number of matching items
    return matches.sort((a, b) => {
      const urgencyOrder = { critical: 3, high: 2, medium: 1 }
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[b.urgency] - urgencyOrder[a.urgency]
      }
      return b.matchingItems.length - a.matchingItems.length
    })
  }, [items, recipes])

  /**
   * Filter matches by urgency
   */
  const filteredMatches = useMemo(() => {
    if (urgencyFilter === 'all') return recipeMatches
    return recipeMatches.filter(match => match.urgency === urgencyFilter)
  }, [recipeMatches, urgencyFilter])

  /**
   * Get urgency badge color
   */
  const getUrgencyColor = (urgency: RecipeMatch['urgency']) => {
    switch (urgency) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    }
  }

  if (recipeMatches.length === 0) {
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-lg shadow p-6 text-center ${className}`}>
        <div className="text-4xl mb-3">🍽️</div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No Recipe Suggestions
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          You don't have any items expiring soon, or no recipes match your expiring ingredients.
        </p>
      </div>
    )
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Recipe Suggestions
        </h2>

        {/* Urgency Filter */}
        <select
          value={urgencyFilter}
          onChange={(e) => {
            const value = e.target.value as 'all' | 'critical' | 'high' | 'medium'
            setUrgencyFilter(value)
          }}
          className="px-3 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="all">All ({recipeMatches.length})</option>
          <option value="critical">
            Critical ({recipeMatches.filter(m => m.urgency === 'critical').length})
          </option>
          <option value="high">
            High ({recipeMatches.filter(m => m.urgency === 'high').length})
          </option>
          <option value="medium">
            Medium ({recipeMatches.filter(m => m.urgency === 'medium').length})
          </option>
        </select>
      </div>

      {/* Recipe Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMatches.map((match) => (
          <Link
            key={match.recipe.id}
            href={`/recipes/${match.recipe.id}`}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden group"
          >
            {/* Recipe Image */}
            <div className="relative h-48 bg-gray-200 dark:bg-gray-800">
              {match.recipe.imageUrl ? (
                <img
                  src={match.recipe.imageUrl}
                  alt={match.recipe.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl">
                  🍽️
                </div>
              )}

              {/* Urgency Badge */}
              <div className="absolute top-2 right-2">
                <div className={`px-2 py-1 rounded-lg text-xs font-semibold border ${getUrgencyColor(match.urgency)}`}>
                  {match.daysUntilExpiry === 0 ? 'Today' : `${match.daysUntilExpiry}d`}
                </div>
              </div>
            </div>

            {/* Recipe Info */}
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                {match.recipe.name}
              </h3>

              {/* Recipe Meta */}
              <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                {match.recipe.cookTime && (
                  <div className="flex items-center gap-1">
                    <ClockIcon className="h-4 w-4" />
                    <span>{match.recipe.cookTime}min</span>
                  </div>
                )}
                {match.recipe.servings && (
                  <div className="flex items-center gap-1">
                    <FireIcon className="h-4 w-4" />
                    <span>{match.recipe.servings} servings</span>
                  </div>
                )}
              </div>

              {/* Matching Items */}
              <div>
                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Uses {match.matchingItems.length} expiring item{match.matchingItems.length !== 1 ? 's' : ''}:
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.matchingItems.slice(0, 3).map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded"
                    >
                      {item.productName}
                    </span>
                  ))}
                  {match.matchingItems.length > 3 && (
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-xs rounded">
                      +{match.matchingItems.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/**
 * Demo recipes for testing
 * In production, these would come from the recipes database
 */
const DEMO_RECIPES: Recipe[] = [
  {
    id: 'demo-1',
    name: 'Fresh Garden Salad',
    imageUrl: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400',
    cookTime: 15,
    servings: 4,
    ingredients: ['lettuce', 'tomato', 'cucumber', 'carrots', 'bell pepper'],
    category: 'salad'
  },
  {
    id: 'demo-2',
    name: 'Chicken Stir Fry',
    imageUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400',
    cookTime: 25,
    servings: 4,
    ingredients: ['chicken', 'broccoli', 'carrots', 'bell pepper', 'soy sauce'],
    category: 'main'
  },
  {
    id: 'demo-3',
    name: 'Berry Smoothie Bowl',
    imageUrl: 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400',
    cookTime: 10,
    servings: 2,
    ingredients: ['strawberries', 'blueberries', 'banana', 'yogurt', 'milk'],
    category: 'breakfast'
  },
  {
    id: 'demo-4',
    name: 'Vegetable Soup',
    imageUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400',
    cookTime: 40,
    servings: 6,
    ingredients: ['carrots', 'celery', 'onion', 'tomato', 'potatoes'],
    category: 'soup'
  },
  {
    id: 'demo-5',
    name: 'Cheese Omelette',
    imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?w=400',
    cookTime: 10,
    servings: 1,
    ingredients: ['eggs', 'cheese', 'milk', 'butter'],
    category: 'breakfast'
  }
]
