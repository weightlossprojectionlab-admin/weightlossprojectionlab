'use client'

import type { PhotoGalleryItem } from '@/lib/photo-gallery-utils'
import { SocialMediaCard } from '@/components/gallery/SocialMediaCard'

export interface PhotoGalleryGridProps {
  photos: PhotoGalleryItem[]
  onPhotoClick: (photo: PhotoGalleryItem, index: number) => void
  loading?: boolean
  enableSocialShare?: boolean // Enable hover-to-share overlay on cards
}

/**
 * Social media-style vertical card grid
 * Displays meals as Instagram Story/TikTok-style posts (9:16 format)
 */
export function PhotoGalleryGrid({ photos, onPhotoClick, loading, enableSocialShare = false }: PhotoGalleryGridProps) {

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="bg-gray-200 dark:bg-gray-800 rounded-xl animate-pulse"
            style={{ aspectRatio: '9/16' }}
          />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-16 px-4 max-w-2xl mx-auto">
        <div className="text-6xl mb-6">🌟</div>
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          Ready to Start Documenting My Journey?
        </h3>
        <div className="space-y-3 mb-8 text-left bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-4">
            Every meal I log becomes share-ready content that shows:
          </p>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-start gap-2">
              <span className="text-lg">✨</span>
              <span>What I'm eating to reach my goals</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">📊</span>
              <span>How I'm tracking my macros and staying on target</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">💪</span>
              <span>The dedication behind my transformation</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-lg">📱</span>
              <span>My progress in a way that inspires others</span>
            </div>
          </div>
        </div>
        <a
          href="/log-meal"
          className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Start My Journey
        </a>
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          My first meal could inspire someone today 🚀
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {photos.map((photo, index) => (
        <SocialMediaCard
          key={photo.id}
          photo={photo}
          onCardClick={() => onPhotoClick(photo, index)}
          showShareOverlay={enableSocialShare}
        />
      ))}
    </div>
  )
}

/**
 * Gallery with date-grouped sections
 */
export interface GroupedGalleryProps {
  photosByDate: Map<string, PhotoGalleryItem[]>
  onPhotoClick: (photo: PhotoGalleryItem, index: number) => void
  enableSocialShare?: boolean
}

export function GroupedPhotoGallery({ photosByDate, onPhotoClick, enableSocialShare = false }: GroupedGalleryProps) {
  // Sort dates in descending order (most recent first)
  const sortedDates = Array.from(photosByDate.keys()).sort((a, b) => b.localeCompare(a))

  if (sortedDates.length === 0) {
    return (
      <div className="text-center py-12">
        <PhotoGalleryGrid photos={[]} onPhotoClick={onPhotoClick} />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {sortedDates.map(dateKey => {
        const photos = photosByDate.get(dateKey) || []
        const date = new Date(dateKey)

        return (
          <div key={dateKey}>
            {/* Date Header */}
            <div className="flex items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                {photos.length} meal{photos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Photos for this date */}
            <PhotoGalleryGrid
              photos={photos}
              onPhotoClick={onPhotoClick}
              enableSocialShare={enableSocialShare}
            />
          </div>
        )
      })}
    </div>
  )
}
