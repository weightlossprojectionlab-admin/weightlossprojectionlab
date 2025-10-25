'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { MealSuggestion, RecipeStatus } from '@/lib/meal-suggestions'
import { getPublishedRecipes, getDraftRecipes, updateRecipeStatus } from '@/lib/firestore-recipes'
import { RecipeGenerator } from '@/components/admin/RecipeGenerator'
import { RecipeEditor } from '@/components/admin/RecipeEditor'
import { PageHeader } from '@/components/ui/PageHeader'
import {
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ArchiveBoxIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'

type ViewMode = 'all' | 'drafts' | 'published' | 'archived'

export default function AdminRecipesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [recipes, setRecipes] = useState<MealSuggestion[]>([])
  const [viewMode, setViewMode] = useState<ViewMode>('all')
  const [loading, setLoading] = useState(true)
  const [showGenerator, setShowGenerator] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<MealSuggestion | null>(null)

  // Admin check
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch recipes
  useEffect(() => {
    fetchRecipes()
  }, [viewMode])

  async function fetchRecipes() {
    setLoading(true)
    try {
      let fetchedRecipes: MealSuggestion[] = []

      if (viewMode === 'published' || viewMode === 'all') {
        const published = await getPublishedRecipes()
        fetchedRecipes = [...fetchedRecipes, ...published]
      }

      if (viewMode === 'drafts' || viewMode === 'all') {
        const drafts = await getDraftRecipes()
        fetchedRecipes = [...fetchedRecipes, ...drafts]
      }

      setRecipes(fetchedRecipes)
    } catch (error) {
      console.error('Error fetching recipes:', error)
      toast.error('Failed to load recipes')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(recipe: MealSuggestion, newStatus: RecipeStatus) {
    try {
      const recipeId = recipe.firestoreId || recipe.id
      await updateRecipeStatus(recipeId, newStatus, user?.uid)
      toast.success(`Recipe ${newStatus}`)
      fetchRecipes()
    } catch (error) {
      console.error('Error updating recipe status:', error)
      toast.error('Failed to update recipe')
    }
  }

  function getStatusColor(status?: RecipeStatus) {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  function getStatusIcon(status?: RecipeStatus) {
    switch (status) {
      case 'published':
        return <CheckCircleIcon className="w-4 h-4" />
      case 'draft':
        return <ClockIcon className="w-4 h-4" />
      case 'archived':
        return <ArchiveBoxIcon className="w-4 h-4" />
      default:
        return null
    }
  }

  const filteredRecipes = recipes.filter((recipe) => {
    if (viewMode === 'all') return true
    return recipe.status === (viewMode === 'drafts' ? 'draft' : viewMode)
  })

  if (authLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <PageHeader
          title="Recipe Library"
          subtitle="Manage AI-generated recipes and publish to users"
          action={
            <button
              onClick={() => setShowGenerator(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Generate Recipes
            </button>
          }
        />

        {/* View Mode Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {(['all', 'drafts', 'published', 'archived'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`${
                  viewMode === mode
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
              >
                {mode}
                <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100">
                  {mode === 'all'
                    ? recipes.length
                    : recipes.filter((r) => r.status === (mode === 'drafts' ? 'draft' : mode)).length}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Recipe List */}
        {loading ? (
          <div className="mt-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : filteredRecipes.length === 0 ? (
          <div className="mt-8 text-center py-12">
            <p className="text-gray-500">No recipes found</p>
            {viewMode === 'all' && (
              <button
                onClick={() => setShowGenerator(true)}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Generate your first recipe →
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRecipes.map((recipe) => (
              <div
                key={recipe.firestoreId || recipe.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Recipe Image */}
                {recipe.imageUrls?.[0] && (
                  <div className="h-48 bg-gray-200">
                    <img
                      src={recipe.imageUrls[0]}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                <div className="p-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        recipe.status
                      )}`}
                    >
                      {getStatusIcon(recipe.status)}
                      <span className="ml-1 capitalize">{recipe.status || 'draft'}</span>
                    </span>
                    {recipe.generatedByAI && (
                      <span className="text-xs text-gray-500">🤖 AI Generated</span>
                    )}
                  </div>

                  {/* Recipe Info */}
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{recipe.name}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{recipe.description}</p>

                  <div className="flex items-center text-xs text-gray-500 space-x-4 mb-4">
                    <span>{recipe.calories} cal</span>
                    <span>{recipe.prepTime} min</span>
                    <span className="capitalize">{recipe.mealType}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingRecipe(recipe)}
                      className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Edit
                    </button>

                    {recipe.status !== 'published' && (
                      <button
                        onClick={() => handleStatusChange(recipe, 'published')}
                        className="flex-1 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                      >
                        Publish
                      </button>
                    )}

                    {recipe.status === 'published' && (
                      <button
                        onClick={() => handleStatusChange(recipe, 'archived')}
                        className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                      >
                        Archive
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recipe Generator Modal */}
      {showGenerator && (
        <RecipeGenerator
          onClose={() => setShowGenerator(false)}
          onSuccess={() => {
            setShowGenerator(false)
            fetchRecipes()
          }}
        />
      )}

      {/* Recipe Editor Modal */}
      {editingRecipe && (
        <RecipeEditor
          recipe={editingRecipe}
          onClose={() => setEditingRecipe(null)}
          onSuccess={() => {
            setEditingRecipe(null)
            fetchRecipes()
          }}
        />
      )}
    </div>
  )
}
