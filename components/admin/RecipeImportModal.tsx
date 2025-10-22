'use client'

import { useState } from 'react'
import { importRecipeFromUrl, calculateRecipeNutrition, ImportedRecipe } from '@/lib/recipe-import'
import { MealSuggestion, MealType } from '@/lib/meal-suggestions'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { Spinner } from '@/components/ui/Spinner'

interface RecipeImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function RecipeImportModal({ isOpen, onClose, onSuccess }: RecipeImportModalProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'url' | 'preview' | 'saving'>('url')
  const [importedRecipe, setImportedRecipe] = useState<ImportedRecipe | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')

  const handleImport = async () => {
    if (!url.trim()) {
      toast.error('Please enter a recipe URL')
      return
    }

    setLoading(true)
    try {
      // Import recipe from URL
      const recipe = await importRecipeFromUrl(url)

      // Calculate nutrition if missing
      if (!recipe.calories || !recipe.protein || !recipe.carbs || !recipe.fat) {
        toast.loading('Calculating nutrition...', { id: 'nutrition' })
        const nutrition = await calculateRecipeNutrition(recipe)
        recipe.calories = nutrition.calories
        recipe.protein = nutrition.protein
        recipe.carbs = nutrition.carbs
        recipe.fat = nutrition.fat
        recipe.fiber = nutrition.fiber
        toast.dismiss('nutrition')
      }

      setImportedRecipe(recipe)
      setStep('preview')
      toast.success('Recipe imported successfully!')
    } catch (error: any) {
      console.error('Import error:', error)
      toast.error(error.message || 'Failed to import recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!importedRecipe) return

    setStep('saving')
    setLoading(true)

    try {
      // Convert ImportedRecipe to MealSuggestion format
      const perServingCalories = Math.round((importedRecipe.calories || 0) / (importedRecipe.servings || 1))
      const perServingProtein = Math.round(((importedRecipe.protein || 0) / (importedRecipe.servings || 1)) * 10) / 10
      const perServingCarbs = Math.round(((importedRecipe.carbs || 0) / (importedRecipe.servings || 1)) * 10) / 10
      const perServingFat = Math.round(((importedRecipe.fat || 0) / (importedRecipe.servings || 1)) * 10) / 10
      const perServingFiber = Math.round(((importedRecipe.fiber || 0) / (importedRecipe.servings || 1)) * 10) / 10

      const recipe: Partial<MealSuggestion> = {
        name: importedRecipe.name,
        description: importedRecipe.description,
        ingredients: importedRecipe.ingredients,
        instructions: importedRecipe.instructions,
        calories: perServingCalories,
        macros: {
          protein: perServingProtein,
          carbs: perServingCarbs,
          fat: perServingFat,
          fiber: perServingFiber
        },
        prepTime: importedRecipe.prepTime || 30,
        cookTime: importedRecipe.cookTime || 30,
        servings: importedRecipe.servings || 4,
        mealType,
        dietaryTags: importedRecipe.dietaryTags || [],
        imageUrls: importedRecipe.imageUrl ? [importedRecipe.imageUrl] : [],
        videoUrl: '',
        tags: [
          ...(importedRecipe.cuisine ? [importedRecipe.cuisine.toLowerCase()] : []),
          ...(importedRecipe.category ? [importedRecipe.category.toLowerCase()] : []),
          'imported'
        ],
        metadata: {
          sourceUrl: importedRecipe.sourceUrl,
          author: importedRecipe.author,
          rating: importedRecipe.rating,
          ratingCount: importedRecipe.ratingCount,
          imported: true,
          importedAt: new Date().toISOString()
        }
      }

      // Save to Firestore
      await addDoc(collection(db, 'recipes'), recipe)

      toast.success(`Recipe "${importedRecipe.name}" saved successfully!`)
      onSuccess?.()
      handleClose()
    } catch (error: any) {
      console.error('Save error:', error)
      toast.error(error.message || 'Failed to save recipe')
    } finally {
      setLoading(false)
      setStep('url')
    }
  }

  const handleClose = () => {
    setUrl('')
    setImportedRecipe(null)
    setStep('url')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Import Recipe from URL
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === 'url' && (
            <div>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Paste a recipe URL from popular sites like AllRecipes, Food Network, Bon Appétit, etc.
                We'll automatically extract the recipe details and nutrition information.
              </p>

              <div className="mb-6">
                <label htmlFor="recipe-url" className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Recipe URL
                </label>
                <input
                  id="recipe-url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://www.example.com/recipe/..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={loading}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleImport}
                  disabled={loading || !url.trim()}
                  className="flex-1 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Import Recipe
                    </>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>

              {/* Example URLs */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">✨ Supported Sites:</p>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li>• AllRecipes, Food Network, Bon Appétit, Serious Eats</li>
                  <li>• NYT Cooking, Epicurious, Tasty, Martha Stewart</li>
                  <li>• And many more! Works with any site using Schema.org Recipe markup</li>
                </ul>
              </div>
            </div>
          )}

          {step === 'preview' && importedRecipe && (
            <div>
              <div className="mb-6">
                {importedRecipe.imageUrl && (
                  <img
                    src={importedRecipe.imageUrl}
                    alt={importedRecipe.name}
                    className="w-full h-64 object-cover rounded-lg mb-4"
                  />
                )}
                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {importedRecipe.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {importedRecipe.description}
                </p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  {importedRecipe.prepTime && (
                    <span>⏱️ Prep: {importedRecipe.prepTime} min</span>
                  )}
                  {importedRecipe.cookTime && (
                    <span>🔥 Cook: {importedRecipe.cookTime} min</span>
                  )}
                  {importedRecipe.servings && (
                    <span>🍽️ Servings: {importedRecipe.servings}</span>
                  )}
                  {importedRecipe.author && (
                    <span>👨‍🍳 By {importedRecipe.author}</span>
                  )}
                </div>

                {/* Nutrition (per serving) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Calories</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round((importedRecipe.calories || 0) / (importedRecipe.servings || 1))}
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Protein</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(((importedRecipe.protein || 0) / (importedRecipe.servings || 1)) * 10) / 10}g
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Carbs</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(((importedRecipe.carbs || 0) / (importedRecipe.servings || 1)) * 10) / 10}g
                    </p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Fat</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {Math.round(((importedRecipe.fat || 0) / (importedRecipe.servings || 1)) * 10) / 10}g
                    </p>
                  </div>
                  {importedRecipe.fiber !== undefined && (
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-600 dark:text-gray-400">Fiber</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {Math.round(((importedRecipe.fiber || 0) / (importedRecipe.servings || 1)) * 10) / 10}g
                      </p>
                    </div>
                  )}
                </div>

                {/* Meal Type Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Meal Type
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                      <button
                        key={type}
                        onClick={() => setMealType(type)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          mealType === type
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Spinner size="sm" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Save Recipe
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setStep('url')
                    setImportedRecipe(null)
                  }}
                  disabled={loading}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
