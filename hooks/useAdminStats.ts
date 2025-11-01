/**
 * useAdminStats Hook
 *
 * Fetches real-time admin dashboard statistics from Firestore
 */

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  collection,
  query,
  where,
  getDocs,
  onSnapshot,
  Timestamp
} from 'firebase/firestore'

export interface PlatformStats {
  totalUsers: number
  activeUsersToday: number
  totalRecipes: number
  pendingRecipes: number
  openCases: number
  lowConfidenceAIDecisions: number
}

export function useAdminStats() {
  const [stats, setStats] = useState<PlatformStats>({
    totalUsers: 0,
    activeUsersToday: 0,
    totalRecipes: 0,
    pendingRecipes: 0,
    openCases: 0,
    lowConfidenceAIDecisions: 0,
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        // Calculate timestamp for "today" (last 24 hours)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = Timestamp.fromDate(today)

        // Fetch all stats in parallel
        const [
          totalUsersSnapshot,
          activeUsersTodaySnapshot,
          totalRecipesSnapshot,
          pendingRecipesSnapshot,
          openCasesSnapshot,
          lowConfidenceAISnapshot,
        ] = await Promise.all([
          // Total users
          getDocs(collection(db, 'users')),

          // Active users today (users with lastActiveAt >= today)
          getDocs(
            query(
              collection(db, 'users'),
              where('lastActiveAt', '>=', todayTimestamp)
            )
          ),

          // Total recipes (from recipes collection - media metadata)
          getDocs(collection(db, 'recipes')),

          // Pending recipes (from publicRecipes collection if it exists, otherwise 0)
          // Note: This collection may not exist yet, so we'll catch the error
          getDocs(
            query(
              collection(db, 'publicRecipes'),
              where('moderationStatus', '==', 'pending')
            )
          ).catch(() => ({ size: 0 })),

          // Open cases (from dispute_cases with status != 'resolved')
          getDocs(
            query(
              collection(db, 'dispute_cases'),
              where('status', '!=', 'resolved')
            )
          ).catch(() => ({ size: 0 })),

          // Low confidence AI decisions (from ai_decision_logs with confidence < 0.8)
          getDocs(
            query(
              collection(db, 'ai_decision_logs'),
              where('confidence', '<', 0.8),
              where('reviewed', '==', false)
            )
          ).catch(() => ({ size: 0 })),
        ])

        setStats({
          totalUsers: totalUsersSnapshot.size,
          activeUsersToday: activeUsersTodaySnapshot.size,
          totalRecipes: totalRecipesSnapshot.size,
          pendingRecipes: typeof pendingRecipesSnapshot === 'object' && 'size' in pendingRecipesSnapshot
            ? pendingRecipesSnapshot.size
            : 0,
          openCases: typeof openCasesSnapshot === 'object' && 'size' in openCasesSnapshot
            ? openCasesSnapshot.size
            : 0,
          lowConfidenceAIDecisions: typeof lowConfidenceAISnapshot === 'object' && 'size' in lowConfidenceAISnapshot
            ? lowConfidenceAISnapshot.size
            : 0,
        })

        setLoading(false)
      } catch (err) {
        logger.error('Error fetching admin stats:', err as Error)
        setError(err instanceof Error ? err.message : 'Failed to fetch stats')
        setLoading(false)
      }
    }

    fetchStats()

    // Set up real-time listener for users collection to get live updates
    const unsubscribeUsers = onSnapshot(
      collection(db, 'users'),
      () => {
        // Refetch all stats when users change
        fetchStats()
      },
      (err) => {
        logger.error('Error listening to users:', err)
      }
    )

    // Set up real-time listener for dispute_cases to get live updates
    const unsubscribeCases = onSnapshot(
      collection(db, 'dispute_cases'),
      () => {
        // Refetch all stats when cases change
        fetchStats()
      },
      (err) => {
        logger.error('Error listening to dispute_cases:', err)
      }
    )

    return () => {
      unsubscribeUsers()
      unsubscribeCases()
    }
  }, [])

  return { stats, loading, error }
}
