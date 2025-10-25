'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PublicRecipe } from '@/lib/types/public-recipes'
import { shareRecipe, canUseWebShare } from '@/lib/recipe-share-utils'
import { generateRecipeAltText } from '@/lib/utils'

interface RecipeCardProps {
  recipe: PublicRecipe
  onSave?: (recipeId: string) => void
  onView?: (recipeId: string) => void
  isSaved?: boolean
  priority?: boolean // For above-the-fold images
}

export function RecipeCard({ recipe, onSave, onView, isSaved = false, priority = false }: RecipeCardProps) {
  const [showActions, setShowActions] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sharing, setSharing] = useState(false)

  const handleSave = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onSave) return

    setSaving(true)
    try {
      await onSave(recipe.id)
    } finally {
      setSaving(false)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    setSharing(true)
    try {
      const { imageBlob, caption, shareUrl } = await shareRecipe(recipe)

      if (canUseWebShare()) {
        const file = new File([imageBlob], `${recipe.slug}.png`, { type: 'image/png' })
        await navigator.share({
          title: recipe.name,
          text: caption,
          url: shareUrl,
          files: [file]
        })
      } else {
        // Fallback: copy link
        await navigator.clipboard.writeText(shareUrl)
        alert('Link copied to clipboard!')
      }
    } catch (error) {
      console.error('Share failed:', error)
    } finally {
      setSharing(false)
    }
  }

  const handleCardClick = () => {
    onView?.(recipe.id)
  }

  // Format numbers for display
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'k'
    }
    return num.toString()
  }

  return (
    <Link
      href={`/recipe/${recipe.slug}`}
      className="group block bg-white dark:bg-gray-900 border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      onClick={handleCardClick}
    >
      {/* Recipe Image */}
      <div className="relative w-full aspect-[3/4] overflow-hidden">
        <Image
          src={recipe.imageUrl}
          alt={generateRecipeAltText(recipe.name, recipe.mealType, 'hero')}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-200"
          priority={priority}
          placeholder={recipe.imageBlurHash ? 'blur' : 'empty'}
          blurDataURL={recipe.imageBlurHash}
        />

        {/* Hover Overlay */}
        <div className={`absolute inset-0 bg-black/40 flex items-center justify-center space-x-3 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center space-x-2 px-4 py-2 rounded-full font-medium transition-all ${
              isSaved
                ? 'bg-success text-white hover:bg-success-hover'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            aria-label={isSaved ? 'Saved' : 'Save recipe'}
          >
            {saving ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            )}
            <span className="text-sm">{isSaved ? 'Saved' : 'Save'}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleShare}
            disabled={sharing}
            className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
            aria-label="Share recipe"
          >
            {sharing ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            )}
            <span className="text-sm">Share</span>
          </button>
        </div>

        {/* Featured Badge */}
        {recipe.isFeatured && (
          <div className="absolute top-2 left-2 bg-warning text-white px-2 py-1 rounded text-xs font-bold">
            ⭐ Featured
          </div>
        )}

        {/* Premium Badge (if creator is verified) */}
        {recipe.createdByVerified && (
          <div className="absolute top-2 right-2 bg-primary text-white px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Verified</span>
          </div>
        )}
      </div>

      {/* Recipe Info */}
      <div className="p-3">
        {/* Title */}
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        {/* Creator */}
        <div className="flex items-center space-x-2 mb-3">
          {recipe.createdByPhoto ? (
            <Image
              src={recipe.createdByPhoto}
              alt={recipe.createdByName}
              width={20}
              height={20}
              className="rounded-full"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-xs text-gray-600 dark:text-gray-400">
              {recipe.createdByName[0].toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-600 dark:text-gray-400">{recipe.createdByName}</span>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{recipe.prepTime}min</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>{recipe.calories}</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{recipe.macros.protein}g</span>
            </span>
          </div>
        </div>

        {/* Save Count */}
        {recipe.saves > 0 && (
          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 font-medium">
            {formatNumber(recipe.saves)} saves
          </div>
        )}

        {/* Dietary Tags (show first 2) */}
        {recipe.dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipe.dietaryTags.slice(0, 2).map(tag => (
              <span key={tag} className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-primary px-1.5 py-0.5 rounded">
                {tag}
              </span>
            ))}
            {recipe.dietaryTags.length > 2 && (
              <span className="text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded">
                +{recipe.dietaryTags.length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  )
}
