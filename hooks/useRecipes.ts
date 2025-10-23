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

  // Legacy fields for backward compatibility
  imageUrl?: string
  imageStoragePath?: string
}

/**
 * Hook to fetch recipes with real-time Firestore media metadata.
 * Merges hardcoded recipe data from MEAL_SUGGESTIONS with uploaded media from Firestore.
 *
 * @returns Array of recipes with merged media data
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
          // Create a map of recipe media data by ID
          const mediaMap = new Map<string, RecipeMediaData>()

          snapshot.forEach((doc) => {
            mediaMap.set(doc.id, doc.data() as RecipeMediaData)
          })

          // Merge hardcoded recipes with Firestore media data
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
