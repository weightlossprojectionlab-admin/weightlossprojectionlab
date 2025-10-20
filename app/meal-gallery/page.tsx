'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useMealLogsRealtime } from '@/lib/firebase-operations'
import { GalleryImageSkeleton } from '@/components/ui/skeleton'

function MealGalleryContent() {
  const [selectedMeal, setSelectedMeal] = useState<any | null>(null)
  const [filterMealType, setFilterMealType] = useState<'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack'>('all')

  const { mealLogs, loading } = useMealLogsRealtime({
    limitCount: 100,
    mealType: filterMealType !== 'all' ? filterMealType : undefined
  })

  // Filter meals that have photos
  const mealsWithPhotos = mealLogs.filter(meal => meal.photoUrl)

  const mealTypes = [
    { id: 'breakfast', label: 'Breakfast', emoji: '🌅' },
    { id: 'lunch', label: 'Lunch', emoji: '☀️' },
    { id: 'dinner', label: 'Dinner', emoji: '🌙' },
    { id: 'snack', label: 'Snack', emoji: '🍎' },
  ] as const

  return (
    <main className="min-h-screen bg-background">
      <PageHeader
        title="Meal Gallery"
        backHref="/dashboard"
      />

      <div className="container-wide py-6">
        {/* Filter Controls */}
        <div className="mb-6 card">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <span className="text-sm font-medium text-foreground whitespace-nowrap">Filter:</span>
            <button
              onClick={() => setFilterMealType('all')}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                filterMealType === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-foreground hover:bg-muted-dark'
              }`}
            >
              All ({mealsWithPhotos.length})
            </button>
            {mealTypes.map((type) => {
              const count = mealLogs.filter(m => m.photoUrl && m.mealType === type.id).length
              return (
                <button
                  key={type.id}
                  onClick={() => setFilterMealType(type.id)}
                  className={`px-3 py-1 rounded-full text-xs whitespace-nowrap ${
                    filterMealType === type.id
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted-dark'
                  }`}
                >
                  {type.emoji} {type.label} ({count})
                </button>
              )
            })}
          </div>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <GalleryImageSkeleton key={i} />
            ))}
          </div>
        ) : mealsWithPhotos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg">
            <div className="w-20 h-20 mx-auto mb-4 bg-primary-light rounded-full flex items-center justify-center">
              <span className="text-4xl">📸</span>
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No meal photos yet</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start logging meals with photos to build your gallery!
            </p>
            <Link
              href="/log-meal"
              className="inline-block bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover"
            >
              Log Your First Meal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {mealsWithPhotos.map((meal) => {
              const mealDate = new Date(meal.loggedAt)
              const isToday = mealDate.toDateString() === new Date().toDateString()
              const dateStr = isToday
                ? `Today, ${mealDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
                : mealDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              const mealTypeEmoji = mealTypes.find(t => t.id === meal.mealType)?.emoji || '🍽️'

              return (
                <div
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal)}
                  className="group relative aspect-square bg-muted rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
                >
                  <img
                    src={meal.photoUrl}
                    alt={`${meal.mealType} meal`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      {meal.title && (
                        <p className="text-sm font-bold mb-1 truncate">{meal.title}</p>
                      )}
                      <div className="flex items-center space-x-1 mb-1">
                        <span className="text-lg">{mealTypeEmoji}</span>
                        <span className="text-xs font-medium capitalize">{meal.mealType}</span>
                      </div>
                      <p className="text-xs opacity-90">{dateStr}</p>
                      <p className="text-sm font-semibold mt-1">{meal.totalCalories || 0} cal</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {selectedMeal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedMeal(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-4 right-4 z-10 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-black/70"
            >
              ✕
            </button>

            <div className="grid md:grid-cols-2">
              {/* Image */}
              <div className="bg-background">
                <img
                  src={selectedMeal.photoUrl}
                  alt={`${selectedMeal.mealType} meal`}
                  className="w-full h-full object-contain max-h-[70vh]"
                />
              </div>

              {/* Details */}
              <div className="p-6 overflow-y-auto max-h-[70vh]">
                {selectedMeal.title && (
                  <h2 className="text-2xl font-bold text-foreground mb-3">{selectedMeal.title}</h2>
                )}
                <div className="flex items-center space-x-2 mb-4">
                  <span className="text-3xl">
                    {mealTypes.find(t => t.id === selectedMeal.mealType)?.emoji || '🍽️'}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground capitalize">
                      {selectedMeal.mealType}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(selectedMeal.loggedAt).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {/* Nutrition */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-primary-light rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Calories</div>
                    <div className="text-2xl font-bold text-primary">
                      {selectedMeal.totalCalories || 0}
                    </div>
                  </div>
                  <div className="bg-success-light rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Protein</div>
                    <div className="text-2xl font-bold text-success">
                      {selectedMeal.macros?.protein || 0}g
                    </div>
                  </div>
                  <div className="bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Carbs</div>
                    <div className="text-2xl font-bold text-orange-600">
                      {selectedMeal.macros?.carbs || 0}g
                    </div>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Fat</div>
                    <div className="text-2xl font-bold text-yellow-600">
                      {selectedMeal.macros?.fat || 0}g
                    </div>
                  </div>
                </div>

                {/* Food Items */}
                {selectedMeal.aiAnalysis?.foodItems && selectedMeal.aiAnalysis.foodItems.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Detected Foods</h3>
                    <ul className="space-y-1">
                      {selectedMeal.aiAnalysis.foodItems.map((item: any, idx: number) => (
                        <li key={idx} className="text-sm text-muted-foreground">• {typeof item === 'string' ? item : item.name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* AI Suggestions */}
                {selectedMeal.aiAnalysis?.suggestions && selectedMeal.aiAnalysis.suggestions.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">AI Suggestions</h3>
                    <ul className="space-y-1">
                      {selectedMeal.aiAnalysis.suggestions.map((suggestion: string, idx: number) => (
                        <li key={idx} className="text-sm text-success">💡 {suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Notes */}
                {selectedMeal.notes && (
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-foreground mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground italic">{selectedMeal.notes}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  <Link
                    href="/log-meal"
                    className="flex-1 bg-primary text-white px-4 py-2 rounded-lg text-center hover:bg-primary-hover"
                  >
                    Go to Meal Log
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function MealGalleryPage() {
  return (
    <AuthGuard>
      <MealGalleryContent />
    </AuthGuard>
  )
}
