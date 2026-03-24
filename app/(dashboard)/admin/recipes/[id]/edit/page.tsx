'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { getCSRFToken } from '@/lib/csrf'
import { logger } from '@/lib/logger'
import { uploadRecipeImages } from '@/lib/recipe-upload'
import RecipeForm, { RecipeFormData } from '@/components/admin/RecipeForm'
import { clearRecipeCache } from '@/hooks/useRecipes'
import { MEAL_SUGGESTIONS } from '@/lib/meal-suggestions'
import { ArrowLeftIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function EditRecipePage() {
  const router = useRouter()
  const params = useParams()
  const recipeId = params.id as string
  const { isAdmin } = useAdminAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerateSteps = async () => {
    if (!initialData) return
    setGenerating(true)
    try {
      const ingredients = (initialData.ingredients || []).map(i => i.ingredientText || '')
      const res = await fetch('/api/recipes/generate-steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipe: {
            name: initialData.recipeName,
            description: initialData.description || '',
            mealType: initialData.mealType || 'lunch',
            prepTime: initialData.prepTime || 30,
            ingredients,
            dietaryTags: initialData.dietaryTags || [],
            servingSize: initialData.servingSize || 1,
          }
        })
      })
      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()

      // Save to Firestore
      const token = await getAdminAuthToken()
      const saveRes = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken()
        },
        body: JSON.stringify({
          recipeSteps: data.recipeSteps || [],
          cookingTips: data.cookingTips || [],
          requiresCooking: data.requiresCooking ?? true,
          ...(data.description ? { description: data.description } : {}),
          ...(data.suggestedDietaryTags?.length ? { dietaryTags: data.suggestedDietaryTags } : {}),
          ...(data.suggestedMealTypes?.length ? {
            mealType: data.suggestedMealTypes[0],
            mealTypes: data.suggestedMealTypes,
          } : {}),
          ...(data.suggestedIngredients?.length ? {
            ingredients: data.suggestedIngredients,
            ingredientsV2: data.suggestedIngredients.map((text: string) => ({
              ingredientText: text,
              quantity: 1,
              unit: 'serving',
            })),
          } : {}),
          ...(data.nutrition ? {
            calories: data.nutrition.calories,
            macros: {
              protein: data.nutrition.protein,
              carbs: data.nutrition.carbs,
              fat: data.nutrition.fat,
              fiber: data.nutrition.fiber,
              sodium: data.nutrition.sodium || 0,
            }
          } : {}),
        })
      })

      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to save regenerated recipe')
      }

      // Update form with new data
      setInitialData(prev => prev ? {
        ...prev,
        recipeSteps: data.recipeSteps || [''],
        cookingTips: data.cookingTips || [''],
        ...(data.description ? { description: data.description } : {}),
        ...(data.suggestedDietaryTags?.length ? { dietaryTags: data.suggestedDietaryTags as any } : {}),
        ...(data.suggestedIngredients?.length ? {
          ingredients: data.suggestedIngredients.map((text: string) => ({
            ingredientText: text,
            quantity: 1,
            unit: 'serving',
          })),
        } : {}),
        ...(data.suggestedMealTypes?.length ? {
          mealType: data.suggestedMealTypes[0],
        } : {}),
        ...(data.nutrition ? {
          aiNutrition: {
            calories: data.nutrition.calories,
            protein: data.nutrition.protein,
            carbs: data.nutrition.carbs,
            fat: data.nutrition.fat,
            fiber: data.nutrition.fiber,
          }
        } : {}),
      } : prev)

      clearRecipeCache()
      toast.success('Recipe generated!')
    } catch {
      toast.error('Failed to generate steps')
    } finally {
      setGenerating(false)
    }
  }
  const [initialData, setInitialData] = useState<Partial<RecipeFormData> & { existingImageUrls?: string[] } | undefined>(undefined)
  const [recipeFetchName, setRecipeFetchName] = useState('')

  useEffect(() => {
    if (!recipeId) return
    fetchRecipe()
  }, [recipeId])

  const fetchRecipe = async () => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const response = await fetch(`/api/admin/recipes/${recipeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recipe')
      }

      const responseData = await response.json()
      const firestoreRecipe = responseData.recipe

      // If media-only doc (no name), try to merge with hardcoded recipe
      let recipe = firestoreRecipe
      if (!firestoreRecipe.name) {
        const hardcoded = MEAL_SUGGESTIONS.find(r => r.id === recipeId)
        if (hardcoded) {
          recipe = { ...hardcoded, ...firestoreRecipe }
        } else {
          toast.error('This recipe has no content. Redirecting to create.')
          router.push('/admin/recipes/create')
          return
        }
      }

      setRecipeFetchName(recipe.name || '')

      // Map API recipe data to RecipeFormData
      const formData: Partial<RecipeFormData> & { existingImageUrls?: string[]; aiNutrition?: { calories: number; protein: number; carbs: number; fat: number; fiber: number } } = {
        recipeName: recipe.name || '',
        description: recipe.description || '',
        mealType: recipe.mealType || 'lunch',
        prepTime: recipe.prepTime ?? 30,
        servingSize: recipe.servingSize ?? 1,
        dietaryTags: recipe.dietaryTags || [],
        ingredients: recipe.ingredientsV2 || (recipe.ingredients || []).map((text: string) => ({
          ingredientText: text,
          quantity: 1,
          unit: 'serving'
        })),
        recipeSteps: recipe.recipeSteps?.length ? recipe.recipeSteps : [''],
        cookingTips: recipe.cookingTips?.length ? recipe.cookingTips : [''],
        existingImageUrls: recipe.imageUrls || [],
        ...(recipe.macros || recipe.calories ? {
          aiNutrition: {
            calories: recipe.calories || 0,
            protein: recipe.macros?.protein || 0,
            carbs: recipe.macros?.carbs || 0,
            fat: recipe.macros?.fat || 0,
            fiber: recipe.macros?.fiber || 0,
          }
        } : {})
      }

      setInitialData(formData)
    } catch (err) {
      logger.error('Fetch recipe error:', err as Error)
      toast.error('Failed to load recipe')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (data: RecipeFormData, imageFiles: File[], status: 'draft' | 'published') => {
    setSaving(true)

    try {
      const token = await getAdminAuthToken()
      const csrfToken = getCSRFToken()

      // Calculate nutrition from ingredients
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

      // Use product nutrition if available, otherwise preserve AI/existing nutrition
      const nutrition = hasProductNutrition
        ? {
            calories: Math.round(totalCalories / servingSize),
            macros: {
              protein: Math.round((totalProtein / servingSize) * 10) / 10,
              carbs: Math.round((totalCarbs / servingSize) * 10) / 10,
              fat: Math.round((totalFat / servingSize) * 10) / 10,
              fiber: Math.round((totalFiber / servingSize) * 10) / 10
            }
          }
        : initialData?.aiNutrition
          ? { calories: initialData.aiNutrition.calories, macros: { protein: initialData.aiNutrition.protein, carbs: initialData.aiNutrition.carbs, fat: initialData.aiNutrition.fat, fiber: initialData.aiNutrition.fiber } }
          : {}

      const recipePayload: Record<string, unknown> = {
        name: data.recipeName,
        description: data.description,
        mealType: data.mealType,
        prepTime: data.prepTime,
        servingSize: data.servingSize,
        dietaryTags: data.dietaryTags,
        ...nutrition,
        ingredientsV2: data.ingredients,
        ingredients: data.ingredients.map(i => i.ingredientText),
        autoCalculatedNutrition: true,
        recipeSteps: data.recipeSteps,
        cookingTips: data.cookingTips,
        status
      }

      // Upload new images if any
      let newImageUrls: string[] = []
      if (imageFiles.length > 0) {
        setUploadProgress(0)
        try {
          const uploadResult = await uploadRecipeImages(
            recipeId,
            data.recipeName,
            imageFiles,
            (progress) => setUploadProgress(progress)
          )
          newImageUrls = uploadResult.imageUrls
        } catch (uploadErr) {
          logger.error('Image upload error:', uploadErr as Error)
          toast.error('Image upload failed. Recipe will be saved without new images.')
        } finally {
          setUploadProgress(null)
        }
      }

      // Combine existing image URLs (that weren't removed) with newly uploaded ones
      const existingUrls = initialData?.existingImageUrls || []
      if (newImageUrls.length > 0 || existingUrls !== (initialData?.existingImageUrls || [])) {
        recipePayload.imageUrls = [...existingUrls, ...newImageUrls]
      }

      const response = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(recipePayload)
      })

      if (!response.ok) {
        throw new Error('Failed to update recipe')
      }

      clearRecipeCache()
      toast.success(`Recipe ${status === 'draft' ? 'saved as draft' : 'published'}!`)
      router.push('/admin/recipes')
    } catch (err) {
      logger.error('Update recipe error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to update recipe')
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
            You do not have permission to edit recipes.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/recipes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Recipes
          </Link>
          <h1 className="text-3xl font-bold text-foreground">Edit Recipe</h1>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading recipe...</p>
        </div>
      </div>
    )
  }

  if (!initialData) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/recipes"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeftIcon className="h-5 w-5" />
            Back to Recipes
          </Link>
        </div>
        <div className="text-center py-12 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold text-foreground mb-2">Recipe not found</h2>
          <p className="text-muted-foreground">
            The recipe could not be loaded. It may have been deleted.
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Edit Recipe</h1>
            {recipeFetchName && (
              <p className="text-muted-foreground mt-1">Editing: {recipeFetchName}</p>
            )}
          </div>
          <button
            onClick={handleGenerateSteps}
            disabled={generating || !initialData}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors font-medium"
          >
            <SparklesIcon className="h-5 w-5" />
            {generating ? 'Generating...' : 'Regenerate Recipe'}
          </button>
        </div>
      </div>

      {/* Recipe Form */}
      <RecipeForm
        initialData={initialData}
        onSave={handleSave}
        saving={saving}
        uploadProgress={uploadProgress}
      />
    </div>
  )
}
