import { useState, useEffect } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

interface Ingredient {
  name: string
  quantity?: number
  unit?: string
}

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

interface ProductMatchResult {
  matches: IngredientMatch[]
  availabilityScore: number
  estimatedPriceRange: {
    minCents: number
    maxCents: number
    ingredientsWithPrice: number
  } | null
  userRegion?: string
}

export function useProductMatching(ingredients: Ingredient[]) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ProductMatchResult | null>(null)

  useEffect(() => {
    if (!ingredients || ingredients.length === 0) {
      setResult(null)
      return
    }

    const fetchMatches = async () => {
      setLoading(true)
      setError(null)

      try {
        const user = auth.currentUser
        if (!user) {
          throw new Error('User not authenticated')
        }

        const token = await user.getIdToken()
        const response = await fetch('/api/products/match', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ ingredients })
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to match products' }))
          throw new Error(errorData.error || 'Failed to match products')
        }

        const data = await response.json()
        setResult(data)
      } catch (err) {
        logger.error('Product matching error', err as Error, {
          ingredientCount: ingredients.length
        })
        setError(err instanceof Error ? err.message : 'Failed to match products')
      } finally {
        setLoading(false)
      }
    }

    fetchMatches()
  }, [ingredients])

  return { loading, error, result }
}
