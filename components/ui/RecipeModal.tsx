'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { MealSuggestion, getRecipeActionLabel } from '@/lib/meal-suggestions'
import { logger } from '@/lib/logger'
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
import { useInventory } from '@/hooks/useInventory'
import { useShopping } from '@/hooks/useShopping'
import {
  checkIngredientsAgainstInventory,
  checkIngredientsWithQuantities,
  calculateRecipeReadiness,
  type IngredientMatchResult
} from '@/lib/ingredient-matcher'
import { addManualShoppingItem, findExistingIngredientByName, appendRecipeToIngredient } from '@/lib/shopping-operations'
import { lookupBarcode, simplifyProduct } from '@/lib/openfoodfacts-api'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'

// Dynamic import for BarcodeScanner
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

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
  const [inventoryMatches, setInventoryMatches] = useState<Map<number, any>>(new Map())
  const [ingredientResults, setIngredientResults] = useState<IngredientMatchResult[]>([])
  const [showCookingOptions, setShowCookingOptions] = useState(false)
  const [showMissingIngredientsModal, setShowMissingIngredientsModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [missingIngredients, setMissingIngredients] = useState<string[]>([])
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set())
  const [scanningInProgress, setScanningInProgress] = useState(false)
  const [recentlyAddedIngredients, setRecentlyAddedIngredients] = useState<Set<string>>(new Set())
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(suggestion.mealType)
  const [startingSession, setStartingSession] = useState(false)
  const [addingToShoppingList, setAddingToShoppingList] = useState(false)

  // Prevent duplicate session creation
  const sessionCreationRef = useRef(false)

  // Get inventory items
  const { fridgeItems, freezerItems, pantryItems, counterItems, refresh: refreshInventory } = useInventory()
  const { addItem, updateItem, neededItems: shoppingListItems, refresh: refreshShoppingList } = useShopping()
  const allInventoryItems = useMemo(() =>
    [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems],
    [fridgeItems, freezerItems, pantryItems, counterItems]
  )

  // Check ingredients against inventory when modal opens
  useEffect(() => {
    if (isOpen && suggestion.ingredients && allInventoryItems.length > 0) {
      // Legacy simple matching (for backward compatibility)
      const matches = checkIngredientsAgainstInventory(
        suggestion.ingredients,
        allInventoryItems
      )
      setInventoryMatches(matches)

      // New quantity-aware matching
      const quantityResults = checkIngredientsWithQuantities(
        suggestion.ingredients,
        allInventoryItems
      )
      setIngredientResults(quantityResults)

      // Auto-check ingredients we have enough of
      const enoughIndices = new Set<number>()
      quantityResults.forEach((result, idx) => {
        if (result.hasEnough === true) {
          enoughIndices.add(idx)
        }
      })
      setHaveIngredients(enoughIndices)
    }
  }, [isOpen, suggestion.ingredients, allInventoryItems])

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

  /**
   * Check if ingredient is on shopping list
   */
  const isIngredientOnShoppingList = (ingredientText: string): boolean => {
    if (!shoppingListItems || shoppingListItems.length === 0) return false

    const ingredientLower = ingredientText.toLowerCase()

    return shoppingListItems.some(item => {
      // Check if item is needed (on shopping list)
      if (!item.needed) return false

      // Match by manual ingredient name (exact recipe text)
      if (item.manualIngredientName?.toLowerCase() === ingredientLower) {
        return true
      }

      // Match by product name (for similar items)
      if (item.productName?.toLowerCase().includes(ingredientLower.split(' ').slice(-1)[0])) {
        return true
      }

      // Match if this recipe added the item (check recipeIds array)
      if (item.recipeIds && item.recipeIds.includes(suggestion.id)) {
        const itemNameWords = item.productName?.toLowerCase().split(' ') || []
        const ingredientWords = ingredientLower.split(' ')
        // Check if any significant word matches
        return ingredientWords.some(word =>
          word.length > 3 && itemNameWords.includes(word)
        )
      }

      return false
    })
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
      logger.error('Share failed:', error as Error)
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
      logger.error('Platform share failed:', error as Error)
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

    // ⚠️ BLOCKING CHECK: Verify all ingredients are available
    const missingItems = ingredientResults.filter(result =>
      !result.matched || result.hasEnough === false
    )

    if (missingItems.length > 0) {
      // Block cooking! User must have all ingredients
      const missingNames = missingItems.map(r => r.ingredient)
      setMissingIngredients(missingNames)
      setShowCookingOptions(false) // Close cooking options modal
      setShowMissingIngredientsModal(true) // Show missing ingredients modal
      toast.error(`Missing ${missingItems.length} ingredient${missingItems.length > 1 ? 's' : ''}. Scan items or add to shopping list.`)
      return // BLOCKED - cannot start cooking
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
      logger.error('Error starting cooking session:', error as Error)
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
      logger.error('Error adding to queue:', error as Error)
      toast.error('Failed to add recipe to queue')
    }
  }

  const handleAddMissingToShoppingList = async () => {
    if (!auth.currentUser?.uid) {
      toast.error('You must be logged in to add items')
      return
    }

    setAddingToShoppingList(true)

    try {
      // Get ingredients that are missing or insufficient (based on quantity-aware matching)
      const itemsToAdd = scaledRecipe.scaledIngredients
        .map((ingredient, idx) => ({ ingredient, idx, result: ingredientResults[idx] }))
        .filter(({ result }) => {
          // Add if not matched at all, or matched but don't have enough
          return !result?.matched || result.hasEnough === false
        })

      if (itemsToAdd.length === 0) {
        toast('You already have all ingredients!', { icon: '✅' })
        setAddingToShoppingList(false)
        return
      }

      // Multi-recipe linking: Check if each ingredient already exists on shopping list
      let newItemsCount = 0
      let linkedItemsCount = 0

      for (const { ingredient } of itemsToAdd) {
        // Check if ingredient already exists on shopping list
        const existingItem = await findExistingIngredientByName(auth.currentUser!.uid, ingredient)

        if (existingItem) {
          // Item exists - append current recipe ID to its recipeIds array
          await appendRecipeToIngredient(existingItem.id, suggestion.id)
          linkedItemsCount++
        } else {
          // Item doesn't exist - create new item with recipeIds array
          await addManualShoppingItem(auth.currentUser!.uid, ingredient, {
            recipeId: suggestion.id, // This will be converted to recipeIds: [id]
            quantity: 1,
            priority: 'medium'
          })
          newItemsCount++
        }
      }

      // Track recently added items for visual feedback
      const addedSet = new Set(itemsToAdd.map(({ ingredient }) => ingredient))
      setRecentlyAddedIngredients(addedSet)

      // Auto-clear "Just Added" indicator after 3 seconds
      setTimeout(() => {
        setRecentlyAddedIngredients(new Set())
      }, 3000)

      // Refresh shopping list to show updated status
      await refreshShoppingList()

      // Show smart toast message based on what happened
      if (linkedItemsCount > 0 && newItemsCount > 0) {
        toast.success(`✓ Added ${newItemsCount} new item${newItemsCount > 1 ? 's' : ''}, linked ${linkedItemsCount} existing item${linkedItemsCount > 1 ? 's' : ''} to this recipe!`)
      } else if (linkedItemsCount > 0) {
        toast.success(`✓ Linked ${linkedItemsCount} item${linkedItemsCount > 1 ? 's' : ''} already on your list to this recipe!`)
      } else {
        toast.success(`✓ Added ${newItemsCount} item${newItemsCount > 1 ? 's' : ''} to shopping list!`)
      }

      setActiveTab('recipe') // Switch back to recipe tab
    } catch (error) {
      logger.error('Error adding to shopping list:', error as Error)
      toast.error('Failed to add items to shopping list')
    } finally {
      setAddingToShoppingList(false)
    }
  }

  /**
   * Handle barcode scan for missing ingredients
   * Scans items one by one, tracks progress, auto-proceeds when all items scanned
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      toast.loading('Looking up product...', { id: 'barcode-scan' })

      // Lookup product
      const response = await lookupBarcode(barcode)
      const product = simplifyProduct(response)

      if (!product.found) {
        toast.error(`Product not found (barcode: ${barcode})`, { id: 'barcode-scan' })
        return
      }

      // Add to inventory
      const existing = allInventoryItems.find(item => item.barcode === barcode)

      if (existing) {
        await updateItem(existing.id, {
          inStock: true,
          quantity: existing.quantity + 1,
          needed: false
        })
      } else {
        await addItem(response.product!, {
          inStock: true,
          needed: false,
          quantity: 1
        })
      }

      // Track this scan
      setScannedItems(prev => new Set([...prev, barcode]))

      // Refresh inventory to update ingredient matching
      refreshInventory()

      toast.success(`✓ Added ${product.name} to inventory`, { id: 'barcode-scan' })

      // Check if we've scanned all missing items
      // Note: This is simplified - ideally we'd match barcodes to specific ingredients
      const newScannedCount = scannedItems.size + 1

      if (newScannedCount >= missingIngredients.length) {
        // All items scanned! Proceed to cooking
        toast.success('✓ All ingredients scanned! Starting cooking...', { duration: 3000 })
        setShowScanner(false)
        setShowMissingIngredientsModal(false)
        setScanningInProgress(false)

        // Small delay to let inventory update, then proceed
        setTimeout(() => {
          setShowCookingOptions(true)
        }, 500)
      } else {
        // More items to scan
        toast(`Progress: ${newScannedCount} of ${missingIngredients.length} items scanned`, {
          icon: '📊',
          duration: 2000
        })
      }
    } catch (error: any) {
      logger.error('Barcode scan error', error as Error)
      toast.error(error?.message || 'Failed to process barcode', { id: 'barcode-scan' })
    }
  }

  /**
   * Start scanning missing ingredients
   */
  const handleStartScanning = () => {
    setScanningInProgress(true)
    setScannedItems(new Set()) // Reset progress
    setShowMissingIngredientsModal(false)
    setShowScanner(true)
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
                {/* Recipe Readiness Indicator */}
                {ingredientResults.length > 0 && (() => {
                  const readiness = calculateRecipeReadiness(suggestion.ingredients || [], allInventoryItems)
                  return (
                    <div className={`mb-3 p-3 rounded-lg border-2 ${
                      readiness.canMake
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-500 dark:border-green-700'
                        : 'bg-orange-50 dark:bg-orange-900/20 border-orange-500 dark:border-orange-700'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-sm font-semibold ${
                            readiness.canMake
                              ? 'text-green-900 dark:text-green-200'
                              : 'text-orange-900 dark:text-orange-200'
                          }`}>
                            {readiness.canMake ? '✓ Ready to cook!' : '⚠️ Missing ingredients'}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                            {readiness.haveEnough} of {readiness.totalIngredients} ingredients
                            {readiness.insufficient > 0 && ` • ${readiness.insufficient} insufficient`}
                            {readiness.missing > 0 && ` • ${readiness.missing} missing`}
                          </p>
                        </div>
                        {!readiness.canMake && (
                          <span className="text-xs px-2 py-1 bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-200 rounded font-medium">
                            Shop needed
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}
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
                                {/* Show quantity-aware inventory status */}
                                {ingredientResults[idx] && (
                                  <div className="mt-1">
                                    {ingredientResults[idx].hasEnough === true && (
                                      <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{ingredientResults[idx].comparison}</span>
                                      </p>
                                    )}
                                    {ingredientResults[idx].hasEnough === false && ingredientResults[idx].matched && (
                                      <p className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-1">
                                        <span>⚠️</span>
                                        <span>{ingredientResults[idx].comparison}</span>
                                      </p>
                                    )}
                                    {!ingredientResults[idx].matched && (
                                      <p className="text-xs text-red-700 dark:text-red-400 flex items-center gap-1">
                                        <span>❌</span>
                                        <span>{ingredientResults[idx].comparison}</span>
                                      </p>
                                    )}
                                    {ingredientResults[idx].hasEnough === null && ingredientResults[idx].matched && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                        <span>ℹ️</span>
                                        <span>{ingredientResults[idx].comparison}</span>
                                      </p>
                                    )}
                                  </div>
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

              {/* Recipe Steps - Gated behind ingredient availability */}
              {suggestion.recipeSteps && suggestion.recipeSteps.length > 0 && (() => {
                // Check if user has ALL ingredients
                const hasAllIngredients = ingredientResults.length > 0 &&
                  ingredientResults.filter(r => !r.matched || r.hasEnough === false).length === 0

                const availableCount = ingredientResults.filter(r => r.matched && r.hasEnough === true).length
                const totalIngredientsCount = ingredientResults.length
                const missingCount = totalIngredientsCount - availableCount

                return (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Instructions</h3>

                    {hasAllIngredients ? (
                      /* Show instructions when user has everything */
                      <ol className="space-y-3">
                        {suggestion.recipeSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-gray-900 dark:text-gray-100 flex items-start">
                            <span className="font-bold text-primary mr-3 min-w-[24px]">{idx + 1}.</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      /* Show locked state when missing ingredients */
                      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-300 dark:border-orange-700 rounded-lg p-6">
                        <div className="text-center mb-4">
                          <div className="text-4xl mb-2">🔒</div>
                          <h4 className="font-semibold text-orange-900 dark:text-orange-100 text-lg mb-1">
                            Instructions Locked
                          </h4>
                          <p className="text-sm text-orange-800 dark:text-orange-200">
                            You need all ingredients before starting to cook. Timers and steps depend on having everything ready!
                          </p>
                        </div>

                        {/* Show what's needed */}
                        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Ingredient Progress
                            </span>
                            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                              {availableCount} / {totalIngredientsCount}
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-orange-500 h-2 rounded-full transition-all"
                              style={{
                                width: `${(availableCount / totalIngredientsCount) * 100}%`
                              }}
                            />
                          </div>
                        </div>

                        {/* Call to action */}
                        <div className="space-y-2">
                          <button
                            onClick={() => setActiveTab('shopping')}
                            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors"
                          >
                            📋 View Missing Ingredients ({missingCount})
                          </button>
                          <p className="text-xs text-center text-orange-700 dark:text-orange-300">
                            Switch to Shopping List tab to scan items or add to your list
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Cooking Tips - Also gated behind ingredient availability */}
              {suggestion.cookingTips && suggestion.cookingTips.length > 0 && (() => {
                // Check if user has ALL ingredients (same check as instructions)
                const hasAllIngredients = ingredientResults.length > 0 &&
                  ingredientResults.filter(r => !r.matched || r.hasEnough === false).length === 0

                // Only show cooking tips if user has all ingredients
                if (!hasAllIngredients) return null

                return (
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
                )
              })()}

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
                // Filter ingredients to only show what they need (missing or insufficient)
                const neededIngredients = scaledRecipe.scaledIngredients
                  .map((ingredient, idx) => ({ ingredient, idx, result: ingredientResults[idx] }))
                  .filter(({ result }) => !result?.matched || result.hasEnough === false)

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

                    {/* Add to Shopping List Button / Status */}
                    {neededCount > 0 && (() => {
                      // Check how many needed items are already on shopping list
                      const itemsOnList = neededIngredients.filter(({ ingredient }) =>
                        isIngredientOnShoppingList(ingredient)
                      ).length
                      const allOnList = itemsOnList === neededCount

                      if (allOnList) {
                        // All missing items are on shopping list
                        return (
                          <div className="w-full mb-4 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-700 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                              <span className="text-lg">📋</span>
                              <span className="font-semibold">All {neededCount} missing item{neededCount > 1 ? 's are' : ' is'} on your shopping list!</span>
                            </div>
                            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                              Shop for these items, then scan them to cook this recipe
                            </p>
                          </div>
                        )
                      }

                      // Some or no items on list - show add button
                      const remainingCount = neededCount - itemsOnList
                      return (
                        <button
                          onClick={handleAddMissingToShoppingList}
                          disabled={addingToShoppingList}
                          className="w-full mb-4 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>
                            {addingToShoppingList
                              ? 'Adding...'
                              : itemsOnList > 0
                                ? `Add ${remainingCount} More Item${remainingCount > 1 ? 's' : ''} to Shopping List`
                                : `Add ${neededCount} Missing Item${neededCount > 1 ? 's' : ''} to Shopping List`
                            }
                          </span>
                        </button>
                      )
                    })()}

                    {/* Shopping List - Only items they need */}
                    {neededCount === 0 ? (
                      <div className="bg-success-light border border-success rounded-lg p-6 text-center">
                        <div className="text-4xl mb-2">🎉</div>
                        <p className="text-lg font-semibold text-success-dark mb-1">You have everything!</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">All ingredients are checked off. Ready to cook!</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {neededIngredients.map(({ ingredient, idx, result }) => {
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
                            <div key={idx} className={`p-3 rounded-lg ${
                              isSwapped
                                ? 'bg-purple-100 dark:bg-purple-900/20'
                                : result && result.matched && result.hasEnough === true
                                  ? 'bg-green-50 dark:bg-green-900/10' // Green background for in-stock
                                  : isIngredientOnShoppingList(ingredient)
                                    ? 'bg-amber-50 dark:bg-amber-900/10' // Amber background for on list
                                    : 'bg-gray-100 dark:bg-gray-800' // Default
                            }`}>
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={
                                    (result && result.matched && result.hasEnough === true) // Green: In inventory
                                    || isIngredientOnShoppingList(ingredient) // Amber: On shopping list
                                  }
                                  readOnly
                                  className={`w-4 h-4 mt-0.5 rounded focus:ring-0 pointer-events-none ${
                                    result && result.matched && result.hasEnough === true
                                      ? 'text-green-500 border-green-500 dark:border-green-500 bg-green-500' // Green checkbox
                                      : isIngredientOnShoppingList(ingredient)
                                        ? 'text-amber-500 border-amber-500 dark:border-amber-500 bg-amber-500' // Amber checkbox
                                        : 'border-gray-300 dark:border-gray-600' // Default unchecked
                                  }`}
                                />
                                <div className="flex-1">
                                  <span className="text-sm text-gray-900 dark:text-gray-100 block">
                                    {displayIngredient}
                                    {isSwapped && swappedSub.ratio && (
                                      <span className="text-xs text-gray-600 dark:text-gray-400 ml-2">({swappedSub.ratio})</span>
                                    )}
                                  </span>
                                  {/* Show quantity status */}
                                  {result && result.hasEnough === false && result.deficit && (
                                    <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                                      ⚠️ Need {result.deficit.quantity} {result.deficit.unit} more
                                    </p>
                                  )}
                                  {result && !result.matched && (
                                    <>
                                      {/* Check if on shopping list */}
                                      {isIngredientOnShoppingList(ingredient) ? (
                                        <div className="text-xs mt-1 flex items-center gap-1.5">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation() // Prevent modal from closing
                                              router.push('/shopping')
                                            }}
                                            className="text-blue-700 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-200 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                                            aria-label="View shopping list"
                                          >
                                            <span>📋</span>
                                            <span>On Shopping List</span>
                                          </button>
                                          {recentlyAddedIngredients.has(ingredient) && (
                                            <span className="text-green-600 dark:text-green-400 font-medium">✓ Just Added</span>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                                          ❌ Not in stock
                                        </p>
                                      )}
                                    </>
                                  )}
                                </div>
                                {isSwapped && (
                                  <span className="text-[10px] bg-success text-white px-1.5 py-0.5 rounded">
                                    Swapped
                                  </span>
                                )}
                              </div>
                            </div>
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

        {/* Missing Ingredients Modal */}
        {showMissingIngredientsModal && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center p-4 z-10">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🛒</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Missing Ingredients</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  You need all ingredients to start cooking. Timers depend on having everything ready!
                </p>
              </div>

              {/* Missing Items List */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-orange-800 dark:text-orange-300 mb-2">
                  Missing ({missingIngredients.length}):
                </p>
                <ul className="space-y-1">
                  {missingIngredients.map((ingredient, idx) => (
                    <li key={idx} className="text-sm text-orange-900 dark:text-orange-200 flex items-start">
                      <span className="mr-2">•</span>
                      <span>{ingredient}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Smart Suggestions Message */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-900 dark:text-blue-200">
                  💡 <strong>Smart tip:</strong> {missingIngredients.length <= 3 ?
                    'Just a few items - quick store trip?' :
                    'Several items needed - plan your shopping!'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button
                  onClick={handleStartScanning}
                  className="w-full px-6 py-3 bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center justify-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <span>Scan Items I Have</span>
                </button>

                <button
                  onClick={async () => {
                    setShowMissingIngredientsModal(false)
                    await handleAddMissingToShoppingList()
                  }}
                  disabled={addingToShoppingList}
                  className="w-full px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>{addingToShoppingList ? 'Adding...' : 'Add to Shopping List'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMissingIngredientsModal(false)
                    setShowCookingOptions(true) // Go back to cooking options
                  }}
                  className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
                  disabled={addingToShoppingList}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Barcode Scanner */}
        <BarcodeScanner
          isOpen={showScanner}
          onScan={handleBarcodeScan}
          onClose={() => {
            setShowScanner(false)
            setShowMissingIngredientsModal(true) // Return to missing ingredients modal
          }}
          context="inventory"
          title={`Scan Ingredients (${scannedItems.size}/${missingIngredients.length})`}
        />
      </div>
    </div>
  )
}
