'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { logger } from '@/lib/logger'
import type { MealLog } from '@/types/medical'

// Re-export MealLog as MealLogData for backward compatibility
export type MealLogData = MealLog

/**
 * True real-time hook for fetching meal logs with Firestore onSnapshot
 *
 * REAL-TIME UPDATES:
 * - Uses onSnapshot for instant updates when meals are added/edited/deleted
 * - No manual refresh required
 * - Automatic cleanup on unmount
 * - Supports filtering by meal type and date range
 *
 * @param params - Optional parameters for filtering
 * @returns Meal logs, loading state, error state, and refresh function
 */
export function useMealLogsRealtime(params?: {
  patientId?: string | null
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

    // Clear meals immediately when switching patients
    logger.debug(`🔄 Setting up meal logs listener for patient: ${params?.patientId || 'none'}`)
    setMealLogs([])
    setLoading(true)
    setError(null)

    // If patientId is provided, query from patient subcollection
    if (params?.patientId) {

      const mealLogsRef = collection(db, 'users', currentUser.uid, 'patients', params.patientId, 'meal-logs')
      logger.debug(`📍 Querying meals from: users/${currentUser.uid}/patients/${params.patientId}/meal-logs`)

      // Build query with filters (WHERE clauses must come before ORDER BY)
      let q = query(mealLogsRef)

      // Add WHERE filters first
      if (params?.mealType) {
        q = query(q, where('mealType', '==', params.mealType))
      }
      if (params?.startDate) {
        q = query(q, where('loggedAt', '>=', params.startDate))
      }
      if (params?.endDate) {
        q = query(q, where('loggedAt', '<=', params.endDate))
      }

      // Then add ORDER BY
      q = query(q, orderBy('loggedAt', 'desc'))

      // Finally add LIMIT
      q = query(q, limit(params?.limitCount || 10))

      // Subscribe to real-time updates
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logs = snapshot.docs.map((doc) => {
            const data = doc.data()
            return {
              id: doc.id,
              ...data,
              // Convert Firestore Timestamp to ISO string
              loggedAt: data.loggedAt?.toDate?.()?.toISOString() || data.loggedAt,
            } as MealLogData
          })

          setMealLogs(logs)
          setLoading(false)
          setError(null)

          logger.debug(`📊 Real-time update: ${logs.length} meal logs loaded for patient ${params.patientId}`)
        },
        (err) => {
          logger.error('❌ Error in meal logs real-time listener:', err)
          setError(err as Error)
          setLoading(false)
        }
      )

      // Cleanup subscription on unmount or when dependencies change
      return () => {
        logger.debug('🔌 Unsubscribing from meal logs listener')
        unsubscribe()
      }
    } else {
      // No patientId - set empty data
      setMealLogs([])
      setLoading(false)
    }
  }, [currentUser, params?.patientId, params?.limitCount, params?.startDate, params?.endDate, params?.mealType])

  // Manual refresh function (forces re-subscription)
  const refresh = () => {
    logger.debug('🔄 Manual refresh requested')
    setLoading(true)
  }

  return {
    mealLogs,
    loading,
    error,
    refresh
  }
}
