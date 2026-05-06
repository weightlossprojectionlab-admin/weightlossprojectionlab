/**
 * Firestore Recipe Operations
 *
 * Handles all Firestore interactions for the dynamic recipe library system.
 * Provides functions for saving, fetching, and managing AI-generated recipes.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryConstraint,
  updateDoc,
  increment
} from 'firebase/firestore'
import { db } from './firebase'
import { MealSuggestion, RecipeStatus, MealType, MEAL_SUGGESTIONS, AllergyTag } from './meal-suggestions'
import { logger } from '@/lib/logger'
import {
  packIngredientAllergens,
  unpackIngredientAllergens,
} from './allergen-pack'

const RECIPES_COLLECTION = 'recipes'

/**
 * Sync lookup against the bundled MEAL_SUGGESTIONS catalog. Returns
 * the recipe when its id matches one of the hardcoded entries; null
 * otherwise. No network — safe for render-time access.
 *
 * Use when the caller knows the recipe id is hardcoded (deep-link,
 * recipe queue, cooking session pulled from a session.recipeId
 * that was set from a hardcoded recipe). When the source is
 * unknown, prefer the async getRecipeById which checks both.
 */
export function getRecipeByIdLocal(recipeId: string): MealSuggestion | null {
  return MEAL_SUGGESTIONS.find((r) => r.id === recipeId) ?? null
}

/**
 * Convert Firestore document data to MealSuggestion. Unwraps the
 * ingredientAllergens field from its persistence shape (array of
 * `{ tags }` objects, since Firestore disallows nested arrays) back
 * to the consumer-facing `AllergyTag[][]` form.
 */
function firestoreToRecipe(id: string, data: DocumentData): MealSuggestion {
  return {
    ...data,
    ingredientAllergens: unpackIngredientAllergens(data.ingredientAllergens),
    firestoreId: id,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    mediaUploadedAt: data.mediaUploadedAt?.toDate?.() || data.mediaUploadedAt,
  } as MealSuggestion
}

/**
 * Convert MealSuggestion to Firestore-ready data. Packs
 * ingredientAllergens into an array of `{ tags }` objects since
 * Firestore disallows nested arrays. Pair with
 * `firestoreToRecipe` on read.
 */
function recipeToFirestore(recipe: MealSuggestion): DocumentData {
  const now = Timestamp.now()

  return {
    ...recipe,
    ingredientAllergens: recipe.ingredientAllergens
      ? packIngredientAllergens(recipe.ingredientAllergens)
      : undefined,
    createdAt: recipe.createdAt ? Timestamp.fromDate(new Date(recipe.createdAt)) : now,
    updatedAt: now,
    mediaUploadedAt: recipe.mediaUploadedAt
      ? Timestamp.fromDate(new Date(recipe.mediaUploadedAt))
      : undefined,
    // Don't store firestoreId in the document itself
    firestoreId: undefined,
  }
}

/**
 * Enrich a recipe with per-ingredient allergen tags via the
 * server-side classifier endpoint. Best-effort: any failure (network,
 * rate limit, Gemini error) returns the recipe unchanged so the save
 * path always proceeds. Recipe-level allergen safety is unaffected.
 *
 * Skips the round-trip when:
 *   - No ingredients to classify
 *   - ingredientAllergens already present and length-matched (cached)
 */
async function enrichWithIngredientAllergens(
  recipe: MealSuggestion
): Promise<MealSuggestion> {
  const ingredients = recipe.ingredients
  if (!ingredients?.length) return recipe

  // Cache hit: parallel arrays match length, treat as up-to-date.
  if (
    recipe.ingredientAllergens &&
    recipe.ingredientAllergens.length === ingredients.length
  ) {
    return recipe
  }

  try {
    const res = await fetch('/api/recipes/classify-allergens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ingredients,
        recipeAllergens: recipe.allergens || [],
      }),
    })
    if (!res.ok) {
      logger.warn('[firestore-recipes] classify-allergens endpoint returned non-ok', { status: res.status })
      return recipe
    }
    const data = (await res.json()) as { ingredientAllergens?: AllergyTag[][] }
    if (!Array.isArray(data.ingredientAllergens)) return recipe
    return { ...recipe, ingredientAllergens: data.ingredientAllergens }
  } catch (err) {
    logger.warn('[firestore-recipes] classify-allergens enrichment failed; saving without per-ingredient tags', { error: err })
    return recipe
  }
}

/**
 * Save a recipe to Firestore (create or update)
 */
export async function saveRecipeToFirestore(
  recipe: MealSuggestion,
  userId?: string
): Promise<string> {
  try {
    // Use existing firestoreId or recipe.id as document ID
    const docId = recipe.firestoreId || recipe.id
    const recipeRef = doc(db, RECIPES_COLLECTION, docId)

    // Enrich with per-ingredient allergen tags before persisting.
    // Best-effort — failures here don't block the save.
    const enriched = await enrichWithIngredientAllergens(recipe)

    const data = recipeToFirestore(enriched)

    // Add metadata if creating
    if (!recipe.createdAt) {
      data.createdAt = Timestamp.now()
      data.curatedBy = userId
    }

    await setDoc(recipeRef, data, { merge: true })

    return docId
  } catch (error) {
    logger.error('Error saving recipe to Firestore', error as Error)
    throw error
  }
}

/**
 * Get a single recipe by ID — canonical lookup.
 *
 * Resolution order:
 *   1. Bundled MEAL_SUGGESTIONS catalog (sync, no network) — covers
 *      deep-links to hardcoded recipes (dn006, etc.) which are the
 *      majority of cooked / queued / shopped-for recipes today.
 *   2. Firestore /recipes/{id} — for admin-created recipes.
 *
 * Returns null when neither source has the id. Single source of
 * truth for "look up a recipe by id" — replaces the 7 ad-hoc
 * MEAL_SUGGESTIONS.find(r => r.id === id) patterns scattered
 * across the codebase, plus the original Firestore-only lookup.
 */
export async function getRecipeById(recipeId: string): Promise<MealSuggestion | null> {
  const local = getRecipeByIdLocal(recipeId)
  if (local) return local

  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId)
    const recipeDoc = await getDoc(recipeRef)

    if (!recipeDoc.exists()) {
      return null
    }

    return firestoreToRecipe(recipeDoc.id, recipeDoc.data())
  } catch (error) {
    logger.error('Error fetching recipe', error as Error)
    throw error
  }
}

/**
 * Get all published recipes (for public consumption)
 * SEC-007: Always enforces pagination (default 50, max 50)
 */
export async function getPublishedRecipes(options?: {
  mealType?: MealType
  limit?: number
}): Promise<MealSuggestion[]> {
  try {
    // SEC-007: Enforce limit <= 50 as per Firestore rules
    const queryLimit = Math.min(options?.limit || 50, 50)

    const constraints: QueryConstraint[] = [
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
      limit(queryLimit),
    ]

    if (options?.mealType) {
      constraints.unshift(where('mealType', '==', options.mealType))
    }

    const recipesQuery = query(collection(db, RECIPES_COLLECTION), ...constraints)
    const snapshot = await getDocs(recipesQuery)

    return snapshot.docs.map((doc) => firestoreToRecipe(doc.id, doc.data()))
  } catch (error) {
    logger.error('Error fetching published recipes', error as Error)
    throw error
  }
}

/**
 * Get draft recipes (admin only)
 * SEC-007: Enforces pagination limit
 */
export async function getDraftRecipes(maxLimit: number = 50): Promise<MealSuggestion[]> {
  try {
    // SEC-007: Enforce limit <= 50 as per Firestore rules
    const queryLimit = Math.min(maxLimit, 50)

    const recipesQuery = query(
      collection(db, RECIPES_COLLECTION),
      where('status', '==', 'draft'),
      orderBy('createdAt', 'desc'),
      limit(queryLimit)
    )
    const snapshot = await getDocs(recipesQuery)

    return snapshot.docs.map((doc) => firestoreToRecipe(doc.id, doc.data()))
  } catch (error) {
    logger.error('Error fetching draft recipes', error as Error)
    throw error
  }
}

/**
 * Update recipe status (draft -> published -> archived)
 */
export async function updateRecipeStatus(
  recipeId: string,
  status: RecipeStatus,
  userId?: string
): Promise<void> {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId)

    const updateData: DocumentData = {
      status,
      updatedAt: Timestamp.now(),
    }

    // If publishing, record who published it
    if (status === 'published' && userId) {
      updateData.curatedBy = userId
    }

    await updateDoc(recipeRef, updateData)
  } catch (error) {
    logger.error('Error updating recipe status', error as Error)
    throw error
  }
}

/**
 * Increment recipe popularity count (when user selects it)
 */
export async function incrementRecipePopularity(recipeId: string): Promise<void> {
  try {
    const recipeRef = doc(db, RECIPES_COLLECTION, recipeId)
    await updateDoc(recipeRef, {
      popularity: increment(1),
    })
  } catch (error) {
    logger.error('Error incrementing recipe popularity', error as Error)
    // Don't throw - popularity tracking is non-critical
  }
}

/**
 * Bulk save recipes (for migration)
 */
export async function bulkSaveRecipes(
  recipes: MealSuggestion[],
  userId?: string
): Promise<{ success: number; failed: number; errors: Error[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as Error[],
  }

  for (const recipe of recipes) {
    try {
      await saveRecipeToFirestore(recipe, userId)
      results.success++
    } catch (error) {
      results.failed++
      results.errors.push(
        error instanceof Error ? error : new Error(`Failed to save recipe ${recipe.id}`)
      )
    }
  }

  return results
}

/**
 * Search recipes by name or ingredients
 * SEC-007: Enforces pagination limit
 */
export async function searchRecipes(searchTerm: string, maxLimit: number = 50): Promise<MealSuggestion[]> {
  try {
    // SEC-007: Enforce limit <= 50 as per Firestore rules
    const queryLimit = Math.min(maxLimit, 50)

    // Firestore doesn't support full-text search natively
    // This is a simple implementation - for production, consider Algolia or similar
    const recipesQuery = query(
      collection(db, RECIPES_COLLECTION),
      where('status', '==', 'published'),
      orderBy('name'),
      limit(queryLimit)
    )

    const snapshot = await getDocs(recipesQuery)
    const allRecipes = snapshot.docs.map((doc) => firestoreToRecipe(doc.id, doc.data()))

    // Filter client-side (not optimal for large datasets)
    const searchLower = searchTerm.toLowerCase()
    return allRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(searchLower) ||
        recipe.description.toLowerCase().includes(searchLower) ||
        recipe.ingredients.some((ing) => ing.toLowerCase().includes(searchLower))
    )
  } catch (error) {
    logger.error('Error searching recipes', error as Error)
    throw error
  }
}
