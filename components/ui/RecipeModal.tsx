'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MealSuggestion, getRecipeActionLabel } from '@/lib/meal-suggestions'
import {
  shareRecipe,
  copyToClipboard,
  downloadImage,
  getPlatformShareUrl,
  shareViaWebShareAPI,
  canUseWebShare,
  type AspectRatio
} from '@/lib/recipe-share-utils'
import { TemplateStyle, getAvailableTemplates, getTemplateConfig } from '@/lib/recipe-templates'
import { scaleRecipe, calculateAdjustedPrepTime, type ScaledRecipe } from '@/lib/recipe-scaler'
import { getSubstitutionSuggestions, type Substitution } from '@/lib/ingredient-substitutions'
import { recipeQueueOperations, cookingSessionOperations } from '@/lib/firebase-operations'
import { createStepTimers } from '@/lib/recipe-timer-parser'
import toast from 'react-hot-toast'

/**
 * Parse ingredient string to extract quantity/unit and ingredient name
 * Example: "2 cups milk" → { quantity: "2 cups", ingredientName: "milk" }
 */
function parseIngredient(ingredient: string): { quantity: string; ingredientName: string } {
  // Common measurement patterns: numbers, fractions, units
  const measurementPattern = /^([\d\/\.\s]+(?:cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|pound|pounds|g|gram|grams|kg|ml|l|liter|liters)?)\s+(.+)$/i

  const match = ingredient.match(measurementPattern)

  if (match) {
    return {
      quantity: match[1].trim(),
      ingredientName: match[2].trim()
    }
  }

  // No quantity found (e.g., "salt and pepper")
  return {
    quantity: '',
    ingredientName: ingredient
  }
}

interface RecipeModalProps {
  suggestion: MealSuggestion
  isOpen: boolean
  onClose: () => void
  userDietaryPreferences?: string[]
  userAllergies?: string[]
}

export function RecipeModal({ suggestion, isOpen, onClose, userDietaryPreferences, userAllergies }: RecipeModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'recipe' | 'shopping'>('recipe')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showAspectRatioSelector, setShowAspectRatioSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('minimalist')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1')
  const [shareStatus, setShareStatus] = useState<string>('')
  const [servingSize, setServingSize] = useState(suggestion.servingSize)
  const [expandedIngredient, setExpandedIngredient] = useState<number | null>(null)
  const [swappedIngredients, setSwappedIngredients] = useState<Map<number, Substitution>>(new Map())
  const [haveIngredients, setHaveIngredients] = useState<Set<number>>(new Set())
  const [showCookingOptions, setShowCookingOptions] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(suggestion.mealType)
  const [startingSession, setStartingSession] = useState(false)

  // Prevent duplicate session creation
  const sessionCreationRef = useRef(false)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      sessionCreationRef.current = false
    }
  }, [])

  // Scale recipe based on current serving size
  const scaledRecipe = useMemo<ScaledRecipe>(() => {
    return scaleRecipe(suggestion, servingSize)
  }, [suggestion, servingSize])

  // Calculate adjusted prep time
  const adjustedPrepTime = useMemo(() => {
    return calculateAdjustedPrepTime(suggestion.prepTime, suggestion.servingSize, servingSize)
  }, [suggestion.prepTime, suggestion.servingSize, servingSize])

  // Get action label (Cook vs Prepare)
  const actionLabel = useMemo(() => {
    return getRecipeActionLabel(suggestion)
  }, [suggestion])

  if (!isOpen) return null

  const incrementServings = () => {
    setServingSize(prev => Math.min(prev + 1, 8)) // Max 8 servings
  }

  const decrementServings = () => {
    setServingSize(prev => Math.max(prev - 1, 1)) // Min 1 serving
  }

  const resetServings = () => {
    setServingSize(suggestion.servingSize)
  }

  const toggleIngredientSubstitutions = (index: number) => {
    setExpandedIngredient(prev => prev === index ? null : index)
  }

  const handleSwapIngredient = (ingredientIndex: number, substitution: Substitution) => {
    setSwappedIngredients(prev => {
      const newMap = new Map(prev)
      newMap.set(ingredientIndex, substitution)
      return newMap
    })
    // Collapse the substitutions after swapping
    setExpandedIngredient(null)
  }

  const handleResetIngredient = (ingredientIndex: number) => {
    setSwappedIngredients(prev => {
      const newMap = new Map(prev)
      newMap.delete(ingredientIndex)
      return newMap
    })
  }

  const toggleHaveIngredient = (ingredientIndex: number) => {
    setHaveIngredients(prev => {
      const newSet = new Set(prev)
      if (newSet.has(ingredientIndex)) {
        newSet.delete(ingredientIndex)
      } else {
        newSet.add(ingredientIndex)
      }
      return newSet
    })
  }

  const handleSelectAllIngredients = () => {
    const allIndices = scaledRecipe.scaledIngredients.map((_, idx) => idx)
    setHaveIngredients(new Set(allIndices))
  }

  const handleClearAllIngredients = () => {
    setHaveIngredients(new Set())
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShareClick = () => {
    setShowTemplateSelector(true)
  }

  const handleTemplateSelect = (template: TemplateStyle) => {
    setSelectedTemplate(template)
    setShowTemplateSelector(false)
    setShowAspectRatioSelector(true)
  }

  const handleAspectRatioSelect = async (aspectRatio: AspectRatio) => {
    setSelectedAspectRatio(aspectRatio)
    setShowAspectRatioSelector(false)

    try {
      const { imageBlob, caption, shareUrl } = await shareRecipe(suggestion, aspectRatio, selectedTemplate)

      // Try Web Share API first (mobile)
      if (canUseWebShare()) {
        const shared = await shareViaWebShareAPI(suggestion, imageBlob, caption, shareUrl)
        if (shared) {
          setShareStatus('Shared!')
          setTimeout(() => setShareStatus(''), 2000)
          return
        }
      }

      // Fallback: Download image and show platform menu (desktop)
      downloadImage(imageBlob, `${suggestion.id}-recipe-${aspectRatio.replace(':', 'x')}.png`)

      // Copy share URL to clipboard
      const copied = await copyToClipboard(shareUrl)
      if (copied) {
        setShareStatus('Image downloaded & link copied!')
        setTimeout(() => setShareStatus(''), 3000)
      }

      // Show platform menu
      setShowShareMenu(true)
    } catch (error) {
      console.error('Share failed:', error)
      setShareStatus('Share failed')
      setTimeout(() => setShareStatus(''), 2000)
    }
  }

  const handlePlatformShare = async (platform: 'facebook' | 'twitter' | 'pinterest' | 'whatsapp') => {
    try {
      const { caption, shareUrl } = await shareRecipe(suggestion, selectedAspectRatio, selectedTemplate)
      const platformUrl = getPlatformShareUrl(platform, shareUrl, caption)

      if (platformUrl) {
        window.open(platformUrl, '_blank', 'width=600,height=400')
      }

      setShowShareMenu(false)
    } catch (error) {
      console.error('Platform share failed:', error)
    }
  }

  const handleCookNow = async () => {
    // Prevent duplicate clicks
    if (startingSession || sessionCreationRef.current) {
      return
    }

    if (!suggestion.recipeSteps || suggestion.recipeSteps.length === 0) {
      toast.error('This recipe doesn\'t have cooking instructions yet')
      return
    }

    sessionCreationRef.current = true
    setStartingSession(true)

    try {
      // Create cooking session
      const stepTimers = createStepTimers(suggestion.recipeSteps)

      const session = await cookingSessionOperations.createCookingSession({
        recipeId: suggestion.id,
        recipeName: suggestion.name,
        servingSize: servingSize,
        mealType: selectedMealType,
        currentStep: 0,
        totalSteps: suggestion.recipeSteps.length,
        stepTimers: stepTimers,
        startedAt: new Date(),
        status: 'in-progress',
        scaledCalories: scaledRecipe.scaledCalories,
        scaledMacros: scaledRecipe.scaledMacros,
        scaledIngredients: scaledRecipe.scaledIngredients
      })

      toast.success('Starting cooking session!')
      await router.push(`/cooking/${session.id}`)
      onClose()
    } catch (error) {
      console.error('Error starting cooking session:', error)
      toast.error('Failed to start cooking session')
      // Reset on error so user can retry
      sessionCreationRef.current = false
      setStartingSession(false)
    }
  }

  const handleAddToQueue = async () => {
    try {
      await recipeQueueOperations.addToQueue({
        recipeId: suggestion.id,
        recipeName: suggestion.name,
        servingSize: servingSize,
        mealType: selectedMealType
      })

      toast.success(`Added "${suggestion.name}" to your recipe queue!`)
      setShowCookingOptions(false)
      onClose()
    } catch (error) {
      console.error('Error adding to queue:', error)
      toast.error('Failed to add recipe to queue')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden m-4">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{suggestion.name}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{suggestion.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 dark:text-gray-100 transition-colors p-2"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('recipe')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'recipe'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'
              }`}
            >
              Recipe
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'shopping'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-gray-100'
              }`}
            >
              Shopping List
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] px-6 pt-6 pb-12">
          {activeTab === 'recipe' ? (
            <div className="space-y-6">
              {/* Serving Size Selector */}
              <div className="bg-gradient-to-r from-purple-100 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/20 border-2 border-primary rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Servings</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Adjust to scale recipe</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={decrementServings}
                      disabled={servingSize <= 1}
                      className="w-8 h-8 rounded-full bg-primary text-white font-bold hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-600 dark:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      aria-label="Decrease servings"
                    >
                      −
                    </button>
                    <div className="text-center min-w-[60px]">
                      <div className="text-3xl font-bold text-primary">{servingSize}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">serving{servingSize > 1 ? 's' : ''}</div>
                    </div>
                    <button
                      onClick={incrementServings}
                      disabled={servingSize >= 8}
                      className="w-8 h-8 rounded-full bg-primary text-white font-bold hover:bg-primary-hover disabled:bg-gray-100 disabled:text-gray-600 dark:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      aria-label="Increase servings"
                    >
                      +
                    </button>
                  </div>
                </div>
                {servingSize !== suggestion.servingSize && (
                  <div className="mt-3 text-center">
                    <button
                      onClick={resetServings}
                      className="text-xs text-primary hover:text-primary-hover font-medium underline"
                    >
                      Reset to original ({suggestion.servingSize} serving{suggestion.servingSize > 1 ? 's' : ''})
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Info - Scaled */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-gray-400">{scaledRecipe.scaledCalories}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">calories (total)</p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-gray-400">{scaledRecipe.scaledMacros.protein}g</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">protein (total)</p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-gray-400">{adjustedPrepTime} min</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">prep time</p>
                </div>
                <div className="text-center p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-gray-400">{Math.round(scaledRecipe.scaledCalories / servingSize)}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">cal per serving</p>
                </div>
              </div>

              {/* Macros - Scaled */}
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Nutrition (Total for {servingSize} serving{servingSize > 1 ? 's' : ''})</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros.carbs}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros.fat}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Fiber:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros.fiber}g</span>
                  </div>
                </div>
              </div>

              {/* Dietary Tags */}
              {suggestion.dietaryTags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Dietary Info</h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.dietaryTags.map(tag => (
                      <span key={tag} className="text-xs bg-purple-100 dark:bg-purple-900/20 text-primary px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Allergens */}
              {suggestion.allergens.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Allergen Warning</h3>
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">Contains:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.allergens.map(allergen => (
                        <span key={allergen} className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 px-2 py-1 rounded">
                          {allergen}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Ingredients - Scaled with Substitutions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Ingredients</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSelectAllIngredients}
                      className="text-xs text-primary hover:text-primary-hover font-medium"
                    >
                      I have all
                    </button>
                    <span className="text-xs text-gray-600 dark:text-gray-400">•</span>
                    <button
                      onClick={handleClearAllIngredients}
                      className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-100"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                {swappedIngredients.size > 0 && (
                  <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-900 dark:text-blue-300">
                      <span className="font-medium">Note:</span> Nutrition info reflects the original recipe. Swapped ingredients may have different nutritional values.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  {scaledRecipe.scaledIngredients.map((ingredient, idx) => {
                    const swappedSub = swappedIngredients.get(idx)
                    const isSwapped = !!swappedSub

                    // Parse ingredient to preserve quantity when swapping
                    let displayIngredient = ingredient
                    if (isSwapped) {
                      const parsed = parseIngredient(ingredient)
                      displayIngredient = parsed.quantity
                        ? `${parsed.quantity} ${swappedSub.name}`
                        : swappedSub.name
                    }

                    const substitutions = getSubstitutionSuggestions(
                      ingredient,
                      userDietaryPreferences,
                      userAllergies
                    )
                    const hasSubstitutions = substitutions.length > 0
                    const isExpanded = expandedIngredient === idx
                    const hasIngredient = haveIngredients.has(idx)

                    return (
                      <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        {/* Main Ingredient */}
                        <div className={`p-3 flex items-start ${isSwapped ? 'bg-purple-100 dark:bg-purple-900/20' : ''} transition-colors`}>
                          {/* Checkbox - I have this */}
                          <div className="flex items-center mr-2">
                            <input
                              type="checkbox"
                              checked={hasIngredient}
                              onChange={() => toggleHaveIngredient(idx)}
                              className="w-4 h-4 text-success border-gray-200 dark:border-gray-700 rounded focus:ring-success cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Ingredient content */}
                          <div
                            className={`flex items-start justify-between flex-1 ${hasSubstitutions && !isSwapped ? 'cursor-pointer hover:opacity-80' : ''}`}
                            onClick={() => hasSubstitutions && !isSwapped && toggleIngredientSubstitutions(idx)}
                          >
                            <div className="flex items-start flex-1">
                              <span className={`text-primary mr-2 mt-0.5 ${hasIngredient ? 'opacity-50' : ''}`}>•</span>
                              <div className="flex-1">
                                <span className={`text-sm text-gray-900 dark:text-gray-100 ${hasIngredient ? 'line-through opacity-60' : ''}`}>
                                  {displayIngredient}
                                </span>
                                {isSwapped && swappedSub.ratio && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">({swappedSub.ratio})</span>
                                )}
                                {isSwapped && swappedSub.notes && (
                                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{swappedSub.notes}</p>
                                )}
                              </div>
                            </div>
                          <div className="flex items-center space-x-2 ml-2">
                            {isSwapped && (
                              <>
                                <span className="text-xs bg-success text-white px-2 py-0.5 rounded-full font-medium">
                                  ✓ Swapped
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleResetIngredient(idx)
                                  }}
                                  className="text-xs text-gray-600 hover:text-gray-900 dark:text-gray-100 underline"
                                  aria-label="Reset to original"
                                >
                                  Reset
                                </button>
                              </>
                            )}
                            {hasSubstitutions && !isSwapped && (
                              <button
                                className="text-primary text-xs font-medium flex items-center space-x-1"
                                aria-label="Show substitutions"
                              >
                                <span>{substitutions.length} alt{substitutions.length > 1 ? 's' : ''}</span>
                                <svg
                                  className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            )}
                          </div>
                          </div>
                        </div>

                        {/* Substitutions */}
                        {hasSubstitutions && isExpanded && !isSwapped && (
                          <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
                            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Alternatives:</p>
                            <div className="space-y-2">
                              {substitutions.map((sub, subIdx) => (
                                <div key={subIdx} className="bg-white dark:bg-gray-900 rounded-md p-2 border border-gray-200 hover:border-primary transition-colors group">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sub.name}</p>
                                      {sub.ratio && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400">Ratio: {sub.ratio}</p>
                                      )}
                                      {sub.notes && (
                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{sub.notes}</p>
                                      )}
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {sub.dietaryTags.slice(0, 2).map(tag => (
                                          <span key={tag} className="text-[10px] bg-purple-100 dark:bg-purple-900/20 text-primary px-1.5 py-0.5 rounded">
                                            {tag}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleSwapIngredient(idx, sub)}
                                      className="ml-2 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-hover transition-colors whitespace-nowrap"
                                    >
                                      Swap
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recipe Steps */}
              {suggestion.recipeSteps && suggestion.recipeSteps.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Instructions</h3>
                  <ol className="space-y-3">
                    {suggestion.recipeSteps.map((step, idx) => (
                      <li key={idx} className="text-sm text-gray-900 dark:text-gray-100 flex items-start">
                        <span className="font-bold text-primary mr-3 min-w-[24px]">{idx + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Cooking Tips */}
              {suggestion.cookingTips && suggestion.cookingTips.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Cooking Tips</h3>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                    {suggestion.cookingTips.map((tip, idx) => (
                      <p key={idx} className="text-sm text-blue-900 dark:text-blue-300 flex items-start">
                        <span className="text-blue-600 dark:text-blue-400 mr-2">💡</span>
                        <span>{tip}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* No Recipe Available */}
              {(!suggestion.recipeSteps || suggestion.recipeSteps.length === 0) && (
                <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Full recipe instructions coming soon! For now, use the ingredients list above.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // Filter ingredients to only show what they need (not checked)
                const neededIngredients = scaledRecipe.scaledIngredients
                  .map((ingredient, idx) => ({ ingredient, idx }))
                  .filter(({ idx }) => !haveIngredients.has(idx))

                const totalCount = scaledRecipe.scaledIngredients.length
                const neededCount = neededIngredients.length

                return (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Shopping List</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {neededCount} of {totalCount} items needed
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">For {servingSize} serving{servingSize > 1 ? 's' : ''}</p>
                    </div>

                    {/* Shopping List - Only items they need */}
                    {neededCount === 0 ? (
                      <div className="bg-success-light border border-success rounded-lg p-6 text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <p className="text-lg font-semibold text-success-dark mb-1">You have everything!</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">All ingredients are checked off. Ready to cook!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {neededIngredients.map(({ ingredient, idx }) => {
                          const swappedSub = swappedIngredients.get(idx)
                          const isSwapped = !!swappedSub

                          // Parse ingredient to preserve quantity when swapping
                          let displayIngredient = ingredient
                          if (isSwapped) {
                            const parsed = parseIngredient(ingredient)
                            displayIngredient = parsed.quantity
                              ? `${parsed.quantity} ${swappedSub.name}`
                              : swappedSub.name
                          }

                          return (
                            <label key={idx} className={`flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer ${isSwapped ? 'bg-purple-100 dark:bg-purple-900/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                              <input
                                type="checkbox"
                                className="w-4 h-4 text-primary border-gray-200 dark:border-gray-700 rounded focus:ring-primary"
                              />
                              <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                                {displayIngredient}
                                {isSwapped && swappedSub.ratio && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">({swappedSub.ratio})</span>
                                )}
                              </span>
                              {isSwapped && (
                                <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded">
                                  Swapped
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}

                    {/* Category Tips */}
                    <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-xs text-blue-900 dark:text-blue-300 font-medium mb-2">Shopping Tips:</p>
                      <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                        <li>• Check your pantry first to avoid duplicate purchases</li>
                        <li>• Look for seasonal produce for best prices</li>
                        <li>• Buy in bulk for commonly used ingredients</li>
                      </ul>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Try This Recipe Button */}
              {suggestion.recipeSteps && suggestion.recipeSteps.length > 0 && (
                <button
                  onClick={() => setShowCookingOptions(true)}
                  className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center space-x-2"
                  disabled={startingSession}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Try This Recipe</span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-100 transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
              <div className="relative">
                <button
                  onClick={handleShareClick}
                  className="text-sm text-primary hover:text-primary-hover transition-colors flex items-center space-x-1 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  <span>Share</span>
                </button>
                {shareStatus && (
                  <div className="absolute bottom-full left-0 mb-2 px-3 py-1 bg-success text-white text-xs rounded shadow-lg whitespace-nowrap">
                    {shareStatus}
                  </div>
                )}
                {/* Template Selector */}
                {showTemplateSelector && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl p-3 min-w-[250px] z-50">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Choose design style:</p>
                    <div className="space-y-2">
                      {getAvailableTemplates().map((template) => (
                        <button
                          key={template.style}
                          onClick={() => handleTemplateSelect(template.style)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{template.icon}</span>
                              <div>
                                <p className="text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400">{template.description}</p>
                              </div>
                            </div>
                            {selectedTemplate === template.style && (
                              <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Aspect Ratio Selector */}
                {showAspectRatioSelector && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl p-3 min-w-[200px]">
                    <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-3">Choose format:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleAspectRatioSelect('1:1')}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Square (1:1)</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Instagram Feed</p>
                        </div>
                        <div className="w-8 h-8 border-2 border-primary rounded bg-purple-100 dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                      <button
                        onClick={() => handleAspectRatioSelect('9:16')}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Story (9:16)</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Instagram/FB Stories</p>
                        </div>
                        <div className="w-5 h-8 border-2 border-primary rounded bg-purple-100 dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                      <button
                        onClick={() => handleAspectRatioSelect('3:2')}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Landscape (3:2)</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Twitter/Facebook</p>
                        </div>
                        <div className="w-10 h-6 border-2 border-primary rounded bg-purple-100 dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                    </div>
                  </div>
                )}
                {showShareMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl p-2 space-y-1 min-w-[150px]">
                    <button
                      onClick={() => handlePlatformShare('facebook')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center space-x-2"
                    >
                      <span>📘</span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('twitter')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center space-x-2"
                    >
                      <span>✖️</span>
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('pinterest')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center space-x-2"
                    >
                      <span>📍</span>
                      <span>Pinterest</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('whatsapp')}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center space-x-2"
                    >
                      <span>💬</span>
                      <span>WhatsApp</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>

        {/* Cooking Options Modal */}
        {showCookingOptions && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-10">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Start {actionLabel}ing</h3>

              {/* Meal Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  What meal is this for?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setSelectedMealType(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors capitalize ${
                        selectedMealType === type
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipe Info */}
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 mb-6 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Recipe:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{suggestion.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Servings:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{servingSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Prep time:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{adjustedPrepTime} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total calories:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{scaledRecipe.scaledCalories}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleCookNow}
                  disabled={startingSession}
                  className="w-full px-6 py-3 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{startingSession ? 'Starting...' : `${actionLabel} Now`}</span>
                </button>

                <button
                  onClick={handleAddToQueue}
                  disabled={startingSession}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Prepare Later</span>
                </button>

                <button
                  onClick={() => setShowCookingOptions(false)}
                  className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                  disabled={startingSession}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
