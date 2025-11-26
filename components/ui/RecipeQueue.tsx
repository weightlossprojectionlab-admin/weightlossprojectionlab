'use client'

import { useState, useEffect, memo } from 'react'
import { useRouter } from 'next/navigation'
import { recipeQueueOperations, cookingSessionOperations } from '@/lib/firebase-operations'
import { QueuedRecipe } from '@/types'
import { MEAL_SUGGESTIONS, getRecipeActionLabel } from '@/lib/meal-suggestions'
import { createStepTimers } from '@/lib/recipe-timer-parser'
import { scaleRecipe } from '@/lib/recipe-scaler'
import { Spinner } from '@/components/ui/Spinner'
import { addManualShoppingItem } from '@/lib/shopping-operations'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

export const RecipeQueue = memo(function RecipeQueue() {
  const router = useRouter()
  const [queue, setQueue] = useState<QueuedRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [startingRecipe, setStartingRecipe] = useState<string | null>(null)
  const [addingToShoppingList, setAddingToShoppingList] = useState(false)

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    try {
      const queueData = await recipeQueueOperations.getQueue()
      setQueue(queueData as QueuedRecipe[])
    } catch (error) {
      logger.error('Error loading recipe queue:', error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartCooking = async (queueItem: QueuedRecipe) => {
    setStartingRecipe(queueItem.id)

    try {
      const recipe = MEAL_SUGGESTIONS.find(r => r.id === queueItem.recipeId)
      if (!recipe || !recipe.recipeSteps || recipe.recipeSteps.length === 0) {
        toast.error('Recipe not found or has no instructions')
        return
      }

      // Scale the recipe
      const scaledRecipe = scaleRecipe(recipe, queueItem.servingSize)

      // Create cooking session
      const stepTimers = createStepTimers(recipe.recipeSteps)

      const session = await cookingSessionOperations.createCookingSession({
        recipeId: recipe.id,
        recipeName: recipe.name,
        servingSize: queueItem.servingSize,
        mealType: queueItem.mealType || recipe.mealType,
        currentStep: 0,
        totalSteps: recipe.recipeSteps.length,
        stepTimers: stepTimers,
        startedAt: new Date(),
        status: 'in-progress',
        scaledCalories: scaledRecipe.scaledCalories,
        scaledMacros: scaledRecipe.scaledMacros,
        scaledIngredients: scaledRecipe.scaledIngredients
      })

      // Remove from queue
      await recipeQueueOperations.removeFromQueue(queueItem.id)

      toast.success('Starting cooking session!')
      router.push(`/cooking/${session.id}`)
    } catch (error) {
      logger.error('Error starting cooking session:', error as Error)
      toast.error('Failed to start cooking session')
    } finally {
      setStartingRecipe(null)
    }
  }

  const handleRemoveFromQueue = async (queueId: string) => {
    try {
      await recipeQueueOperations.removeFromQueue(queueId)
      setQueue(prev => prev.filter(item => item.id !== queueId))
      toast.success('Removed from queue')
    } catch (error) {
      logger.error('Error removing from queue:', error as Error)
      toast.error('Failed to remove from queue')
    }
  }

  const handleAddAllToShoppingList = async () => {
    if (!auth.currentUser?.uid) {
      toast.error('You must be logged in')
      return
    }

    setAddingToShoppingList(true)

    try {
      // Collect all unique ingredients from all queued recipes
      const allIngredients = new Set<string>()
      const ingredientRecipeMap = new Map<string, string>() // Track which recipe each ingredient is from

      queue.forEach((queueItem) => {
        const recipe = MEAL_SUGGESTIONS.find(r => r.id === queueItem.recipeId)
        if (recipe && recipe.ingredients) {
          // Scale ingredients
          const scaledRecipe = scaleRecipe(recipe, queueItem.servingSize)
          scaledRecipe.scaledIngredients.forEach((ingredient) => {
            allIngredients.add(ingredient)
            if (!ingredientRecipeMap.has(ingredient)) {
              ingredientRecipeMap.set(ingredient, queueItem.recipeId)
            }
          })
        }
      })

      if (allIngredients.size === 0) {
        toast('No ingredients to add', { icon: 'ℹ️' })
        return
      }

      // Add all ingredients to shopping list
      const addPromises = Array.from(allIngredients).map((ingredient) =>
        addManualShoppingItem(auth.currentUser!.uid, ingredient, {
          recipeId: ingredientRecipeMap.get(ingredient),
          quantity: 1,
          priority: 'medium'
        })
      )

      await Promise.all(addPromises)

      toast.success(`✓ Added ${allIngredients.size} ingredient${allIngredients.size > 1 ? 's' : ''} to shopping list!`)
    } catch (error) {
      logger.error('Error adding queue ingredients to shopping list:', error as Error)
      toast.error('Failed to add ingredients')
    } finally {
      setAddingToShoppingList(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-background rounded-lg shadow-lg p-6 flex justify-center">
        <Spinner />
      </div>
    )
  }

  if (queue.length === 0) {
    return null // Don't show the widget if queue is empty
  }

  return (
    <div className="bg-background rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h2 className="text-xl font-bold text-foreground">Recipe Queue</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm bg-primary-light dark:bg-purple-900/20 text-primary px-3 py-1 rounded-full font-medium">
            {queue.length} {queue.length === 1 ? 'recipe' : 'recipes'}
          </span>
          <button
            onClick={handleAddAllToShoppingList}
            disabled={addingToShoppingList || queue.length === 0}
            className="px-3 py-1 text-xs bg-secondary text-white rounded-full hover:bg-secondary-hover transition-colors font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Add all recipe ingredients to shopping list"
          >
            {addingToShoppingList ? (
              <>
                <Spinner size="sm" className="w-3 h-3" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Shop All</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {queue.map((queueItem) => {
          const recipe = MEAL_SUGGESTIONS.find(r => r.id === queueItem.recipeId)
          const isStarting = startingRecipe === queueItem.id
          const actionLabel = recipe ? getRecipeActionLabel(recipe) : 'Cook'

          if (!recipe) return null

          return (
            <div
              key={queueItem.id}
              className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-foreground">{queueItem.recipeName}</h3>
                    {queueItem.mealType && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded capitalize">
                        {queueItem.mealType}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-3">
                    <span>{queueItem.servingSize} serving{queueItem.servingSize > 1 ? 's' : ''}</span>
                    <span>•</span>
                    <span>{recipe.prepTime} min</span>
                    <span>•</span>
                    <span>{Math.round(recipe.calories * (queueItem.servingSize / recipe.servingSize))} cal</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleStartCooking(queueItem)}
                      disabled={isStarting}
                      className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium text-sm flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isStarting ? (
                        <>
                          <Spinner size="sm" />
                          <span>Starting...</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Start {actionLabel}ing</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleRemoveFromQueue(queueItem.id)}
                      disabled={isStarting}
                      className="px-3 py-2 text-error hover:bg-error-light rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label="Remove from queue"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
})

