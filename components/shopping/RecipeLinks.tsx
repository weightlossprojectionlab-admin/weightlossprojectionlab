'use client'

/**
 * Recipe Links Component
 *
 * Displays recipe badges for ingredients that are used in multiple recipes.
 * Shows primary recipe + expandable list of additional recipes.
 * Makes recipe names clickable to open recipe modal.
 */

import { useState } from 'react'
import { useRecipeNames } from '@/hooks/useRecipeNames'

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
  const { names, isLoading, error } = useRecipeNames(recipeIds)
  const [expanded, setExpanded] = useState(false)

  // No recipes linked
  if (!recipeIds || recipeIds.length === 0) {
    return null
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-500">
        <span className="animate-pulse">🍳</span>
        <span>Loading recipes...</span>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
        <span>⚠️</span>
        <span>Failed to load recipes</span>
      </div>
    )
  }

  // Get primary recipe name
  const primaryRecipe = primaryRecipeId ? names[primaryRecipeId] : null
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
            const recipeName = names[recipeId] || 'Unknown Recipe'
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
