'use client'

import { useState, useEffect, useRef } from 'react'
import { Query, QueryDocumentSnapshot, onSnapshot } from 'firebase/firestore'
import { logger } from '@/lib/logger'

/**
 * Generic real-time Firestore query hook
 *
 * Subscribes to a Firestore query via onSnapshot and returns live data.
 * Reusable across any hook that needs real-time Firestore collection data.
 *
 * @param queryOrNull - Firestore Query to subscribe to, or null to skip (e.g., auth not ready)
 * @param mapDoc - Function to transform each document snapshot into your desired type
 * @returns { data, loading, error }
 *
 * @example
 * const q = query(collection(db, 'recipes'), where('status', '==', 'published'), limit(50))
 * const { data: recipes, loading } = useFirestoreQuery(q, (doc) => ({ id: doc.id, ...doc.data() }))
 */
export function useFirestoreQuery<T>(
  queryOrNull: Query | null,
  mapDoc: (doc: QueryDocumentSnapshot) => T,
): { data: T[]; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const prevDataRef = useRef<string>('')

  useEffect(() => {
    if (!queryOrNull) {
      setLoading(false)
      return
    }

    const unsubscribe = onSnapshot(
      queryOrNull,
      { includeMetadataChanges: false },
      (snapshot) => {
        // Skip metadata-only changes (hasPendingWrites) to prevent double-render
        if (snapshot.metadata.hasPendingWrites) return

        const mapped = snapshot.docs.map(mapDoc)

        // State diff: only update if data actually changed
        const dataKey = JSON.stringify(mapped.map((item: any) => item.id || '').sort())
        if (dataKey !== prevDataRef.current) {
          prevDataRef.current = dataKey
          setData(mapped)
        }

        setLoading(false)
        setError(null)
      },
      (err) => {
        // Firestore errors keep `code`/`message` as non-enumerable props, and
        // the logger only extracts message/name — so `code` (the useful field:
        // permission-denied, or failed-precondition = missing index whose
        // message has a create-index URL) was dropped, leaving "{}". Pass err
        // for message/stack, plus `code` and a best-effort collection path so
        // the failing subscription is obvious.
        let path: string | undefined
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          path = (queryOrNull as any)?._query?.path?.segments?.join('/')
        } catch {
          /* internal query shape unavailable — ignore */
        }
        logger.error('[useFirestoreQuery] Snapshot error', err, {
          code: (err as { code?: string })?.code,
          path,
        })
        setError(err)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [queryOrNull]) // Re-subscribe when query reference changes

  return { data, loading, error }
}
