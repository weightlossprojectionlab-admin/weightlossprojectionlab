/**
 * useHouseholds Hook
 *
 * Real-time hook to fetch and monitor all households for the current user
 * Uses onSnapshot for live updates when households are created/updated/deleted
 */

import { useState, useEffect } from 'react'
import { collection, query, where, onSnapshot, or, and } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { useAuth } from './useAuth'
import { logger } from '@/lib/logger'
import type { Household } from '@/types/household'

export function useHouseholds() {
  const { user } = useAuth()
  const [households, setHouseholds] = useState<Household[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user?.uid) {
      setHouseholds([])
      setLoading(false)
      return
    }

    // Set up real-time listener for households where user is primary caregiver or additional caregiver
    // Must use and() when combining multiple filters with or()
    const householdsRef = collection(db, 'households')
    const q = query(
      householdsRef,
      and(
        where('isActive', '==', true),
        or(
          where('primaryCaregiverId', '==', user.uid),
          where('additionalCaregiverIds', 'array-contains', user.uid)
        )
      )
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const householdsList: Household[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Household))

        // Sort by name
        householdsList.sort((a, b) => a.name.localeCompare(b.name))

        setHouseholds(householdsList)
        setError(null)
        setLoading(false)

        logger.debug('[useHouseholds] Households updated', {
          userId: user.uid,
          count: householdsList.length
        })
      },
      (err) => {
        logger.error('[useHouseholds] Snapshot error', err as Error, { userId: user.uid })
        setError('Failed to monitor households')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [user?.uid])

  return { households, loading, error, refetch: () => {} }
}
