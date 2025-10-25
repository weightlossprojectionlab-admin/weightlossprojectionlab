'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { MealType, DietaryTag, MealSuggestion } from '@/lib/meal-suggestions'
import { generateRecipeSteps } from '@/lib/ai-recipe-generator'
import { saveRecipeToFirestore } from '@/lib/firestore-recipes'
import { requiresCooking, getRecipeActionLabel } from '@/lib/meal-suggestions'
import {
  XMarkIcon,
  SparklesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

interface RecipeGeneratorProps {
  onClose: () => void
  onSuccess: () => void
}

interface RecipeParams {
  mealType: MealType
  calories: number
  protein: number
  dietaryTags: DietaryTag[]
  count: number
}

export function RecipeGenerator({ onClose, onSuccess }: RecipeGeneratorProps) {
  const { user } = useAuth()

  const [params, setParams] = useState<RecipeParams>({
    mealType: 'lunch',
    calories: 500,
    protein: 30,
    dietaryTags: [],
    count: 5,
  })

  const [generating, setGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [generatedRecipes, setGeneratedRecipes] = useState<MealSuggestion[]>([])

  async function handleGenerate() {
    if (!user) {
      toast.error('You must be logged in')
      return
    }

    setGenerating(true)
    setProgress({ current: 0, total: params.count })
    setGeneratedRecipes([])

    try {
      const recipes: MealSuggestion[] = []

      for (let i = 0; i < params.count; i++) {
        setProgress({ current: i + 1, total: params.count })

        // Create a base recipe template
        const baseRecipe: MealSuggestion = {
          id: `ai-${Date.now()}-${i}`,
          name: `AI Generated ${params.mealType} Recipe ${i + 1}`,
          mealType: params.mealType,
          calories: params.calories,
          macros: {
            protein: params.protein,
            carbs: Math.round((params.calories - params.protein * 4) / 4 * 0.6),
            fat: Math.round((params.calories - params.protein * 4) / 9 * 0.4),
            fiber: 6,
          },
          ingredients: ['To be generated'],
          prepTime: 20,
          dietaryTags: params.dietaryTags,
          allergens: [],
          description: `A delicious ${params.mealType} recipe with ${params.calories} calories`,
          servingSize: 1,
          status: 'draft',
          generatedByAI: true,
        }

        try {
          // Generate steps with AI
          const generated = await generateRecipeSteps({ recipe: baseRecipe })

          // Update recipe with AI-generated data
          baseRecipe.recipeSteps = generated.recipeSteps
          baseRecipe.cookingTips = generated.cookingTips
          baseRecipe.requiresCooking = generated.requiresCooking

          recipes.push(baseRecipe)
        } catch (error) {
          console.error(`Failed to generate recipe ${i + 1}:`, error)
          toast.error(`Failed to generate recipe ${i + 1}`)
        }

        // Delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }

      setGeneratedRecipes(recipes)
      toast.success(`Generated ${recipes.length} recipes!`)
    } catch (error) {
      console.error('Error generating recipes:', error)
      toast.error('Failed to generate recipes')
    } finally {
      setGenerating(false)
    }
  }

  async function handleSaveAll() {
    if (!user) return

    try {
      let saved = 0
      for (const recipe of generatedRecipes) {
        try {
          await saveRecipeToFirestore(recipe, user.uid)
          saved++
        } catch (error) {
          console.error('Failed to save recipe:', error)
        }
      }

      toast.success(`Saved ${saved} recipes as drafts`)
      onSuccess()
    } catch (error) {
      console.error('Error saving recipes:', error)
      toast.error('Failed to save recipes')
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <SparklesIcon className="w-6 h-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">AI Recipe Generator</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
            disabled={generating}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Generation Parameters */}
          {generatedRecipes.length === 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Type
                </label>
                <select
                  value={params.mealType}
                  onChange={(e) => setParams({ ...params, mealType: e.target.value as MealType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  disabled={generating}
                >
                  <option value="breakfast">Breakfast</option>
                  <option value="lunch">Lunch</option>
                  <option value="dinner">Dinner</option>
                  <option value="snack">Snack</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Calories: {params.calories}
                </label>
                <input
                  type="range"
                  min="200"
                  max="800"
                  step="50"
                  value={params.calories}
                  onChange={(e) => setParams({ ...params, calories: parseInt(e.target.value) })}
                  className="w-full"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Target Protein (g): {params.protein}
                </label>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={params.protein}
                  onChange={(e) => setParams({ ...params, protein: parseInt(e.target.value) })}
                  className="w-full"
                  disabled={generating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Recipes: {params.count}
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={params.count}
                  onChange={(e) => setParams({ ...params, count: parseInt(e.target.value) })}
                  className="w-full"
                  disabled={generating}
                />
              </div>

              <div>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full px-4 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 font-medium"
                >
                  {generating ? 'Generating...' : 'Generate Recipes with AI'}
                </button>
              </div>

              {generating && (
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Generating recipe {progress.current} of {progress.total}...
                  </p>
                  <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Generated Recipes Preview */}
          {generatedRecipes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">
                  Generated {generatedRecipes.length} recipe(s). Review and save as drafts.
                </p>
                <button
                  onClick={handleSaveAll}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  Save All as Drafts
                </button>
              </div>

              {generatedRecipes.map((recipe, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{recipe.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{recipe.description}</p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>{recipe.calories} cal</span>
                        <span>{recipe.macros.protein}g protein</span>
                        <span>{recipe.prepTime} min</span>
                      </div>
                    </div>

                    <div className="ml-4">
                      {recipe.requiresCooking ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          🔥 Requires Cooking
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          ✓ Prepare Only
                        </span>
                      )}
                    </div>
                  </div>

                  {recipe.recipeSteps && recipe.recipeSteps.length > 0 && (
                    <div className="mt-3 pl-4 border-l-2 border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-1">Steps:</p>
                      <ol className="text-xs text-gray-600 space-y-1">
                        {recipe.recipeSteps.map((step, i) => (
                          <li key={i}>
                            {i + 1}. {step}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
