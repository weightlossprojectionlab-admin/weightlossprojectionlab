'use client'

import { useState, useEffect } from 'react'
import { auth, db } from '@/lib/firebase'
import { collection, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import type { Unsubscribe } from 'firebase/firestore'

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
 * Real-time hook for fetching meal logs from Firestore
 *
 * @param params - Optional parameters for filtering
 * @returns Meal logs, loading state, and error state
 */
export function useMealLogsRealtime(params?: {
  limitCount?: number
  startDate?: string
  endDate?: string
  mealType?: string
}) {
  const [mealLogs, setMealLogs] = useState<MealLogData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user)
      if (!user) {
        setLoading(false)
        setMealLogs([])
        setError(null) // Clear error when user logs out (expected behavior)
      }
    })

    return () => unsubscribeAuth()
  }, [])

  // Set up Firestore listener when user is authenticated
  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    const mealLogsRef = collection(db, 'users', currentUser.uid, 'mealLogs')

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

    // Set up real-time listener
    const unsubscribe: Unsubscribe = onSnapshot(
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
      },
      (err) => {
        console.error('Error in meal logs snapshot:', err)
        setError(err as Error)
        setLoading(false)
      }
    )

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [currentUser, params?.limitCount, params?.startDate, params?.endDate, params?.mealType])

  return { mealLogs, loading, error }
}
