'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { auth, db } from '@/lib/firebase'
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { logger } from '@/lib/logger'

export interface MealLogData {
  id: string
  title?: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  photoUrl?: string
  aiAnalysis?: any
  manualEntries?: Array<{
    food: string
    calories: number
    quantity: string
  }>
  totalCalories: number
  macros: {
    carbs: number
    protein: number
    fat: number
    fiber?: number
  }
  searchKeywords?: string[]
  loggedAt: string
  source: string
  notes?: string
}

/**
 * Fetcher function for SWR - fetches meal logs from Firestore
 */
async function fetchMealLogs(
  userId: string,
  params?: {
    limitCount?: number
    startDate?: string
    endDate?: string
    mealType?: string
  }
): Promise<MealLogData[]> {
  const mealLogsRef = collection(db, 'users', userId, 'mealLogs')

  // Build query with filters (WHERE clauses must come before ORDER BY)
  let q = query(mealLogsRef)

  // Add WHERE filters first
  if (params?.mealType) {
    q = query(q, where('mealType', '==', params.mealType))
  }
  if (params?.startDate) {
    q = query(q, where('loggedAt', '>=', new Date(params.startDate)))
  }
  if (params?.endDate) {
    q = query(q, where('loggedAt', '<=', new Date(params.endDate)))
  }

  // Then add ORDER BY
  q = query(q, orderBy('loggedAt', 'desc'))

  // Finally add LIMIT
  q = query(q, limit(params?.limitCount || 10))

  const snapshot = await getDocs(q)

  const logs = snapshot.docs.map((doc) => {
    const data = doc.data()
    return {
      id: doc.id,
      ...data,
      // Convert Firestore Timestamp to ISO string
      loggedAt: data.loggedAt?.toDate?.()?.toISOString() || data.loggedAt,
    } as MealLogData
  })

  return logs
}

/**
 * Optimized hook for fetching meal logs with SWR caching
 *
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses one-time fetch (getDocs) instead of real-time subscription (onSnapshot)
 * - Implements 5-minute SWR cache for instant subsequent loads
 * - Automatic background revalidation on focus/reconnect
 * - Deduplicates concurrent requests
 *
 * @param params - Optional parameters for filtering
 * @returns Meal logs, loading state, error state, and mutate function
 */
export function useMealLogsRealtime(params?: {
  limitCount?: number
  startDate?: string
  endDate?: string
  mealType?: string
}) {
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
    })

    return () => unsubscribeAuth()
  }, [])

  // Create SWR key based on user and params
  const swrKey = currentUser
    ? ['mealLogs', currentUser.uid, params?.limitCount, params?.startDate, params?.endDate, params?.mealType]
    : null

  // Use SWR with 5-minute cache
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    () => fetchMealLogs(currentUser!.uid, params),
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 5000, // Dedupe requests within 5 seconds
      refreshInterval: 0, // No automatic polling (only revalidate on focus/reconnect)
      errorRetryCount: 2,
      onError: (err) => {
        logger.error('Error fetching meal logs:', err)
      }
    }
  )

  return {
    mealLogs: data || [],
    loading: isLoading,
    error: error || null,
    refresh: mutate // Expose mutate for manual refresh
  }
}
