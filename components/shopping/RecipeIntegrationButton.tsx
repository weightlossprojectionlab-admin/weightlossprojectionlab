'use client'

/**
 * Recipe Integration Button
 *
 * Button that appears on recipe pages to add ingredients to shopping list
 * Opens modal showing inventory diff (have vs need)
 */

import { useState } from 'react'
import { ShoppingCartIcon } from '@heroicons/react/24/outline'
import { IngredientDiffModal } from './IngredientDiffModal'
import type { RecipeIngredient } from '@/lib/shopping-diff'

interface RecipeIntegrationButtonProps {
  recipeId: string
  recipeName: string
  ingredients: RecipeIngredient[]
  className?: string
}

export function RecipeIntegrationButton({
  recipeId,
  recipeName,
  ingredients,
  className = '',
}: RecipeIntegrationButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${className}`}
        aria-label={`Add ${recipeName} ingredients to shopping list`}
      >
        <ShoppingCartIcon className="h-5 w-5" />
        <span>Add to Shopping List</span>
      </button>

      {showModal && (
        <IngredientDiffModal
          recipeId={recipeId}
          recipeName={recipeName}
          ingredients={ingredients}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
