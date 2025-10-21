'use client'

import { useEffect, useRef, useState } from 'react'
import { PublicRecipe } from '@/lib/types/public-recipes'
import { RecipeCard } from './RecipeCard'

interface RecipeGridProps {
  recipes: PublicRecipe[]
  onLoadMore?: () => void
  hasMore?: boolean
  loading?: boolean
  onSaveRecipe?: (recipeId: string) => void
  onViewRecipe?: (recipeId: string) => void
  savedRecipeIds?: Set<string>
}

export function RecipeGrid({
  recipes,
  onLoadMore,
  hasMore = false,
  loading = false,
  onSaveRecipe,
  onViewRecipe,
  savedRecipeIds = new Set()
}: RecipeGridProps) {
  const observerTarget = useRef<HTMLDivElement>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setIsIntersecting(true)
        }
      },
      { threshold: 0.1, rootMargin: '100px' }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [])

  // Trigger load more when intersecting
  useEffect(() => {
    if (isIntersecting && hasMore && !loading && onLoadMore) {
      setIsIntersecting(false)
      onLoadMore()
    }
  }, [isIntersecting, hasMore, loading, onLoadMore])

  if (recipes.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <svg className="w-16 h-16 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-lg font-semibold text-foreground mb-2">No recipes found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or check back later</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Masonry Grid - Pinterest Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recipes.map((recipe, index) => (
          <RecipeCard
            key={recipe.id}
            recipe={recipe}
            onSave={onSaveRecipe}
            onView={onViewRecipe}
            isSaved={savedRecipeIds.has(recipe.id)}
            priority={index < 4} // Priority load for first 4 images
          />
        ))}
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mt-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-muted rounded-lg overflow-hidden">
                <div className="aspect-[3/4] bg-muted-foreground/20" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-muted-foreground/20 rounded w-3/4" />
                  <div className="h-3 bg-muted-foreground/20 rounded w-1/2" />
                  <div className="flex space-x-2">
                    <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                    <div className="h-3 bg-muted-foreground/20 rounded w-12" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Intersection Observer Target */}
      {hasMore && <div ref={observerTarget} className="h-10" />}

      {/* End of Results */}
      {!hasMore && recipes.length > 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          You've reached the end! 🎉
        </div>
      )}
    </div>
  )
}
