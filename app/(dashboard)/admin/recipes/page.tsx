'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import Image from 'next/image'
import { logger } from '@/lib/logger'
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  StarIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'

interface PublicRecipe {
  id: string
  title: string
  imageUrl: string
  createdBy: string
  createdByName: string
  createdByPhoto?: string
  moderationStatus: 'pending' | 'approved' | 'rejected'
  submittedAt: Date
  description: string
  prepTime: number
  servings: number
  difficulty: 'easy' | 'medium' | 'hard'
  cuisine?: string
  totalCalories: number
  macros: {
    protein: number
    carbs: number
    fat: number
    fiber: number
  }
  ingredients: string[]
  steps: string[]
  tags: string[]
}

type RejectionReason =
  | 'low_quality_photo'
  | 'incomplete_recipe'
  | 'inappropriate_content'
  | 'duplicate'
  | 'misleading_nutrition'

export default function RecipeModerationPage() {
  const router = useRouter()
  const { role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [recipes, setRecipes] = useState<PublicRecipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<PublicRecipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending')
  const [rejectionReason, setRejectionReason] = useState<RejectionReason | ''>('')
  const [notes, setNotes] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    fetchRecipes()
  }, [filter])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      // TODO: Replace with real API call
      // const res = await fetch(`/api/admin/recipes?status=${filter}`)
      // const data = await res.json()
      // setRecipes(data.recipes)

      // Placeholder: No recipes yet
      setRecipes([])
    } catch (error) {
      logger.error('Error fetching recipes:', error as Error)
      toast.error('Failed to fetch recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (recipeId: string, feature: boolean = false) => {
    if (!permissions.canModerateRecipes) {
      toast.error('You do not have permission to moderate recipes')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/recipes/${recipeId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          feature,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to approve recipe')
      }

      toast.success(feature ? 'Recipe approved and featured!' : 'Recipe approved!')
      setSelectedRecipe(null)
      setNotes('')
      fetchRecipes()
    } catch (error) {
      logger.error('Error approving recipe:', error as Error)
      toast.error('Failed to approve recipe')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (recipeId: string) => {
    if (!permissions.canModerateRecipes) {
      toast.error('You do not have permission to moderate recipes')
      return
    }

    if (!rejectionReason) {
      toast.error('Please select a rejection reason')
      return
    }

    setProcessing(true)
    try {
      const response = await fetch(`/api/admin/recipes/${recipeId}/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason: rejectionReason,
          notes,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to reject recipe')
      }

      toast.success('Recipe rejected')
      setSelectedRecipe(null)
      setNotes('')
      setRejectionReason('')
      fetchRecipes()
    } catch (error) {
      logger.error('Error rejecting recipe:', error as Error)
      toast.error('Failed to reject recipe')
    } finally {
      setProcessing(false)
    }
  }

  const rejectionReasons: { value: RejectionReason; label: string }[] = [
    { value: 'low_quality_photo', label: 'Low quality photo' },
    { value: 'incomplete_recipe', label: 'Incomplete recipe (missing ingredients/steps)' },
    { value: 'inappropriate_content', label: 'Inappropriate content' },
    { value: 'duplicate', label: 'Duplicate recipe' },
    { value: 'misleading_nutrition', label: 'Misleading nutrition information' },
  ]

  if (!permissions.canModerateRecipes) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 mb-2">Access Denied</h2>
          <p className="text-red-700">
            You do not have permission to moderate recipes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Recipe Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Create, review, and moderate recipes</p>
        </div>
        <button
          onClick={() => router.push('/admin/recipes/create')}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Recipe
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {(['pending', 'approved', 'rejected'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`
                py-4 px-1 border-b-2 font-medium text-sm capitalize
                ${
                  filter === status
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-300 hover:border-gray-300'
                }
              `}
            >
              {status}
              {status === 'pending' && recipes.length > 0 && (
                <span className="ml-2 bg-purple-100 dark:bg-purple-900/20 text-purple-600 py-0.5 px-2 rounded-full text-xs">
                  {recipes.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Recipe List or Empty State */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg shadow">
          <ClockIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No {filter} recipes
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {filter === 'pending'
              ? 'All recipes have been reviewed. Check back later for new submissions.'
              : `No ${filter} recipes to display.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden cursor-pointer"
              onClick={() => setSelectedRecipe(recipe)}
            >
              {/* Recipe Image */}
              <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                {recipe.imageUrl ? (
                  <Image
                    src={recipe.imageUrl}
                    alt={recipe.title}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`
                      px-2 py-1 rounded-full text-xs font-semibold
                      ${
                        recipe.moderationStatus === 'approved'
                          ? 'bg-green-500 text-white'
                          : recipe.moderationStatus === 'rejected'
                          ? 'bg-red-500 text-white'
                          : 'bg-yellow-500 text-white'
                      }
                    `}
                  >
                    {recipe.moderationStatus}
                  </span>
                </div>
              </div>

              {/* Recipe Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">{recipe.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  by {recipe.createdByName}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{recipe.prepTime} min</span>
                  <span>•</span>
                  <span className="capitalize">{recipe.difficulty}</span>
                  <span>•</span>
                  <span>{recipe.totalCalories} cal</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedRecipe(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Content */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedRecipe.title}</h2>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-300"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipe Image */}
              {selectedRecipe.imageUrl && (
                <div className="relative h-64 rounded-lg overflow-hidden">
                  <Image
                    src={selectedRecipe.imageUrl}
                    alt={selectedRecipe.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}

              {/* Creator Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Creator</h3>
                <p className="text-gray-900 dark:text-gray-100">{selectedRecipe.createdByName}</p>
                <p className="text-sm text-gray-500">ID: {selectedRecipe.createdBy}</p>
              </div>

              {/* Recipe Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Prep Time</h3>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRecipe.prepTime} minutes</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Servings</h3>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRecipe.servings}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Difficulty</h3>
                  <p className="text-gray-900 dark:text-gray-100 capitalize">{selectedRecipe.difficulty}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Cuisine</h3>
                  <p className="text-gray-900 dark:text-gray-100">{selectedRecipe.cuisine || 'N/A'}</p>
                </div>
              </div>

              {/* Nutrition */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Nutrition (per serving)</h3>
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Calories</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRecipe.totalCalories}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Protein</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRecipe.macros.protein}g</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Carbs</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRecipe.macros.carbs}g</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-950 p-3 rounded">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fat</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{selectedRecipe.macros.fat}g</p>
                  </div>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ingredients</h3>
                <ul className="list-disc list-inside space-y-1">
                  {selectedRecipe.ingredients.map((ingredient, index) => (
                    <li key={index} className="text-gray-900 dark:text-gray-100">{ingredient}</li>
                  ))}
                </ul>
              </div>

              {/* Steps */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Instructions</h3>
                <ol className="list-decimal list-inside space-y-2">
                  {selectedRecipe.steps.map((step, index) => (
                    <li key={index} className="text-gray-900 dark:text-gray-100">{step}</li>
                  ))}
                </ol>
              </div>

              {/* Tags */}
              {selectedRecipe.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRecipe.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Moderation Actions (only for pending) */}
              {selectedRecipe.moderationStatus === 'pending' && (
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Moderation Actions</h3>

                  {/* Rejection Reason */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rejection Reason (required to reject)
                    </label>
                    <select
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value as RejectionReason)}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-3 py-2"
                    >
                      <option value="">Select a reason...</option>
                      {rejectionReasons.map((reason) => (
                        <option key={reason.value} value={reason.value}>
                          {reason.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any additional notes..."
                      rows={3}
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 rounded-lg px-3 py-2"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApprove(selectedRecipe.id, false)}
                      disabled={processing}
                      className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      <CheckCircleIcon className="h-5 w-5" />
                      Approve
                    </button>
                    {permissions.canFeatureRecipes && (
                      <button
                        onClick={() => handleApprove(selectedRecipe.id, true)}
                        disabled={processing}
                        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                      >
                        <StarIconSolid className="h-5 w-5" />
                        Approve & Feature
                      </button>
                    )}
                    <button
                      onClick={() => handleReject(selectedRecipe.id)}
                      disabled={processing}
                      className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                      <XCircleIcon className="h-5 w-5" />
                      Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
