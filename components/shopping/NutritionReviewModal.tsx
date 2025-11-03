'use client'

/**
 * Nutrition Review Modal Component
 *
 * Displays detailed nutritional information for a scanned product.
 * Allows users to review nutrition before confirming purchase.
 */

import { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'

interface NutritionReviewModalProps {
  isOpen: boolean
  onClose: () => void
  product: OpenFoodFactsProduct
  onConfirm: () => void
}

export function NutritionReviewModal({
  isOpen,
  onClose,
  product,
  onConfirm
}: NutritionReviewModalProps) {
  if (!isOpen) return null

  const nutriments = product.nutriments || {}

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Review Product
        </h2>

        {/* Product Image */}
        {product.image_url && (
          <img
            src={product.image_url}
            alt={product.product_name || 'Product'}
            className="w-full h-48 object-cover rounded-lg mb-4"
          />
        )}

        {/* Product Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            {product.product_name || 'Unknown Product'}
          </h3>
          {product.brands && (
            <p className="text-sm text-gray-600 dark:text-gray-400">{product.brands}</p>
          )}
          {product.quantity && (
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{product.quantity}</p>
          )}
        </div>

        {/* Nutritional Information */}
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Nutritional Information (per 100g)
          </h4>
          <div className="space-y-2">
            {nutriments['energy-kcal_100g'] !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments['energy-kcal_100g']} kcal
                </span>
              </div>
            )}
            {nutriments.proteins_100g !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments.proteins_100g}g
                </span>
              </div>
            )}
            {nutriments.carbohydrates_100g !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments.carbohydrates_100g}g
                </span>
              </div>
            )}
            {nutriments.fat_100g !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments.fat_100g}g
                </span>
              </div>
            )}
            {nutriments.fiber_100g !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Fiber:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments.fiber_100g}g
                </span>
              </div>
            )}
            {nutriments.sodium_100g !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Sodium:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {nutriments.sodium_100g}mg
                </span>
              </div>
            )}
          </div>

          {/* Show message if no nutrition data */}
          {Object.keys(nutriments).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-500 italic">
              No nutritional information available for this product
            </p>
          )}
        </div>

        {/* Ingredients */}
        {product.ingredients_text && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Ingredients
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
              {product.ingredients_text}
            </p>
          </div>
        )}

        {/* Allergens */}
        {product.allergens && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mb-4">
            <h4 className="font-semibold text-orange-900 dark:text-orange-200 mb-1 text-sm">
              ⚠️ Allergens
            </h4>
            <p className="text-xs text-orange-800 dark:text-orange-300">
              {product.allergens}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium text-gray-900 dark:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
          >
            Confirm & Continue
          </button>
        </div>
      </div>
    </div>
  )
}
