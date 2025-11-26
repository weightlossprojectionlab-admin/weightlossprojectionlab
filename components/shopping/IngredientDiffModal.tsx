'use client'

/**
 * Ingredient Diff Modal
 *
 * Shows which recipe ingredients are in stock vs missing
 * Allows user to bulk add missing items to shopping list
 */

import { useState, useEffect } from 'react'
import { XMarkIcon, CheckCircleIcon, PlusCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { useInventory } from '@/hooks/useInventory'
import { useShopping } from '@/hooks/useShopping'
import { compareWithInventory, getItemsToAdd } from '@/lib/shopping-diff'
import type { RecipeIngredient } from '@/lib/shopping-diff'
import type { IngredientDiff } from '@/lib/shopping-diff'
import { Spinner } from '@/components/ui/Spinner'

interface IngredientDiffModalProps {
  recipeId: string
  recipeName: string
  ingredients: RecipeIngredient[]
  onClose: () => void
}

export function IngredientDiffModal({
  recipeId,
  recipeName,
  ingredients,
  onClose,
}: IngredientDiffModalProps) {
  const { allItems: inventoryItems, loading: inventoryLoading } = useInventory()
  const { addFromRecipe, loading: addingItems } = useShopping()
  const [diffs, setDiffs] = useState<IngredientDiff[]>([])
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set())

  // Compare recipe with inventory on mount
  useEffect(() => {
    const comparison = compareWithInventory(ingredients, inventoryItems)
    setDiffs(comparison)

    // Pre-select items that need to be added
    const needIndices = comparison
      .map((diff, index) => (diff.status !== 'have' ? index : -1))
      .filter(index => index !== -1)
    setSelectedItems(new Set(needIndices))
  }, [ingredients, inventoryItems])

  const toggleItem = (index: number) => {
    const newSelected = new Set(selectedItems)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedItems(newSelected)
  }

  const handleAddToList = async () => {
    try {
      // Get selected diffs
      const selectedDiffs = diffs.filter((_, index) => selectedItems.has(index))
      const itemsToAdd = getItemsToAdd(selectedDiffs)

      if (itemsToAdd.length === 0) {
        toast.error('No items selected')
        return
      }

      await addFromRecipe(recipeId, itemsToAdd)

      toast.success(`Added ${itemsToAdd.length} items to shopping list`)
      onClose()
    } catch (error) {
      toast.error('Failed to add items to shopping list')
    }
  }

  const haveCount = diffs.filter(d => d.status === 'have').length
  const needCount = diffs.filter(d => d.status === 'need').length
  const partialCount = diffs.filter(d => d.status === 'partial').length

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-background rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground dark:text-white">
                Add to Shopping List
              </h2>
              <p className="text-muted-foreground mt-1">{recipeName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
              aria-label="Close modal"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Summary */}
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex items-center gap-1">
              <CheckCircleIcon className="h-5 w-5 text-green-500" />
              <span className="text-foreground">
                {haveCount} in stock
              </span>
            </div>
            {partialCount > 0 && (
              <div className="flex items-center gap-1">
                <ExclamationCircleIcon className="h-5 w-5 text-warning" />
                <span className="text-foreground">
                  {partialCount} partial
                </span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <PlusCircleIcon className="h-5 w-5 text-blue-500" />
              <span className="text-foreground">
                {needCount} needed
              </span>
            </div>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="flex-1 overflow-y-auto p-6">
          {inventoryLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="space-y-2">
              {diffs.map((diff, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    diff.status === 'have'
                      ? 'bg-success-light dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-background dark:bg-gray-700/50 border-border dark:border-gray-600'
                  }`}
                >
                  {/* Checkbox (only for items that need to be added) */}
                  {diff.status !== 'have' && (
                    <input
                      type="checkbox"
                      checked={selectedItems.has(index)}
                      onChange={() => toggleItem(index)}
                      className="h-4 w-4 text-secondary rounded"
                    />
                  )}

                  {/* Status Icon */}
                  {diff.status === 'have' && (
                    <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                  )}
                  {diff.status === 'partial' && (
                    <ExclamationCircleIcon className="h-5 w-5 text-warning flex-shrink-0" />
                  )}
                  {diff.status === 'need' && (
                    <PlusCircleIcon className="h-5 w-5 text-blue-500 flex-shrink-0" />
                  )}

                  {/* Ingredient Info */}
                  <div className="flex-1">
                    <div className="font-medium text-foreground dark:text-white">
                      {diff.ingredient.name}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {diff.status === 'have' && (
                        <span>
                          ✓ Have {diff.haveQuantity} {diff.haveUnit || 'units'}
                        </span>
                      )}
                      {diff.status === 'partial' && (
                        <span>
                          Have {diff.haveQuantity} {diff.haveUnit || 'units'} / Need{' '}
                          {diff.needQuantity} {diff.needUnit || 'more'}
                        </span>
                      )}
                      {diff.status === 'need' && (
                        <span>
                          Need {diff.ingredient.quantity} {diff.ingredient.unit || 'units'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddToList}
            disabled={addingItems || selectedItems.size === 0}
            className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addingItems ? (
              <>
                <Spinner size="sm" className="text-white" />
                <span>Adding...</span>
              </>
            ) : (
              <span>Add {selectedItems.size} items</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
