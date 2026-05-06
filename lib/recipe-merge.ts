/**
 * Recipe Merge Utility
 *
 * DRY: Shared logic for merging Firestore recipes with hardcoded MEAL_SUGGESTIONS.
 * Used by both useRecipes (public) and admin recipes page.
 */

import { MEAL_SUGGESTIONS, MealSuggestion } from './meal-suggestions'
import { unpackIngredientAllergens } from './ingredient-allergen-classifier'

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
 * Convert a "full" Firestore recipe doc (one with name + status +
 * recipeSteps) to a MealSuggestion with safe defaults on every
 * collection field. Centralizes the shape contract so both the
 * single-recipe merge and the list merge produce identical objects —
 * consumers can rely on .length / .map() without optional chaining.
 */
function firestoreToFullRecipe(doc: FirestoreDoc): MealSuggestion {
  return {
    ...doc,
    id: doc.id || doc.docId,
    createdAt: doc.createdAt?.toDate?.() || doc.createdAt,
    updatedAt: doc.updatedAt?.toDate?.() || doc.updatedAt,
    mediaUploadedAt: doc.mediaUploadedAt?.toDate?.() || doc.mediaUploadedAt,
    ingredientAllergens: unpackIngredientAllergens(doc.ingredientAllergens),
    dietaryTags: doc.dietaryTags || [],
    allergens: doc.allergens || [],
    ingredients: doc.ingredients || [],
    recipeSteps: doc.recipeSteps || [],
    cookingTips: doc.cookingTips || [],
    macros: doc.macros || { protein: 0, carbs: 0, fat: 0, fiber: 0 },
  } as MealSuggestion
}

/**
 * Single-recipe merge — returns one MealSuggestion given a hardcoded
 * base (or null) and a Firestore overlay doc (or null).
 *
 * Mirrors the list-merge rules:
 *  - If the Firestore doc is a "full recipe" (has name+status+recipeSteps),
 *    it's used directly — admin-created entries.
 *  - Otherwise the hardcoded recipe is used as the base and the Firestore
 *    doc overlays present fields (media, AI-regenerated data, etc.).
 *  - Returns null if neither source has data.
 *
 * Used by the consumer detail page (server component) so it gets the
 * same overlay behavior as the public list and admin list. Without
 * this, admin edits to hardcoded recipes (regenerate ingredients,
 * upload media) wouldn't appear on the detail page.
 */
export function mergeRecipeWithMedia(
  hardcoded: MealSuggestion | null,
  firestoreDoc: FirestoreDoc | null
): MealSuggestion | null {
  // Full Firestore recipe — admin-created or fully-edited entry
  if (firestoreDoc?.name && firestoreDoc?.status && firestoreDoc?.recipeSteps) {
    return firestoreToFullRecipe(firestoreDoc)
  }

  if (!hardcoded) return null
  if (!firestoreDoc) return hardcoded

  // Overlay: hardcoded as base, Firestore overlays present fields
  const imageUrls = firestoreDoc.imageUrls || (firestoreDoc.imageUrl ? [firestoreDoc.imageUrl] : undefined)
  const imageStoragePaths =
    firestoreDoc.imageStoragePaths ||
    (firestoreDoc.imageStoragePath ? [firestoreDoc.imageStoragePath] : undefined)

  return {
    ...hardcoded,
    imageUrls,
    imageStoragePaths,
    videoUrl: firestoreDoc.videoUrl,
    videoThumbnailUrl: firestoreDoc.videoThumbnailUrl,
    videoStoragePath: firestoreDoc.videoStoragePath,
    imageUrl: imageUrls?.[0],
    imageStoragePath: imageStoragePaths?.[0],
    ...(firestoreDoc.calories ? { calories: firestoreDoc.calories } : {}),
    ...(firestoreDoc.macros ? { macros: firestoreDoc.macros } : {}),
    ...(firestoreDoc.recipeSteps?.length ? { recipeSteps: firestoreDoc.recipeSteps } : {}),
    ...(firestoreDoc.cookingTips?.length ? { cookingTips: firestoreDoc.cookingTips } : {}),
    ...(firestoreDoc.ingredients?.length ? { ingredients: firestoreDoc.ingredients } : {}),
    ...(firestoreDoc.mealTypes?.length ? { mealTypes: firestoreDoc.mealTypes } : {}),
    ...(firestoreDoc.mealType ? { mealType: firestoreDoc.mealType } : {}),
  } as MealSuggestion
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
  // Build overlay map from ALL Firestore docs (media, nutrition, steps, etc.)
  const mediaMap = new Map<string, FirestoreDoc>()
  for (const doc of firestoreDocs) {
    const docKey = doc.docId || doc.id
    if (docKey) {
      mediaMap.set(docKey, doc)
    }
  }

  // Separate full recipes (admin-created with name + status) from media-only docs.
  // Family-meal Commit D — firestoreToFullRecipe also unpacks ingredientAllergens
  // from its Firestore-stored shape ([{tags:[...]}, ...]) back to the
  // consumer-facing AllergyTag[][] form. Without this, RecipeModal
  // sees the packed objects and silently bails on per-row chips.
  let fullRecipes = firestoreDocs
    .filter(doc => doc.name && doc.status && doc.recipeSteps)
    .map(firestoreToFullRecipe)

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
        // Media overlay
        imageUrls,
        imageStoragePaths,
        videoUrl: media.videoUrl,
        videoThumbnailUrl: media.videoThumbnailUrl,
        videoStoragePath: media.videoStoragePath,
        imageUrl: imageUrls?.[0],
        imageStoragePath: imageStoragePaths?.[0],
        // AI-generated data overlay (from regeneration)
        ...(media.calories ? { calories: media.calories } : {}),
        ...(media.macros ? { macros: media.macros } : {}),
        ...(media.recipeSteps?.length ? { recipeSteps: media.recipeSteps } : {}),
        ...(media.cookingTips?.length ? { cookingTips: media.cookingTips } : {}),
        ...(media.ingredients?.length ? { ingredients: media.ingredients } : {}),
        ...(media.mealTypes?.length ? { mealTypes: media.mealTypes } : {}),
        ...(media.mealType ? { mealType: media.mealType } : {}),
      }
    })

  return [...hardcodedWithMedia, ...fullRecipes]
}
