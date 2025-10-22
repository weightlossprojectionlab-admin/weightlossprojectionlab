'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import type { PhotoGalleryItem } from '@/lib/photo-gallery-utils'

export interface PhotoModalProps {
  photo: PhotoGalleryItem | null
  allPhotos: PhotoGalleryItem[]
  currentIndex: number
  onClose: () => void
  onNext?: () => void
  onPrevious?: () => void
}

/**
 * Full-screen lightbox modal for viewing meal photos
 * Includes navigation, metadata display, and keyboard shortcuts
 */
export function PhotoModal({
  photo,
  allPhotos,
  currentIndex,
  onClose,
  onNext,
  onPrevious
}: PhotoModalProps) {
  const [imageLoaded, setImageLoaded] = useState(false)

  // Keyboard navigation
  useEffect(() => {
    if (!photo) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext()
      } else if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [photo, onClose, onNext, onPrevious])

  // Reset image loaded state when photo changes
  useEffect(() => {
    setImageLoaded(false)
  }, [photo])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (photo) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [photo])

  if (!photo) return null

  const hasNext = currentIndex < allPhotos.length - 1
  const hasPrevious = currentIndex > 0

  // Meal type emoji mapping
  const mealTypeEmoji = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍎'
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        aria-label="Close modal"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Photo Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
        {currentIndex + 1} / {allPhotos.length}
      </div>

      {/* Main Content */}
      <div
        className="max-w-7xl w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full h-full lg:h-auto">
          {/* Image Section (2/3 width on desktop) */}
          <div className="lg:col-span-2 flex items-center justify-center relative">
            {/* Loading Spinner */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-white border-t-transparent"></div>
              </div>
            )}

            {/* Image */}
            <div className="relative w-full aspect-square lg:aspect-auto lg:h-[80vh] rounded-lg overflow-hidden bg-gray-900">
              <Image
                src={photo.photoUrl}
                alt={`${photo.mealType} - ${photo.foodItems.join(', ')}`}
                fill
                sizes="(max-width: 1024px) 100vw, 66vw"
                className="object-contain"
                onLoad={() => setImageLoaded(true)}
                priority
              />
            </div>

            {/* Navigation Buttons */}
            {hasPrevious && onPrevious && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPrevious()
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                aria-label="Previous photo"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}

            {hasNext && onNext && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onNext()
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                aria-label="Next photo"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>

          {/* Details Sidebar (1/3 width on desktop) */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 overflow-y-auto max-h-[80vh]">
            {/* Meal Type & Date */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-3xl">{mealTypeEmoji[photo.mealType]}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {photo.loggedAt.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
                {photo.title || photo.mealType}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {photo.loggedAt.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>

            {/* Calories */}
            <div className="mb-6 p-4 bg-primary/10 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Calories</div>
              <div className="text-3xl font-bold text-primary">{photo.calories}</div>
            </div>

            {/* Food Items */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">
                Food Items
              </h3>
              <div className="space-y-2">
                {photo.foodItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start p-2 bg-gray-50 dark:bg-gray-800 rounded"
                  >
                    <span className="text-primary mr-2">•</span>
                    <span className="text-gray-900 dark:text-gray-100">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            {photo.notes && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                  Notes
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {photo.notes}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <a
                href={`/meals/${photo.id}`}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-center text-sm font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                View Details
              </a>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  window.open(photo.photoUrl, '_blank')
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-sm"
                aria-label="Open in new tab"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </div>

            {/* Keyboard Shortcuts Hint */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                Keyboard Shortcuts
              </h4>
              <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Close</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">Esc</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Previous</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">←</kbd>
                </div>
                <div className="flex justify-between">
                  <span>Next</span>
                  <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">→</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
