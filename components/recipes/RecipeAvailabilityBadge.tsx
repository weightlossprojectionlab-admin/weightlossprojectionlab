'use client'

import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ShoppingCartIcon } from '@heroicons/react/24/outline'

interface RecipeAvailabilityBadgeProps {
  availabilityScore: number
  ingredientsFound: number
  totalIngredients: number
  estimatedCostMin?: number
  estimatedCostMax?: number
  canMake: boolean
  compact?: boolean
}

export function RecipeAvailabilityBadge({
  availabilityScore,
  ingredientsFound,
  totalIngredients,
  estimatedCostMin,
  estimatedCostMax,
  canMake,
  compact = false
}: RecipeAvailabilityBadgeProps) {
  if (compact) {
    // Compact version for recipe cards
    return (
      <div className="flex items-center gap-2">
        {/* Ready to Cook Badge */}
        {canMake && (
          <div className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
            <CheckCircleIcon className="h-3 w-3" />
            <span>Ready to Cook</span>
          </div>
        )}

        {/* Availability Badge */}
        {!canMake && availabilityScore > 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            availabilityScore >= 60
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
          }`}>
            <ShoppingCartIcon className="h-3 w-3" />
            <span>{availabilityScore}% available</span>
          </div>
        )}

        {/* Price Badge */}
        {estimatedCostMin && estimatedCostMax && estimatedCostMin > 0 && (
          <div className="flex items-center gap-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs font-medium">
            <CurrencyDollarIcon className="h-3 w-3" />
            <span>${(estimatedCostMin / 100).toFixed(0)}-${(estimatedCostMax / 100).toFixed(0)}</span>
          </div>
        )}
      </div>
    )
  }

  // Full version for recipe detail pages
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <ShoppingCartIcon className="h-5 w-5" />
          Local Availability
        </h3>
        {canMake && (
          <span className="flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
            <CheckCircleIcon className="h-4 w-4" />
            Ready to Cook
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-600 dark:text-gray-400">
            {ingredientsFound} of {totalIngredients} ingredients found locally
          </span>
          <span className={`font-bold ${
            availabilityScore >= 80 ? 'text-green-600 dark:text-green-400' :
            availabilityScore >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
            'text-red-600 dark:text-red-400'
          }`}>
            {availabilityScore}%
          </span>
        </div>
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              availabilityScore >= 80 ? 'bg-green-500' :
              availabilityScore >= 50 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${availabilityScore}%` }}
          />
        </div>
      </div>

      {/* Price Estimate */}
      {estimatedCostMin && estimatedCostMax && estimatedCostMin > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <CurrencyDollarIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
          <span className="text-gray-700 dark:text-gray-300">Estimated cost:</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            ${(estimatedCostMin / 100).toFixed(2)} - ${(estimatedCostMax / 100).toFixed(2)}
          </span>
        </div>
      )}
    </div>
  )
}
