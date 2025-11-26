'use client'

import { useState } from 'react'
import { ShoppingCartIcon, CheckBadgeIcon, MapPinIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline'

interface ProductMatch {
  barcode: string
  productName: string
  brand: string
  imageUrl?: string
  category: string
  matchScore: number
  stats: {
    totalScans: number
    totalPurchases: number
  }
  regional: {
    stores: string[]
    avgPriceCents: number
    priceMin: number
    priceMax: number
  }
  quality: {
    verified: boolean
    confidence: number
  }
  nutrition: any
}

interface IngredientMatch {
  ingredient: string
  quantity?: number
  unit?: string
  matches: ProductMatch[]
}

interface ProductMatchesViewProps {
  ingredientMatches: IngredientMatch[]
  availabilityScore: number
  estimatedPriceRange: {
    minCents: number
    maxCents: number
    ingredientsWithPrice: number
  } | null
  onAddToCart?: (barcode: string, ingredient: string) => void
}

export function ProductMatchesView({
  ingredientMatches,
  availabilityScore,
  estimatedPriceRange,
  onAddToCart
}: ProductMatchesViewProps) {
  const [expandedIngredients, setExpandedIngredients] = useState<Set<string>>(new Set())

  const toggleIngredient = (ingredient: string) => {
    const newExpanded = new Set(expandedIngredients)
    if (newExpanded.has(ingredient)) {
      newExpanded.delete(ingredient)
    } else {
      newExpanded.add(ingredient)
    }
    setExpandedIngredients(newExpanded)
  }

  const handleAddToCart = (barcode: string, ingredient: string) => {
    if (onAddToCart) {
      onAddToCart(barcode, ingredient)
    }
  }

  return (
    <div className="space-y-4">
      {/* Availability Score */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-secondary-light">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground">Recipe Availability</h3>
          <span className={`text-2xl font-bold ${
            availabilityScore >= 80 ? 'text-success dark:text-green-400' :
            availabilityScore >= 50 ? 'text-warning' :
            'text-error'
          }`}>
            {availabilityScore}%
          </span>
        </div>
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full ${
              availabilityScore >= 80 ? 'bg-success-light0' :
              availabilityScore >= 50 ? 'bg-warning-light0' :
              'bg-error-light0'
            }`}
            style={{ width: `${availabilityScore}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {ingredientMatches.filter(m => m.matches.length > 0).length} of {ingredientMatches.length} ingredients found in local stores
        </p>

        {/* Price Estimate */}
        {estimatedPriceRange && (
          <div className="mt-3 pt-3 border-t border-secondary-light">
            <div className="flex items-center gap-2 text-sm">
              <CurrencyDollarIcon className="h-4 w-4 text-success dark:text-green-400" />
              <span className="text-foreground">Estimated cost:</span>
              <span className="font-semibold text-foreground">
                ${(estimatedPriceRange.minCents / 100).toFixed(2)} - ${(estimatedPriceRange.maxCents / 100).toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground">
                ({estimatedPriceRange.ingredientsWithPrice}/{ingredientMatches.length} items)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Matches */}
      <div className="space-y-3">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <ShoppingCartIcon className="h-5 w-5" />
          Where to Buy Ingredients
        </h3>

        {ingredientMatches.map((ingredientMatch, idx) => {
          const isExpanded = expandedIngredients.has(ingredientMatch.ingredient)
          const hasMatches = ingredientMatch.matches.length > 0
          const topMatch = ingredientMatch.matches[0]

          return (
            <div
              key={idx}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Ingredient Header */}
              <button
                onClick={() => toggleIngredient(ingredientMatch.ingredient)}
                className="w-full p-4 flex items-center justify-between hover:bg-background transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className={`w-2 h-2 rounded-full ${
                    hasMatches ? 'bg-success-light0' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      {ingredientMatch.ingredient}
                    </div>
                    {hasMatches ? (
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                        {ingredientMatch.matches.length} product{ingredientMatch.matches.length !== 1 ? 's' : ''} found
                        {topMatch.regional.avgPriceCents > 0 && (
                          <span className="ml-2">
                            • ${(topMatch.regional.avgPriceCents / 100).toFixed(2)} avg
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">No products found</div>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Expanded Product Matches */}
              {isExpanded && hasMatches && (
                <div className="border-t border-border bg-background/50">
                  <div className="p-4 space-y-3">
                    {ingredientMatch.matches.map((product, productIdx) => (
                      <div
                        key={productIdx}
                        className="bg-card rounded-lg p-3 border border-border"
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Image */}
                          {product.imageUrl && (
                            <img
                              src={product.imageUrl}
                              alt={product.productName}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1">
                                <h4 className="font-medium text-foreground text-sm">
                                  {product.productName}
                                </h4>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                  {product.brand}
                                </p>
                              </div>
                              {product.quality.verified && (
                                <CheckBadgeIcon className="h-4 w-4 text-green-500 flex-shrink-0" />
                              )}
                            </div>

                            {/* Price & Stores */}
                            <div className="mt-2 space-y-1">
                              {product.regional.avgPriceCents > 0 && (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                  <CurrencyDollarIcon className="h-3 w-3" />
                                  ${(product.regional.avgPriceCents / 100).toFixed(2)}
                                  {product.regional.priceMin > 0 && product.regional.priceMax > 0 && (
                                    <span className="text-muted-foreground">
                                      (${(product.regional.priceMin / 100).toFixed(2)} - ${(product.regional.priceMax / 100).toFixed(2)})
                                    </span>
                                  )}
                                </div>
                              )}
                              {product.regional.stores.length > 0 && (
                                <div className="text-xs flex items-center gap-1 text-muted-foreground">
                                  <MapPinIcon className="h-3 w-3" />
                                  {product.regional.stores.slice(0, 2).join(', ')}
                                  {product.regional.stores.length > 2 && (
                                    <span className="text-muted-foreground">
                                      +{product.regional.stores.length - 2} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Add to Cart Button */}
                            <button
                              onClick={() => handleAddToCart(product.barcode, ingredientMatch.ingredient)}
                              className="mt-2 w-full py-1.5 px-3 bg-primary hover:bg-primary-hover text-white text-xs rounded font-medium transition-colors flex items-center justify-center gap-1"
                            >
                              <ShoppingCartIcon className="h-3 w-3" />
                              Add to Shopping List
                            </button>
                          </div>
                        </div>

                        {/* Match Score (for debugging) */}
                        {productIdx === 0 && (
                          <div className="mt-2 pt-2 border-t border-border">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">Best match</span>
                              <span className="text-muted-foreground">
                                {product.stats.totalScans} scans • {product.matchScore.toFixed(0)} match score
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* No Matches Info */}
      {ingredientMatches.filter(m => m.matches.length === 0).length > 0 && (
        <div className="bg-warning-light border border-warning-light rounded-lg p-4">
          <p className="text-sm text-warning-dark">
            <strong>Can't find some ingredients?</strong> We're continuously adding products as users scan them at stores.
            You can manually add these items to your shopping list.
          </p>
        </div>
      )}
    </div>
  )
}
