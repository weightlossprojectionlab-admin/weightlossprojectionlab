/**
 * useAuditTrail Hook
 *
 * Real-time Firestore listener for audit logs with filtering and pagination.
 *
 * Features:
 * - Real-time updates via Firestore snapshots
 * - Client-side filtering (entity type, action, date range, search)
 * - Pagination support
 * - Loading and error states
 * - Automatic cleanup on unmount
 *
 * Usage:
 * ```tsx
 * const { logs, loading, error, hasMore, loadMore } = useAuditTrail({
 *   patientId: 'pat_123',
 *   entityType: 'medication',
 *   limit: 50
 * })
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { db } from '@/lib/firebase'
import {
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  QueryConstraint,
  Unsubscribe
} from 'firebase/firestore'
import type {
  AuditLog,
  AuditLogFilters,
  AuditEntityType,
  AuditAction
} from '@/types/audit'

interface UseAuditTrailOptions extends AuditLogFilters {
  // Enable real-time updates (default: true)
  realtime?: boolean
  // Auto-load on mount (default: true)
  autoLoad?: boolean
}

interface UseAuditTrailReturn {
  logs: AuditLog[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  total: number
  loadMore: () => void
  refresh: () => void
}

/**
 * Hook for querying and subscribing to audit logs
 */
export function useAuditTrail(options: UseAuditTrailOptions = {}): UseAuditTrailReturn {
  const {
    patientId,
    userId,
    performedBy,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    searchQuery,
    limit = 50,
    orderBy: orderByField = 'performedAt',
    orderDirection = 'desc',
    realtime = true,
    autoLoad = true
  } = options

  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState<boolean>(autoLoad)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(false)
  const [currentLimit, setCurrentLimit] = useState<number>(limit)

  /**
   * Build Firestore query from filters
   */
  const buildQuery = useCallback(() => {
    const constraints: QueryConstraint[] = []

    // SECURITY: Always require either patientId or userId
    if (!patientId && !userId) {
      throw new Error('Either patientId or userId is required for audit log queries')
    }

    // Apply filters
    if (patientId) {
      constraints.push(where('patientId', '==', patientId))
    }

    if (userId) {
      constraints.push(where('userId', '==', userId))
    }

    if (performedBy) {
      constraints.push(where('performedBy', '==', performedBy))
    }

    if (entityType) {
      if (Array.isArray(entityType)) {
        if (entityType.length <= 10) {
          constraints.push(where('entityType', 'in', entityType))
        }
        // Note: If more than 10 entity types, we'll filter client-side
      } else {
        constraints.push(where('entityType', '==', entityType))
      }
    }

    if (entityId) {
      constraints.push(where('entityId', '==', entityId))
    }

    if (action) {
      if (Array.isArray(action)) {
        if (action.length <= 10) {
          constraints.push(where('action', 'in', action))
        }
        // Note: If more than 10 actions, we'll filter client-side
      } else {
        constraints.push(where('action', '==', action))
      }
    }

    // Date range filters
    if (startDate) {
      constraints.push(where('performedAt', '>=', startDate.toISOString()))
    }

    if (endDate) {
      constraints.push(where('performedAt', '<=', endDate.toISOString()))
    }

    // Ordering and limit
    constraints.push(orderBy(orderByField, orderDirection))
    constraints.push(firestoreLimit(currentLimit + 1)) // Fetch one extra to check hasMore

    // Use collection group query to search across all audit logs
    return query(collectionGroup(db, 'auditLogs'), ...constraints)
  }, [
    patientId,
    userId,
    performedBy,
    entityType,
    entityId,
    action,
    startDate,
    endDate,
    orderByField,
    orderDirection,
    currentLimit
  ])

  /**
   * Apply client-side filters
   * (for filters that can't be done server-side)
   */
  const applyClientFilters = useCallback(
    (rawLogs: AuditLog[]): AuditLog[] => {
      let filtered = rawLogs

      // Filter entity types if more than 10 (Firestore 'in' limit)
      if (Array.isArray(entityType) && entityType.length > 10) {
        filtered = filtered.filter((log) =>
          (entityType as AuditEntityType[]).includes(log.entityType)
        )
      }

      // Filter actions if more than 10 (Firestore 'in' limit)
      if (Array.isArray(action) && action.length > 10) {
        filtered = filtered.filter((log) =>
          (action as AuditAction[]).includes(log.action)
        )
      }

      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (log) =>
            log.entityName?.toLowerCase().includes(searchLower) ||
            log.performedByName?.toLowerCase().includes(searchLower) ||
            log.metadata?.notes?.toLowerCase().includes(searchLower)
        )
      }

      return filtered
    },
    [entityType, action, searchQuery]
  )

  /**
   * Load more logs (pagination)
   */
  const loadMore = useCallback(() => {
    setCurrentLimit((prev) => prev + limit)
  }, [limit])

  /**
   * Refresh logs (reset to initial limit)
   */
  const refresh = useCallback(() => {
    setCurrentLimit(limit)
    setError(null)
  }, [limit])

  /**
   * Subscribe to audit logs
   */
  useEffect(() => {
    if (!autoLoad && !loading) {
      return
    }

    let unsubscribe: Unsubscribe | undefined

    try {
      const q = buildQuery()

      if (realtime) {
        // Real-time listener
        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            const rawLogs = snapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data()
            } as AuditLog))

            // Check if we have more results
            const hasMoreResults = rawLogs.length > currentLimit
            const displayLogs = hasMoreResults ? rawLogs.slice(0, currentLimit) : rawLogs

            // Apply client-side filters
            const filteredLogs = applyClientFilters(displayLogs)

            setLogs(filteredLogs)
            setHasMore(hasMoreResults)
            setLoading(false)
            setError(null)
          },
          (err) => {
            console.error('[useAuditTrail] Snapshot error:', err)
            setError(err as Error)
            setLoading(false)
          }
        )
      } else {
        // One-time fetch
        import('firebase/firestore').then(({ getDocs }) => {
          getDocs(q)
            .then((snapshot) => {
              const rawLogs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data()
              } as AuditLog))

              const hasMoreResults = rawLogs.length > currentLimit
              const displayLogs = hasMoreResults ? rawLogs.slice(0, currentLimit) : rawLogs

              const filteredLogs = applyClientFilters(displayLogs)

              setLogs(filteredLogs)
              setHasMore(hasMoreResults)
              setLoading(false)
              setError(null)
            })
            .catch((err) => {
              console.error('[useAuditTrail] Fetch error:', err)
              setError(err as Error)
              setLoading(false)
            })
        })
      }
    } catch (err) {
      console.error('[useAuditTrail] Query build error:', err)
      setError(err as Error)
      setLoading(false)
    }

    // Cleanup
    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }, [
    buildQuery,
    applyClientFilters,
    currentLimit,
    realtime,
    autoLoad,
    loading
  ])

  return {
    logs,
    loading,
    error,
    hasMore,
    total: logs.length,
    loadMore,
    refresh
  }
}
