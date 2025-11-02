'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { MealSuggestion } from '@/lib/meal-suggestions'
import { saveRecipeToFirestore } from '@/lib/firestore-recipes'
import { requiresCooking, getRecipeActionLabel } from '@/lib/meal-suggestions'
import { XMarkIcon, CheckCircleIcon, TrashIcon, PlusIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

interface RecipeEditorProps {
  recipe: MealSuggestion
  onClose: () => void
  onSuccess: () => void
}

export function RecipeEditor({ recipe: initialRecipe, onClose, onSuccess }: RecipeEditorProps) {
  const { user } = useAuth()
  const [recipe, setRecipe] = useState<MealSuggestion>(initialRecipe)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!user) return

    setSaving(true)
    try {
      await saveRecipeToFirestore(recipe, user.uid)
      toast.success('Recipe saved successfully')
      onSuccess()
    } catch (error) {
      logger.error('Error saving recipe:', error as Error)
      toast.error('Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  function addStep() {
    setRecipe({
      ...recipe,
      recipeSteps: [...(recipe.recipeSteps || []), ''],
    })
  }

  function updateStep(index: number, value: string) {
    const newSteps = [...(recipe.recipeSteps || [])]
    newSteps[index] = value
    setRecipe({ ...recipe, recipeSteps: newSteps })
  }

  function removeStep(index: number) {
    const newSteps = recipe.recipeSteps?.filter((_, i) => i !== index) || []
    setRecipe({ ...recipe, recipeSteps: newSteps })
  }

  function addTip() {
    setRecipe({
      ...recipe,
      cookingTips: [...(recipe.cookingTips || []), ''],
    })
  }

  function updateTip(index: number, value: string) {
    const newTips = [...(recipe.cookingTips || [])]
    newTips[index] = value
    setRecipe({ ...recipe, cookingTips: newTips })
  }

  function removeTip(index: number) {
    const newTips = recipe.cookingTips?.filter((_, i) => i !== index) || []
    setRecipe({ ...recipe, cookingTips: newTips })
  }

  const needsCooking = requiresCooking(recipe)
  const actionLabel = getRecipeActionLabel(recipe)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Edit Recipe</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:bg-gray-400 text-sm font-medium"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Cook/Prepare Detection */}
          <div
            className={`p-4 rounded-lg ${
              needsCooking ? 'bg-orange-50 border border-orange-200' : 'bg-blue-50 border border-blue-200'
            }`}
          >
            <div className="flex items-center">
              <span className="text-2xl mr-2">{needsCooking ? '🔥' : '✓'}</span>
              <div>
                <p className="font-medium text-gray-900">
                  {needsCooking ? 'Requires Cooking' : 'Prepare Only'}
                </p>
                <p className="text-sm text-gray-600">
                  Users will see "{actionLabel} Now" button
                </p>
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recipe Name</label>
              <input
                type="text"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
              <select
                value={recipe.mealType}
                onChange={(e) =>
                  setRecipe({ ...recipe, mealType: e.target.value as any })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Calories</label>
              <input
                type="number"
                value={recipe.calories}
                onChange={(e) => setRecipe({ ...recipe, calories: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prep Time (min)</label>
              <input
                type="number"
                value={recipe.prepTime}
                onChange={(e) => setRecipe({ ...recipe, prepTime: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={recipe.description}
              onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Macros */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Macros</label>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Protein (g)</label>
                <input
                  type="number"
                  value={recipe.macros.protein}
                  onChange={(e) =>
                    setRecipe({
                      ...recipe,
                      macros: { ...recipe.macros, protein: parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Carbs (g)</label>
                <input
                  type="number"
                  value={recipe.macros.carbs}
                  onChange={(e) =>
                    setRecipe({
                      ...recipe,
                      macros: { ...recipe.macros, carbs: parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fat (g)</label>
                <input
                  type="number"
                  value={recipe.macros.fat}
                  onChange={(e) =>
                    setRecipe({
                      ...recipe,
                      macros: { ...recipe.macros, fat: parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Fiber (g)</label>
                <input
                  type="number"
                  value={recipe.macros.fiber}
                  onChange={(e) =>
                    setRecipe({
                      ...recipe,
                      macros: { ...recipe.macros, fiber: parseInt(e.target.value) },
                    })
                  }
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
            </div>
          </div>

          {/* Recipe Steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Recipe Steps</label>
              <button
                onClick={addStep}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Step
              </button>
            </div>
            <div className="space-y-2">
              {(recipe.recipeSteps || []).map((step, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-sm text-gray-500 mt-2">{index + 1}.</span>
                  <input
                    type="text"
                    value={step}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder="Enter step description"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={() => removeStep(index)}
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!recipe.recipeSteps || recipe.recipeSteps.length === 0) && (
                <p className="text-sm text-gray-500">No steps yet. Click "Add Step" to begin.</p>
              )}
            </div>
          </div>

          {/* Cooking Tips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Cooking Tips</label>
              <button
                onClick={addTip}
                className="text-sm text-primary-600 hover:text-primary-700 flex items-center"
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Add Tip
              </button>
            </div>
            <div className="space-y-2">
              {(recipe.cookingTips || []).map((tip, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <span className="text-sm text-gray-500 mt-2">💡</span>
                  <input
                    type="text"
                    value={tip}
                    onChange={(e) => updateTip(index, e.target.value)}
                    placeholder="Enter cooking tip"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                  <button
                    onClick={() => removeTip(index)}
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {(!recipe.cookingTips || recipe.cookingTips.length === 0) && (
                <p className="text-sm text-gray-500">No tips yet. Click "Add Tip" to begin.</p>
              )}
            </div>
          </div>

          {/* Force Cooking Flag */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresCooking"
              checked={recipe.requiresCooking || false}
              onChange={(e) => setRecipe({ ...recipe, requiresCooking: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="requiresCooking" className="ml-2 text-sm text-gray-700">
              Force "Requires Cooking" flag (overrides keyword detection)
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
