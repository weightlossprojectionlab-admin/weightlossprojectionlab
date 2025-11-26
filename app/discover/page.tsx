'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RecipeGrid } from '@/components/RecipeGrid'
import { PublicRecipe, RecipeSortOption, MembershipTier } from '@/lib/types/public-recipes'
import { useAuth } from '@/hooks/useAuth'
import { MealType } from '@/lib/meal-suggestions'
import { logger } from '@/lib/logger'

export default function DiscoverPage() {
  const router = useRouter()
  const { user } = useAuth()

  // State
  const [recipes, setRecipes] = useState<PublicRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [sortBy, setSortBy] = useState<RecipeSortOption>('popular')
  const [mealTypeFilter, setMealTypeFilter] = useState<MealType | 'all'>('all')
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())
  const [userTier, setUserTier] = useState<MembershipTier>('free')
  const [viewsRemaining, setViewsRemaining] = useState(3)

  // Mock data for now - will replace with Firestore queries
  useEffect(() => {
    loadRecipes()
  }, [sortBy, mealTypeFilter])

  const loadRecipes = async () => {
    setLoading(true)
    try {
      // TODO: Replace with actual Firestore query
      // const recipesData = await fetchPublicRecipes({ sortBy, mealType: mealTypeFilter, limit: 20 })
      // setRecipes(recipesData)

      // Mock delay
      await new Promise(resolve => setTimeout(resolve, 1000))
      setRecipes([])
      setHasMore(false)
    } catch (error) {
      logger.error('Error loading recipes:', error as Error)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = async () => {
    try {
      // TODO: Load next page of recipes
      logger.debug('Load more recipes')
    } catch (error) {
      logger.error('Error loading more recipes:', error as Error)
    }
  }

  const handleSaveRecipe = async (recipeId: string) => {
    if (!user) {
      router.push('/login?redirect=/discover')
      return
    }

    try {
      // TODO: Implement save to board functionality
      setSavedRecipeIds(prev => {
        const newSet = new Set(prev)
        if (newSet.has(recipeId)) {
          newSet.delete(recipeId)
        } else {
          newSet.add(recipeId)
        }
        return newSet
      })
    } catch (error) {
      logger.error('Error saving recipe:', error as Error)
    }
  }

  const handleViewRecipe = async (recipeId: string) => {
    // Track view for freemium limits
    if (userTier === 'free' && viewsRemaining <= 0) {
      // Show upgrade modal
      logger.debug('Show upgrade modal')
    }
  }

  const handleUpgrade = () => {
    router.push('/pricing')
  }

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-foreground">Discover Recipes</h1>
            {user && (
              <button
                onClick={() => router.push('/my-recipes')}
                className="btn btn-outline text-sm"
              >
                My Recipes
              </button>
            )}
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Meal Type Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto">
              <button
                onClick={() => setMealTypeFilter('all')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  mealTypeFilter === 'all'
                    ? 'bg-primary text-white'
                    : 'bg-muted text-foreground hover:bg-gray-200'
                }`}
              >
                All
              </button>
              {(['breakfast', 'lunch', 'dinner', 'snack'] as MealType[]).map(type => (
                <button
                  key={type}
                  onClick={() => setMealTypeFilter(type)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap capitalize transition-colors ${
                    mealTypeFilter === type
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as RecipeSortOption)}
              className="px-4 py-2 rounded-lg bg-muted text-foreground border border-border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="popular">Most Popular</option>
              <option value="newest">Newest</option>
              <option value="trending">Trending</option>
              <option value="most_saved">Most Saved</option>
              <option value="most_viewed">Most Viewed</option>
            </select>

            {/* Advanced Filters (Premium) */}
            {userTier === 'free' && (
              <button
                onClick={handleUpgrade}
                className="ml-auto px-4 py-2 bg-warning text-white rounded-lg text-sm font-medium hover:bg-warning-hover transition-colors flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>Unlock Filters</span>
              </button>
            )}
          </div>

          {/* Freemium Banner */}
          {userTier === 'free' && (
            <div className="mt-3 bg-primary-light dark:bg-purple-900/20 border border-primary rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-foreground">
                  {viewsRemaining} free recipe{viewsRemaining !== 1 ? 's' : ''} remaining this month
                </span>
              </div>
              <button
                onClick={handleUpgrade}
                className="px-4 py-1 bg-primary text-white rounded-full text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Upgrade
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Grid */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {recipes.length === 0 && !loading ? (
          <div className="text-center py-20">
            <div className="mb-6">
              <svg className="w-24 h-24 mx-auto text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Be the First to Share!
            </h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              No recipes have been shared yet. Start by logging your meals and sharing your favorite recipes with the community!
            </p>
            {user ? (
              <button
                onClick={() => router.push('/log-meal')}
                className="btn btn-primary"
              >
                Log a Meal
              </button>
            ) : (
              <button
                onClick={() => router.push('/login')}
                className="btn btn-primary"
              >
                Sign In to Share
              </button>
            )}
          </div>
        ) : (
          <RecipeGrid
            recipes={recipes}
            onLoadMore={handleLoadMore}
            hasMore={hasMore}
            loading={loading}
            onSaveRecipe={handleSaveRecipe}
            onViewRecipe={handleViewRecipe}
            savedRecipeIds={savedRecipeIds}
          />
        )}
      </div>
    </div>
  )
}
