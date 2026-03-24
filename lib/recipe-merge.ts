/**
 * Recipe Merge Utility
 *
 * DRY: Shared logic for merging Firestore recipes with hardcoded MEAL_SUGGESTIONS.
 * Used by both useRecipes (public) and admin recipes page.
 */

import { MEAL_SUGGESTIONS, MealSuggestion } from './meal-suggestions'

interface FirestoreDoc {
  docId?: string
  id?: string
  name?: string
  status?: string
  recipeSteps?: string[]
  imageUrls?: string[]
  imageUrl?: string
  videoUrl?: string
  videoThumbnailUrl?: string
  imageStoragePaths?: string[]
  imageStoragePath?: string
  videoStoragePath?: string
  mediaUploadedAt?: any
  mediaUploadedBy?: string
  [key: string]: any
}

/**
 * Merge Firestore docs with hardcoded MEAL_SUGGESTIONS
 *
 * - Full recipes (have name + status + recipeSteps) are used directly
 * - Media-only docs (have imageUrls but no name) are applied as overlays to hardcoded recipes
 * - Hardcoded recipes fill in the rest
 *
 * @param firestoreDocs - Raw docs from Firestore
 * @param statusFilter - Optional status filter ('published', 'draft', etc.)
 * @returns Merged recipe list
 */
export function mergeRecipesWithMedia(
  firestoreDocs: FirestoreDoc[],
  statusFilter?: string
): MealSuggestion[] {
  // Build media overlay map from ALL docs that have image/video data
  const mediaMap = new Map<string, FirestoreDoc>()
  for (const doc of firestoreDocs) {
    const docKey = doc.docId || doc.id
    if (docKey && (doc.imageUrls || doc.imageUrl || doc.videoUrl)) {
      mediaMap.set(docKey, doc)
    }
  }

  // Separate full recipes (admin-created with name + status) from media-only docs
  let fullRecipes = firestoreDocs
    .filter(doc => doc.name && doc.status && doc.recipeSteps)
    .map(doc => ({
      ...doc,
      id: doc.id || doc.docId,
      createdAt: doc.createdAt?.toDate?.() || doc.createdAt,
      updatedAt: doc.updatedAt?.toDate?.() || doc.updatedAt,
      mediaUploadedAt: doc.mediaUploadedAt?.toDate?.() || doc.mediaUploadedAt,
    } as MealSuggestion))

  // Apply status filter if provided
  if (statusFilter && statusFilter !== 'all') {
    fullRecipes = fullRecipes.filter(r => (r as any).status === statusFilter)
  } else {
    // Default: only published full recipes
    fullRecipes = fullRecipes.filter(r => (r as any).status === 'published' || !statusFilter)
  }

  // Only include hardcoded recipes for 'all' or 'published' (they're always published)
  if (statusFilter && statusFilter !== 'all' && statusFilter !== 'published') {
    return fullRecipes
  }

  // Apply media overlay to hardcoded recipes (dedup against full recipes)
  const fullRecipeIds = new Set(fullRecipes.map(r => r.id))
  const hardcodedWithMedia = MEAL_SUGGESTIONS
    .filter(r => !fullRecipeIds.has(r.id))
    .map(recipe => {
      const media = mediaMap.get(recipe.id)
      if (!media) return recipe

      const imageUrls = media.imageUrls || (media.imageUrl ? [media.imageUrl] : undefined)
      const imageStoragePaths = media.imageStoragePaths || (media.imageStoragePath ? [media.imageStoragePath] : undefined)

      return {
        ...recipe,
        imageUrls,
        imageStoragePaths,
        videoUrl: media.videoUrl,
        videoThumbnailUrl: media.videoThumbnailUrl,
        videoStoragePath: media.videoStoragePath,
        imageUrl: imageUrls?.[0],
        imageStoragePath: imageStoragePaths?.[0],
      }
    })

  return [...hardcodedWithMedia, ...fullRecipes]
}
