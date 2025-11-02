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
import { MealSuggestion, RecipeStatus, MealType } from './meal-suggestions'
import { logger } from '@/lib/logger'

const RECIPES_COLLECTION = 'recipes'

/**
 * Convert Firestore document data to MealSuggestion
 */
function firestoreToRecipe(id: string, data: DocumentData): MealSuggestion {
  return {
    ...data,
    firestoreId: id,
    createdAt: data.createdAt?.toDate?.() || data.createdAt,
    updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
    mediaUploadedAt: data.mediaUploadedAt?.toDate?.() || data.mediaUploadedAt,
  } as MealSuggestion
}

/**
 * Convert MealSuggestion to Firestore-ready data
 */
function recipeToFirestore(recipe: MealSuggestion): DocumentData {
  const now = Timestamp.now()

  return {
    ...recipe,
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

    const data = recipeToFirestore(recipe)

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
 * Get a single recipe by ID
 */
export async function getRecipeById(recipeId: string): Promise<MealSuggestion | null> {
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
 */
export async function getPublishedRecipes(options?: {
  mealType?: MealType
  limit?: number
}): Promise<MealSuggestion[]> {
  try {
    const constraints: QueryConstraint[] = [
      where('status', '==', 'published'),
      orderBy('popularity', 'desc'),
      orderBy('createdAt', 'desc'),
    ]

    if (options?.mealType) {
      constraints.unshift(where('mealType', '==', options.mealType))
    }

    if (options?.limit) {
      constraints.push(limit(options.limit))
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
 */
export async function getDraftRecipes(): Promise<MealSuggestion[]> {
  try {
    const recipesQuery = query(
      collection(db, RECIPES_COLLECTION),
      where('status', '==', 'draft'),
      orderBy('createdAt', 'desc')
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
 */
export async function searchRecipes(searchTerm: string): Promise<MealSuggestion[]> {
  try {
    // Firestore doesn't support full-text search natively
    // This is a simple implementation - for production, consider Algolia or similar
    const recipesQuery = query(
      collection(db, RECIPES_COLLECTION),
      where('status', '==', 'published'),
      orderBy('name')
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
