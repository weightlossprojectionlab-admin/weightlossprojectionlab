'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getAdminAuthToken } from '@/lib/admin/api'
import { logger } from '@/lib/logger'
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  EyeIcon,
  LinkIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getCSRFToken } from '@/lib/csrf'
import { clearRecipeCache } from '@/hooks/useRecipes'
import { mergeRecipesWithMedia } from '@/lib/recipe-merge'

interface Recipe {
  id: string
  name: string
  description: string
  mealType: string
  prepTime: number
  servingSize: number
  calories: number
  macros?: { protein: number; carbs: number; fat: number; fiber: number }
  status: 'draft' | 'published' | 'archived'
  imageUrls?: string[]
  ingredients?: string[]
  createdAt: string
  updatedAt: string
}

export default function AdminRecipesPage() {
  const router = useRouter()
  const { isAdmin } = useAdminAuth()
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'draft' | 'published' | 'archived'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecipes()
  }, [filter])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      // Always fetch all docs (need media-only docs for image overlay)
      const token = await getAdminAuthToken()
      const res = await fetch('/api/admin/recipes?status=all', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch recipes')
      const data = await res.json()
      const firestoreRecipes = data.recipes || []

      // DRY: shared merge utility handles media overlay + hardcoded recipes
      const merged = mergeRecipesWithMedia(firestoreRecipes, filter) as any[]
      setRecipes(merged)
    } catch (error) {
      logger.error('Error fetching recipes:', error as Error)
      toast.error('Failed to fetch recipes')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (recipe: Recipe) => {
    if (!confirm(`Delete "${recipe.name}"? This cannot be undone.`)) return
    setDeletingId(recipe.id)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken()
        }
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success(`"${recipe.name}" deleted`)
      clearRecipeCache()
      setRecipes(prev => prev.filter(r => r.id !== recipe.id))
    } catch {
      toast.error('Failed to delete recipe')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (recipe: Recipe) => {
    const newStatus = recipe.status === 'published' ? 'draft' : 'published'
    setTogglingId(recipe.id)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch(`/api/admin/recipes/${recipe.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': getCSRFToken()
        },
        body: JSON.stringify({ status: newStatus })
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Recipe ${newStatus === 'published' ? 'published' : 'unpublished'}`)
      clearRecipeCache()
      setRecipes(prev => prev.map(r => r.id === recipe.id ? { ...r, status: newStatus } : r))
    } catch {
      toast.error('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }

  if (!isAdmin) {
    return (
      <div className="p-8">
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">You do not have permission to manage recipes.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Recipe Management</h1>
          <p className="text-muted-foreground mt-1">{recipes.length} recipe{recipes.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          href="/admin/recipes/create"
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
          Create Recipe
        </Link>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes by name, type, or ingredient..."
          className="w-full px-4 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {(['all', 'published', 'draft', 'archived'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                filter === status
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {status}
            </button>
          ))}
        </nav>
      </div>

      {/* Meal Type Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(['all', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setMealTypeFilter(type)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors capitalize ${
              mealTypeFilter === type
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground hover:bg-muted/80'
            }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Recipe List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading recipes...</p>
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-lg shadow">
          <h2 className="text-lg font-semibold text-foreground mb-2">No {filter === 'all' ? '' : filter} recipes</h2>
          <p className="text-muted-foreground mb-4">Get started by creating your first recipe.</p>
          <Link
            href="/admin/recipes/create"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
          >
            <PlusIcon className="h-5 w-5" />
            Create Recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.filter(r => {
            // Meal type filter
            if (mealTypeFilter !== 'all' && r.mealType !== mealTypeFilter) return false
            // Search filter
            if (!searchQuery.trim()) return true
            const q = searchQuery.toLowerCase()
            return (
              r.name?.toLowerCase().includes(q) ||
              r.description?.toLowerCase().includes(q) ||
              r.mealType?.toLowerCase().includes(q) ||
              r.ingredients?.some(i => i.toLowerCase().includes(q))
            )
          }).map((recipe) => (
            <div key={recipe.id} className="bg-card rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow flex flex-col">
              {/* Image */}
              <div className="relative h-48 bg-muted">
                {recipe.imageUrls?.[0] ? (
                  <img src={recipe.imageUrls[0]} alt={recipe.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No image</div>
                )}
                {/* Status Badge */}
                <button
                  onClick={() => handleToggleStatus(recipe)}
                  disabled={togglingId === recipe.id || !recipe.createdAt}
                  title={recipe.createdAt ? `Click to ${recipe.status === 'published' ? 'unpublish' : 'publish'}` : 'Hardcoded recipe'}
                  className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity disabled:cursor-default disabled:opacity-60 ${
                    recipe.status === 'published'
                      ? 'bg-green-500 text-white'
                      : recipe.status === 'draft'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-500 text-white'
                  }`}
                >
                  {togglingId === recipe.id ? '...' : recipe.status}
                </button>
                {/* Meal Type */}
                <span className="absolute top-2 left-2 bg-primary text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm capitalize">
                  {recipe.mealType}
                </span>
              </div>

              {/* Content */}
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-foreground mb-1">{recipe.name}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{recipe.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                  <span>{recipe.calories || 0} cal</span>
                  <span>{recipe.macros?.protein ?? 0}g protein</span>
                  <span>{recipe.prepTime || 30} min</span>
                </div>

                {/* Actions */}
                <div className="mt-auto grid grid-cols-3 gap-1.5">
                  <Link
                    href={`/recipes/${recipe.id}`}
                    className="flex items-center justify-center text-xs py-2 bg-muted text-foreground rounded hover:bg-muted/80 transition-colors font-medium"
                  >
                    View
                  </Link>
                  <Link
                    href={`/admin/recipes/${recipe.id}/edit`}
                    className="flex items-center justify-center text-xs py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors font-medium"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(recipe)}
                    disabled={deletingId === recipe.id}
                    className="flex items-center justify-center text-xs py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:bg-red-300 transition-colors font-medium"
                  >
                    {deletingId === recipe.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
