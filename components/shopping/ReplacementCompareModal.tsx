'use client'

/**
 * Replacement Compare Modal Component
 *
 * Shows side-by-side comparison of original item vs replacement product.
 * Allows user to confirm using replacement when original is unavailable.
 */

import { ShoppingItem } from '@/types/shopping'
import { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'
import { getCategoryMetadata } from '@/lib/product-categories'

interface ReplacementCompareModalProps {
  isOpen: boolean
  onClose: () => void
  originalItem: ShoppingItem
  replacementProduct: OpenFoodFactsProduct
  onConfirm: () => void
  onCancel: () => void
}

export function ReplacementCompareModal({
  isOpen,
  onClose,
  originalItem,
  replacementProduct,
  onConfirm,
  onCancel
}: ReplacementCompareModalProps) {
  if (!isOpen) return null

  const categoryMeta = getCategoryMetadata(originalItem.category)
  const originalNutriments = {} // Original item doesn't have nutriments stored
  const replacementNutriments = replacementProduct.nutriments || {}

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Replacement Comparison
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          {/* Original Product */}
          <div className="border-2 border-red-300 dark:border-red-700 rounded-lg p-4">
            <div className="text-xs text-error font-semibold mb-2">
              ORIGINAL (Not Found)
            </div>
            {originalItem.imageUrl ? (
              <img
                src={originalItem.imageUrl}
                alt={originalItem.productName}
                className="w-full h-32 object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center text-4xl">
                {categoryMeta.icon}
              </div>
            )}
            <h3 className="font-semibold text-sm mb-1 text-foreground">
              {originalItem.productName}
            </h3>
            <p className="text-xs text-muted-foreground">
              {originalItem.brand}
            </p>
          </div>

          {/* Replacement Product */}
          <div className="border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
            <div className="text-xs text-success dark:text-green-400 font-semibold mb-2">
              REPLACEMENT (Found)
            </div>
            {replacementProduct.image_url ? (
              <img
                src={replacementProduct.image_url}
                alt={replacementProduct.product_name || 'Replacement'}
                className="w-full h-32 object-cover rounded mb-2"
              />
            ) : (
              <div className="w-full h-32 bg-muted rounded mb-2 flex items-center justify-center text-4xl">
                {categoryMeta.icon}
              </div>
            )}
            <h3 className="font-semibold text-sm mb-1 text-foreground">
              {replacementProduct.product_name || 'Unknown Product'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {replacementProduct.brands || 'Unknown Brand'}
            </p>
          </div>
        </div>

        {/* Nutritional Comparison */}
        {replacementNutriments && Object.keys(replacementNutriments).length > 0 && (
          <div className="bg-background rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-foreground mb-3">
              Nutritional Comparison (per 100g)
            </h4>
            <div className="space-y-2 text-sm">
              {replacementNutriments['energy-kcal_100g'] !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calories:</span>
                  <span className="font-medium text-foreground">
                    {replacementNutriments['energy-kcal_100g']} kcal
                  </span>
                </div>
              )}
              {replacementNutriments.proteins_100g !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein:</span>
                  <span className="font-medium text-foreground">
                    {replacementNutriments.proteins_100g}g
                  </span>
                </div>
              )}
              {replacementNutriments.carbohydrates_100g !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carbs:</span>
                  <span className="font-medium text-foreground">
                    {replacementNutriments.carbohydrates_100g}g
                  </span>
                </div>
              )}
              {replacementNutriments.fat_100g !== undefined && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fat:</span>
                  <span className="font-medium text-foreground">
                    {replacementNutriments.fat_100g}g
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-warning-light border border-warning-light rounded-lg p-3 mb-4">
          <p className="text-xs text-warning-dark">
            💡 This replacement will be used for this shopping trip. Your shopping list will keep the original item for future trips.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-3 bg-muted rounded-lg hover:bg-gray-200 transition-colors font-medium text-foreground"
          >
            Cancel - Keep Looking
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-success hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
          >
            ✓ Use Replacement
          </button>
        </div>
      </div>
    </div>
  )
}
