'use client'

import { useState, useEffect } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MEAL_SUGGESTIONS, MealSuggestion } from '@/lib/meal-suggestions'

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
 * Hook to fetch recipes with Firestore integration
 *
 * BACKWARDS COMPATIBLE BEHAVIOR:
 * - Before migration: Merges hardcoded MEAL_SUGGESTIONS with media from Firestore
 * - After migration: Fetches full recipes from Firestore (with status: 'published')
 *
 * The hook automatically detects which mode to use based on Firestore data.
 *
 * @returns Array of recipes with loading and error states
 */
export function useRecipes() {
  const [recipes, setRecipes] = useState<MealSuggestion[]>(MEAL_SUGGESTIONS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    // Subscribe to recipes collection for real-time updates
    const recipesRef = collection(db, 'recipes')

    const unsubscribe = onSnapshot(
      recipesRef,
      (snapshot) => {
        try {
          // Check if we have full recipes (post-migration) or just media (pre-migration)
          const hasFullRecipes = snapshot.docs.some((doc) => {
            const data = doc.data()
            return data.status && data.recipeSteps && data.name
          })

          if (hasFullRecipes) {
            // POST-MIGRATION: Use full recipes from Firestore
            const firestoreRecipes: MealSuggestion[] = snapshot.docs
              .filter((doc) => doc.data().status === 'published')
              .map((doc) => {
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
            setRecipes(firestoreRecipes.length > 0 ? firestoreRecipes : MEAL_SUGGESTIONS)
          } else {
            // PRE-MIGRATION: Merge hardcoded recipes with media data
            const mediaMap = new Map<string, RecipeMediaData>()

            snapshot.forEach((doc) => {
              mediaMap.set(doc.id, doc.data() as RecipeMediaData)
            })

            const mergedRecipes = MEAL_SUGGESTIONS.map((recipe) => {
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

            setRecipes(mergedRecipes)
          }

          setLoading(false)
        } catch (err) {
          console.error('Error processing recipe data:', err)
          setError(err instanceof Error ? err : new Error('Unknown error'))
          setLoading(false)
        }
      },
      (err) => {
        console.error('Error fetching recipes:', err)
        setError(err instanceof Error ? err : new Error('Unknown error'))
        setLoading(false)
        // Fall back to hardcoded recipes on error
        setRecipes(MEAL_SUGGESTIONS)
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
      localStorage.removeItem('wlpl_recipes_cache')
    } catch (error) {
      console.error('Error clearing recipe cache:', error)
    }
  }
}
