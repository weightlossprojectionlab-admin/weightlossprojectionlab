'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import type { PhotoGalleryItem } from '@/lib/photo-gallery-utils'
import { PlatformSelector } from './PlatformSelector'
import type { SocialPlatform, MealCardData } from '@/lib/social-media-cards'
import { generatePlatformCard, getCardFilename, downloadCard } from '@/lib/social-media-cards'
import { logger } from '@/lib/logger'
import { generateSocialMediaPost, suggestBestPlatform } from '@/lib/social-media-agent'

export interface SocialMediaCardProps {
  photo: PhotoGalleryItem
  onCardClick?: () => void
  showShareOverlay?: boolean
  targetPlatform?: SocialPlatform // NEW: Allow specifying platform
}

/**
 * Social media-style vertical card (9:16 format)
 * Displays meal photo on top with info panel on bottom
 * Mimics Instagram Story/TikTok post aesthetic
 */
export function SocialMediaCard({ photo, onCardClick, showShareOverlay = false, targetPlatform }: SocialMediaCardProps) {
  const [imageError, setImageError] = useState(false)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [showPlatformSelector, setShowPlatformSelector] = useState(false)

  // Generate intelligent platform-specific post using AI agent
  const socialPost = useMemo(() => {
    const platform = targetPlatform || suggestBestPlatform({
      mealType: photo.mealType,
      photoUrl: photo.photoUrl,
      calories: photo.calories,
      loggedAt: photo.loggedAt,
      foodItems: photo.foodItems,
      macros: photo.macros,
      title: photo.title,
      notes: photo.notes
    })

    return generateSocialMediaPost({
      mealType: photo.mealType,
      photoUrl: photo.photoUrl,
      calories: photo.calories,
      loggedAt: photo.loggedAt,
      foodItems: photo.foodItems,
      macros: photo.macros,
      title: photo.title,
      notes: photo.notes
    }, platform)
  }, [photo, targetPlatform])

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
      className="group relative rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
      style={{ aspectRatio: '9/16' }}
      onClick={onCardClick}
      onMouseEnter={() => showShareOverlay && setShowPlatformSelector(true)}
      onMouseLeave={() => !generatingCard && setShowPlatformSelector(false)}
    >
      {/* Full Background Image */}
      <div className="absolute inset-0">
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
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-muted-foreground">
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>

      {/* Bottom Gradient Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

      {/* Platform Selector Overlay */}
      {(showShareOverlay || showPlatformSelector) && !generatingCard && (
        <div className="absolute inset-0 z-10">
          <PlatformSelector
            onSelectPlatform={handlePlatformSelect}
            className="z-10"
          />
        </div>
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

      {/* Content Overlay - AI-Powered Platform-Optimized Layout */}
      <div className={`absolute ${
        socialPost.designStyle.textPosition === 'top' ? 'top-0' :
        socialPost.designStyle.textPosition === 'center' ? 'top-1/2 -translate-y-1/2' :
        'bottom-0'
      } left-0 right-0 p-6 z-10 text-white`}>

        {/* Primary Text - Platform Optimized */}
        <div className="mb-4">
          <div className={`${
            socialPost.designStyle.fontSize === '4xl' ? 'text-6xl md:text-7xl' :
            socialPost.designStyle.fontSize === '3xl' ? 'text-5xl md:text-6xl' :
            socialPost.designStyle.fontSize === '2xl' ? 'text-4xl md:text-5xl' :
            'text-3xl md:text-4xl'
          } ${
            socialPost.designStyle.fontStyle === 'hand-drawn' ? 'font-black' :
            socialPost.designStyle.fontStyle === 'bold' ? 'font-black' :
            'font-bold'
          } leading-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.8)]`}>
            {socialPost.overlayText.primary}
          </div>
          {socialPost.overlayText.secondary && (
            <div className="text-xl md:text-2xl font-semibold mt-2 opacity-90 drop-shadow-lg">
              {socialPost.overlayText.secondary}
            </div>
          )}
        </div>

        {/* Stats Badge - Macros */}
        {socialPost.overlayText.stats && (
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-full mb-3 text-sm font-bold">
            {socialPost.overlayText.stats}
          </div>
        )}

        {/* Platform Badge */}
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600/90 to-pink-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs font-bold">
          <span>✨ {socialPost.platform.toUpperCase()}</span>
        </div>

        {/* Engagement Hook */}
        <div className="mt-4 text-sm font-medium opacity-90 line-clamp-2">
          {socialPost.engagementHooks.callToAction}
        </div>
      </div>

      {/* Share Button (appears on hover) */}
      {!showShareOverlay && (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowPlatformSelector(true)
            }}
            className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full shadow-xl hover:scale-105 transition-all font-bold text-sm"
            aria-label="Share my win"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share 🚀</span>
          </button>
        </div>
      )}
    </div>
  )
}
