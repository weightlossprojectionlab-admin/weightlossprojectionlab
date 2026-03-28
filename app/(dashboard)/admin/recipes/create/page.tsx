'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { uploadRecipeImages } from '@/lib/recipe-upload'
import RecipeForm, { RecipeFormData } from '@/components/admin/RecipeForm'
import { clearRecipeCache } from '@/hooks/useRecipes'
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CreateRecipePage() {
  const router = useRouter()
  const { isAdmin } = useAdminAuth()

  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  // URL Import state
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const [importedData, setImportedData] = useState<Partial<RecipeFormData> & { existingImageUrls?: string[]; aiNutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber: number } } | undefined>(undefined)
  const [importedSource, setImportedSource] = useState<string | undefined>(undefined)

  // AI Generate state
  const [aiRecipeName, setAiRecipeName] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleAIGenerate = async () => {
    const name = aiRecipeName.trim()
    if (!name) {
      toast.error('Enter a recipe name')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/recipes/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name,
            description: '',
            mealType: 'lunch',
            prepTime: 30,
            ingredients: [],
            dietaryTags: [],
            servingSize: 1,
          }
        })
      })

      if (!res.ok) throw new Error('Failed to generate recipe')
      const data = await res.json()

      const formData: Partial<RecipeFormData> & { existingImageUrls?: string[]; aiNutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber: number } } = {
        recipeName: name,
        description: data.description || '',
        mealType: data.suggestedMealTypes?.[0] || 'lunch',
        prepTime: 30,
        servingSize: 1,
        dietaryTags: data.suggestedDietaryTags || [],
        ingredients: (data.suggestedIngredients || []).map((text: string) => ({
          ingredientText: text,
          quantity: 1,
          unit: 'serving',
        })),
        recipeSteps: data.recipeSteps || [''],
        cookingTips: data.cookingTips || [],
        ...(data.nutrition ? {
          aiNutrition: {
            calories: data.nutrition.calories,
            protein: data.nutrition.protein,
            carbs: data.nutrition.carbs,
            fat: data.nutrition.fat,
            fiber: data.nutrition.fiber,
          }
        } : {}),
      }

      setImportedData(formData)
      setImportedSource(undefined)
      toast.success(`Recipe generated: ${name}`)
    } catch (err) {
      logger.error('AI generate error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to generate recipe')
    } finally {
      setGenerating(false)
    }
  }

  const handleImport = async () => {
    const cleanUrl = importUrl.trim()
    if (!cleanUrl) {
      toast.error('Please enter a URL')
      return
    }

    try {
      new URL(cleanUrl)
    } catch {
      toast.error('Please enter a valid URL (e.g., https://example.com/recipe)')
      return
    }

    setImporting(true)
    try {
      const token = await getAdminAuthToken()
      const response = await fetch(`/api/recipes/import?url=${encodeURIComponent(cleanUrl)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Import failed' }))
        throw new Error(err.error || 'Failed to import recipe')
      }

      const { recipe } = await response.json()

      // Map imported recipe to RecipeFormData
      const mealType = recipe.category === 'breakfast' ? 'breakfast'
        : recipe.category === 'dinner' ? 'dinner'
        : recipe.category === 'snack' ? 'snack'
        : 'lunch'

      const formData: Partial<RecipeFormData> & { existingImageUrls?: string[]; aiNutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber: number } } = {
        recipeName: recipe.name || '',
        description: recipe.description || '',
        mealType,
        prepTime: recipe.prepTime || recipe.totalTime || 30,
        servingSize: recipe.servings || 1,
        dietaryTags: recipe.dietaryTags || [],
        ingredients: (recipe.ingredients || []).map((text: string) => ({
          ingredientText: text,
          quantity: 1,
          unit: 'serving'
        })),
        recipeSteps: recipe.instructions || [''],
        cookingTips: [],
        existingImageUrls: recipe.imageUrl ? [recipe.imageUrl] : []
      }

      setImportedData(formData)

      // Extract domain for source badge
      try {
        const domain = new URL(importUrl).hostname.replace('www.', '')
        setImportedSource(domain)
      } catch {
        setImportedSource(importUrl)
      }

      toast.success(`Recipe imported: ${recipe.name}`)
    } catch (err) {
      logger.error('Import error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to import recipe')
    } finally {
      setImporting(false)
    }
  }

  const handleSave = async (data: RecipeFormData, imageFiles: File[], status: 'draft' | 'published', existingImageUrls?: string[]) => {
    setSaving(true)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()

      // Calculate nutrition from ingredients (product database)
      let totalCalories = 0
      let totalProtein = 0
      let totalCarbs = 0
      let totalFat = 0
      let totalFiber = 0

      data.ingredients.forEach(ingredient => {
        if (ingredient.nutrition) {
          totalCalories += ingredient.nutrition.calories * ingredient.quantity
          totalProtein += ingredient.nutrition.protein * ingredient.quantity
          totalCarbs += ingredient.nutrition.carbs * ingredient.quantity
          totalFat += ingredient.nutrition.fat * ingredient.quantity
          totalFiber += ingredient.nutrition.fiber * ingredient.quantity
        }
      })

      const servingSize = data.servingSize || 1
      const hasProductNutrition = totalCalories > 0

      // Fallback to AI-generated nutrition when no product nutrition available
      const aiNutrition = importedData?.aiNutrition
      const finalCalories = hasProductNutrition ? Math.round(totalCalories / servingSize) : (aiNutrition?.calories || 0)
      const finalMacros = hasProductNutrition
        ? {
            protein: Math.round((totalProtein / servingSize) * 10) / 10,
            carbs: Math.round((totalCarbs / servingSize) * 10) / 10,
            fat: Math.round((totalFat / servingSize) * 10) / 10,
            fiber: Math.round((totalFiber / servingSize) * 10) / 10,
          }
        : {
            protein: aiNutrition?.protein || 0,
            carbs: aiNutrition?.carbs || 0,
            fat: aiNutrition?.fat || 0,
            fiber: aiNutrition?.fiber || 0,
          }

      const recipePayload = {
        name: data.recipeName,
        description: data.description,
        mealType: data.mealType,
        prepTime: data.prepTime,
        servingSize: data.servingSize,
        dietaryTags: data.dietaryTags,
        calories: finalCalories,
        macros: finalMacros,
        ingredientsV2: data.ingredients,
        ingredients: data.ingredients.map(i => i.ingredientText),
        autoCalculatedNutrition: true,
        recipeSteps: data.recipeSteps,
        cookingTips: data.cookingTips,
        status,
        allergens: [],
        ...(existingImageUrls?.length ? { imageUrls: existingImageUrls } : {})
      }

      const response = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(recipePayload)
      })

      if (!response.ok) {
        throw new Error('Failed to create recipe')
      }

      const responseData = await response.json()
      const recipeId = responseData.recipe?.id || responseData.data?.id || responseData.id

      // Upload images if any
      if (imageFiles.length > 0 && recipeId) {
        setUploadProgress(0)
        try {
          const { imageUrls } = await uploadRecipeImages(
            recipeId,
            data.recipeName,
            imageFiles,
            (progress) => setUploadProgress(progress)
          )

          await fetch(`/api/admin/recipes/${recipeId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': csrfToken,
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ imageUrls })
          })
        } catch (uploadErr) {
          logger.error('Image upload error:', uploadErr as Error)
          toast.error('Recipe saved but image upload failed. You can add images later.')
        } finally {
          setUploadProgress(null)
        }
      }

      clearRecipeCache()
      toast.success(`Recipe ${status === 'draft' ? 'saved as draft' : 'published'}!`)
      router.push('/admin/recipes')
    } catch (err) {
      logger.error('Save recipe error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
            You do not have permission to create recipes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/admin/recipes"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeftIcon className="h-5 w-5" />
          Back to Recipes
        </Link>
        <h1 className="text-3xl font-bold text-foreground">Create New Recipe</h1>
        <p className="text-muted-foreground mt-1">Build recipes using verified products from the database</p>
      </div>

      {/* URL Import Section */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-3">Import from URL</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Paste a recipe URL to auto-fill the form with recipe data.
        </p>
        <div className="flex gap-2">
          <input
            type="url"
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleImport()}
            placeholder="https://www.example.com/recipe/..."
            className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-6 py-2 bg-primary hover:bg-primary-hover disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {importing ? 'Importing...' : 'Import'}
          </button>
        </div>
      </div>

      {/* AI Generate Section */}
      <div className="bg-card rounded-lg shadow p-6 mb-6 border border-purple-200 dark:border-purple-800">
        <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-purple-500" />
          AI Generate from Name
        </h2>
        <p className="text-sm text-muted-foreground mb-3">
          Just enter a recipe name and AI will generate the full recipe — ingredients, steps, nutrition, and tags.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={aiRecipeName}
            onChange={(e) => setAiRecipeName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAIGenerate()}
            placeholder="e.g. Chicken Alfredo, Vegan Buddha Bowl, Banana Pancakes..."
            className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
          />
          <button
            onClick={handleAIGenerate}
            disabled={generating}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            {generating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate
              </>
            )}
          </button>
        </div>
      </div>

      {/* Recipe Form */}
      <RecipeForm
        initialData={importedData}
        onSave={handleSave}
        saving={saving}
        uploadProgress={uploadProgress}
        importedSource={importedSource}
      />
    </div>
  )
}
