import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { MealSuggestion } from '@/lib/meal-suggestions'

interface RecipeAvailability {
  recipeId: string
  availabilityScore: number
  estimatedCostMin: number
  estimatedCostMax: number
  ingredientsFound: number
  totalIngredients: number
  canMake: boolean
  loading: boolean
  error: string | null
}

export function useRecipeAvailability(recipes: MealSuggestion[]) {
  const [availability, setAvailability] = useState<Map<string, RecipeAvailability>>(new Map())
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!recipes || recipes.length === 0) {
      setAvailability(new Map())
      return
    }

    const fetchAvailability = async () => {
      setLoading(true)

      const user = auth.currentUser
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const token = await user.getIdToken()

        // Fetch availability for each recipe
        const results = await Promise.all(
          recipes.map(async (recipe) => {
            try {
              // Parse ingredients
              const ingredients = recipe.ingredients.map(ing => {
                const parts = ing.split(' ')
                const quantity = parseFloat(parts[0]) || 1
                const unit = isNaN(parseFloat(parts[0])) ? undefined : parts[1]
                const name = isNaN(parseFloat(parts[0]))
                  ? ing
                  : parts.slice(unit ? 2 : 1).join(' ')

                return { name, quantity, unit }
              })

              const response = await fetch('/api/products/match', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ingredients })
              })

              if (!response.ok) {
                throw new Error('Failed to fetch availability')
              }

              const data = await response.json()

              const ingredientsFound = data.matches.filter((m: any) => m.matches.length > 0).length
              const totalIngredients = ingredients.length
              const availabilityScore = data.availabilityScore
              const canMake = availabilityScore >= 80 // 80% threshold for "can make"

              return {
                recipeId: recipe.id,
                availabilityScore,
                estimatedCostMin: data.estimatedPriceRange?.minCents || 0,
                estimatedCostMax: data.estimatedPriceRange?.maxCents || 0,
                ingredientsFound,
                totalIngredients,
                canMake,
                loading: false,
                error: null
              } as RecipeAvailability
            } catch (error) {
              logger.error('Error fetching recipe availability', error as Error, { recipeId: recipe.id })
              return {
                recipeId: recipe.id,
                availabilityScore: 0,
                estimatedCostMin: 0,
                estimatedCostMax: 0,
                ingredientsFound: 0,
                totalIngredients: recipe.ingredients.length,
                canMake: false,
                loading: false,
                error: error instanceof Error ? error.message : 'Failed to fetch availability'
              } as RecipeAvailability
            }
          })
        )

        // Convert to map
        const availabilityMap = new Map<string, RecipeAvailability>()
        results.forEach(result => {
          availabilityMap.set(result.recipeId, result)
        })

        setAvailability(availabilityMap)
      } catch (error) {
        logger.error('Error fetching recipe availability', error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchAvailability()
  }, [recipes])

  return { availability, loading }
}
