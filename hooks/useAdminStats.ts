/**
 * useAdminStats Hook
 *
 * Fetches real-time admin dashboard statistics from Firestore
 */

import { useState, useEffect } from 'react'
import { db, auth } from '@/lib/firebase'
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

        logger.debug('Fetching admin stats...')
        logger.debug(`Current auth user: ${auth.currentUser?.uid} ${auth.currentUser?.email}`)

        if (!auth.currentUser) {
          logger.error('No authenticated user found!')
          setError('Not authenticated')
          setLoading(false)
          return
        }

        // Calculate timestamp for "today" (last 24 hours)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const todayTimestamp = Timestamp.fromDate(today)

        logger.debug('Attempting to fetch users collection...')

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
          getDocs(collection(db, 'users')).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} users`)
            return snap
          }).catch(err => {
            logger.error('Error fetching users collection:', err instanceof Error ? err : new Error(String(err)))
            throw err
          }),

          // Active users today (users with lastActiveAt >= today)
          getDocs(
            query(
              collection(db, 'users'),
              where('lastActiveAt', '>=', todayTimestamp)
            )
          ).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} active users`)
            return snap
          }).catch(err => {
            logger.error('Error fetching active users:', err instanceof Error ? err : new Error(String(err)))
            throw err
          }),

          // Total recipes (from recipes collection - media metadata)
          getDocs(collection(db, 'recipes')).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} recipes`)
            return snap
          }).catch(err => {
            logger.error('Error fetching recipes:', err instanceof Error ? err : new Error(String(err)))
            throw err
          }),

          // Pending recipes (from publicRecipes collection if it exists, otherwise 0)
          // Note: This collection may not exist yet, so we'll catch the error
          getDocs(
            query(
              collection(db, 'publicRecipes'),
              where('moderationStatus', '==', 'pending')
            )
          ).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} pending recipes`)
            return snap
          }).catch((err) => {
            logger.warn('Error fetching pending recipes (may not exist)', { error: err instanceof Error ? err.message : String(err) })
            return { size: 0 }
          }),

          // Open cases (from dispute_cases with status != 'resolved')
          getDocs(
            query(
              collection(db, 'dispute_cases'),
              where('status', '!=', 'resolved')
            )
          ).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} open cases`)
            return snap
          }).catch((err) => {
            logger.warn('Error fetching open cases', { error: err instanceof Error ? err.message : String(err) })
            return { size: 0 }
          }),

          // Low confidence AI decisions (from ai_decision_logs with confidence < 0.8)
          getDocs(
            query(
              collection(db, 'ai_decision_logs'),
              where('confidence', '<', 0.8),
              where('reviewed', '==', false)
            )
          ).then(snap => {
            logger.debug(`Successfully fetched ${snap.size} low confidence AI decisions`)
            return snap
          }).catch((err) => {
            logger.warn('Error fetching AI decisions', { error: err instanceof Error ? err.message : String(err) })
            return { size: 0 }
          }),
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
        logger.error('Error listening to users:', err instanceof Error ? err : new Error(String(err)))
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
        logger.error('Error listening to dispute_cases:', err instanceof Error ? err : new Error(String(err)))
      }
    )

    return () => {
      unsubscribeUsers()
      unsubscribeCases()
    }
  }, [])

  return { stats, loading, error }
}
