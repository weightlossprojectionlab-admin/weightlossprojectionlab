'use client'

/**
 * Recipe Links Component
 *
 * Displays recipe badges for ingredients that are used in multiple recipes.
 * Shows primary recipe + expandable list of additional recipes.
 * Makes recipe names clickable to open recipe modal.
 */

import { useState, useEffect } from 'react'
import { collection, doc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MealSuggestion } from '@/lib/meal-suggestions'
import { logger } from '@/lib/logger'

interface RecipeLinksProps {
  recipeIds?: string[]
  primaryRecipeId?: string
  onRecipeClick?: (recipeId: string, recipeName: string) => void
  compact?: boolean // Compact mode for smaller displays
}

export function RecipeLinks({
  recipeIds = [],
  primaryRecipeId,
  onRecipeClick,
  compact = false
}: RecipeLinksProps) {
  const [recipes, setRecipes] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  // Load recipe names from Firestore
  useEffect(() => {
    async function loadRecipeNames() {
      if (recipeIds.length === 0) {
        setLoading(false)
        return
      }

      try {
        const recipeMap = new Map<string, string>()

        // Load all recipe names in parallel
        const promises = recipeIds.map(async (id) => {
          try {
            const recipeDoc = await getDoc(doc(db, 'recipes', id))
            if (recipeDoc.exists()) {
              const data = recipeDoc.data() as MealSuggestion
              recipeMap.set(id, data.name || 'Unknown Recipe')
            } else {
              recipeMap.set(id, 'Unknown Recipe')
            }
          } catch (error) {
            logger.error('[RecipeLinks] Error loading recipe', error as Error, { recipeId: id })
            recipeMap.set(id, 'Unknown Recipe')
          }
        })

        await Promise.all(promises)
        setRecipes(recipeMap)
      } catch (error) {
        logger.error('[RecipeLinks] Error loading recipe names', error as Error)
      } finally {
        setLoading(false)
      }
    }

    loadRecipeNames()
  }, [recipeIds])

  // No recipes linked
  if (!recipeIds || recipeIds.length === 0) {
    return null
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
        <span className="animate-pulse">🍳</span>
        <span>Loading recipes...</span>
      </div>
    )
  }

  // Get primary recipe name
  const primaryRecipe = primaryRecipeId ? recipes.get(primaryRecipeId) : null
  const additionalRecipes = recipeIds.filter(id => id !== primaryRecipeId)
  const additionalCount = additionalRecipes.length

  // Compact mode - just show icon + count
  if (compact) {
    return (
      <button
        onClick={(e) => {
          e.stopPropagation()
          setExpanded(!expanded)
        }}
        className="flex items-center gap-1 text-xs px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
      >
        <span>🍳</span>
        <span className="font-medium">{recipeIds.length} recipe{recipeIds.length > 1 ? 's' : ''}</span>
      </button>
    )
  }

  return (
    <div className="text-xs space-y-1">
      {/* Primary Recipe */}
      {primaryRecipe && (
        <div className="flex items-center gap-1.5">
          <span>🍳</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              if (onRecipeClick && primaryRecipeId) {
                onRecipeClick(primaryRecipeId, primaryRecipe)
              }
            }}
            className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:underline font-medium transition-colors"
          >
            {primaryRecipe}
          </button>
          {additionalCount > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                setExpanded(!expanded)
              }}
              className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full hover:bg-purple-200 dark:hover:bg-purple-900/40 font-medium transition-colors"
            >
              +{additionalCount} more
            </button>
          )}
        </div>
      )}

      {/* No Primary Recipe - Show count */}
      {!primaryRecipe && recipeIds.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
          className="flex items-center gap-1.5 text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 transition-colors"
        >
          <span>🍳</span>
          <span className="font-medium">Used in {recipeIds.length} recipe{recipeIds.length > 1 ? 's' : ''}</span>
        </button>
      )}

      {/* Expanded - Show all additional recipes */}
      {expanded && additionalRecipes.length > 0 && (
        <div className="pl-5 space-y-1 mt-1">
          {additionalRecipes.map((recipeId) => {
            const recipeName = recipes.get(recipeId) || 'Unknown Recipe'
            return (
              <button
                key={recipeId}
                onClick={(e) => {
                  e.stopPropagation()
                  if (onRecipeClick) {
                    onRecipeClick(recipeId, recipeName)
                  }
                }}
                className="block text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-100 hover:underline transition-colors"
              >
                • {recipeName}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
