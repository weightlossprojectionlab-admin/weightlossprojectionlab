'use client'

import { useState } from 'react'
import Image from 'next/image'
import { MealType } from '@/lib/meal-suggestions'
import { generateRecipeAltText } from '@/lib/utils'

interface RecipeImageCarouselProps {
  images?: string[]
  recipeName: string
  mealType: MealType
  className?: string
}

const MEAL_TYPE_COLORS: Record<MealType, { bg: string; text: string; emoji: string }> = {
  breakfast: { bg: 'bg-orange-100', text: 'text-orange-600', emoji: '🍳' },
  lunch: { bg: 'bg-green-100', text: 'text-green-600', emoji: '🥗' },
  dinner: { bg: 'bg-blue-100', text: 'text-blue-600', emoji: '🍽️' },
  snack: { bg: 'bg-purple-100', text: 'text-purple-600', emoji: '🍎' },
}

export function RecipeImageCarousel({
  images,
  recipeName,
  mealType,
  className = ''
}: RecipeImageCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  // Use uploaded images or show placeholder
  const hasImages = images && images.length > 0
  const displayImages = hasImages ? images : []
  const hasMultipleImages = displayImages.length > 1

  const mealColors = MEAL_TYPE_COLORS[mealType]

  return (
    <div className={`recipe-carousel ${className}`}>
      {/* Main Image Display */}
      <div className="relative h-64 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
        {hasImages ? (
          <Image
            src={displayImages[activeIndex]}
            alt={generateRecipeAltText(recipeName, mealType, activeIndex === 0 ? 'hero' : 'angle')}
            fill
            className="object-cover transition-opacity duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className={`flex flex-col items-center justify-center h-full ${mealColors.bg} dark:bg-gray-700`}>
            <div className="text-6xl mb-4">{mealColors.emoji}</div>
            <div className={`text-2xl font-bold capitalize ${mealColors.text}`}>{mealType}</div>
            <div className={`text-sm mt-2 ${mealColors.text} opacity-70`}>No image uploaded yet</div>
          </div>
        )}
      </div>

      {/* Thumbnail Navigation - Only show if multiple images */}
      {hasMultipleImages && (
        <div className="flex gap-2 p-2 bg-gray-50 dark:bg-gray-950 rounded-b-lg overflow-x-auto">
          {displayImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`
                flex-shrink-0 relative w-16 h-16 rounded-md overflow-hidden
                border-2 transition-all
                ${activeIndex === index
                  ? 'border-primary scale-105 shadow-md'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }
              `}
              aria-label={`View image ${index + 1}`}
            >
              <Image
                src={image}
                alt={generateRecipeAltText(recipeName, mealType, 'thumbnail')}
                fill
                className="object-cover"
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}

      {/* Image Counter */}
      {hasMultipleImages && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-60 text-white text-xs px-2 py-1 rounded">
          {activeIndex + 1} / {displayImages.length}
        </div>
      )}
    </div>
  )
}
