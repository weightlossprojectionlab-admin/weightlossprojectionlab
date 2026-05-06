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
import { getServingSize } from '@/lib/recipe-utils'
import { getSubstitutionSuggestions, type Substitution } from '@/lib/ingredient-substitutions'
import { recipeQueueOperations, cookingSessionOperations } from '@/lib/firebase-operations'
import { createStepTimers } from '@/lib/recipe-timer-parser'
import { useInventory } from '@/hooks/useInventory'
import { useShopping } from '@/hooks/useShopping'
import {
  checkIngredientsAgainstInventory,
  checkIngredientsWithQuantities,
  checkStructuredIngredients,
  filterRecipeRelevantItems,
  calculateRecipeReadiness,
  type IngredientMatchResult
} from '@/lib/ingredient-matcher'
import { addRecipeIngredientsToShoppingList } from '@/lib/shopping-operations'
import { findAllergenOverlap } from '@/lib/allergen-cross-check'
import { unpackIngredientAllergens } from '@/lib/ingredient-allergen-classifier'
import { EaterMultiSelect, type EaterSelection } from '@/components/log-meal/EaterMultiSelect'
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
  patientId?: string
  /**
   * The patient's display name. When present, allergen-conflict
   * copy reads "...flagged in Steve's allergy profile" instead of
   * the generic "the eater's allergy profile". Falls back to the
   * generic copy when omitted (e.g., in non-patient contexts).
   */
  patientName?: string
}

export function RecipeModal({
  suggestion,
  isOpen,
  onClose,
  userDietaryPreferences,
  userAllergies,
  patientId,
  patientName,
}: RecipeModalProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'recipe' | 'shopping'>('recipe')
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [showAspectRatioSelector, setShowAspectRatioSelector] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateStyle>('minimalist')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1')
  const [shareStatus, setShareStatus] = useState<string>('')
  const [servingSize, setServingSize] = useState(getServingSize(suggestion.servingSize))
  const [expandedIngredient, setExpandedIngredient] = useState<number | null>(null)
  const [swappedIngredients, setSwappedIngredients] = useState<Map<number, Substitution>>(new Map())
  const [haveIngredients, setHaveIngredients] = useState<Set<number>>(new Set())
  const [inventoryMatches, setInventoryMatches] = useState<Map<number, any>>(new Map())
  const [ingredientResults, setIngredientResults] = useState<IngredientMatchResult[]>([])
  const [showCookingOptions, setShowCookingOptions] = useState(false)
  const [showMissingIngredientsModal, setShowMissingIngredientsModal] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  // After an inline "Scan to fix" succeeds, hold the looked-up
  // product here while the user confirms the on-hand quantity.
  // Hardcoding "1" was misleading — a scanned barcode usually
  // means "I have at least one of these," but a box of graham
  // cracker crumbs isn't actually a single unit of crumbs to the
  // recipe matcher. Prompt for the count so inventory reflects
  // reality.
  const [pendingScanProduct, setPendingScanProduct] = useState<{
    barcode: string
    name: string
    productData: any
  } | null>(null)
  const [scanQuantity, setScanQuantity] = useState<number>(1)
  // "Fix inventory" chooser — shown when user clicks the per-row
  // CTA on a missing ingredient. Lets them pick between scanning a
  // barcode (boxed/packaged) or counting manually (produce, herbs,
  // anything without a barcode). Backend term is "inventory
  // adjustment"; the UI calls it "Fix inventory" so the affordance
  // is consistent regardless of the chosen path.
  const [fixInventoryFor, setFixInventoryFor] = useState<{
    ingredientName: string
  } | null>(null)
  const [missingIngredients, setMissingIngredients] = useState<string[]>([])
  const [scannedItems, setScannedItems] = useState<Set<string>>(new Set())
  const [scanningInProgress, setScanningInProgress] = useState(false)
  const [recentlyAddedIngredients, setRecentlyAddedIngredients] = useState<Set<string>>(new Set())
  const [selectedMealType, setSelectedMealType] = useState<'breakfast' | 'lunch' | 'dinner' | 'snack'>(suggestion.mealType)
  const [startingSession, setStartingSession] = useState(false)
  const [addingToShoppingList, setAddingToShoppingList] = useState(false)
  // Family-meal Commit C — explicit override for the allergen
  // pre-flight gate. False by default; user must check the
  // override box on the warning panel to clear the block. Resets
  // on open or recipe change so stale consent doesn't carry over.
  const [allergenOverride, setAllergenOverride] = useState(false)
  useEffect(() => {
    setAllergenOverride(false)
  }, [isOpen, suggestion.id])

  // Compute the allergen overlap once per render. Pure function;
  // safe to recompute. When the recipe carries no allergens or
  // the eater has no foodAllergies set, returns []. Drives the
  // Cook Now gate + the warning panel below.
  // Effective allergen set — derived from the recipe's per-ingredient
  // classification, MINUS any tags that come from ingredients the user
  // has substituted away. Substitutions in lib/ingredient-substitutions
  // already filter to allergy-safe alternatives, so a swap means that
  // ingredient no longer contributes the original allergen.
  //
  // Without this re-derivation, the Allergen Conflict panel would still
  // say "contains milk" even after the user swapped all the dairy
  // ingredients to dairy-free alternatives — fighting the user's intent
  // and forcing them to "pick a different recipe" when they've already
  // resolved the conflict in place.
  const effectiveAllergenSet = useMemo(() => {
    const unpacked = unpackIngredientAllergens(suggestion.ingredientAllergens)
    if (!unpacked?.length) {
      // No per-ingredient classification — fall back to the recipe-
      // level allergen list (substitutions can't selectively clear
      // individual tags without ingredient-level resolution).
      return suggestion.allergens || []
    }
    const tagSet = new Set<string>()
    suggestion.ingredients.forEach((_, idx) => {
      if (swappedIngredients.has(idx)) return
      const tags = unpacked[idx]
      if (tags) tags.forEach((t) => tagSet.add(t))
    })
    return Array.from(tagSet) as typeof suggestion.allergens
  }, [
    suggestion.ingredients,
    suggestion.ingredientAllergens,
    suggestion.allergens,
    swappedIngredients,
  ])

  const allergenMatches = useMemo(
    () => findAllergenOverlap(effectiveAllergenSet, userAllergies),
    [effectiveAllergenSet, userAllergies]
  )
  const hasAllergenConflict = allergenMatches.length > 0

  // Family-meal Commit B (RecipeModal extension) — multi-eater
  // selector engages when servings > 1. Below this threshold the
  // recipe is implicitly cooked for the active eater (the
  // patient context the modal opened in), and the existing
  // single-eater allergen panel handles the gate. At >1 servings,
  // surface the family roster so the user can declare WHO the
  // additional servings are for; auto-disable any family member
  // whose allergies conflict with the recipe (planning mode =
  // hard-block, no override, mirrors Commit D).
  const [planningEaters, setPlanningEaters] = useState<EaterSelection[]>([])
  const isMultiEaterMode = servingSize > 1

  // Family-meal Commit B refinement — auto-sync servings to eater
  // count in one direction: when the user adds an eater that
  // would push the count above the current servings, bump
  // servings to match. Removing an eater does NOT auto-decrement
  // (over-cooking for leftovers is a real intent). The other
  // direction (manual servings-stepper bumps) is left to the
  // user; a small "leftovers" hint surfaces when servings >
  // eater count to make the mismatch explicit.
  useEffect(() => {
    if (planningEaters.length > servingSize) {
      setServingSize(planningEaters.length)
    }
  }, [planningEaters.length, servingSize])

  // Down-stepper floor: can't drop below the eater count, since
  // that would mean you literally don't have enough food for the
  // people you said are eating.
  const minServings = Math.max(1, planningEaters.length)

  // Cook Now gate:
  //   - servings === 1: existing per-eater hard-block on the
  //     active patient's allergies (Commit D).
  //   - servings > 1: at least one selected planning-eater must
  //     survive the auto-disable. Empty set = nobody to cook for
  //     = block.
  const cookNowBlocked = isMultiEaterMode
    ? planningEaters.length === 0
    : hasAllergenConflict && !allergenOverride

  // Are any ingredients missing from inventory (or insufficient
  // quantity)? Drives the "Try This Recipe" gate — there's no
  // point opening the cooking-options modal when the recipe is
  // unbuildable. Empty results array = inventory check hasn't run
  // yet (modal just opened); allow click while we wait. The
  // cookingOptions modal has its own missing-ingredients prompt
  // for the case where the user wants to add to shopping list
  // anyway.
  const hasMissingIngredients = useMemo(() => {
    if (ingredientResults.length === 0) return false
    return ingredientResults.some((r) => !r.matched || r.hasEnough === false)
  }, [ingredientResults])

  const tryRecipeBlocked = cookNowBlocked || hasMissingIngredients

  // Family-meal Commit D — per-ingredient allergen conflicts.
  // `ingredientAllergens` is the cached per-row classification
  // populated at recipe write time by the Gemini classifier
  // (lib/ingredient-allergen-classifier.ts). Falls back gracefully
  // when missing — recipe-level conflict still triggers via
  // `allergenMatches` above. Map: ingredient-index → list of user
  // terms that match (e.g., ["peanuts"], ["milk", "peanuts"]).
  //
  // Defense-in-depth: call unpack here too. Some read paths
  // (mergeRecipesWithMedia from useRecipes hook, raw admin SDK
  // reads) may pass the field through in its packed Firestore
  // shape ([{tags:[...]}, ...]). The unpack helper is idempotent
  // — already-unpacked input passes through unchanged.
  const perIngredientConflicts = useMemo(() => {
    const map = new Map<number, string[]>()
    const ingredientAllergens = unpackIngredientAllergens(
      suggestion.ingredientAllergens,
    )
    if (!ingredientAllergens?.length || !userAllergies?.length) return map
    suggestion.ingredients.forEach((_, idx) => {
      // Swapped → alternative is allergy-safe per substitution
      // suggestions filter; don't render the original allergen flag
      // on a row whose ingredient is no longer the original.
      if (swappedIngredients.has(idx)) return
      const tags = ingredientAllergens[idx]
      if (!tags?.length) return
      const overlaps = findAllergenOverlap(tags, userAllergies)
      if (overlaps.length > 0) {
        map.set(idx, overlaps.map((m) => m.userTerm))
      }
    })
    return map
  }, [
    suggestion.ingredients,
    suggestion.ingredientAllergens,
    userAllergies,
    swappedIngredients,
  ])

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
      // Strip pet-food / pet-supplies (and any future non-recipe
      // categories) from the inventory before the matcher sees it.
      // Without this, a recipe ingredient like "tofu" can fuzzy-match
      // a pet product like "Crisp Cod Fish Skins" via tokenization
      // overlap — the matcher has no concept of category. Filtering
      // at the boundary fixes this for every matcher call below.
      const recipeRelevantItems = filterRecipeRelevantItems(allInventoryItems)

      // Legacy simple matching (for backward compatibility)
      const matches = checkIngredientsAgainstInventory(
        suggestion.ingredients,
        recipeRelevantItems
      )
      setInventoryMatches(matches)

      // Quantity-aware matching. Prefer the structured path
      // (ingredientsV2 from /admin/recipes — barcode-linked to
      // product_database) when present; the matcher does exact
      // barcode lookups instead of free-text parsing, which is what
      // /admin/recipes already curated. Falls back to the legacy
      // text path for recipes that haven't been migrated.
      const quantityResults = suggestion.ingredientsV2 && suggestion.ingredientsV2.length > 0
        ? checkStructuredIngredients(suggestion.ingredientsV2, recipeRelevantItems)
        : checkIngredientsWithQuantities(suggestion.ingredients, recipeRelevantItems)
      setIngredientResults(quantityResults)

      // Auto-check ingredients the user effectively has. Treat
      // hasEnough === null (matched but units can't be compared, e.g.
      // recipe wants "1 cup snap peas" but inventory tracks count) as
      // "have" — the user has the ingredient, just not in a unit we
      // can convert. The cooking-block gate at handleCookNow already
      // treats null this way; aligning the visible UI here removes
      // the false-pessimistic "X of Y" counter where most rows showed
      // unchecked despite the ingredient being on hand.
      const enoughIndices = new Set<number>()
      quantityResults.forEach((result, idx) => {
        if (result.hasEnough === true || (result.matched && result.hasEnough === null)) {
          enoughIndices.add(idx)
        }
      })
      setHaveIngredients(enoughIndices)
    }
  }, [isOpen, suggestion.ingredients, suggestion.ingredientsV2, allInventoryItems])

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
    setServingSize(getServingSize(suggestion.servingSize))
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

    // Family-meal Commit C — allergen pre-flight. Block when the
    // recipe carries an allergen the eater is allergic to, unless
    // they've explicitly checked the override. Backstop only —
    // the button itself is also disabled below, but a defensive
    // check here ensures the gate holds even if the disabled
    // attribute gets bypassed (programmatic click, accessibility
    // tools, etc.).
    if (cookNowBlocked) {
      if (isMultiEaterMode) {
        toast.error('Pick at least one eligible eater above before cooking.')
      } else {
        const names = allergenMatches.map((m) => m.userTerm).join(', ')
        toast.error(
          `Recipe contains ${names} — unsafe for this eater. Pick a different recipe.`
        )
      }
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

    // Family-meal Commit D — defensive backstop. Button is disabled
    // when cookNowBlocked, but a programmatic / accessibility-tool
    // click could still hit this path. Toast and bail.
    if (cookNowBlocked) {
      if (isMultiEaterMode) {
        toast.error(
          'Pick at least one eligible eater above before adding to the shopping list.'
        )
      } else {
        const names = allergenMatches.map((m) => m.userTerm).join(', ')
        toast.error(
          `Recipe contains ${names} — unsafe for this eater. Pick a different recipe.`
        )
      }
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

      const userId = auth.currentUser!.uid
      const ingredientTexts = itemsToAdd.map(({ ingredient }) => ingredient)
      const { newCount: newItemsCount, linkedCount: linkedItemsCount } = await addRecipeIngredientsToShoppingList(
        userId, ingredientTexts, suggestion.id, patientId
      )

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

      // Switch to the shopping tab so the user lands on what they just
      // added — easier to see linked vs new items at a glance, and the
      // toast message references counts that match the visible list.
      setActiveTab('shopping')
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

      // Per-row inline scan path — user clicked "Scan to fix" on a
      // single missing ingredient row. Defer the inventory write
      // until they tell us the on-hand quantity (could be 1, 2, 5,
      // a half-empty box, etc.). The batch-modal flow below
      // continues to assume +1 per scan to keep that flow fast.
      if (!scanningInProgress) {
        setShowScanner(false)
        toast.dismiss('barcode-scan')
        setPendingScanProduct({
          barcode,
          name: product.name,
          productData: response.product,
        })
        setScanQuantity(1)
        return
      }

      // Batch path — existing missing-ingredients-modal flow.
      // Add +1 of the scanned item without prompting (speed of
      // batch scanning trumps quantity precision here).
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
      <div className="relative bg-card border border-border rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden m-4">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-foreground">{suggestion.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex space-x-1 px-4">
            <button
              onClick={() => setActiveTab('recipe')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'recipe'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Recipe
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-4 py-3 font-medium transition-colors ${
                activeTab === 'shopping'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
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
                    <h3 className="font-semibold text-foreground text-sm">Servings</h3>
                    <p className="text-xs text-muted-foreground">Adjust to scale recipe</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={decrementServings}
                      disabled={servingSize <= minServings}
                      className="w-11 h-11 rounded-full bg-primary text-white text-xl font-bold hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                      aria-label="Decrease servings"
                      title={
                        servingSize <= minServings && minServings > 1
                          ? `Servings can't drop below the eater count (${minServings}). De-select an eater first.`
                          : undefined
                      }
                    >
                      −
                    </button>
                    <div className="text-center min-w-[60px]">
                      <div className="text-3xl font-bold text-primary">{servingSize}</div>
                      <div className="text-xs text-muted-foreground">serving{servingSize > 1 ? 's' : ''}</div>
                    </div>
                    <button
                      onClick={incrementServings}
                      disabled={servingSize >= 8}
                      className="w-11 h-11 rounded-full bg-primary text-white text-xl font-bold hover:bg-primary-hover disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors flex items-center justify-center"
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
                      className="inline-flex items-center px-3 py-2 min-h-[36px] text-xs text-primary hover:bg-primary/10 active:bg-primary/20 font-medium rounded-md transition-colors"
                    >
                      Reset to original ({suggestion.servingSize} serving{suggestion.servingSize > 1 ? 's' : ''})
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Info - Scaled */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-muted-foreground">
                    {scaledRecipe.scaledCalories || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">calories (total)</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-muted-foreground">
                    {scaledRecipe.scaledMacros?.protein || 0}g
                  </p>
                  <p className="text-xs text-muted-foreground">protein (total)</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-muted-foreground">
                    {adjustedPrepTime || 0} min
                  </p>
                  <p className="text-xs text-muted-foreground">prep time</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-primary dark:text-muted-foreground">
                    {scaledRecipe.scaledCalories && servingSize ? Math.round(scaledRecipe.scaledCalories / servingSize) : 0}
                  </p>
                  <p className="text-xs text-muted-foreground">cal per serving</p>
                </div>
              </div>

              {/* Macros - Scaled */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Nutrition (Total for {servingSize} serving{servingSize > 1 ? 's' : ''})</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Carbs:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros?.carbs || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fat:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros?.fat || 0}g</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiber:</span>
                    <span className="font-medium">{scaledRecipe.scaledMacros?.fiber || 0}g</span>
                  </div>
                </div>
              </div>

              {/* Dietary Tags */}
              {suggestion.dietaryTags && suggestion.dietaryTags.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Dietary Info</h3>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.dietaryTags.map(tag => (
                      <span key={tag} className="text-xs bg-primary-light dark:bg-purple-900/20 text-primary px-2 py-1 rounded">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Family-meal Commit B (RecipeModal extension) —
                  multi-eater selector when servings > 1. Asks who
                  the additional servings are for. Auto-disables
                  any family member whose foodAllergies overlap any
                  classified ingredient. plan mode = no override
                  toggle (Commit D semantic). */}
              {isMultiEaterMode && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">
                    Cooking for {servingSize} — who else is eating?
                  </h3>
                  <EaterMultiSelect
                    ingredientAllergens={suggestion.ingredientAllergens}
                    scopedToPatientId={patientId}
                    mode="plan"
                    onChange={setPlanningEaters}
                  />
                  {/* Leftovers hint — when the user manually bumped
                      servings past the eater count. (B) coupling:
                      adding eaters auto-syncs servings up, so this
                      can only happen via servings stepper. Make
                      the mismatch explicit so the user sees why
                      Cook Now is asking for {servingSize} portions
                      with only {planningEaters.length} eaters. */}
                  {servingSize > planningEaters.length && planningEaters.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Cooking {servingSize} servings for {planningEaters.length}{' '}
                      eater{planningEaters.length === 1 ? '' : 's'} —{' '}
                      {servingSize - planningEaters.length} extra portion
                      {servingSize - planningEaters.length === 1 ? '' : 's'} for
                      leftovers. Add more eaters above or step servings down.
                    </p>
                  )}
                </div>
              )}

              {/* Allergens — two states (only rendered at servings
                  = 1; at >1, the EaterMultiSelect above handles
                  per-eater conflict messaging):
                  1. hasAllergenConflict: this recipe contains an
                     allergen the active eater is allergic to.
                     Render a red gating panel — Cook Now and
                     shopping-list actions are HARD blocked.
                     The override checkbox is disabled because the
                     active eater literally has the allergy; an
                     override here would just be a footgun.
                  2. No conflict but recipe carries allergens:
                     passive orange "Contains:" label as before. */}
              {!isMultiEaterMode && (hasAllergenConflict ? (
                <div>
                  <h3 className="font-semibold text-error mb-2">
                    Allergen Conflict
                  </h3>
                  <div className="bg-error/10 border-2 border-error rounded-lg p-3">
                    <p className="text-sm font-medium text-error mb-2">
                      This recipe contains{' '}
                      <strong>
                        {allergenMatches.map((m) => m.userTerm).join(', ')}
                      </strong>{' '}
                      — flagged in{' '}
                      <strong>
                        {patientName ? `${patientName}'s` : 'the eater’s'}
                      </strong>{' '}
                      allergy profile.
                    </p>
                    <p className="text-xs text-error mb-3">
                      To proceed, swap the conflicting ingredients
                      below for allergen-safe alternatives. Once every
                      flagged item is substituted, Cook Now will
                      unblock automatically.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        // Find the first conflicting ingredient, expand
                        // its substitution panel, and scroll the row
                        // into view. If multiple conflicts, the user
                        // can re-click after picking the first to walk
                        // to the next.
                        const firstConflictIdx = Array.from(
                          perIngredientConflicts.keys(),
                        ).sort((a, b) => a - b)[0]
                        if (firstConflictIdx === undefined) return
                        setExpandedIngredient(firstConflictIdx)
                        // Defer scroll to next paint so the expand
                        // animation has the row in DOM.
                        setTimeout(() => {
                          const row = document.querySelector(
                            `[data-ingredient-idx="${firstConflictIdx}"]`,
                          )
                          if (row) {
                            row.scrollIntoView({
                              behavior: 'smooth',
                              block: 'center',
                            })
                          }
                        }, 100)
                      }}
                      className="w-full px-3 py-2 bg-error text-white rounded font-medium text-sm hover:opacity-90 transition-opacity mb-2"
                    >
                      Substitute conflicting ingredients
                    </button>
                    <label className="flex items-start gap-2 text-xs cursor-not-allowed text-muted-foreground opacity-60">
                      <input
                        type="checkbox"
                        checked={false}
                        disabled
                        readOnly
                        className="w-4 h-4 mt-0.5 rounded border-border cursor-not-allowed"
                      />
                      <span>
                        Override unavailable — {patientName || 'this eater'} is
                        allergic. Substitute the conflicting ingredients
                        instead.
                      </span>
                    </label>
                  </div>
                </div>
              ) : (
                suggestion.allergens?.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-foreground mb-2">
                      Allergen Warning
                    </h3>
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                      <p className="text-sm font-medium text-orange-800 dark:text-orange-300 mb-1">
                        Contains:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 px-2 py-1 rounded"
                          >
                            {allergen}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )
              ))}

              {/* Ingredients - Scaled with Substitutions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">Ingredients</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleSelectAllIngredients}
                      className="px-3 py-2 min-h-[36px] text-xs text-primary hover:bg-primary/10 active:bg-primary/20 font-medium rounded-md transition-colors"
                    >
                      I have all
                    </button>
                    <span className="text-xs text-muted-foreground">•</span>
                    <button
                      onClick={handleClearAllIngredients}
                      className="px-3 py-2 min-h-[36px] text-xs text-muted-foreground hover:bg-muted active:bg-muted/80 rounded-md transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                </div>
                {/* Recipe Readiness Indicator. Pass structured
                    ingredientsV2 when populated so the readiness
                    badge benefits from barcode-exact matching;
                    calculateRecipeReadiness also filters pet
                    categories internally. */}
                {ingredientResults.length > 0 && (() => {
                  const readiness = calculateRecipeReadiness(
                    suggestion.ingredientsV2 && suggestion.ingredientsV2.length > 0
                      ? suggestion.ingredientsV2
                      : (suggestion.ingredients || []),
                    allInventoryItems
                  )
                  return (
                    <div className={`mb-3 p-3 rounded-lg border-2 ${
                      readiness.canMake
                        ? 'bg-success-light dark:bg-green-900/20 border-green-500 dark:border-green-700'
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
                          <p className="text-xs text-muted-foreground mt-0.5">
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
                  <div className="mb-3 bg-secondary-light border border-secondary-light rounded-lg px-3 py-2">
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
                      <div
                        key={idx}
                        data-ingredient-idx={idx}
                        className="border border-border rounded-lg overflow-hidden"
                      >
                        {/* Main Ingredient */}
                        <div className={`p-3 flex items-start ${isSwapped ? 'bg-primary-light dark:bg-purple-900/20' : ''} transition-colors`}>
                          {/* Checkbox - I have this */}
                          <div className="flex items-center mr-2">
                            <input
                              type="checkbox"
                              checked={hasIngredient}
                              onChange={() => toggleHaveIngredient(idx)}
                              className="w-4 h-4 text-success border-border rounded focus:ring-success cursor-pointer"
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
                                <span className={`text-sm text-foreground ${hasIngredient ? 'line-through opacity-60' : ''}`}>
                                  {displayIngredient}
                                </span>
                                {isSwapped && swappedSub.ratio && (
                                  <span className="text-xs text-muted-foreground ml-2">({swappedSub.ratio})</span>
                                )}
                                {isSwapped && swappedSub.notes && (
                                  <p className="text-xs text-muted-foreground mt-1">{swappedSub.notes}</p>
                                )}
                                {/* Family-meal Commit D — per-ingredient
                                    allergen flag. Renders when this row's
                                    classified allergens overlap with the
                                    eater's foodAllergies. */}
                                {perIngredientConflicts.has(idx) && (
                                  <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                                    <span>⚠</span>
                                    <span>
                                      Contains {perIngredientConflicts.get(idx)!.join(', ')} —{' '}
                                      {perIngredientConflicts.get(idx)!.length === 1 ? 'allergy' : 'allergies'}
                                    </span>
                                  </p>
                                )}
                                {/* Show quantity-aware inventory status */}
                                {ingredientResults[idx] && (
                                  <div className="mt-1">
                                    {ingredientResults[idx].hasEnough === true && (
                                      <p className="text-xs text-success-dark dark:text-green-400 flex items-center gap-1">
                                        <span>✓</span>
                                        <span>{ingredientResults[idx].comparison}</span>
                                      </p>
                                    )}
                                    {ingredientResults[idx].hasEnough === false && ingredientResults[idx].matched && (
                                      <div className="text-xs text-orange-700 dark:text-orange-400 flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <span>⚠️</span>
                                          <span>{ingredientResults[idx].comparison}</span>
                                        </span>
                                        {isIngredientOnShoppingList(ingredient) && (
                                          <span className="inline-flex items-center gap-0.5 text-primary font-medium">
                                            <span>📋</span> On Shopping List
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            // Both rows pass the
                                            // displayIngredient text — that's
                                            // the user-visible name we'd want
                                            // to surface in the chooser
                                            // (e.g., "1 cup graham cracker
                                            // crumbs" → user sees what
                                            // they're fixing inventory for).
                                            setFixInventoryFor({
                                              ingredientName: displayIngredient,
                                            })
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs bg-primary/10 text-primary font-medium rounded-md hover:bg-primary/20 active:bg-primary/30 transition-colors"
                                        >
                                          <span>🔧</span>
                                          <span>Fix inventory</span>
                                        </button>
                                      </div>
                                    )}
                                    {!ingredientResults[idx].matched && (
                                      <div className="text-xs text-error-dark flex items-center gap-2 flex-wrap">
                                        <span className="flex items-center gap-1">
                                          <span>❌</span>
                                          <span>{ingredientResults[idx].comparison}</span>
                                        </span>
                                        {isIngredientOnShoppingList(ingredient) && (
                                          <span className="inline-flex items-center gap-0.5 text-primary font-medium">
                                            <span>📋</span> On Shopping List
                                          </span>
                                        )}
                                        {/* Inline "Scan to fix" — for the case
                                            where the user actually has the
                                            ingredient at home but it's not in
                                            the app's inventory. One scan adds
                                            it; the row updates inline. */}
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            // Both rows pass the
                                            // displayIngredient text — that's
                                            // the user-visible name we'd want
                                            // to surface in the chooser
                                            // (e.g., "1 cup graham cracker
                                            // crumbs" → user sees what
                                            // they're fixing inventory for).
                                            setFixInventoryFor({
                                              ingredientName: displayIngredient,
                                            })
                                          }}
                                          className="inline-flex items-center gap-1 px-3 py-2 min-h-[36px] text-xs bg-primary/10 text-primary font-medium rounded-md hover:bg-primary/20 active:bg-primary/30 transition-colors"
                                        >
                                          <span>🔧</span>
                                          <span>Fix inventory</span>
                                        </button>
                                      </div>
                                    )}
                                    {ingredientResults[idx].hasEnough === null && ingredientResults[idx].matched && (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1">
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
                                  className="text-xs text-muted-foreground hover:text-foreground underline"
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
                          <div className="bg-muted border-t border-border p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">Alternatives:</p>
                            <div className="space-y-2">
                              {substitutions.map((sub, subIdx) => (
                                <div key={subIdx} className="bg-card rounded-md p-2 border border-border hover:border-primary transition-colors group">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-foreground">{sub.name}</p>
                                      {sub.ratio && (
                                        <p className="text-xs text-muted-foreground">Ratio: {sub.ratio}</p>
                                      )}
                                      {sub.notes && (
                                        <p className="text-xs text-muted-foreground mt-1">{sub.notes}</p>
                                      )}
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {sub.dietaryTags.slice(0, 2).map(tag => (
                                          <span key={tag} className="text-[10px] bg-primary-light dark:bg-purple-900/20 text-primary px-1.5 py-0.5 rounded">
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
                    <h3 className="font-semibold text-foreground mb-2">Instructions</h3>

                    {hasAllIngredients ? (
                      /* Show instructions when user has everything */
                      <ol className="space-y-3">
                        {suggestion.recipeSteps.map((step, idx) => (
                          <li key={idx} className="text-sm text-foreground flex items-start">
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
                        <div className="bg-card rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">
                              Ingredient Progress
                            </span>
                            <span className="text-sm font-bold text-warning dark:text-orange-400">
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
                    <h3 className="font-semibold text-foreground mb-2">Cooking Tips</h3>
                    <div className="bg-secondary-light border border-secondary-light rounded-lg p-4 space-y-2">
                      {suggestion.cookingTips.map((tip, idx) => (
                        <p key={idx} className="text-sm text-blue-900 dark:text-blue-300 flex items-start">
                          <span className="text-secondary mr-2">💡</span>
                          <span>{tip}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* No Recipe Available */}
              {(!suggestion.recipeSteps || suggestion.recipeSteps.length === 0) && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">
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
                        <h3 className="font-semibold text-foreground">Shopping List</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {neededCount} of {totalCount} items needed
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground">For {servingSize} serving{servingSize > 1 ? 's' : ''}</p>
                    </div>

                    {/* Family-meal Commit B (RecipeModal extension) —
                        when servings > 1 the multi-eater UI on the
                        Recipe tab handles per-eater conflict messaging,
                        so we suppress the duplicate panel on the
                        Shopping List tab to avoid stacking. */}
                    {/* Family-meal Commit D — allergen pre-flight on
                        the Shopping List path. Same hard-block as the
                        Cook Now panel. Override is disabled because
                        the active eater has the allergy; there's no
                        scenario where bulk-adding allergen-containing
                        ingredients to the shopping list for this
                        eater is the right action. */}
                    {!isMultiEaterMode && hasAllergenConflict && (
                      <div className="bg-error/10 border-2 border-error rounded-lg p-3 mb-4">
                        <h4 className="text-sm font-semibold text-error mb-1">
                          Allergen Conflict
                        </h4>
                        <p className="text-xs text-error mb-2">
                          This recipe contains{' '}
                          <strong>
                            {allergenMatches.map((m) => m.userTerm).join(', ')}
                          </strong>
                          . Adding these ingredients to the shopping list
                          won&apos;t make them safe for this eater. Pick a
                          different recipe, or substitute the conflicting
                          ingredients first.
                        </p>
                        <label className="flex items-start gap-2 text-xs cursor-not-allowed text-muted-foreground opacity-60">
                          <input
                            type="checkbox"
                            checked={false}
                            disabled
                            readOnly
                            className="w-4 h-4 mt-0.5 rounded border-border cursor-not-allowed"
                          />
                          <span>
                            Override unavailable — this eater is allergic.
                          </span>
                        </label>
                      </div>
                    )}

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
                          <div className="w-full mb-4 px-4 py-3 bg-secondary-light border-2 border-blue-500 dark:border-blue-700 rounded-lg text-center">
                            <div className="flex items-center justify-center gap-2 text-blue-700 dark:text-blue-300">
                              <span className="text-lg">📋</span>
                              <span className="font-semibold">All {neededCount} missing item{neededCount > 1 ? 's are' : ' is'} on your shopping list!</span>
                            </div>
                            <p className="text-xs text-secondary mt-1">
                              Shop for these items, then scan them to cook this recipe
                            </p>
                          </div>
                        )
                      }

                      // Some or no items on list - show add button.
                      // Family-meal Commit D — disabled when allergen
                      // conflict not yet overridden.
                      const remainingCount = neededCount - itemsOnList
                      return (
                        <button
                          onClick={handleAddMissingToShoppingList}
                          disabled={addingToShoppingList || cookNowBlocked}
                          className="w-full mb-4 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>
                            {addingToShoppingList
                              ? 'Adding...'
                              : cookNowBlocked
                                ? isMultiEaterMode
                                  ? 'Pick at least one eligible eater above'
                                  : 'Unsafe for this eater — pick a different recipe'
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
                        <p className="text-sm text-muted-foreground">All ingredients are checked off. Ready to cook!</p>
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
                                ? 'bg-primary-light dark:bg-purple-900/20'
                                : result && result.matched && result.hasEnough === true
                                  ? 'bg-success-light dark:bg-green-900/10' // Green background for in-stock
                                  : isIngredientOnShoppingList(ingredient)
                                    ? 'bg-amber-50 dark:bg-amber-900/10' // Amber background for on list
                                    : 'bg-muted' // Default
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
                                      ? 'text-green-500 border-green-500 dark:border-green-500 bg-success-light0' // Green checkbox
                                      : isIngredientOnShoppingList(ingredient)
                                        ? 'text-amber-500 border-amber-500 dark:border-amber-500 bg-amber-500' // Amber checkbox
                                        : 'border-border dark:border-gray-600' // Default unchecked
                                  }`}
                                />
                                <div className="flex-1">
                                  <span className="text-sm text-foreground block">
                                    {displayIngredient}
                                    {isSwapped && swappedSub.ratio && (
                                      <span className="text-xs text-muted-foreground ml-2">({swappedSub.ratio})</span>
                                    )}
                                  </span>
                                  {/* Family-meal Commit D — per-ingredient
                                      allergen flag in the shopping-list row,
                                      mirroring the Recipe-tab badge so users
                                      can see which specific items are unsafe
                                      before adding to their list. */}
                                  {perIngredientConflicts.has(idx) && (
                                    <p className="text-xs text-error font-medium flex items-center gap-1 mt-1">
                                      <span>⚠</span>
                                      <span>
                                        Contains {perIngredientConflicts.get(idx)!.join(', ')} — allergy
                                      </span>
                                    </p>
                                  )}
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
                                            className="text-blue-700 hover:text-blue-900 dark:hover:text-blue-200 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                                            aria-label="View shopping list"
                                          >
                                            <span>📋</span>
                                            <span>On Shopping List</span>
                                          </button>
                                          {recentlyAddedIngredients.has(ingredient) && (
                                            <span className="text-success dark:text-green-400 font-medium">✓ Just Added</span>
                                          )}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-error-dark mt-1">
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
                    <div className="mt-6 bg-secondary-light border border-secondary-light rounded-lg p-4">
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
        <div className="sticky bottom-0 bg-card border-t border-border p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {/* Try This Recipe Button. Disabled when:
                  - allergen conflict isn't resolved (cookNowBlocked)
                  - any ingredient is missing/insufficient AND no
                    substitute has been chosen (hasMissingIngredients)
                  Avoids the bait-and-switch where the green button
                  looks ready but opens a dead-end modal saying
                  "you can't actually cook this." */}
              {suggestion.recipeSteps && suggestion.recipeSteps.length > 0 && (
                <button
                  onClick={() => setShowCookingOptions(true)}
                  className="px-5 py-3 min-h-[44px] bg-success text-white rounded-lg hover:bg-success-hover transition-colors font-medium flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-success"
                  disabled={startingSession || tryRecipeBlocked}
                  title={
                    cookNowBlocked
                      ? `Allergen conflict — substitute the flagged ingredients first`
                      : hasMissingIngredients
                        ? `Missing ingredients — add them to inventory or your shopping list first`
                        : undefined
                  }
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>
                    {cookNowBlocked
                      ? 'Allergen conflict'
                      : hasMissingIngredients
                        ? 'Missing ingredients'
                        : 'Try This Recipe'}
                  </span>
                </button>
              )}

              <button
                onClick={handlePrint}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
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
                  <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[250px] z-50">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Choose design style:</p>
                    <div className="space-y-2">
                      {getAvailableTemplates().map((template) => (
                        <button
                          key={template.style}
                          onClick={() => handleTemplateSelect(template.style)}
                          className="w-full text-left px-3 py-2 hover:bg-muted rounded group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="text-2xl">{template.icon}</span>
                              <div>
                                <p className="text-sm font-medium">{template.name}</p>
                                <p className="text-xs text-muted-foreground">{template.description}</p>
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
                  <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-xl p-3 min-w-[200px]">
                    <p className="text-xs font-semibold text-muted-foreground mb-3">Choose format:</p>
                    <div className="space-y-2">
                      <button
                        onClick={() => handleAspectRatioSelect('1:1')}
                        className="w-full text-left px-3 py-2 hover:bg-muted rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Square (1:1)</p>
                          <p className="text-xs text-muted-foreground">Instagram Feed</p>
                        </div>
                        <div className="w-8 h-8 border-2 border-primary rounded bg-primary-light dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                      <button
                        onClick={() => handleAspectRatioSelect('9:16')}
                        className="w-full text-left px-3 py-2 hover:bg-muted rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Story (9:16)</p>
                          <p className="text-xs text-muted-foreground">Instagram/FB Stories</p>
                        </div>
                        <div className="w-5 h-8 border-2 border-primary rounded bg-primary-light dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                      <button
                        onClick={() => handleAspectRatioSelect('3:2')}
                        className="w-full text-left px-3 py-2 hover:bg-muted rounded flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-sm font-medium">Landscape (3:2)</p>
                          <p className="text-xs text-muted-foreground">Twitter/Facebook</p>
                        </div>
                        <div className="w-10 h-6 border-2 border-primary rounded bg-primary-light dark:bg-purple-900/20 group-hover:bg-primary-hover"></div>
                      </button>
                    </div>
                  </div>
                )}
                {showShareMenu && (
                  <div className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-lg shadow-xl p-2 space-y-1 min-w-[150px]">
                    <button
                      onClick={() => handlePlatformShare('facebook')}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm flex items-center space-x-2"
                    >
                      <span>📘</span>
                      <span>Facebook</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('twitter')}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm flex items-center space-x-2"
                    >
                      <span>✖️</span>
                      <span>Twitter</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('pinterest')}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm flex items-center space-x-2"
                    >
                      <span>📍</span>
                      <span>Pinterest</span>
                    </button>
                    <button
                      onClick={() => handlePlatformShare('whatsapp')}
                      className="w-full text-left px-3 py-2 hover:bg-muted rounded text-sm flex items-center space-x-2"
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
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-xl font-bold text-foreground mb-4">Start {actionLabel}ing</h3>

              {/* Meal Type Selector */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-foreground mb-2">
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
                          : 'bg-muted text-foreground hover:bg-gray-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipe Info */}
              <div className="bg-muted rounded-lg p-3 mb-6 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Recipe:</span>
                  <span className="font-medium text-foreground">{suggestion.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Servings:</span>
                  <span className="font-medium text-foreground">{servingSize}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prep time:</span>
                  <span className="font-medium text-foreground">{adjustedPrepTime} min</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total calories:</span>
                  <span className="font-medium text-foreground">{scaledRecipe.scaledCalories}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                {/* Allergen-conflict callout in this options pane —
                    duplicated copy of the gate from the main view
                    so the user sees the block in the same place
                    they're trying to act. The disabled state +
                    backstop in handleCookNow keep the gate held. */}
                {cookNowBlocked && (
                  <div className="bg-error/10 border-2 border-error rounded-lg p-3 text-sm text-error">
                    {isMultiEaterMode ? (
                      <>
                        No eligible eater for this recipe. Every selected
                        family member has an allergen conflict, or none
                        selected. Pick someone in &quot;Who else is eating?&quot;
                        above, or reduce servings to 1.
                      </>
                    ) : (
                      <>
                        Allergen conflict ({allergenMatches.map((m) => m.userTerm).join(', ')}) —
                        unsafe for this eater. Cook Now is blocked. Choose a
                        different recipe or substitute the conflicting ingredients.
                      </>
                    )}
                  </div>
                )}
                <button
                  onClick={handleCookNow}
                  disabled={startingSession || cookNowBlocked}
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
                  className="w-full px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors font-medium"
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
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-4">
                <div className="text-4xl mb-2">🛒</div>
                <h3 className="text-xl font-bold text-foreground">Missing Ingredients</h3>
                <p className="text-sm text-muted-foreground mt-2">
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
              <div className="bg-secondary-light border border-secondary-light rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-900">
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
                  className="w-full px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  disabled={addingToShoppingList}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* "Fix inventory" chooser — picks between barcode scan
            (boxed / packaged items) and manual count (produce,
            herbs, loose items with no barcode). Both paths feed
            the same quantity-prompt below. Backend logs the change
            as an "inventory adjustment" regardless of which path
            was used. */}
        {fixInventoryFor && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-foreground mb-1">
                Fix inventory
              </h3>
              <p className="text-sm text-muted-foreground mb-5 break-words">
                <strong>{fixInventoryFor.ingredientName}</strong>
              </p>
              <div className="space-y-2 mb-4">
                {/* Three semantically-distinct paths for resolving a
                    missing ingredient:
                    - Add to Shopping List: "I don't have it"
                    - Scan: "I have it (boxed)"
                    - Adjust: "I have it (produce, no barcode)"
                    Backend treats all three as inventory-adjustment
                    events; the user-facing labels make the intent
                    explicit. */}
                <button
                  type="button"
                  onClick={async () => {
                    const ingredient = fixInventoryFor.ingredientName
                    setFixInventoryFor(null)
                    if (!auth.currentUser?.uid) {
                      toast.error('You must be logged in')
                      return
                    }
                    try {
                      const { newCount, linkedCount } =
                        await addRecipeIngredientsToShoppingList(
                          auth.currentUser.uid,
                          [ingredient],
                          suggestion.id,
                          patientId,
                        )
                      await refreshShoppingList()
                      if (newCount > 0) {
                        toast.success(`✓ Added "${ingredient}" to shopping list`)
                      } else if (linkedCount > 0) {
                        toast.success(
                          `✓ Linked "${ingredient}" (already on your list) to this recipe`,
                        )
                      }
                    } catch (err) {
                      logger.error('add-to-shopping single-item failed', err as Error)
                      toast.error('Failed to add to shopping list')
                    }
                  }}
                  className="w-full px-4 py-3 min-h-[44px] bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 active:bg-amber-700 flex items-center gap-3 text-left"
                >
                  <span className="text-xl">📋</span>
                  <span className="flex-1">
                    <span className="block">Add to Shopping List</span>
                    <span className="block text-xs font-normal opacity-90">
                      I don&apos;t have it — need to buy it
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFixInventoryFor(null)
                    setShowScanner(true)
                  }}
                  className="w-full px-4 py-3 min-h-[44px] bg-primary text-white rounded-lg font-medium hover:bg-primary-hover active:bg-primary-hover flex items-center gap-3 text-left"
                >
                  <span className="text-xl">📷</span>
                  <span className="flex-1">
                    <span className="block">Scan</span>
                    <span className="block text-xs font-normal opacity-90">
                      I have it — boxed, jarred, or packaged
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const name = fixInventoryFor.ingredientName
                    const slug = name
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/(^-|-$)/g, '')
                      .slice(0, 60)
                    const synthetic = `manual:${slug || 'item'}`
                    setFixInventoryFor(null)
                    // Reuse the existing quantity-prompt by faking a
                    // pendingScanProduct entry. addItem treats the
                    // OpenFoodFactsProduct's `code` as the barcode,
                    // so the synthetic "manual:xxx" key gives us
                    // dedup against future "Adjust" repeats for the
                    // same ingredient string.
                    setPendingScanProduct({
                      barcode: synthetic,
                      name,
                      productData: {
                        code: synthetic,
                        product_name: name,
                      },
                    })
                    setScanQuantity(1)
                  }}
                  className="w-full px-4 py-3 min-h-[44px] bg-success text-white rounded-lg font-medium hover:bg-success-hover active:bg-success-hover flex items-center gap-3 text-left"
                >
                  <span className="text-xl">🔢</span>
                  <span className="flex-1">
                    <span className="block">Adjust</span>
                    <span className="block text-xs font-normal opacity-90">
                      I have it — produce, herbs, no barcode
                    </span>
                  </span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFixInventoryFor(null)}
                className="w-full px-4 py-3 min-h-[44px] text-muted-foreground hover:bg-muted/50 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Quantity confirmation prompt — fires after a successful
            inline "Fix inventory" lookup (Scan path) or directly
            after the chooser's "Count it" path. User tells us how
            many they actually have on hand before we touch the
            inventory. */}
        {pendingScanProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-bold text-foreground mb-2">
                How many do you have?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                <strong>{pendingScanProduct.name}</strong> — confirm the
                on-hand count before adding to inventory.
              </p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => setScanQuantity((q) => Math.max(1, q - 1))}
                  className="w-11 h-11 rounded-full bg-muted text-foreground text-2xl font-bold active:bg-muted/80"
                  aria-label="Decrease quantity"
                  disabled={scanQuantity <= 1}
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={scanQuantity}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10)
                    if (!isNaN(n) && n >= 1 && n <= 999) setScanQuantity(n)
                  }}
                  className="w-20 text-center text-3xl font-bold tabular-nums bg-muted rounded-lg px-2 py-1 text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setScanQuantity((q) => Math.min(999, q + 1))}
                  className="w-11 h-11 rounded-full bg-muted text-foreground text-2xl font-bold active:bg-muted/80"
                  aria-label="Increase quantity"
                  disabled={scanQuantity >= 999}
                >
                  +
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingScanProduct(null)}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg font-medium active:bg-muted/80"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const { barcode, name, productData } = pendingScanProduct
                    try {
                      const existing = allInventoryItems.find((item) => item.barcode === barcode)
                      if (existing) {
                        await updateItem(existing.id, {
                          inStock: true,
                          quantity: existing.quantity + scanQuantity,
                          needed: false,
                        })
                      } else {
                        await addItem(productData, {
                          inStock: true,
                          needed: false,
                          quantity: scanQuantity,
                        })
                      }
                      refreshInventory()
                      toast.success(
                        `✓ Added ${scanQuantity} × ${name} to inventory`,
                      )
                    } catch (err) {
                      logger.error('inline-scan add failed', err as Error)
                      toast.error('Failed to update inventory')
                    } finally {
                      setPendingScanProduct(null)
                    }
                  }}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-hover active:bg-primary-hover"
                >
                  Add to inventory
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
            // Only return to the missing-ingredients modal when the
            // user opened the scanner from THAT modal (batch flow).
            // Inline "Scan to fix" closes silently.
            if (scanningInProgress) {
              setShowMissingIngredientsModal(true)
            }
          }}
          context="inventory"
          title={
            scanningInProgress
              ? `Scan Ingredients (${scannedItems.size}/${missingIngredients.length})`
              : 'Scan to add to inventory'
          }
        />
      </div>
    </div>
  )
}
