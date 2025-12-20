/**
 * useMeals Hook
 *
 * React hook for managing meal logs for a specific patient
 * Provides operations to log, fetch, and manage meal entries with duplicate detection
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import type { MealLog, MealType } from '@/types/medical'

interface UseMealsOptions {
  patientId: string
  limit?: number
  autoFetch?: boolean
}

interface DuplicateCheckResult {
  isDuplicate: boolean
  existing: MealLog | null
  loggedBy: string | null
  loggedAt: string | null
  hoursAgo: number
}

interface UseMealsReturn {
  meals: MealLog[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  logMeal: (data: Omit<MealLog, 'id' | 'patientId' | 'userId' | 'loggedAt' | 'loggedBy'>) => Promise<MealLog>
  checkDuplicateToday: (mealType: MealType) => Promise<DuplicateCheckResult>
  getLatestMeal: (mealType: MealType) => MealLog | null
  getTodayMeals: () => MealLog[]
}

export function useMeals({
  patientId,
  limit,
  autoFetch = true
}: UseMealsOptions): UseMealsReturn {
  const [meals, setMeals] = useState<MealLog[]>([])
  const [loading, setLoading] = useState<boolean>(autoFetch)
  const [error, setError] = useState<string | null>(null)

  // Fetch meals
  const fetchMeals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useMeals] Fetching meals', { patientId, limit })

      const data = await medicalOperations.mealLogs.getMealLogs(patientId, { limit })
      setMeals(data)

      logger.info('[useMeals] Meals fetched successfully', {
        patientId,
        count: data.length
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch meals'
      logger.error('[useMeals] Error fetching meals', err, { patientId })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [patientId, limit])

  // Initial fetch (if autoFetch is true)
  useEffect(() => {
    if (autoFetch) {
      fetchMeals()
    }
  }, [fetchMeals, autoFetch])

  // Log meal
  const logMeal = useCallback(async (
    data: Omit<MealLog, 'id' | 'patientId' | 'userId' | 'loggedAt' | 'loggedBy'>
  ): Promise<MealLog> => {
    try {
      logger.info('[useMeals] Logging meal', { patientId, mealType: data.mealType })

      const newMeal = await medicalOperations.mealLogs.logMeal(patientId, data)

      // Add to local state (prepend to maintain chronological order)
      setMeals(prev => [newMeal, ...prev])

      logger.info('[useMeals] Meal logged successfully', {
        patientId,
        mealId: newMeal.id
      })
      return newMeal
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to log meal'
      logger.error('[useMeals] Error logging meal', err, { patientId })
      throw new Error(errorMessage)
    }
  }, [patientId])

  // Check for duplicate meal logging today
  const checkDuplicateToday = useCallback(async (
    mealType: MealType
  ): Promise<DuplicateCheckResult> => {
    try {
      logger.debug('[useMeals] Checking for duplicate', { patientId, mealType })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Filter meals logged today for this meal type
      const todayMeals = meals.filter(meal => {
        const mealDate = new Date(meal.loggedAt)
        return meal.mealType === mealType && mealDate >= today
      })

      if (todayMeals.length > 0) {
        const existing = todayMeals[0] // Most recent
        const loggedAt = new Date(existing.loggedAt)
        const now = new Date()
        const hoursAgo = (now.getTime() - loggedAt.getTime()) / (1000 * 60 * 60)

        // Warn if logged within 2 hours
        const isDuplicate = hoursAgo < 2

        logger.info('[useMeals] Duplicate check result', {
          patientId,
          mealType,
          isDuplicate,
          hoursAgo: hoursAgo.toFixed(1)
        })

        return {
          isDuplicate,
          existing,
          loggedBy: existing.loggedBy,
          loggedAt: existing.loggedAt,
          hoursAgo: Math.round(hoursAgo * 10) / 10 // Round to 1 decimal
        }
      }

      return {
        isDuplicate: false,
        existing: null,
        loggedBy: null,
        loggedAt: null,
        hoursAgo: 0
      }
    } catch (err: any) {
      logger.error('[useMeals] Error checking duplicate', err, { patientId, mealType })
      // Return safe default on error
      return {
        isDuplicate: false,
        existing: null,
        loggedBy: null,
        loggedAt: null,
        hoursAgo: 0
      }
    }
  }, [meals, patientId])

  // Get latest meal of a specific type
  const getLatestMeal = useCallback((mealType: MealType): MealLog | null => {
    const filtered = meals.filter(m => m.mealType === mealType)
    return filtered.length > 0 ? filtered[0] : null
  }, [meals])

  // Get all meals logged today
  const getTodayMeals = useCallback((): MealLog[] => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return meals.filter(meal => {
      const mealDate = new Date(meal.loggedAt)
      return mealDate >= today
    })
  }, [meals])

  return {
    meals,
    loading,
    error,
    refetch: fetchMeals,
    logMeal,
    checkDuplicateToday,
    getLatestMeal,
    getTodayMeals
  }
}
