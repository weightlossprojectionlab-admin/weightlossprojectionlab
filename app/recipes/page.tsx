'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MealType, DietaryTag, MealSuggestion } from '@/lib/meal-suggestions'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useRecipes } from '@/hooks/useRecipes'
import { AdminModeToggle } from '@/components/admin/AdminModeToggle'
import { RecipeMediaUpload } from '@/components/admin/RecipeMediaUpload'
import { RecipeImageCarousel } from '@/components/RecipeImageCarousel'
import { PencilSquareIcon, VideoCameraIcon, PlusCircleIcon } from '@heroicons/react/24/outline'
import { RecipeImportModal } from '@/components/admin/RecipeImportModal'

export default function RecipeIndexPage() {
  const { isAdmin } = useAdminAuth()
  const { recipes, loading: recipesLoading } = useRecipes()
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [selectedRecipeForEdit, setSelectedRecipeForEdit] = useState<MealSuggestion | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState<MealType | 'all'>('all')
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<DietaryTag[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
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
      <div className="bg-gradient-to-r from-primary to-accent text-white py-3 px-4 text-center">
        <p className="text-sm font-medium">
          ✨ Track these recipes with AI-powered meal analysis.{' '}
          <Link href="/auth" className="text-white underline font-bold hover:opacity-80">
            Start Free →
          </Link>
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header with Admin Mode Toggle */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100">
              Healthy Recipe Collection
            </h1>
            {isAdmin && (
              <AdminModeToggle
                isAdminMode={isAdminMode}
                onToggle={setIsAdminMode}
              />
            )}
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Browse 28 delicious, macro-friendly recipes. Track them automatically with our AI-powered app.
          </p>
          {isAdminMode && (
            <div className="mt-4 space-y-3">
              <div className="bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-200 px-4 py-2 rounded-lg inline-block">
                <p className="text-sm font-medium">
                  🔓 Admin Mode Active - Click "Edit Media" on any recipe to upload images/videos
                </p>
              </div>
              <div>
                <button
                  onClick={() => setShowImportModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium shadow-lg"
                >
                  <PlusCircleIcon className="h-5 w-5" />
                  Import Recipe from URL
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-6 mb-8">
          {/* Search */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search recipes, ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Meal Type Filter */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Meal Type</h3>
            <div className="flex flex-wrap gap-2">
              {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedMealType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMealType === type
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Dietary Tags Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">Dietary Preferences</h3>
            <div className="flex flex-wrap gap-2">
              {(['vegan', 'vegetarian', 'keto', 'paleo', 'gluten-free', 'dairy-free', 'high-protein', 'low-carb'] as DietaryTag[]).map(tag => (
                <button
                  key={tag}
                  onClick={() => toggleDietaryTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedDietaryTags.includes(tag)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
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
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recipes...</span>
          </div>
        )}

        {/* Results Count */}
        {!recipesLoading && (
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {filteredRecipes.length} recipe{filteredRecipes.length !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Recipe Grid */}
        {!recipesLoading && filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map(recipe => (
              <div
                key={recipe.id}
                className="bg-white dark:bg-gray-900 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
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
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2 hover:text-primary cursor-pointer">
                      {recipe.name}
                    </h3>
                  </Link>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                    {recipe.description}
                  </p>

                  {/* Quick Stats */}
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-4">
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
                          className="text-xs bg-purple-100 dark:bg-purple-900/20 text-primary px-2 py-1 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {recipe.dietaryTags.length > 3 && (
                        <span className="text-xs text-gray-600 dark:text-gray-400 px-2 py-1">
                          +{recipe.dietaryTags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Admin Edit Button */}
                  {isAdminMode && (
                    <button
                      onClick={() => setSelectedRecipeForEdit(recipe)}
                      className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No recipes found. Try adjusting your filters.</p>
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
            className="inline-block btn bg-white dark:bg-gray-800 text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 px-8 py-4 text-lg font-bold rounded-lg shadow-lg"
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
