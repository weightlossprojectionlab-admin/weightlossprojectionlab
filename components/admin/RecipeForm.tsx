'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ProductSelector } from '@/components/admin/ProductSelector'
import { MealType, DietaryTag, RecipeIngredient } from '@/lib/meal-suggestions'
import { PlusIcon, TrashIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline'
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

export interface RecipeFormData {
  recipeName: string
  description: string
  mealType: MealType
  prepTime: number
  servingSize: number
  dietaryTags: DietaryTag[]
  ingredients: RecipeIngredient[]
  recipeSteps: string[]
  cookingTips: string[]
}

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData> & { existingImageUrls?: string[] }
  onSave: (data: RecipeFormData, imageFiles: File[], status: 'draft' | 'published', existingImageUrls?: string[]) => Promise<void>
  saving: boolean
  uploadProgress: number | null
  importedSource?: string
}

export default function RecipeForm({ initialData, onSave, saving, uploadProgress, importedSource }: RecipeFormProps) {
  // Recipe basic info
  const [recipeName, setRecipeName] = useState(initialData?.recipeName || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [mealType, setMealType] = useState<MealType>(initialData?.mealType || 'lunch')
  const [prepTime, setPrepTime] = useState(initialData?.prepTime ?? 30)
  const [servingSize, setServingSize] = useState(initialData?.servingSize ?? 1)
  const [dietaryTags, setDietaryTags] = useState<DietaryTag[]>(initialData?.dietaryTags || [])

  // Ingredients
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(initialData?.ingredients || [])
  const [showProductSelector, setShowProductSelector] = useState(false)
  const [textIngredient, setTextIngredient] = useState('')

  // Recipe steps
  const [recipeSteps, setRecipeSteps] = useState<string[]>(initialData?.recipeSteps?.length ? initialData.recipeSteps : [''])
  const [cookingTips, setCookingTips] = useState<string[]>(initialData?.cookingTips?.length ? initialData.cookingTips : [''])

  // Images
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>(initialData?.existingImageUrls || [])
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Re-initialize when initialData changes (e.g. after import)
  useEffect(() => {
    if (initialData) {
      if (initialData.recipeName !== undefined) setRecipeName(initialData.recipeName)
      if (initialData.description !== undefined) setDescription(initialData.description)
      if (initialData.mealType !== undefined) setMealType(initialData.mealType)
      if (initialData.prepTime !== undefined) setPrepTime(initialData.prepTime)
      if (initialData.servingSize !== undefined) setServingSize(initialData.servingSize)
      if (initialData.dietaryTags !== undefined) setDietaryTags(initialData.dietaryTags)
      if (initialData.ingredients !== undefined) setIngredients(initialData.ingredients)
      if (initialData.recipeSteps?.length) setRecipeSteps(initialData.recipeSteps)
      if (initialData.cookingTips?.length) setCookingTips(initialData.cookingTips)
      if (initialData.existingImageUrls) setExistingImageUrls(initialData.existingImageUrls)
    }
  }, [initialData])

  const handleImageFiles = useCallback((files: FileList | File[]) => {
    const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'))
    if (newFiles.length === 0) {
      toast.error('Please select valid image files')
      return
    }
    const totalFiles = imageFiles.length + existingImageUrls.length + newFiles.length
    if (totalFiles > 4) {
      toast.error('Maximum 4 images allowed')
      return
    }
    for (const file of newFiles) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit`)
        return
      }
    }
    setImageFiles(prev => [...prev, ...newFiles])
    const newPreviews = newFiles.map(f => URL.createObjectURL(f))
    setImagePreviews(prev => [...prev, ...newPreviews])
  }, [imageFiles.length, existingImageUrls.length])

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(imagePreviews[index])
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingImage = (index: number) => {
    setExistingImageUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files) {
      handleImageFiles(e.dataTransfer.files)
    }
  }, [handleImageFiles])

  // Calculate total nutrition from ingredients
  const calculateNutrition = () => {
    let totalCalories = 0
    let totalProtein = 0
    let totalCarbs = 0
    let totalFat = 0
    let totalFiber = 0

    ingredients.forEach(ingredient => {
      if (ingredient.nutrition) {
        totalCalories += ingredient.nutrition.calories * ingredient.quantity
        totalProtein += ingredient.nutrition.protein * ingredient.quantity
        totalCarbs += ingredient.nutrition.carbs * ingredient.quantity
        totalFat += ingredient.nutrition.fat * ingredient.quantity
        totalFiber += ingredient.nutrition.fiber * ingredient.quantity
      }
    })

    return {
      calories: Math.round(totalCalories / servingSize),
      protein: Math.round((totalProtein / servingSize) * 10) / 10,
      carbs: Math.round((totalCarbs / servingSize) * 10) / 10,
      fat: Math.round((totalFat / servingSize) * 10) / 10,
      fiber: Math.round((totalFiber / servingSize) * 10) / 10
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

    const data: RecipeFormData = {
      recipeName,
      description,
      mealType,
      prepTime,
      servingSize,
      dietaryTags,
      ingredients,
      recipeSteps: recipeSteps.filter(s => s.trim()),
      cookingTips: cookingTips.filter(t => t.trim())
    }

    await onSave(data, imageFiles, status, existingImageUrls)
  }

  const nutrition = calculateNutrition()

  return (
    <>
      {/* Imported Source Badge */}
      {importedSource && (
        <div className="mb-4 inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200 px-3 py-1.5 rounded-full text-sm">
          Imported from {importedSource}
        </div>
      )}

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

          {/* Recipe Image Upload */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-foreground mb-1">Recipe Images (max 4)</label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => e.target.files && handleImageFiles(e.target.files)}
              />
              <PhotoIcon className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-primary">Click to upload</span> or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 5MB each</p>
            </div>

            {/* Existing Image Previews */}
            {existingImageUrls.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {existingImageUrls.map((src, i) => (
                  <div key={`existing-${i}`} className="relative group">
                    <img
                      src={src}
                      alt={`Existing image ${i + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border border-border"
                    />
                    {i === 0 && imagePreviews.length === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">
                        Hero
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveExistingImage(i) }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* New Image Previews */}
            {imagePreviews.length > 0 && (
              <div className="flex gap-3 mt-3 flex-wrap">
                {imagePreviews.map((src, i) => (
                  <div key={`new-${i}`} className="relative group">
                    <img
                      src={src}
                      alt={`Recipe image ${i + 1}`}
                      className="h-24 w-24 object-cover rounded-lg border border-border"
                    />
                    {i === 0 && existingImageUrls.length === 0 && (
                      <span className="absolute top-1 left-1 text-[10px] bg-primary text-white px-1.5 py-0.5 rounded">
                        Hero
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleRemoveImage(i) }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress !== null && (
              <div className="mt-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Uploading images... {uploadProgress}%</p>
              </div>
            )}
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
                  <p className="text-xs text-muted-foreground">{ingredient.productBrand} - {ingredient.productBarcode}</p>
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
              No ingredients added yet. Click &quot;Add from Database&quot; to get started.
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
            Auto-calculated from {ingredients.filter(i => i.nutrition).length} verified products
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
    </>
  )
}
