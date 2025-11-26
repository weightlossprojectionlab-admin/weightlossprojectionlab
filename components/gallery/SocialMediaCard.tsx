'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PhotoGalleryItem } from '@/lib/photo-gallery-utils'
import { PlatformSelector } from './PlatformSelector'
import type { SocialPlatform, MealCardData } from '@/lib/social-media-cards'
import { generatePlatformCard, getCardFilename, downloadCard } from '@/lib/social-media-cards'
import { logger } from '@/lib/logger'

export interface SocialMediaCardProps {
  photo: PhotoGalleryItem
  onCardClick?: () => void
  showShareOverlay?: boolean
}

/**
 * Social media-style vertical card (9:16 format)
 * Displays meal photo on top with info panel on bottom
 * Mimics Instagram Story/TikTok post aesthetic
 */
export function SocialMediaCard({ photo, onCardClick, showShareOverlay = false }: SocialMediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)

  const handlePlatformSelect = async (platform: SocialPlatform) => {
    try {
      setGeneratingCard(true)
      logger.info('Generating social media card', { platform, mealId: photo.id })

      // Convert PhotoGalleryItem to MealCardData
      const mealData: MealCardData = {
        mealType: photo.mealType,
        photoUrl: photo.photoUrl,
        calories: photo.calories,
        loggedAt: photo.loggedAt,
        foodItems: photo.foodItems,
        macros: photo.macros
      }

      // Generate the card
      const cardBlob = await generatePlatformCard(mealData, platform)
      const filename = getCardFilename(mealData, platform)

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare) {
        try {
          // Create File object from blob
          const file = new File([cardBlob], filename, { type: 'image/png' })

          // Check if we can share files
          const canShareFiles = navigator.canShare({ files: [file] })

          if (canShareFiles) {
            logger.info('Using Web Share API with file', { platform, filename })

            await navigator.share({
              files: [file],
              title: `My ${photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1)} Win! 💪`,
              text: `${photo.calories} calories tracked! #MyJourney #FitnessGoals`
            })

            logger.info('Successfully shared via Web Share API', { platform })
            setShowPlatformSelector(false)
            return
          } else {
            logger.info('Web Share API does not support files, falling back to download', { platform })
          }
        } catch (shareError: any) {
          // User cancelled or share failed
          if (shareError.name === 'AbortError') {
            logger.info('User cancelled share', { platform })
            setShowPlatformSelector(false)
            return
          } else {
            logger.warn('Web Share API failed, falling back to download', { error: shareError.message })
          }
        }
      }

      // Fallback: Download the card (desktop behavior)
      downloadCard(cardBlob, filename)
      logger.info('Social media card downloaded', { platform, filename })
      setShowPlatformSelector(false)
    } catch (error) {
      console.error('Social media card generation error:', error)
      logger.error('Failed to generate social media card', error as Error, {
        platform,
        photoUrl: photo.photoUrl,
        mealType: photo.mealType,
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined
      })
      alert(`Failed to generate social media card: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setGeneratingCard(false)
    }
  }

  // Meal type emoji mapping
  const mealTypeEmoji = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  }

  const emoji = mealTypeEmoji[photo.mealType] || '🍽️'
  const mealTypeDisplay = photo.mealType.charAt(0).toUpperCase() + photo.mealType.slice(1)

  return (
    <div
      className="group relative bg-gradient-to-b from-purple-600 to-indigo-600 rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
      style={{ aspectRatio: '9/16' }}
      onClick={onCardClick}
      onMouseEnter={() => showShareOverlay && setShowPlatformSelector(true)}
      onMouseLeave={() => !generatingCard && setShowPlatformSelector(false)}
    >
      {/* Meal Photo Section - Top 65% */}
      <div className="relative h-[65%] bg-black">
        {!imageError ? (
          <Image
            src={photo.photoUrl}
            alt={`${photo.mealType} - ${photo.foodItems.join(', ')}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Platform Selector Overlay */}
        {(showShareOverlay || showPlatformSelector) && !generatingCard && (
          <PlatformSelector
            onSelectPlatform={handlePlatformSelect}
            className="z-10"
          />
        )}

        {/* Generating Spinner */}
        {generatingCard && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent mx-auto mb-2"></div>
              <p className="text-white text-sm font-medium">Generating...</p>
            </div>
          </div>
        )}
      </div>

      {/* Info Panel Section - Bottom 35% */}
      <div className="h-[35%] bg-card p-6 flex flex-col justify-center">
        {/* Meal Type & Emoji - Prominent */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-4xl">{emoji}</span>
          <span className="font-bold text-foreground text-xl">
            {mealTypeDisplay}
          </span>
        </div>

        {/* Calories - HUGE and Eye-Catching (Hero Element) */}
        <div className="mb-4">
          <div className="text-7xl font-bold text-primary leading-none">
            {photo.calories}
          </div>
          <div className="text-base text-muted-foreground mt-1">
            calories
          </div>
        </div>

        {/* Macros (if available) - Supporting Info */}
        {photo.macros && (
          <div className="flex gap-3 mb-3 text-sm font-semibold text-foreground">
            <span>P: {photo.macros.protein}g</span>
            <span>•</span>
            <span>C: {photo.macros.carbs}g</span>
            <span>•</span>
            <span>F: {photo.macros.fat}g</span>
          </div>
        )}

        {/* Food Items (truncated) - Detail */}
        <div className="text-xs text-muted-foreground line-clamp-1">
          {photo.foodItems.slice(0, 2).join(', ')}
          {photo.foodItems.length > 2 && '...'}
        </div>
      </div>

      {/* Share Button with First-Person CTA (appears on hover when not in share mode) */}
      {!showShareOverlay && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowPlatformSelector(true)
            }}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all font-semibold text-sm"
            aria-label="Share my win"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share My Win! 🚀</span>
          </button>
        </div>
      )}

      {/* Achievement Badge (top left) */}
      {!showShareOverlay && (
        <div className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-background/95/95 px-3 py-1.5 rounded-full shadow-lg">
            <span className="text-xs font-semibold text-primary">My {mealTypeDisplay} 💪</span>
          </div>
        </div>
      )}

      {/* Hover Scale Effect */}
      <div className="absolute inset-0 group-hover:scale-[1.02] transition-transform duration-300 pointer-events-none" />
    </div>
  )
}
