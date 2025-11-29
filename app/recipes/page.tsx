'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { MealType, DietaryTag, MealSuggestion } from '@/lib/meal-suggestions'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useRecipes } from '@/hooks/useRecipes'
import { AdminModeToggle } from '@/components/admin/AdminModeToggle'
import { RecipeMediaUpload } from '@/components/admin/RecipeMediaUpload'
import { RecipeImageCarousel } from '@/components/RecipeImageCarousel'
import { PencilSquareIcon, VideoCameraIcon, PlusCircleIcon, ShieldCheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { RecipeImportModal } from '@/components/admin/RecipeImportModal'
import { getMemberRecipeSuggestions, type MemberRecipeSuggestion } from '@/lib/member-recipe-engine'
import { medicalOperations } from '@/lib/medical-operations'
import { useShopping } from '@/hooks/useShopping'
import { auth } from '@/lib/firebase'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import type { PatientProfile, PatientMedication, VitalSign } from '@/types/medical'

export default function RecipeIndexPage() {
  const searchParams = useSearchParams()
  const memberId = searchParams.get('memberId') // Support ?memberId= for personalization

  const { isAdmin } = useAdminAuth()
  const { recipes, loading: recipesLoading } = useRecipes()
  const { items: inventoryItems } = useShopping() // Household inventory

  const [isAdminMode, setIsAdminMode] = useState(false)
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<MealSuggestion | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>('all')
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<DietaryTag[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Member-specific state
  const [memberProfile, setMemberProfile] = useState<PatientProfile | null>(null)
  const [memberMedications, setMemberMedications] = useState<PatientMedication[]>([])
  const [memberVitals, setMemberVitals] = useState<VitalSign[]>([])
  const [memberRecipes, setMemberRecipes] = useState<MemberRecipeSuggestion[]>([])
  const [loadingMemberData, setLoadingMemberData] = useState(false)

  // Fetch member medical data and generate personalized recipes
  useEffect(() => {
    if (!memberId) {
      setMemberProfile(null)
      setMemberRecipes([])
      return
    }

    const fetchMemberData = async () => {
      setLoadingMemberData(true)
      try {
        const user = auth.currentUser
        if (!user) {
          logger.warn('[Recipes] No authenticated user for member data')
          return
        }

        // Fetch patient profile
        const profile = await medicalOperations.patients.getPatient(memberId)
        if (!profile) {
          toast.error('Member profile not found')
          return
        }
        setMemberProfile(profile)

        // Fetch medications
        const meds = await medicalOperations.medications.getMedications(memberId)
        setMemberMedications(meds || [])

        // Fetch recent vitals (last 30 days)
        const vitals = await medicalOperations.vitals.getVitals(memberId)
        setMemberVitals(vitals || [])

        // Generate personalized recipe suggestions using member recipe engine
        if (recipes.length > 0 && inventoryItems.length >= 0) {
          const suggestions = await getMemberRecipeSuggestions({
            patient: profile,
            medications: meds || [],
            recentVitals: vitals || [],
            householdInventory: inventoryItems,
            mealType: selectedMealType === 'all' ? 'breakfast' : selectedMealType,
            maxResults: 100, // Get all, we'll filter in UI
            availableRecipes: recipes,
            prioritizeExpiring: true,
            minAvailability: 0
          })

          setMemberRecipes(suggestions)
          logger.info('[Recipes] Generated member recipes', {
            memberId,
            count: suggestions.length,
            // conditions: profile.healthConditions?.length || 0 // healthConditions not in PatientProfile
          })
        }
      } catch (error) {
        logger.error('[Recipes] Error fetching member data', error as Error, { memberId })
        toast.error('Failed to load personalized recipes')
      } finally {
        setLoadingMemberData(false)
      }
    }

    fetchMemberData()
  }, [memberId, recipes, inventoryItems, selectedMealType])

  // Determine which recipes to display (member-specific or all)
  const displayRecipes: (MealSuggestion & { safetyResult?: any; inventoryAvailability?: any; medicalBadges?: string[] })[] = memberId && memberRecipes.length > 0
    ? memberRecipes
    : recipes

  // Filter recipes
  const filteredRecipes = displayRecipes.filter(recipe => {
    // Filter by meal type
    if (selectedMealType !== 'all' && recipe.mealType !== selectedMealType) {
      return false
    }

    // Filter by dietary tags
    if (selectedDietaryTags.length > 0) {
      const hasAllTags = selectedDietaryTags.every(tag =>
        recipe.dietaryTags.includes(tag)
      )
      if (!hasAllTags) return false
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        recipe.name.toLowerCase().includes(query) ||
        recipe.description.toLowerCase().includes(query) ||
        recipe.ingredients.some(ing => ing.toLowerCase().includes(query))
      )
    }

    return true
  })

  const toggleDietaryTag = (tag: DietaryTag) => {
    setSelectedDietaryTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const handleMediaUploadSuccess = () => {
    // No need to reload - useRecipes hook provides real-time updates via Firestore onSnapshot
    // The recipe list will automatically update when media is uploaded
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-100 dark:from-gray-900 dark:to-purple-900/20">
      {/* Marketing Banner */}
      {!memberId && (
        <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4 text-center">
          <p className="text-sm font-medium">
            ✨ Track these recipes with AI-powered meal analysis.{' '}
            <Link href="/auth" className="text-white underline font-bold hover:opacity-80">
              Start Free →
            </Link>
          </p>
        </div>
      )}

      {/* Member Context Banner (DRY - same pattern as shopping page) */}
      {memberId && memberProfile && (
        <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white py-4 px-4 border-b-2 border-green-700">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheckIcon className="h-6 w-6" />
              <div>
                <p className="font-bold text-lg">
                  Personalized Recipes for {memberProfile.name}
                </p>
                <p className="text-sm opacity-90">
                  {inventoryItems.filter(i => i.inStock).length} items in household inventory • Personalized for {memberProfile.name}
                </p>
              </div>
            </div>
            <Link
              href="/recipes"
              className="text-white hover:underline text-sm font-medium"
            >
              View All Recipes →
            </Link>
          </div>
        </div>
      )}

      {/* Missing Health Data Warning */}
      {/* Health conditions warning removed - healthConditions not in PatientProfile */}
      {false && memberId && memberProfile && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b-2 border-yellow-300 dark:border-yellow-700 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-700 dark:text-yellow-400 flex-shrink-0" />
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Tip:</strong> Add health conditions to {memberProfile?.name}'s profile for personalized, medically-safe recipe suggestions.
              <Link href={`/patients/${memberId}`} className="ml-2 underline font-semibold hover:opacity-80">
                Complete Health Profile →
              </Link>
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header with Admin Mode Toggle */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold text-foreground">
              Healthy Recipe Collection
            </h1>
            {isAdmin && (
              <AdminModeToggle
                isAdminMode={isAdminMode}
                onToggle={setIsAdminMode}
              />
            )}
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Browse 28 delicious, macro-friendly recipes. Track them automatically with our AI-powered app.
          </p>
          {isAdminMode && (
            <div className="mt-4 space-y-3">
              <div className="bg-primary-light dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 px-4 py-2 rounded-lg inline-block">
                <p className="text-sm font-medium">
                  🔓 Admin Mode Active - Click "Edit Media" on any recipe to upload images/videos
                </p>
              </div>
              <div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-success text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  Import Recipe from URL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg shadow-lg p-6 mb-8">
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
                      : 'bg-muted text-foreground hover:bg-gray-200'
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
                      : 'bg-muted text-foreground hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {recipesLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-muted-foreground">Loading recipes...</span>
          </div>
        )}

        {/* Results Count */}
        {!recipesLoading && (
          <p className="text-muted-foreground mb-6">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Recipe Grid */}
        {!recipesLoading && filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="bg-card rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
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
                  <Link href={`/recipes/${recipe.id}`}>
                    <h3 className="text-xl font-bold text-foreground mb-2 hover:text-primary cursor-pointer">
                      {recipe.name}
                    </h3>
                  </Link>
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

                  {/* Medical Safety & Inventory Badges (Member-specific) */}
                  {memberId && 'safetyResult' in recipe && recipe.safetyResult && (
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

                      {/* Inventory Availability */}
                      {'inventoryAvailability' in recipe && recipe.inventoryAvailability && (
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                recipe.inventoryAvailability.percentage >= 80
                                  ? 'bg-green-500'
                                  : recipe.inventoryAvailability.percentage >= 50
                                  ? 'bg-yellow-500'
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

                  {/* Admin Edit Button */}
                  {isAdminMode && (
                    <button
                      onClick={() => setSelectedRecipeForEdit(recipe)}
                      className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:bg-primary-hover flex items-center justify-center gap-2"
                    >
                      <PencilSquareIcon className="h-5 w-5" />
                      Edit Media
                      {!recipe.imageUrls?.length && !recipe.videoUrl && (
                        <span className="ml-2 bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded text-xs">
                          No media
                        </span>
                      )}
                      {recipe.imageUrls && recipe.imageUrls.length > 0 && (
                        <span className="ml-2 bg-green-400 text-green-900 px-2 py-0.5 rounded text-xs">
                          {recipe.imageUrls.length} {recipe.imageUrls.length === 1 ? 'image' : 'images'}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !recipesLoading ? (
          <div className="bg-card rounded-lg shadow-lg p-12 text-center">
            <p className="text-muted-foreground text-lg">No recipes found. Try adjusting your filters.</p>
          </div>
        ) : null}

        {/* CTA Section */}
        <div className="mt-16 bg-gradient-to-r from-primary to-accent text-white rounded-lg p-8 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Tracking?</h2>
          <p className="text-lg mb-6 opacity-90">
            Snap a photo of any meal and get instant nutrition analysis
          </p>
          <Link
            href="/auth"
            className="inline-block btn bg-background text-primary dark:text-white hover:bg-muted px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
          >
            Start Your Journey
          </Link>
          <p className="text-sm mt-6 opacity-75">
            ✨ Free forever • No credit card required
          </p>
        </div>
      </div>

      {/* Media Upload Modal */}
      {selectedRecipeForEdit && (
        <RecipeMediaUpload
          recipe={selectedRecipeForEdit}
          onClose={() => setSelectedRecipeForEdit(null)}
          onSuccess={handleMediaUploadSuccess}
        />
      )}

      {/* Recipe Import Modal */}
      <RecipeImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={handleMediaUploadSuccess}
      />
    </main>
  )
}
