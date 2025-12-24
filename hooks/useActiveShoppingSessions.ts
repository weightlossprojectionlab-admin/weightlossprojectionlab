/**
 * useActiveShoppingSessions Hook
 *
 * Real-time listener for active shopping sessions in a household
 * Used to detect if anyone is shopping before allowing bulk operations
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { ShoppingSession } from '@/types/shopping-session'
import { SESSION_TIMEOUTS, isSessionActive } from '@/types/shopping-session'
import { logger } from '@/lib/logger'

export interface UseActiveShoppingSessionsResult {
  activeSessions: ShoppingSession[]
  hasActiveSessions: boolean
  loading: boolean
  error: Error | null
  getSessionByUser: (userId: string) => ShoppingSession | undefined
  hasOtherActiveSessions: (currentUserId: string) => boolean
}

/**
 * Hook to monitor active shopping sessions in a household
 *
 * @param householdId - Household ID to monitor
 * @param enabled - Whether to enable the listener (default: true)
 */
export function useActiveShoppingSessions(
  householdId: string | undefined | null,
  enabled: boolean = true
): UseActiveShoppingSessionsResult {
  const [activeSessions, setActiveSessions] = useState<ShoppingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!householdId || !enabled) {
      setActiveSessions([])
      setLoading(false)
      return
    }

    // Calculate 3 minutes ago for activity filtering
    const threeMinutesAgo = Timestamp.fromMillis(
      Date.now() - SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED
    )

    // Query for active sessions in this household
    const q = query(
      collection(db, 'shopping_sessions'),
      where('householdId', '==', householdId),
      where('status', '==', 'active'),
      where('lastActivityAt', '>', threeMinutesAgo)
    )

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessions = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          } as ShoppingSession))
          .filter(session => isSessionActive(session)) // Additional validation

        logger.info('[useActiveShoppingSessions] Sessions updated', {
          householdId,
          count: sessions.length,
          sessionIds: sessions.map(s => s.id)
        })

        setActiveSessions(sessions)
        setLoading(false)
        setError(null)
      },
      (err) => {
        logger.error('[useActiveShoppingSessions] Listener error', err as Error, {
          householdId
        })
        setError(err as Error)
        setLoading(false)
      }
    )

    // Cleanup on unmount
    return () => {
      unsubscribe()
    }
  }, [householdId, enabled])

  /**
   * Get session for specific user
   */
  const getSessionByUser = (userId: string): ShoppingSession | undefined => {
    return activeSessions.find(session => session.userId === userId)
  }

  /**
   * Check if there are active sessions excluding current user
   */
  const hasOtherActiveSessions = (currentUserId: string): boolean => {
    return activeSessions.some(session => session.userId !== currentUserId)
  }

  return {
    activeSessions,
    hasActiveSessions: activeSessions.length > 0,
    loading,
    error,
    getSessionByUser,
    hasOtherActiveSessions
  }
}

/**
 * Hook variant that only returns boolean (lighter weight)
 */
export function useHasActiveSessions(
  householdId: string | undefined | null
): boolean {
  const { hasActiveSessions } = useActiveShoppingSessions(householdId)
  return hasActiveSessions
}
