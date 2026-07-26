'use client'

import { useState, useEffect, useCallback } from 'react'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { logger } from '@/lib/logger'
import type { MealLog } from '@/types/medical'

// Re-export MealLog as MealLogData for backward compatibility
export type MealLogData = MealLog

/**
 * Real-time meal logs for either scope, from a SINGLE source:
 *   - self:    users/{uid}/mealLogs
 *   - patient: users/{ownerId}/patients/{patientId}/meal-logs
 *
 * Both use one Firestore onSnapshot listener (no API polling), so a family
 * member's meals update live just like your own — including saves made by other
 * caregivers. The patient path is gated by the `isTenantOfUser` read rule and
 * needs the owner uid (`patientOwnerId`, = patient.userId) to build the path.
 *
 * The query is orderBy(loggedAt) + limit only — deliberately NO mealType
 * where-clause. The patient `meal-logs` subcollection has no (mealType,
 * loggedAt) composite index, and a server-side filter there would silently
 * fail (the recurring missing-index footgun). mealType is filtered client-side
 * instead, which needs no index and keeps one query shape for both scopes.
 *
 * @returns Meal logs, loading state, error state, and a refresh no-op (the
 *          listener is already live; refresh is kept for call-site compat).
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

  // One real-time listener for both scopes.
  useEffect(() => {
    if (!currentUser) {
      setMealLogs([])
      setLoading(false)
      return
    }

    // Logging for a family member needs the owner uid to build the path. Wait
    // for it rather than falling back to the wrong (self) scope.
    if (params?.patientId && !params?.patientOwnerId) {
      setLoading(true)
      return
    }

    setLoading(true)
    setError(null)

    // Over-fetch a little when filtering by mealType so client-side filtering
    // still returns a full-ish list within the requested count.
    const wanted = params?.limitCount || 30
    const fetchLimit = params?.mealType ? Math.min(wanted * 4, 100) : wanted

    try {
      const colRef = params?.patientId
        ? collection(db, 'users', params.patientOwnerId as string, 'patients', params.patientId, 'meal-logs')
        : collection(db, 'users', currentUser.uid, 'mealLogs')

      const q = query(colRef, orderBy('loggedAt', 'desc'), limit(fetchLimit))

      logger.debug('🔄 Setting up meal logs listener', {
        scope: params?.patientId ? 'patient' : 'self',
      })

      const unsubscribe = onSnapshot(
        q,
        { includeMetadataChanges: false },
        (snapshot) => {
          // Skip metadata-only changes to prevent re-render/image-refresh loops.
          if (snapshot.metadata.hasPendingWrites) return

          let logs = snapshot.docs.map((doc) => {
            const data = doc.data() as Record<string, any>
            return {
              id: doc.id,
              ...data,
              // Normalize API structure (totalCalories, macros.*) to the UI
              // shape (calories, protein, …); tolerate either on both paths.
              calories: data.totalCalories ?? data.calories ?? 0,
              protein: data.macros?.protein ?? data.protein ?? 0,
              carbs: data.macros?.carbs ?? data.carbs ?? 0,
              fat: data.macros?.fat ?? data.fat ?? 0,
              fiber: data.macros?.fiber ?? data.fiber ?? 0,
              loggedAt: data.loggedAt?.toDate?.()?.toISOString?.() || data.loggedAt,
            }
          }) as MealLogData[]

          // Client-side mealType filter (kept out of the query — see header),
          // then trim to the requested count.
          if (params?.mealType) {
            logs = logs.filter((m) => (m as Record<string, any>).mealType === params.mealType)
          }
          logs = logs.slice(0, wanted)

          // Only update state if the set actually changed (prevents image
          // re-fetch loops from metadata-driven re-emits).
          setMealLogs((prev) => {
            const prevIds = prev.map((m) => m.id).join(',')
            const newIds = logs.map((m) => m.id).join(',')
            if (prevIds === newIds && prev.length === logs.length) {
              const hasChanges = logs.some((log, i) => {
                const p = prev[i]
                return (
                  !p ||
                  p.id !== log.id ||
                  p.description !== log.description ||
                  (p as Record<string, any>).calories !== (log as Record<string, any>).calories ||
                  p.photoUrl !== log.photoUrl
                )
              })
              if (!hasChanges) return prev
            }
            return logs
          })
          setLoading(false)
        },
        (err) => {
          logger.error('❌ Error in meal logs listener:', err as Error)
          setError(err as Error)
          setLoading(false)
        },
      )

      return () => {
        logger.debug('🔌 Cleaning up meal logs listener')
        unsubscribe()
      }
    } catch (err) {
      logger.error('❌ Error setting up meal logs listener:', err as Error)
      setError(err as Error)
      setLoading(false)
    }
  }, [
    currentUser,
    params?.patientId,
    params?.patientOwnerId,
    params?.limitCount,
    params?.mealType,
  ])

  // The listener keeps data live, so refresh is a no-op — kept so existing call
  // sites (e.g. a save that used to force a poll) don't break.
  const refresh = useCallback(() => {}, [])

  return {
    mealLogs,
    loading,
    error,
    refresh,
  }
}
