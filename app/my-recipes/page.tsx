'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { RecipeGrid } from '@/components/RecipeGrid'
import { PublicRecipe } from '@/lib/types/public-recipes'
import { logger } from '@/lib/logger'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'

type ViewMode = 'saved' | 'created'

export default function MyRecipesPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [viewMode, setViewMode] = useState<ViewMode>('saved')
  const [recipes, setRecipes] = useState<PublicRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [savedRecipeIds, setSavedRecipeIds] = useState<Set<string>>(new Set())

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login?redirect=/my-recipes')
    }
  }, [user, authLoading, router])

  // Load recipes based on view mode
  useEffect(() => {
    if (!user) return
    loadRecipes()
  }, [user, viewMode])

  const loadRecipes = async () => {
    if (!user) return

    setLoading(true)
    try {
      if (viewMode === 'saved') {
        await loadSavedRecipes()
      } else {
        await loadCreatedRecipes()
      }
    } catch (error) {
      logger.error('[MyRecipes] Error loading recipes', error as Error, {
        viewMode,
        userId: user.uid
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSavedRecipes = async () => {
    if (!user) return

    try {
      // Get user's saved recipe IDs from recipeSaves collection
      const savesRef = collection(db, 'recipeSaves')
      const savesQuery = query(
        savesRef,
        where('userId', '==', user.uid),
        orderBy('savedAt', 'desc')
      )

      const savesSnapshot = await getDocs(savesQuery)
      const recipeIds = savesSnapshot.docs.map(doc => doc.data().recipeId)
      setSavedRecipeIds(new Set(recipeIds))

      if (recipeIds.length === 0) {
        setRecipes([])
        return
      }

      // Fetch the actual recipes (in batches of 10 to avoid Firestore 'in' query limit)
      const recipesData: PublicRecipe[] = []
      const batchSize = 10

      for (let i = 0; i < recipeIds.length; i += batchSize) {
        const batch = recipeIds.slice(i, i + batchSize)
        const recipesRef = collection(db, 'publicRecipes')
        const recipesQuery = query(
          recipesRef,
          where('__name__', 'in', batch)
        )

        const recipesSnapshot = await getDocs(recipesQuery)
        recipesSnapshot.docs.forEach(doc => {
          recipesData.push({
            id: doc.id,
            ...doc.data()
          } as PublicRecipe)
        })
      }

      setRecipes(recipesData)
    } catch (error) {
      logger.error('[MyRecipes] Error loading saved recipes', error as Error, {
        userId: user.uid
      })
      throw error
    }
  }

  const loadCreatedRecipes = async () => {
    if (!user) return

    try {
      const recipesRef = collection(db, 'publicRecipes')
      const recipesQuery = query(
        recipesRef,
        where('createdBy', '==', user.uid),
        orderBy('createdAt', 'desc')
      )

      const snapshot = await getDocs(recipesQuery)
      const recipesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PublicRecipe))

      setRecipes(recipesData)
      setSavedRecipeIds(new Set(recipesData.map(r => r.id)))
    } catch (error) {
      logger.error('[MyRecipes] Error loading created recipes', error as Error, {
        userId: user.uid
      })
      throw error
    }
  }

  const handleSaveRecipe = async (recipeId: string, saved: boolean) => {
    // Update local state optimistically
    setSavedRecipeIds(prev => {
      const next = new Set(prev)
      if (saved) {
        next.add(recipeId)
      } else {
        next.delete(recipeId)
        // If viewing saved recipes and unsaving, remove from list
        if (viewMode === 'saved') {
          setRecipes(prev => prev.filter(r => r.id !== recipeId))
        }
      }
      return next
    })
  }

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-primary text-primary-content py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-2">My Recipes</h1>
          <p className="text-primary-content/80">
            {viewMode === 'saved'
              ? 'Recipes you\'ve saved for later'
              : 'Recipes you\'ve shared with the community'}
          </p>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="bg-base-200 border-b border-base-300">
        <div className="container mx-auto px-4">
          <div className="tabs tabs-boxed bg-transparent">
            <button
              className={`tab ${viewMode === 'saved' ? 'tab-active' : ''}`}
              onClick={() => setViewMode('saved')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
              Saved Recipes ({savedRecipeIds.size})
            </button>
            <button
              className={`tab ${viewMode === 'created' ? 'tab-active' : ''}`}
              onClick={() => setViewMode('created')}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5 mr-2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              My Creations
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="text-center">
              <div className="loading loading-spinner loading-lg"></div>
              <p className="mt-4 text-secondary">Loading recipes...</p>
            </div>
          </div>
        ) : recipes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {viewMode === 'saved' ? '📖' : '👨‍🍳'}
            </div>
            <h2 className="text-2xl font-bold mb-2">
              {viewMode === 'saved'
                ? 'No Saved Recipes Yet'
                : 'No Recipes Created Yet'}
            </h2>
            <p className="text-secondary mb-6">
              {viewMode === 'saved'
                ? 'Start exploring and save recipes you love!'
                : 'Share your culinary creations with the community!'}
            </p>
            <button
              onClick={() => router.push(viewMode === 'saved' ? '/discover' : '/recipes/create')}
              className="btn btn-primary"
            >
              {viewMode === 'saved' ? 'Discover Recipes' : 'Create Recipe'}
            </button>
          </div>
        ) : (
          <RecipeGrid
            recipes={recipes}
            savedRecipeIds={savedRecipeIds}
            onSaveRecipe={(id) => handleSaveRecipe(id, !savedRecipeIds.has(id))}
            onRecipeClick={(id: string) => router.push(`/recipes/${id}`)}
            loading={loading}
          />
        )}
      </div>
    </div>
  )
}
