'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { logger } from '@/lib/logger'
import { medicalOperations } from '@/lib/medical-operations'
import type { MealLog } from '@/types/medical'

// Re-export MealLog as MealLogData for backward compatibility
export type MealLogData = MealLog

/**
 * Hook for fetching meal logs using API
 *
 * @param params - Optional parameters for filtering
 * @returns Meal logs, loading state, error state, and refresh function
 */
export function useMealLogsRealtime(params?: {
  patientId?: string | null
  patientOwnerId?: string | null
  limitCount?: number
  startDate?: string
  endDate?: string
  mealType?: string
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)
  const [mealLogs, setMealLogs] = useState<MealLogData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribeAuth()
  }, [])

  // Fetch meal logs using API
  const fetchMealLogs = useCallback(async () => {
    if (!currentUser) {
      setMealLogs([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Build query params
      const queryParams = new URLSearchParams()
      if (params?.limitCount) queryParams.set('limit', params.limitCount.toString())
      if (params?.mealType) queryParams.set('mealType', params.mealType)
      if (params?.startDate) queryParams.set('startDate', params.startDate)
      if (params?.endDate) queryParams.set('endDate', params.endDate)

      const token = await currentUser.getIdToken()

      // Choose API endpoint based on whether we're fetching patient or user meal logs
      const endpoint = params?.patientId
        ? `/api/patients/${params.patientId}/meal-logs?${queryParams}`
        : `/api/meal-logs?${queryParams}`

      logger.debug(`🔄 Fetching meal logs from: ${endpoint}`)

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch meal logs')
      }

      const data = await response.json()
      const logs = data.data || []

      // Debug: Log first meal to check photoUrl
      if (logs.length > 0) {
        logger.debug(`📊 ${logs.length} meal logs loaded, first meal:`, {
          id: logs[0].id,
          mealType: logs[0].mealType,
          hasPhotoUrl: !!logs[0].photoUrl,
          photoUrl: logs[0].photoUrl
        })
      } else {
        logger.debug(`📊 ${logs.length} meal logs loaded`)
      }

      setMealLogs(logs)
      setLoading(false)
    } catch (err) {
      logger.error('❌ Error fetching meal logs:', err as Error)
      setError(err as Error)
      setLoading(false)
    }
  }, [currentUser, params?.patientId, params?.limitCount, params?.startDate, params?.endDate, params?.mealType])

  useEffect(() => {
    fetchMealLogs()
  }, [fetchMealLogs])

  // Manual refresh function
  const refresh = useCallback(() => {
    logger.debug('🔄 Manual refresh requested')
    fetchMealLogs()
  }, [fetchMealLogs])

  return {
    mealLogs,
    loading,
    error,
    refresh
  }
}
