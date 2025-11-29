'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MealType, DietaryTag, MealSuggestion } from '@/lib/meal-suggestions'
import { useRecipes } from '@/hooks/useRecipes'
import { RecipeImageCarousel } from '@/components/RecipeImageCarousel'
import { VideoCameraIcon, ShieldCheckIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { getMemberRecipeSuggestions, type MemberRecipeSuggestion } from '@/lib/member-recipe-engine'
import { medicalOperations } from '@/lib/medical-operations'
import { getHouseholdInventory, enrichInventoryWithNutrition } from '@/lib/household-shopping-operations'
import { requiresCooking } from '@/lib/meal-suggestions'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import type { PatientProfile, PatientMedication, VitalSign } from '@/types/medical'
import type { ShoppingItem } from '@/types/shopping'
import { useUserProfile } from '@/hooks/useUserProfile'
import { RecipeSuggestions } from '@/components/inventory/RecipeSuggestions'
import { RecipeModal } from '@/components/ui/RecipeModal'
import { generateRecipeFromInventory } from '@/lib/inventory-recipe-generator'

interface RecipeViewProps {
  patientId: string
  patientName: string
}

/**
 * Get current meal type based on time of day
 */
function getCurrentMealType(): MealType {
  const hour = new Date().getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}

export function RecipeView({ patientId, patientName }: RecipeViewProps) {
  const { recipes, loading: recipesLoading } = useRecipes()
  const { profile: userProfile } = useUserProfile()

  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>(getCurrentMealType())
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<DietaryTag[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [minInventoryFilter, setMinInventoryFilter] = useState<number>(0) // 0 = show all, 50 = 50%+ available, 100 = only makeable
  const [hasSetInitialFilter, setHasSetInitialFilter] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<MealSuggestion | null>(null)

  // Member-specific state
  const [memberProfile, setMemberProfile] = useState<PatientProfile | null>(null)
  const [memberMedications, setMemberMedications] = useState<PatientMedication[]>([])
  const [memberVitals, setMemberVitals] = useState<VitalSign[]>([])
  const [memberRecipes, setMemberRecipes] = useState<MemberRecipeSuggestion[]>([])
  const [inventoryItems, setInventoryItems] = useState<ShoppingItem[]>([])
  const [loadingMemberData, setLoadingMemberData] = useState(false)
  const [generatingRecipe, setGeneratingRecipe] = useState(false)

  // Fetch member medical data and generate personalized recipes
  useEffect(() => {
    const fetchMemberData = async () => {
      setLoadingMemberData(true)
      try {
        const user = auth.currentUser
        if (!user) {
          logger.warn('[RecipeView] No authenticated user for member data')
          return
        }

        // Fetch patient profile
        const profile = await medicalOperations.patients.getPatient(patientId)
        if (!profile) {
          toast.error('Member profile not found')
          return
        }
        setMemberProfile(profile)

        // Fetch medications
        const meds = await medicalOperations.medications.getMedications(patientId)
        setMemberMedications(meds || [])

        // Fetch recent vitals (last 30 days)
        const vitals = await medicalOperations.vitals.getVitals(patientId)
        setMemberVitals(vitals || [])

        // Fetch household inventory (using user's householdId which is their userId)
        const householdId = user.uid
        const household = await getHouseholdInventory(householdId)

        // Enrich inventory with nutrition data from product_database
        const enrichedHousehold = await enrichInventoryWithNutrition(household || [])

        console.log('[RecipeView] Inventory loaded:', {
          householdId,
          totalItems: enrichedHousehold?.length || 0,
          inStockItems: enrichedHousehold?.filter(i => i.inStock).length || 0,
          itemsWithNutrition: enrichedHousehold?.filter(i => i.nutrition).length || 0,
          items: enrichedHousehold?.slice(0, 3) // Show first 3 for debugging
        })
        setInventoryItems(enrichedHousehold || [])

        // Generate personalized recipe suggestions using member recipe engine
        if (recipes.length > 0) {
          const suggestions = await getMemberRecipeSuggestions({
            patient: profile,
            medications: meds || [],
            recentVitals: vitals || [],
            householdInventory: enrichedHousehold || [], // Use the enriched household inventory
            mealType: selectedMealType === 'all' ? 'breakfast' : selectedMealType,
            maxResults: 100,
            availableRecipes: recipes,
            prioritizeExpiring: true,
            minAvailability: 0 // Show all, we'll filter in UI
          })

          setMemberRecipes(suggestions)
          logger.info('[RecipeView] Generated member recipes', {
            memberId: patientId,
            count: suggestions.length,
            inventoryItems: household?.length || 0
          })
        }
      } catch (error) {
        logger.error('[RecipeView] Error fetching member data', error as Error, { memberId: patientId })
        toast.error('Failed to load personalized recipes')
      } finally {
        setLoadingMemberData(false)
      }
    }

    fetchMemberData()
  }, [patientId, recipes, selectedMealType])

  // Auto-set filter to "Can Make Now" when inventory loads
  useEffect(() => {
    if (!hasSetInitialFilter && inventoryItems.length > 0 && memberRecipes.length > 0) {
      // Check if we have any recipes with 100% availability
      const canMakeCount = memberRecipes.filter(r =>
        'inventoryAvailability' in r && r.inventoryAvailability?.percentage === 100
      ).length

      // If we have recipes we can make, default to showing only those
      if (canMakeCount > 0) {
        setMinInventoryFilter(100)
      }
      setHasSetInitialFilter(true)
    }
  }, [inventoryItems, memberRecipes, hasSetInitialFilter])

  // Determine which recipes to display
  // If we have inventory and member recipes were generated, use those
  // Otherwise, fall back to base recipes
  const hasInventory = inventoryItems.length > 0
  const displayRecipes: (MealSuggestion & { safetyResult?: any; inventoryAvailability?: any; medicalBadges?: string[] })[] = hasInventory && memberRecipes.length > 0
    ? memberRecipes
    : recipes

  // Filter recipes
  const filteredRecipes = displayRecipes.filter(recipe => {
    if (selectedMealType !== 'all' && recipe.mealType !== selectedMealType) {
      return false
    }

    if (selectedDietaryTags.length > 0) {
      const hasAllTags = selectedDietaryTags.every(tag =>
        recipe.dietaryTags.includes(tag)
      )
      if (!hasAllTags) return false
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(query))
      )
    }

    // Filter by inventory availability (only if we have inventory AND member recipes)
    if (hasInventory && memberRecipes.length > 0) {
      // We have inventory and member recipes - filter by availability
      if ('inventoryAvailability' in recipe && recipe.inventoryAvailability) {
        // Hide recipes with 0% availability (no ingredients on hand)
        if (recipe.inventoryAvailability.percentage === 0) {
          return false
        }
        // Apply additional filter if set
        if (minInventoryFilter > 0 && recipe.inventoryAvailability.percentage < minInventoryFilter) {
          return false
        }
      }
    } else if (hasInventory && memberRecipes.length === 0 && minInventoryFilter > 0) {
      // We have inventory but member recipes haven't loaded yet
      // Still apply the filter if user selected one (but don't auto-hide 0%)
      // This prevents weird behavior while loading
      return false
    }

    return true
  })

  // Sort by inventory availability (recipes you can make first)
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    const aAvail = 'inventoryAvailability' in a && a.inventoryAvailability ? a.inventoryAvailability.percentage : 0
    const bAvail = 'inventoryAvailability' in b && b.inventoryAvailability ? b.inventoryAvailability.percentage : 0

    // First, sort by urgency (expiring ingredients)
    const aUrgency = 'urgency' in a ? a.urgency : 'low'
    const bUrgency = 'urgency' in b ? b.urgency : 'low'
    const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 }
    const urgencyDiff = urgencyOrder[bUrgency as keyof typeof urgencyOrder] - urgencyOrder[aUrgency as keyof typeof urgencyOrder]
    if (urgencyDiff !== 0) return urgencyDiff

    // Then by availability percentage
    return bAvail - aAvail
  })

  const toggleDietaryTag = (tag: DietaryTag) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  // Check if we have expiring items
  const hasExpiringItems = inventoryItems.some(item => {
    if (!item.inStock || !item.expiresAt) return false
    const expiryDate = new Date(item.expiresAt)
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    return expiryDate <= sevenDaysFromNow
  })

  // Generate recipe from inventory using our inventory data as the "AI"
  const handleGenerateInventoryRecipe = () => {
    try {
      setGeneratingRecipe(true)

      const newRecipe = generateRecipeFromInventory(inventoryItems, {
        mealType: selectedMealType === 'all' ? getCurrentMealType() : selectedMealType,
        minIngredients: 3,
        maxIngredients: 6,
        preferExpiring: true
      })

      if (!newRecipe) {
        toast.error('No ingredients available to generate recipe')
        return
      }

      // Add to the recipe list temporarily
      setSelectedRecipe(newRecipe)
      toast.success(`Created: ${newRecipe.name}! 🎉`)
      logger.info('[RecipeView] Generated recipe from inventory', {
        recipeName: newRecipe.name,
        ingredientCount: newRecipe.ingredients.length
      })
    } catch (error) {
      logger.error('[RecipeView] Error generating recipe from inventory', error as Error)
      toast.error('Failed to generate recipe')
    } finally {
      setGeneratingRecipe(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Expiring Items Recipe Suggestions - DRY from RecipeSuggestions component */}
      {inventoryItems.length > 0 && hasExpiringItems && (
        <RecipeSuggestions
          items={inventoryItems}
          recipes={memberRecipes.length > 0 ? memberRecipes : recipes}
        />
      )}

      {/* Inventory Recipe Generator - No External AI! */}
      {memberProfile && inventoryItems.filter(i => i.inStock).length >= 3 && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-6 px-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <SparklesIcon className="h-8 w-8 flex-shrink-0" />
              <div>
                <p className="font-bold text-xl mb-1">
                  Kitchen Inventory Recipe Generator
                </p>
                <p className="text-sm opacity-90">
                  {inventoryItems.filter(i => i.inStock).length} items in stock • Create a new recipe from what you have
                </p>
                <p className="text-xs opacity-75 mt-1">
                  💡 No external AI - uses your Firebase inventory as the intelligence
                </p>
              </div>
            </div>
            <button
              onClick={handleGenerateInventoryRecipe}
              disabled={generatingRecipe || inventoryItems.filter(i => i.inStock).length < 3}
              className="flex items-center gap-2 px-6 py-3 bg-white text-purple-600 font-bold rounded-lg hover:bg-purple-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {generatingRecipe ? (
                <>
                  <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span>Generate Recipe</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Medical Personalization Banner */}
      {memberProfile && (
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-6 rounded-lg">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="h-6 w-6" />
            <div>
              <p className="font-bold text-lg">
                Medically Safe Recipes for {patientName}
              </p>
              <p className="text-sm opacity-90">
                All recipes are personalized based on {patientName}'s health profile
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Missing Health Data Warning - Removed since healthConditions not in PatientProfile */}

      {/* Filters */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search recipes, ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-border bg-background text-foreground placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Inventory Filter - Only show if we have inventory AND member recipes loaded */}
        {hasInventory && memberRecipes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            On-Hand Ingredients ({inventoryItems.filter(i => i.inStock).length} items in stock)
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMinInventoryFilter(0)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                minInventoryFilter === 0
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              All Recipes
            </button>
            <button
              onClick={() => setMinInventoryFilter(50)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                minInventoryFilter === 50
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              50%+ On Hand
            </button>
            <button
              onClick={() => setMinInventoryFilter(80)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                minInventoryFilter === 80
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              80%+ On Hand
            </button>
            <button
              onClick={() => setMinInventoryFilter(100)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                minInventoryFilter === 100
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              🔥 Can Make Now
            </button>
          </div>
        </div>
      )}

      {/* No Inventory Warning */}
      {!hasInventory && (
        <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg py-3 px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📦</span>
            <div>
              <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                No Kitchen Inventory Yet
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Add items to your household shopping list to see which recipes you can make with ingredients on hand.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Member Recipes */}
      {hasInventory && memberRecipes.length === 0 && !loadingMemberData && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg py-3 px-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔄</span>
            <div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-semibold">
                Analyzing Your Inventory
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Matching recipes to your on-hand ingredients and {patientName}'s health needs...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Meal Type Filter */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Meal Type</h3>
          <div className="flex flex-wrap gap-2">
            {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
              <button
                key={type}
                onClick={() => setSelectedMealType(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedMealType === type
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Dietary Tags Filter */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">Dietary Preferences</h3>
          <div className="flex flex-wrap gap-2">
            {(['vegan', 'vegetarian', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'high-protein', 'low-carb'] as DietaryTag[]).map(tag => (
              <button
                key={tag}
                onClick={() => toggleDietaryTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedDietaryTags.includes(tag)
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {(recipesLoading || loadingMemberData) && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-3 text-muted-foreground">Loading recipes...</span>
        </div>
      )}

      {/* Results Count */}
      {!recipesLoading && !loadingMemberData && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {sortedRecipes.length} recipe{sortedRecipes.length !== 1 ? 's' : ''} found
            {hasInventory && memberRecipes.length > 0 && sortedRecipes.length > 0 && (
              <span className="text-green-600 dark:text-green-400 font-medium ml-2">
                (matched to your inventory)
              </span>
            )}
            {hasInventory && memberRecipes.length > 0 && minInventoryFilter > 0 && ` • ${minInventoryFilter}%+ ingredients on hand`}
          </p>
          {hasInventory && memberRecipes.length > 0 && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-600 dark:text-green-400 font-semibold">
                {memberRecipes.filter(r => 'inventoryAvailability' in r && r.inventoryAvailability?.percentage === 100).length} ready to cook
              </span>
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">
                {memberRecipes.filter(r => 'inventoryAvailability' in r && r.inventoryAvailability && r.inventoryAvailability.percentage >= 80 && r.inventoryAvailability.percentage < 100).length} almost ready
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recipe Grid */}
      {!recipesLoading && !loadingMemberData && sortedRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedRecipes.map(recipe => (
            <div
              key={recipe.id}
              onClick={() => setSelectedRecipe(recipe)}
              className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow border border-border cursor-pointer"
            >
              {/* Recipe Image Carousel */}
              <div className="relative">
                <RecipeImageCarousel
                  images={recipe.imageUrls}
                  recipeName={recipe.name}
                  mealType={recipe.mealType}
                />
                {recipe.videoUrl && (
                  <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded-lg flex items-center gap-1 text-xs">
                    <VideoCameraIcon className="h-4 w-4" />
                    <span>Video</span>
                  </div>
                )}
              </div>

              {/* Recipe Content */}
              <div className="p-6">
                {/* READY TO COOK/MAKE BADGE - Show prominently at top */}
                {hasInventory && memberRecipes.length > 0 && 'inventoryAvailability' in recipe && recipe.inventoryAvailability && (
                  <div className="mb-3">
                    {recipe.inventoryAvailability.percentage === 100 ? (
                      <div className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-2 rounded-lg font-bold text-sm shadow-md">
                        <span className="text-lg">✓</span>
                        <span>{requiresCooking(recipe) ? 'READY TO COOK NOW' : 'READY TO MAKE NOW'}</span>
                      </div>
                    ) : recipe.inventoryAvailability.percentage >= 80 ? (
                      <div className="flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-400 dark:border-yellow-600 text-yellow-900 dark:text-yellow-100 px-3 py-2 rounded-lg font-semibold text-xs">
                        <span>Missing {recipe.inventoryAvailability.missingCount || 0} ingredient{(recipe.inventoryAvailability.missingCount || 0) !== 1 ? 's' : ''}</span>
                        <span className="text-yellow-600 dark:text-yellow-400">{recipe.inventoryAvailability.percentage}%</span>
                      </div>
                    ) : recipe.inventoryAvailability.percentage >= 50 ? (
                      <div className="flex items-center justify-between bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100 px-3 py-1.5 rounded-lg font-medium text-xs">
                        <span>Need {recipe.inventoryAvailability.missingCount || 0} more items</span>
                        <span className="text-orange-600 dark:text-orange-400">{recipe.inventoryAvailability.percentage}%</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800/30 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1.5 rounded-lg text-xs">
                        <span>Low inventory</span>
                        <span>{recipe.inventoryAvailability.percentage}%</span>
                      </div>
                    )}
                  </div>
                )}

                <h3 className="text-xl font-bold text-foreground mb-2 hover:text-primary">
                  {recipe.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {recipe.description}
                </p>

                {/* Quick Stats */}
                <div className="flex justify-between text-xs text-muted-foreground mb-4">
                  <span>{recipe.calories} cal</span>
                  <span>{recipe.macros.protein}g protein</span>
                  <span>{recipe.prepTime} min</span>
                </div>

                {/* Dietary Tags */}
                {recipe.dietaryTags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {recipe.dietaryTags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="text-xs bg-primary-light dark:bg-purple-900/20 text-primary px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {recipe.dietaryTags.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        +{recipe.dietaryTags.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* No Inventory Alert - Show on every card when inventory is empty */}
                {!hasInventory && (
                  <div className="mb-4 bg-gradient-to-r from-orange-100 to-yellow-100 dark:from-orange-900/30 dark:to-yellow-900/30 border-2 border-orange-400 dark:border-orange-600 rounded-lg p-3 shadow-sm">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-2xl">📦</span>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-orange-900 dark:text-orange-100 mb-1">
                          Take Kitchen Inventory First
                        </p>
                        <p className="text-xs text-orange-800 dark:text-orange-200">
                          Can you make this with what you have? Add your ingredients to find out!
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/shopping"
                      onClick={(e) => e.stopPropagation()}
                      className="block w-full text-center px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md text-xs font-semibold transition-colors"
                    >
                      🛒 Add Ingredients to Shopping List
                    </Link>
                  </div>
                )}

                {/* Medical Safety & Inventory Badges */}
                {'safetyResult' in recipe && recipe.safetyResult && (
                  <div className="space-y-2 mb-4">
                    {/* Medical Safety Badges */}
                    {recipe.safetyResult.badges && recipe.safetyResult.badges.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {recipe.safetyResult.badges.map((badge: any, idx: number) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              badge.type === 'safe'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                : badge.type === 'warning'
                                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                : badge.type === 'danger'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}
                            title={badge.tooltip}
                          >
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Inventory Availability - Only show if we have inventory and member recipes */}
                    {hasInventory && memberRecipes.length > 0 && 'inventoryAvailability' in recipe && recipe.inventoryAvailability && (
                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${
                              recipe.inventoryAvailability.percentage >= 80
                                ? 'bg-green-500'
                                : recipe.inventoryAvailability.percentage >= 50
                                ? 'bg-yellow-500'
                                : recipe.inventoryAvailability.percentage > 0
                                ? 'bg-orange-500'
                                : 'bg-gray-400'
                            }`}
                            style={{ width: `${recipe.inventoryAvailability.percentage}%` }}
                          />
                        </div>
                        <span className="text-muted-foreground font-medium">
                          {recipe.inventoryAvailability.percentage}% in stock
                        </span>
                      </div>
                    )}

                    {/* Expiring Ingredients Alert */}
                    {'inventoryAvailability' in recipe && recipe.inventoryAvailability?.expiringIngredients && recipe.inventoryAvailability.expiringIngredients.length > 0 && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded px-2 py-1">
                        <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                          🔥 Uses {recipe.inventoryAvailability.expiringIngredients.length} expiring item{recipe.inventoryAvailability.expiringIngredients.length > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {/* Safety Warnings */}
                    {recipe.safetyResult.warnings && recipe.safetyResult.warnings.length > 0 && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded px-2 py-1.5">
                        {recipe.safetyResult.warnings.slice(0, 2).map((warning: string, idx: number) => (
                          <p key={idx} className="text-xs text-yellow-800 dark:text-yellow-200">
                            ⚠️ {warning}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !recipesLoading && !loadingMemberData ? (
        <div className="bg-card rounded-lg shadow-sm border border-border p-12 text-center">
          <p className="text-muted-foreground text-lg">No recipes found. Try adjusting your filters.</p>
        </div>
      ) : null}

      {/* Recipe Detail Modal - DRY from RecipeModal component */}
      {selectedRecipe && (
        <RecipeModal
          suggestion={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          userDietaryPreferences={undefined}
          userAllergies={undefined}
        />
      )}
    </div>
  )
}
