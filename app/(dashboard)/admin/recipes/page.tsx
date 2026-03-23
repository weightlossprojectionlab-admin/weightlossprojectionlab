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
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { getCSRFToken } from '@/lib/csrf'
import { clearRecipeCache } from '@/hooks/useRecipes'

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
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecipes()
  }, [filter])

  const fetchRecipes = async () => {
    setLoading(true)
    try {
      const token = await getAdminAuthToken()
      const res = await fetch(`/api/admin/recipes?status=${filter}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Failed to fetch recipes')
      const data = await res.json()
      setRecipes(data.recipes || [])
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
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Recipe</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Type</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Calories</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recipes.map((recipe) => (
                <tr key={recipe.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {recipe.imageUrls?.[0] ? (
                        <img src={recipe.imageUrls[0]} alt={recipe.name} className="h-10 w-10 rounded object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                          No img
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-foreground">{recipe.name}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{recipe.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground capitalize">{recipe.mealType}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-foreground">{recipe.calories || 0} cal</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      recipe.status === 'published'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                        : recipe.status === 'draft'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {recipe.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/recipes/${recipe.id}`}
                        className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                        title="View"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        href={`/admin/recipes/${recipe.id}/edit`}
                        className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(recipe)}
                        disabled={deletingId === recipe.id}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
