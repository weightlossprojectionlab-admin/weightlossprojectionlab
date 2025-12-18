'use client'

import { mealLogOperations } from './firebase-operations'
import { medicalOperations } from './medical-operations'
import type { MealLog } from '@/types'
import type { MealLog as MedicalMealLog } from '@/types/medical'
import type { PatientProfile } from '@/types/medical'
import { logger } from '@/lib/logger'

/**
 * Photo Gallery Utilities
 *
 * Functions for fetching and organizing meal photos for gallery view
 */

export interface PhotoGalleryItem {
  id: string
  photoUrl: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  loggedAt: Date
  calories: number
  foodItems: string[]
  notes?: string
  title?: string
  patientId?: string // For family plan filtering
  patientName?: string // Display name of family member
  macros?: {
    protein: number
    carbs: number
    fat: number
  }
}

export interface GalleryFilters {
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'all'
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  limit?: number
}

/**
 * Fetch meal photos for gallery view
 * Only returns meals that have photos (excludes manual entries and templates)
 */
export async function fetchGalleryPhotos(filters?: GalleryFilters): Promise<PhotoGalleryItem[]> {
  try {
    const params: any = {
      limit: filters?.limit || 100,
    }

    // Add date range if specified
    if (filters?.dateRange) {
      params.startDate = filters.dateRange.startDate.toISOString()
      params.endDate = filters.dateRange.endDate.toISOString()
    }

    // Add meal type filter if specified and not 'all'
    if (filters?.mealType && filters.mealType !== 'all') {
      params.mealType = filters.mealType
    }

    // Debug: Log params being sent
    console.log('[Gallery] Fetching with params:', params)

    // Fetch meals from API
    const response = await mealLogOperations.getMealLogs(params)
    const meals: MealLog[] = response.data || []

    // Filter to only meals with photos and transform to gallery items
    const galleryItems: PhotoGalleryItem[] = meals
      .filter(meal => meal.photoUrl && meal.photoUrl.length > 0)
      .filter(meal => meal.aiAnalysis) // Only include meals with AI analysis
      .map(meal => {
        const item: PhotoGalleryItem = {
          id: meal.id,
          photoUrl: meal.photoUrl!,
          mealType: meal.mealType,
          loggedAt: new Date(meal.loggedAt),
          calories: meal.aiAnalysis?.totalCalories || 0,
          foodItems: meal.aiAnalysis?.foodItems?.map(item => item.name) || [],
          notes: meal.notes,
          title: meal.title
        }

        // Add macros if available
        if (meal.aiAnalysis?.totalMacros) {
          item.macros = {
            protein: meal.aiAnalysis.totalMacros.protein || 0,
            carbs: meal.aiAnalysis.totalMacros.carbs || 0,
            fat: meal.aiAnalysis.totalMacros.fat || 0
          }
        }

        return item
      })

    return galleryItems
  } catch (error) {
    console.error('[Gallery] Error fetching photos:', error)
    logger.error('Error fetching gallery photos', error as Error)
    return []
  }
}

/**
 * Fetch gallery photos for Family plan subscriptions
 * Aggregates meal photos from all patients in parallel
 */
export async function fetchGalleryPhotosForFamily(
  patients: PatientProfile[],
  filters?: GalleryFilters
): Promise<PhotoGalleryItem[]> {
  try {
    const params: any = {
      limit: filters?.limit || 100,
    }

    // Add date range if specified
    if (filters?.dateRange) {
      params.startDate = filters.dateRange.startDate.toISOString()
      params.endDate = filters.dateRange.endDate.toISOString()
    }

    // Add meal type filter if specified and not 'all'
    if (filters?.mealType && filters.mealType !== 'all') {
      params.mealType = filters.mealType
    }

    console.log('[Gallery] Fetching for', patients.length, 'patients with params:', params)

    // Fetch meal logs for all patients in parallel
    const patientMealPromises = patients.map(async (patient) => {
      try {
        const meals = await medicalOperations.mealLogs.getMealLogs(patient.id, params)
        // Attach patient metadata to each meal
        return meals.map((meal: MedicalMealLog) => ({
          meal,
          patientId: patient.id,
          patientName: patient.name
        }))
      } catch (error) {
        console.error(`[Gallery] Error fetching meals for patient ${patient.name}:`, error)
        return []
      }
    })

    const allPatientMeals = await Promise.all(patientMealPromises)
    const flattenedMeals = allPatientMeals.flat()

    console.log('[Gallery] Fetched', flattenedMeals.length, 'meals across all patients')

    // Filter to only meals with photos and transform to gallery items
    const galleryItems: PhotoGalleryItem[] = flattenedMeals
      .filter(({ meal }) => meal.photoUrl && meal.photoUrl.length > 0)
      .map(({ meal, patientId, patientName }) => {
        const item: PhotoGalleryItem = {
          id: meal.id,
          photoUrl: meal.photoUrl!,
          mealType: meal.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
          loggedAt: new Date(meal.loggedAt),
          calories: meal.calories || 0,
          foodItems: meal.foodItems || [],
          notes: meal.notes,
          patientId,
          patientName
        }

        // Add macros if available
        if (meal.protein !== undefined && meal.carbs !== undefined && meal.fat !== undefined) {
          item.macros = {
            protein: meal.protein || 0,
            carbs: meal.carbs || 0,
            fat: meal.fat || 0
          }
        }

        return item
      })

    // Sort by date descending (most recent first)
    galleryItems.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())

    return galleryItems
  } catch (error) {
    console.error('[Gallery] Error fetching family photos:', error)
    logger.error('Error fetching family gallery photos', error as Error)
    return []
  }
}

/**
 * Fetch photos from last N days
 * Auto-detects if user has patients (family plan) or not
 */
export async function fetchRecentPhotos(
  days: number = 30,
  patients?: PatientProfile[]
): Promise<PhotoGalleryItem[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const filters: GalleryFilters = {
    dateRange: { startDate, endDate },
    limit: 100
  }

  // If patients provided, use family-aware fetching
  if (patients && patients.length > 0) {
    return fetchGalleryPhotosForFamily(patients, filters)
  }

  // Otherwise, fall back to user-level fetching (backward compatibility)
  return fetchGalleryPhotos(filters)
}

/**
 * Group photos by date (YYYY-MM-DD)
 */
export function groupPhotosByDate(photos: PhotoGalleryItem[]): Map<string, PhotoGalleryItem[]> {
  const grouped = new Map<string, PhotoGalleryItem[]>()

  photos.forEach(photo => {
    const dateKey = photo.loggedAt.toISOString().split('T')[0] // YYYY-MM-DD
    const existing = grouped.get(dateKey) || []
    existing.push(photo)
    grouped.set(dateKey, existing)
  })

  // Sort each group by loggedAt descending
  grouped.forEach((items, key) => {
    items.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
  })

  return grouped
}

/**
 * Group photos by meal type
 */
export function groupPhotosByMealType(photos: PhotoGalleryItem[]): Map<string, PhotoGalleryItem[]> {
  const grouped = new Map<string, PhotoGalleryItem[]>()

  photos.forEach(photo => {
    const existing = grouped.get(photo.mealType) || []
    existing.push(photo)
    grouped.set(photo.mealType, existing)
  })

  // Sort each group by loggedAt descending
  grouped.forEach((items, key) => {
    items.sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
  })

  return grouped
}

/**
 * Get summary statistics for gallery
 */
export function getGalleryStats(photos: PhotoGalleryItem[]) {
  const totalPhotos = photos.length
  const totalCalories = photos.reduce((sum, photo) => sum + photo.calories, 0)
  const avgCalories = totalPhotos > 0 ? Math.round(totalCalories / totalPhotos) : 0

  // Count by meal type
  const mealTypeCounts = photos.reduce((counts, photo) => {
    counts[photo.mealType] = (counts[photo.mealType] || 0) + 1
    return counts
  }, {} as Record<string, number>)

  // Get date range
  const dates = photos.map(p => p.loggedAt.getTime()).sort((a, b) => a - b)
  const dateRange = dates.length > 0 ? {
    earliest: new Date(dates[0]),
    latest: new Date(dates[dates.length - 1])
  } : null

  return {
    totalPhotos,
    totalCalories,
    avgCalories,
    mealTypeCounts,
    dateRange
  }
}

/**
 * Search photos by food items or notes
 */
export function searchPhotos(photos: PhotoGalleryItem[], searchTerm: string): PhotoGalleryItem[] {
  const term = searchTerm.toLowerCase().trim()

  if (!term) return photos

  return photos.filter(photo => {
    // Search in food items
    const foodMatch = photo.foodItems.some(item =>
      item.toLowerCase().includes(term)
    )

    // Search in notes
    const notesMatch = photo.notes && photo.notes.toLowerCase().includes(term)

    // Search in title
    const titleMatch = photo.title && photo.title.toLowerCase().includes(term)

    return foodMatch || notesMatch || titleMatch
  })
}
