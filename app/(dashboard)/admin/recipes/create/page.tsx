'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { ProductSelector } from '@/components/admin/ProductSelector'
import { MealType, DietaryTag, RecipeIngredient } from '@/lib/meal-suggestions'
import { ArrowLeftIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface SelectedProduct {
  barcode: string
  productName: string
  brand: string
  imageUrl?: string
  quantity: number
  unit: string
  notes?: string
  optional?: boolean
  nutrition: {
    calories: number
    protein: number
    carbs: number
    fat: number
    saturatedFat?: number
    transFat?: number
    fiber: number
    sugars?: number
    addedSugars?: number
    sodium: number
    cholesterol?: number
    vitaminD?: number
    calcium?: number
    iron?: number
    potassium?: number
    servingSize: string
  }
}

export default function CreateRecipePage() {
  const router = useRouter()
  const { isAdmin } = useAdminAuth()

  // Recipe basic info
  const [recipeName, setRecipeName] = useState('')
  const [description, setDescription] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [prepTime, setPrepTime] = useState(30)
  const [servingSize, setServingSize] = useState(1)
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>([])

  // Ingredients
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [textIngredient, setTextIngredient] = useState('')

  // Recipe steps
  const [recipeSteps, setRecipeSteps] = useState<string[]>([''])
  const [cookingTips, setCookingTips] = useState<string[]>([''])

  // State
  const [saving, setSaving] = useState(false)

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  // Calculate total nutrition from ingredients
  const calculateNutrition = () => {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalSaturatedFat = 0
    let totalTransFat = 0
    let totalFiber = 0
    let totalSugars = 0
    let totalAddedSugars = 0
    let totalSodium = 0
    let totalCholesterol = 0
    let totalVitaminD = 0
    let totalCalcium = 0
    let totalIron = 0
    let totalPotassium = 0

    ingredients.forEach(ingredient => {
      if (ingredient.nutrition) {
        totalCalories += ingredient.nutrition.calories * ingredient.quantity
        totalProtein += ingredient.nutrition.protein * ingredient.quantity
        totalCarbs += ingredient.nutrition.carbs * ingredient.quantity
        totalFat += ingredient.nutrition.fat * ingredient.quantity
        totalSaturatedFat += (ingredient.nutrition.saturatedFat || 0) * ingredient.quantity
        totalTransFat += (ingredient.nutrition.transFat || 0) * ingredient.quantity
        totalFiber += ingredient.nutrition.fiber * ingredient.quantity
        totalSugars += (ingredient.nutrition.sugars || 0) * ingredient.quantity
        totalAddedSugars += (ingredient.nutrition.addedSugars || 0) * ingredient.quantity
        totalSodium += (ingredient.nutrition.sodium || 0) * ingredient.quantity
        totalCholesterol += (ingredient.nutrition.cholesterol || 0) * ingredient.quantity
        totalVitaminD += (ingredient.nutrition.vitaminD || 0) * ingredient.quantity
        totalCalcium += (ingredient.nutrition.calcium || 0) * ingredient.quantity
        totalIron += (ingredient.nutrition.iron || 0) * ingredient.quantity
        totalPotassium += (ingredient.nutrition.potassium || 0) * ingredient.quantity
      }
    })

    return {
      calories: Math.round(totalCalories / servingSize),
      protein: Math.round((totalProtein / servingSize) * 10) / 10,
      carbs: Math.round((totalCarbs / servingSize) * 10) / 10,
      fat: Math.round((totalFat / servingSize) * 10) / 10,
      saturatedFat: totalSaturatedFat > 0 ? Math.round((totalSaturatedFat / servingSize) * 10) / 10 : undefined,
      transFat: totalTransFat > 0 ? Math.round((totalTransFat / servingSize) * 10) / 10 : undefined,
      fiber: Math.round((totalFiber / servingSize) * 10) / 10,
      sugars: totalSugars > 0 ? Math.round((totalSugars / servingSize) * 10) / 10 : undefined,
      addedSugars: totalAddedSugars > 0 ? Math.round((totalAddedSugars / servingSize) * 10) / 10 : undefined,
      sodium: Math.round(totalSodium / servingSize),
      cholesterol: totalCholesterol > 0 ? Math.round((totalCholesterol / servingSize) * 10) / 10 : undefined,
      vitaminD: totalVitaminD > 0 ? Math.round((totalVitaminD / servingSize) * 10) / 10 : undefined,
      calcium: totalCalcium > 0 ? Math.round((totalCalcium / servingSize) * 10) / 10 : undefined,
      iron: totalIron > 0 ? Math.round((totalIron / servingSize) * 10) / 10 : undefined,
      potassium: totalPotassium > 0 ? Math.round((totalPotassium / servingSize) * 10) / 10 : undefined
    }
  }

  const handleAddProduct = (product: SelectedProduct) => {
    const newIngredient: RecipeIngredient = {
      productBarcode: product.barcode,
      productName: product.productName,
      productBrand: product.brand,
      productImageUrl: product.imageUrl,
      ingredientText: `${product.productName} (${product.quantity} ${product.unit})`,
      quantity: product.quantity,
      unit: product.unit,
      nutrition: {
        calories: product.nutrition.calories,
        protein: product.nutrition.protein,
        carbs: product.nutrition.carbs,
        fat: product.nutrition.fat,
        saturatedFat: product.nutrition.saturatedFat,
        transFat: product.nutrition.transFat,
        fiber: product.nutrition.fiber,
        sugars: product.nutrition.sugars,
        addedSugars: product.nutrition.addedSugars,
        sodium: product.nutrition.sodium || 0,
        cholesterol: product.nutrition.cholesterol,
        vitaminD: product.nutrition.vitaminD,
        calcium: product.nutrition.calcium,
        iron: product.nutrition.iron,
        potassium: product.nutrition.potassium
      },
      notes: product.notes,
      optional: product.optional
    }

    setIngredients([...ingredients, newIngredient])
    setShowProductSelector(false)
    toast.success(`Added ${product.productName} to recipe`)
  }

  const handleAddTextIngredient = () => {
    if (!textIngredient.trim()) return

    const newIngredient: RecipeIngredient = {
      ingredientText: textIngredient,
      quantity: 1,
      unit: 'serving'
    }

    setIngredients([...ingredients, newIngredient])
    setTextIngredient('')
    toast.success('Added ingredient to recipe')
  }

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index))
  }

  const handleAddStep = () => {
    setRecipeSteps([...recipeSteps, ''])
  }

  const handleUpdateStep = (index: number, value: string) => {
    const newSteps = [...recipeSteps]
    newSteps[index] = value
    setRecipeSteps(newSteps)
  }

  const handleRemoveStep = (index: number) => {
    setRecipeSteps(recipeSteps.filter((_, i) => i !== index))
  }

  const handleAddTip = () => {
    setCookingTips([...cookingTips, ''])
  }

  const handleUpdateTip = (index: number, value: string) => {
    const newTips = [...cookingTips]
    newTips[index] = value
    setCookingTips(newTips)
  }

  const handleRemoveTip = (index: number) => {
    setCookingTips(cookingTips.filter((_, i) => i !== index))
  }

  const toggleDietaryTag = (tag: DietaryTag) => {
    if (dietaryTags.includes(tag)) {
      setDietaryTags(dietaryTags.filter(t => t !== tag))
    } else {
      setDietaryTags([...dietaryTags, tag])
    }
  }

  const handleSave = async (status: 'draft' | 'published') => {
    // Validation
    if (!recipeName.trim()) {
      toast.error('Please enter a recipe name')
      return
    }

    if (ingredients.length === 0) {
      toast.error('Please add at least one ingredient')
      return
    }

    if (recipeSteps.filter(s => s.trim()).length === 0) {
      toast.error('Please add at least one recipe step')
      return
    }

    setSaving(true)

    try {
      const token = await getAuthToken()
      const nutrition = calculateNutrition()

      const recipeData = {
        name: recipeName,
        description,
        mealType,
        prepTime,
        servingSize,
        dietaryTags,
        calories: nutrition.calories,
        macros: {
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fat: nutrition.fat,
          fiber: nutrition.fiber
        },
        ingredientsV2: ingredients,
        ingredients: ingredients.map(i => i.ingredientText), // Backward compatibility
        autoCalculatedNutrition: true,
        recipeSteps: recipeSteps.filter(s => s.trim()),
        cookingTips: cookingTips.filter(t => t.trim()),
        status,
        allergens: [] // TODO: Auto-detect from ingredients
      }

      const response = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(recipeData)
      })

      if (!response.ok) {
        throw new Error('Failed to create recipe')
      }

      const data = await response.json()
      toast.success(`Recipe ${status === 'draft' ? 'saved as draft' : 'published'}!`)
      router.push('/admin/recipes')
    } catch (err) {
      logger.error('Save recipe error:', err as Error)
      toast.error(err instanceof Error ? err.message : 'Failed to save recipe')
    } finally {
      setSaving(false)
    }
  }

  const nutrition = calculateNutrition()

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

      {/* Basic Info */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Recipe Name</label>
            <input
              type="text"
              value={recipeName}
              onChange={(e) => setRecipeName(e.target.value)}
              placeholder="e.g., High Protein Egg Breakfast"
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what makes this recipe special..."
              rows={3}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Meal Type</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value as MealType)}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Prep Time (minutes)</label>
            <input
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Servings</label>
            <input
              type="number"
              min="1"
              value={servingSize}
              onChange={(e) => setServingSize(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Dietary Tags */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-foreground mb-2">Dietary Tags</label>
          <div className="flex flex-wrap gap-2">
            {(['vegan', 'vegetarian', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'high-protein', 'low-carb'] as DietaryTag[]).map(tag => (
              <button
                key={tag}
                onClick={() => toggleDietaryTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  dietaryTags.includes(tag)
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Ingredients ({ingredients.length})</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowProductSelector(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add from Database
            </button>
          </div>
        </div>

        {/* Ingredients List */}
        <div className="space-y-3">
          {ingredients.map((ingredient, index) => (
            <div key={index} className="flex items-start gap-3 p-3 border border-border rounded-lg">
              {ingredient.productImageUrl && (
                <img src={ingredient.productImageUrl} alt={ingredient.productName} className="w-12 h-12 object-cover rounded" />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{ingredient.ingredientText}</p>
                {ingredient.productBarcode && (
                  <p className="text-xs text-muted-foreground">{ingredient.productBrand} • {ingredient.productBarcode}</p>
                )}
                {ingredient.notes && (
                  <p className="text-xs text-muted-foreground italic mt-1">{ingredient.notes}</p>
                )}
                {ingredient.nutrition && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {Math.round(ingredient.nutrition.calories * ingredient.quantity)} cal •{' '}
                    {Math.round(ingredient.nutrition.protein * ingredient.quantity * 10) / 10}g protein
                  </p>
                )}
              </div>
              <button
                onClick={() => handleRemoveIngredient(index)}
                className="text-error hover:text-error-dark"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}

          {ingredients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No ingredients added yet. Click "Add from Database" to get started.
            </div>
          )}
        </div>

        {/* Text Ingredient Input */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={textIngredient}
            onChange={(e) => setTextIngredient(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTextIngredient()}
            placeholder="Or add text ingredient (e.g., '2 cups milk', 'salt to taste')"
            className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            onClick={handleAddTextIngredient}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Add Text
          </button>
        </div>
      </div>

      {/* Nutrition Summary */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Nutrition (per serving)</h2>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">{nutrition.calories}</div>
            <div className="text-sm text-muted-foreground">Calories</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-success">{nutrition.protein}g</div>
            <div className="text-sm text-muted-foreground">Protein</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-secondary">{nutrition.carbs}g</div>
            <div className="text-sm text-muted-foreground">Carbs</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning">{nutrition.fat}g</div>
            <div className="text-sm text-muted-foreground">Fat</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-warning">{nutrition.fiber}g</div>
            <div className="text-sm text-muted-foreground">Fiber</div>
          </div>
        </div>
        {ingredients.some(i => i.nutrition) && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            ✓ Auto-calculated from {ingredients.filter(i => i.nutrition).length} verified products
          </p>
        )}
      </div>

      {/* Recipe Steps */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Cooking Steps</h2>
          <button
            onClick={handleAddStep}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Step
          </button>
        </div>

        <div className="space-y-3">
          {recipeSteps.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </div>
              <textarea
                value={step}
                onChange={(e) => handleUpdateStep(index, e.target.value)}
                placeholder="Enter step description..."
                rows={2}
                className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => handleRemoveStep(index)}
                className="text-error hover:text-error-dark"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Cooking Tips */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Cooking Tips (Optional)</h2>
          <button
            onClick={handleAddTip}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <PlusIcon className="h-4 w-4" />
            Add Tip
          </button>
        </div>

        <div className="space-y-3">
          {cookingTips.map((tip, index) => (
            <div key={index} className="flex gap-3">
              <input
                type="text"
                value={tip}
                onChange={(e) => handleUpdateTip(index, e.target.value)}
                placeholder="Enter cooking tip..."
                className="flex-1 px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={() => handleRemoveTip(index)}
                className="text-error hover:text-error-dark"
              >
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => handleSave('draft')}
          disabled={saving}
          className="flex-1 py-3 px-6 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving...' : 'Save as Draft'}
        </button>
        <button
          onClick={() => handleSave('published')}
          disabled={saving}
          className="flex-1 py-3 px-6 bg-primary hover:bg-primary-hover disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Publishing...' : 'Publish Recipe'}
        </button>
      </div>

      {/* Product Selector Modal */}
      {showProductSelector && (
        <ProductSelector
          onSelectProduct={handleAddProduct}
          onClose={() => setShowProductSelector(false)}
        />
      )}
    </div>
  )
}
