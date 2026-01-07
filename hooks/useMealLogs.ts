'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore'
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

  // Set up real-time listener for meal logs
  useEffect(() => {
    if (!currentUser) {
      setMealLogs([])
      setLoading(false)
      return
    }

    // For patient meal logs, use API with polling for real-time updates
    if (params?.patientId) {
      let pollInterval: NodeJS.Timeout | null = null

      const fetchPatientMeals = async () => {
        try {
          if (!currentUser) return

          setLoading(true)
          const queryParams = new URLSearchParams()
          if (params?.limitCount) queryParams.set('limit', params.limitCount.toString())
          if (params?.mealType) queryParams.set('mealType', params.mealType)

          const token = await currentUser.getIdToken()
          const response = await fetch(`/api/patients/${params.patientId}/meal-logs?${queryParams}`, {
            headers: { Authorization: `Bearer ${token}` }
          })

          if (response.ok) {
            const data = await response.json()
            setMealLogs(data.data || [])
          }
          setLoading(false)
        } catch (err) {
          logger.error('Error fetching patient meals:', err as Error)
          setError(err as Error)
          setLoading(false)
        }
      }

      // Initial fetch
      fetchPatientMeals()

      // Poll every 5 seconds for updates (real-time simulation)
      pollInterval = setInterval(fetchPatientMeals, 5000)

      // Cleanup polling on unmount
      return () => {
        if (pollInterval) {
          clearInterval(pollInterval)
        }
      }
    }

    // For user's own meals, use real-time Firestore listener
    setLoading(true)
    setError(null)

    try {
      // Build Firestore query
      let q = query(
        collection(db, 'users', currentUser.uid, 'mealLogs'),
        orderBy('loggedAt', 'desc')
      )

      // Add meal type filter if specified
      if (params?.mealType) {
        q = query(q, where('mealType', '==', params.mealType))
      }

      // Add limit
      const limitCount = params?.limitCount || 30
      q = query(q, limit(limitCount))

      logger.debug('🔄 Setting up real-time listener for meal logs')

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs = snapshot.docs.map(doc => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              // Map API structure (totalCalories, macros.protein) to UI structure (calories, protein)
              calories: data.totalCalories || 0,
              protein: data.macros?.protein || 0,
              carbs: data.macros?.carbs || 0,
              fat: data.macros?.fat || 0,
              fiber: data.macros?.fiber || 0,
              loggedAt: data.loggedAt?.toDate?.()?.toISOString() || data.loggedAt
            }
          }) as MealLogData[]

          logger.debug(`📊 ${logs.length} meal logs loaded (real-time)`, {
            firstMeal: logs[0] ? {
              id: logs[0].id,
              hasPhotoUrl: !!logs[0].photoUrl,
              photoUrl: logs[0].photoUrl
            } : null
          })

          setMealLogs(logs)
          setLoading(false)
        },
        (err) => {
          logger.error('❌ Error in meal logs listener:', err as Error)
          setError(err as Error)
          setLoading(false)
        }
      )

      // Cleanup listener on unmount
      return () => {
        logger.debug('🔌 Cleaning up meal logs listener')
        unsubscribe()
      }
    } catch (err) {
      logger.error('❌ Error setting up meal logs listener:', err as Error)
      setError(err as Error)
      setLoading(false)
    }
  }, [currentUser, params?.patientId, params?.limitCount, params?.mealType])

  // Manual refresh function (for real-time listeners, this is mostly a no-op)
  const refresh = useCallback(() => {
    logger.debug('🔄 Manual refresh requested (using real-time listener, data already synced)')
    // Real-time listener automatically syncs data, no manual fetch needed
  }, [])

  return {
    mealLogs,
    loading,
    error,
    refresh
  }
}
