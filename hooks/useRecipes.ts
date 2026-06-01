'use client'

import { useMemo } from 'react'
import { collection, query, limit, QueryDocumentSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { MEAL_SUGGESTIONS, MealSuggestion } from '@/lib/meal-suggestions'
import { mergeRecipesWithMedia } from '@/lib/recipe-merge'
import { useFirestoreQuery } from './useFirestoreQuery'

/**
 * Hook to fetch recipes with real-time Firestore integration
 *
 * Uses useFirestoreQuery (onSnapshot) for live updates — new recipes
 * appear instantly without refresh.
 *
 * Merges:
 * - Admin-created recipes from Firestore (full recipes with status/name/steps)
 * - Hardcoded MEAL_SUGGESTIONS with media overlay from Firestore
 * - Falls back to MEAL_SUGGESTIONS for unauthenticated users
 */
export function useRecipes() {
  // Load the full recipe catalog in one shot (the page filters/searches
  // client-side). There is NO orderBy: ~27 media-overlay docs lack a
  // `createdAt` and would be silently dropped by an orderBy, breaking images
  // on the built-in recipes. So the limit must simply exceed the catalog size
  // — otherwise Firestore truncates by document id, and `recipe-<timestamp>`
  // ids sort the NEWEST recipes last, making freshly-imported recipes vanish.
  // Soft cap (mirrored in firestore.rules `recipes` list rule). When the
  // catalog approaches this, switch to server-side pagination/search rather
  // than raising it indefinitely.
  const recipesQuery = useMemo(
    () => query(collection(db, 'recipes'), limit(200)),
    []
  )

  const { data: firestoreDocs, loading, error } = useFirestoreQuery<Record<string, any>>(
    recipesQuery,
    (doc: QueryDocumentSnapshot) => ({
      docId: doc.id,
      ...doc.data()
    })
  )

  // Merge Firestore data with hardcoded recipes (DRY: shared utility)
  const recipes = useMemo(() => {
    if (firestoreDocs.length === 0) return MEAL_SUGGESTIONS
    return mergeRecipesWithMedia(firestoreDocs, 'published')
  }, [firestoreDocs])

  return { recipes, loading, error, refresh: () => {} }
}

/**
 * Clear the recipe cache (legacy — kept for backward compatibility)
 */
export function clearRecipeCache() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('wlpl_recipes_cache')
    } catch {
      // ignore
    }
  }
}
