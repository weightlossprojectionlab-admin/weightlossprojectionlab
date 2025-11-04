'use client'

import { useState } from 'react'
import { MealSuggestion } from '@/lib/meal-suggestions'
import { useProductMatching } from '@/hooks/useProductMatching'
import { ProductMatchesView } from './ProductMatchesView'
import { ShoppingCartIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { addManualShoppingItem } from '@/lib/shopping-operations'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

interface RecipeWithProductMatchingProps {
  recipe: MealSuggestion
  onClose?: () => void
}

export function RecipeWithProductMatching({ recipe, onClose }: RecipeWithProductMatchingProps) {
  const [showProductMatches, setShowProductMatches] = useState(false)
  const [addingToCart, setAddingToCart] = useState(false)

  // Parse ingredients for product matching
  const ingredients = recipe.ingredients.map(ing => {
    // Simple parsing - could be enhanced
    const parts = ing.split(' ')
    const quantity = parseFloat(parts[0]) || 1
    const unit = isNaN(parseFloat(parts[0])) ? undefined : parts[1]
    const name = isNaN(parseFloat(parts[0]))
      ? ing
      : parts.slice(unit ? 2 : 1).join(' ')

    return { name, quantity, unit }
  })

  const { loading, error, result } = showProductMatches
    ? useProductMatching(ingredients)
    : { loading: false, error: null, result: null }

  const handleAddToCart = async (barcode: string, ingredientName: string) => {
    const user = auth.currentUser
    if (!user) {
      toast.error('Please sign in to add items to your shopping list')
      return
    }

    setAddingToCart(true)
    try {
      await addManualShoppingItem(user.uid, {
        ingredientText: ingredientName,
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantity: 1,
        barcode
      })

      toast.success(`Added ${ingredientName} to shopping list`)
    } catch (error) {
      toast.error('Failed to add to shopping list')
    } finally {
      setAddingToCart(false)
    }
  }

  const handleAddAllToCart = async () => {
    if (!result) return

    const user = auth.currentUser
    if (!user) {
      toast.error('Please sign in to add items to your shopping list')
      return
    }

    setAddingToCart(true)
    try {
      const promises = result.matches
        .filter(match => match.matches.length > 0)
        .map(match => {
          const topMatch = match.matches[0]
          return addManualShoppingItem(user.uid, {
            ingredientText: match.ingredient,
            recipeId: recipe.id,
            recipeName: recipe.name,
            quantity: match.quantity || 1,
            barcode: topMatch.barcode
          })
        })

      await Promise.all(promises)
      toast.success(`Added ${promises.length} items to shopping list`)
    } catch (error) {
      toast.error('Failed to add items to shopping list')
    } finally {
      setAddingToCart(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Product Matching Toggle Button */}
      {!showProductMatches ? (
        <button
          onClick={() => setShowProductMatches(true)}
          className="w-full py-3 px-4 bg-gradient-to-r from-primary to-accent text-white rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center gap-2"
        >
          <SparklesIcon className="h-5 w-5" />
          <span>Find Ingredients at Local Stores</span>
        </button>
      ) : (
        <div className="space-y-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">Finding products at local stores...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Product Matches */}
          {result && !loading && (
            <>
              {/* Add All Button */}
              <div className="flex gap-2">
                <button
                  onClick={handleAddAllToCart}
                  disabled={addingToCart || result.matches.filter(m => m.matches.length > 0).length === 0}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <ShoppingCartIcon className="h-5 w-5" />
                  <span>
                    {addingToCart
                      ? 'Adding...'
                      : `Add All to Shopping List (${result.matches.filter(m => m.matches.length > 0).length})`}
                  </span>
                </button>
                <button
                  onClick={() => setShowProductMatches(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg font-medium transition-colors"
                >
                  Hide
                </button>
              </div>

              <ProductMatchesView
                ingredientMatches={result.matches}
                availabilityScore={result.availabilityScore}
                estimatedPriceRange={result.estimatedPriceRange}
                onAddToCart={handleAddToCart}
              />
            </>
          )}
        </div>
      )}
    </div>
  )
}
