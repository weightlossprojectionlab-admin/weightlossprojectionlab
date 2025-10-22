'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { PhotoGalleryItem } from '@/lib/photo-gallery-utils'

export interface PhotoGalleryGridProps {
  photos: PhotoGalleryItem[]
  onPhotoClick: (photo: PhotoGalleryItem, index: number) => void
  loading?: boolean
}

/**
 * Masonry-style grid layout for meal photos
 * Responsive grid with hover effects and meal metadata
 */
export function PhotoGalleryGrid({ photos, onPhotoClick, loading }: PhotoGalleryGridProps) {
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set())

  const handleImageError = (photoId: string) => {
    setImageErrors(prev => new Set(prev).add(photoId))
  }

  // Meal type emoji mapping
  const mealTypeEmoji = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  }

  // Meal type colors
  const mealTypeColors = {
    breakfast: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
    lunch: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    dinner: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400',
    snack: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="text-center py-12 px-4">
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          No Photos Yet
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Start logging meals with photos to build your gallery!
        </p>
        <a
          href="/log-meal"
          className="inline-flex items-center px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Log Your First Meal
        </a>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((photo, index) => {
        const hasError = imageErrors.has(photo.id)

        return (
          <div
            key={photo.id}
            onClick={() => onPhotoClick(photo, index)}
            className="group relative aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-md hover:shadow-xl"
          >
            {/* Meal Photo */}
            {!hasError ? (
              <Image
                src={photo.photoUrl}
                alt={`${photo.mealType} - ${photo.foodItems.join(', ')}`}
                fill
                sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                onError={() => handleImageError(photo.id)}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            {/* Overlay with meal info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                {/* Meal Type Badge */}
                <div className="mb-2">
                  <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${mealTypeColors[photo.mealType]}`}>
                    <span className="mr-1">{mealTypeEmoji[photo.mealType]}</span>
                    {photo.mealType}
                  </span>
                </div>

                {/* Calories */}
                <div className="font-semibold text-sm mb-1">
                  {photo.calories} cal
                </div>

                {/* Food Items (truncated) */}
                <div className="text-xs opacity-90 line-clamp-2">
                  {photo.foodItems.slice(0, 3).join(', ')}
                  {photo.foodItems.length > 3 && '...'}
                </div>

                {/* Date */}
                <div className="text-xs opacity-75 mt-1">
                  {photo.loggedAt.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </div>
              </div>
            </div>

            {/* Quick View Icon */}
            <div className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <svg className="w-4 h-4 text-gray-700 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Gallery with date-grouped sections
 */
export interface GroupedGalleryProps {
  photosByDate: Map<string, PhotoGalleryItem[]>
  onPhotoClick: (photo: PhotoGalleryItem, index: number) => void
}

export function GroupedPhotoGallery({ photosByDate, onPhotoClick }: GroupedGalleryProps) {
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
            />
          </div>
        )
      })}
    </div>
  )
}
