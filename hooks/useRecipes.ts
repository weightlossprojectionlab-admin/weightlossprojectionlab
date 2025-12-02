'use client'

import { useState, useEffect, useCallback } from 'react'
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MEAL_SUGGESTIONS, MealSuggestion } from '@/lib/meal-suggestions'
import { logger } from '@/lib/logger'

// Cache configuration
const CACHE_KEY = 'wlpl_recipes_cache'
const CACHE_TTL = 30 * 60 * 1000 // 30 minutes in milliseconds

interface RecipeMediaData {
  imageUrls?: string[]
  videoUrl?: string
  videoThumbnailUrl?: string
  imageStoragePaths?: string[]
  videoStoragePath?: string
  mediaUploadedAt?: any
  mediaUploadedBy?: string

  // Fields that indicate this is a full recipe (post-migration)
  status?: 'draft' | 'published' | 'archived'
  recipeSteps?: string[]
  name?: string

  // Legacy fields for backward compatibility
  imageUrl?: string
  imageStoragePath?: string
}

/**
 * Get cached recipes from localStorage
 */
function getCachedRecipes(): { recipes: MealSuggestion[]; timestamp: number } | null {
  if (typeof window === 'undefined') return null

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null

    const parsed = JSON.parse(cached)
    const age = Date.now() - parsed.timestamp

    // Return cached data if still fresh
    if (age < CACHE_TTL) {
      return parsed
    }

    // Cache expired, remove it
    localStorage.removeItem(CACHE_KEY)
    return null
  } catch (error) {
    logger.error('Error reading recipe cache:', error as Error)
    return null
  }
}

/**
 * Save recipes to localStorage cache
 */
function setCachedRecipes(recipes: MealSuggestion[]): void {
  if (typeof window === 'undefined') return

  try {
    const cacheData = {
      recipes,
      timestamp: Date.now()
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
  } catch (error) {
    logger.error('Error caching recipes:', error as Error)
  }
}

/**
 * Hook to fetch recipes with Firestore integration
 *
 * OPTIMIZED FOR PERFORMANCE:
 * - Uses one-time fetch (getDocs) instead of real-time subscription (onSnapshot)
 * - Implements 30-minute client-side cache for instant loads
 * - Falls back to cache on network errors
 * - Provides refresh function for manual updates
 *
 * BACKWARDS COMPATIBLE BEHAVIOR:
 * - Before migration: Merges hardcoded MEAL_SUGGESTIONS with media from Firestore
 * - After migration: Fetches full recipes from Firestore (with status: 'published')
 *
 * @returns Array of recipes with loading, error states, and refresh function
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<MealSuggestion[]>(() => {
    // Try to load from cache on mount for instant display
    const cached = getCachedRecipes()
    return cached?.recipes || MEAL_SUGGESTIONS
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchRecipes = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // SEC-007: Always enforce pagination limit (max 50 per Firestore rules)
      // Also filter for published recipes and order consistently
      const recipesRef = collection(db, 'recipes')

      // First, check if we have the 'status' field (post-migration)
      const checkSnapshot = await getDocs(query(recipesRef, limit(1)))
      const hasStatusField = checkSnapshot.docs.some((doc) => 'status' in doc.data())

      let snapshot
      if (hasStatusField) {
        // POST-MIGRATION: Query with status filter and ordering
        snapshot = await getDocs(
          query(
            recipesRef,
            where('status', '==', 'published'),
            orderBy('createdAt', 'desc'),
            limit(50)
          )
        )
      } else {
        // PRE-MIGRATION: Just apply limit
        snapshot = await getDocs(query(recipesRef, limit(50)))
      }

      // Check if we have full recipes (post-migration) or just media (pre-migration)
      const hasFullRecipes = snapshot.docs.some((doc) => {
        const data = doc.data()
        return data.status && data.recipeSteps && data.name
      })

      let fetchedRecipes: MealSuggestion[]

      if (hasFullRecipes) {
        // POST-MIGRATION: Use full recipes from Firestore
        const firestoreRecipes: MealSuggestion[] = snapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            ...data,
            firestoreId: doc.id,
            // Convert Firestore Timestamps to Date objects
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
            mediaUploadedAt: data.mediaUploadedAt?.toDate?.() || data.mediaUploadedAt,
          } as MealSuggestion
        })

        // If no published recipes, fall back to hardcoded
        fetchedRecipes = firestoreRecipes.length > 0 ? firestoreRecipes : MEAL_SUGGESTIONS
      } else {
        // PRE-MIGRATION: Merge hardcoded recipes with media data
        const mediaMap = new Map<string, RecipeMediaData>()

        snapshot.forEach((doc) => {
          mediaMap.set(doc.id, doc.data() as RecipeMediaData)
        })

        fetchedRecipes = MEAL_SUGGESTIONS.map((recipe) => {
          const mediaData = mediaMap.get(recipe.id)

          if (mediaData) {
            // Handle both new array format and legacy single image format
            let imageUrls = mediaData.imageUrls
            let imageStoragePaths = mediaData.imageStoragePaths

            // Backward compatibility: if legacy imageUrl exists but imageUrls doesn't, convert to array
            if (!imageUrls && mediaData.imageUrl) {
              imageUrls = [mediaData.imageUrl]
            }
            if (!imageStoragePaths && mediaData.imageStoragePath) {
              imageStoragePaths = [mediaData.imageStoragePath]
            }

            return {
              ...recipe,
              imageUrls,
              imageStoragePaths,
              videoUrl: mediaData.videoUrl,
              videoThumbnailUrl: mediaData.videoThumbnailUrl,
              videoStoragePath: mediaData.videoStoragePath,
              mediaUploadedAt: mediaData.mediaUploadedAt?.toDate?.() || mediaData.mediaUploadedAt,
              mediaUploadedBy: mediaData.mediaUploadedBy,
              // Keep legacy fields for any components still using them
              imageUrl: imageUrls?.[0],
              imageStoragePath: imageStoragePaths?.[0],
            }
          }

          return recipe
        })
      }

      // Update state and cache
      setRecipes(fetchedRecipes)
      setCachedRecipes(fetchedRecipes)
      setLoading(false)
    } catch (err) {
      logger.error('Error fetching recipes:', err as Error)
      setError(err instanceof Error ? err : new Error('Unknown error'))
      setLoading(false)

      // Try to fall back to cache on error
      const cached = getCachedRecipes()
      if (cached) {
        setRecipes(cached.recipes)
        logger.info('Using cached recipes due to fetch error')
      } else {
        // Fall back to hardcoded recipes
        setRecipes(MEAL_SUGGESTIONS)
      }
    }
  }, [])

  useEffect(() => {
    // Check if we have fresh cached data
    const cached = getCachedRecipes()

    if (cached) {
      // Use cached data, skip network fetch
      setRecipes(cached.recipes)
      setLoading(false)
      logger.info('Loaded recipes from cache (age: ' + Math.round((Date.now() - cached.timestamp) / 1000) + 's)')
    } else {
      // No cache or expired, fetch from network
      fetchRecipes()
    }
  }, [fetchRecipes])

  return { recipes, loading, error, refresh: fetchRecipes }
}

/**
 * Clear the recipe cache (useful for debugging or forcing refresh)
 */
export function clearRecipeCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('wlpl_recipes_cache')
    } catch (error) {
      logger.error('Error clearing recipe cache:', error as Error)
    }
  }
}
