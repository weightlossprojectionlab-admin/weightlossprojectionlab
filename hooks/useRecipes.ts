'use client'

import { useState, useEffect } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MEAL_SUGGESTIONS, MealSuggestion } from '@/lib/meal-suggestions'

const CACHE_KEY = 'wlpl_recipes_cache'
const CACHE_VERSION = 1
const CACHE_EXPIRY = 1000 * 60 * 60 * 24 // 24 hours

interface RecipeCache {
  version: number
  timestamp: number
  recipes: MealSuggestion[]
}

/**
 * Hook to fetch recipes from Firestore recipe library
 *
 * - Fetches only published recipes from Firestore
 * - Caches recipes in localStorage for offline support
 * - Falls back to hardcoded MEAL_SUGGESTIONS if Firestore is empty or fails
 * - Provides real-time updates when recipes change
 *
 * @returns Array of recipes with loading and error states
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<MealSuggestion[]>(() => {
    // Try to load from cache on initial render
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const cacheData: RecipeCache = JSON.parse(cached)
          const age = Date.now() - cacheData.timestamp

          if (cacheData.version === CACHE_VERSION && age < CACHE_EXPIRY) {
            return cacheData.recipes
          }
        }
      } catch (error) {
        console.error('Error loading recipes from cache:', error)
      }
    }
    return MEAL_SUGGESTIONS // Fallback to seed data
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Query only published recipes, ordered by popularity and creation date
    const recipesQuery = query(
      collection(db, 'recipes'),
      where('status', '==', 'published'),
      orderBy('popularity', 'desc'),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      recipesQuery,
      (snapshot) => {
        try {
          // Convert Firestore documents to MealSuggestion objects
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

          // If Firestore is empty, use seed data
          const finalRecipes = firestoreRecipes.length > 0 ? firestoreRecipes : MEAL_SUGGESTIONS

          setRecipes(finalRecipes)
          setLoading(false)

          // Cache recipes in localStorage for offline support
          if (typeof window !== 'undefined') {
            try {
              const cacheData: RecipeCache = {
                version: CACHE_VERSION,
                timestamp: Date.now(),
                recipes: finalRecipes,
              }
              localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))
            } catch (error) {
              console.error('Error caching recipes:', error)
              // Don't fail if localStorage is full or unavailable
            }
          }
        } catch (err) {
          console.error('Error processing recipe data:', err)
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setLoading(false)
        }
      },
      (err) => {
        console.error('Error fetching recipes from Firestore:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setLoading(false)

        // Fall back to cached or seed data
        if (recipes.length === 0) {
          setRecipes(MEAL_SUGGESTIONS)
        }
      }
    )

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  return { recipes, loading, error }
}

/**
 * Clear the recipe cache (useful for debugging or forcing refresh)
 */
export function clearRecipeCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(CACHE_KEY)
    } catch (error) {
      console.error('Error clearing recipe cache:', error)
    }
  }
}
