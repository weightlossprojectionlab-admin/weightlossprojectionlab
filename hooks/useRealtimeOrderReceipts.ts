'use client'

/**
 * Real-time hook for the OrderReceipt feed. One snapshot listener per
 * signed-in user (or household), ordered by createdAt descending so
 * the most recently-saved draft lands at the top of the feed.
 *
 * Single-doc variant `useRealtimeOrderReceipt(id)` is used by the
 * detail view so edits made by another concurrent caregiver land
 * instantly (matters for the lock takeover UX).
 */

import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
} from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { COLLECTIONS } from '@/constants/firestore'
import { logger } from '@/lib/logger'
import type { OrderReceipt } from '@/types/shopping'

interface UseRealtimeOrderReceiptsOptions {
  /** Optional household scope. When set, queries by householdId; falls
   *  back to userId otherwise. Mirrors useRealtimeInventory. */
  householdId?: string
  /** Cap the feed length. Default 50. */
  max?: number
}

interface RealtimeOrderReceiptsState {
  receipts: OrderReceipt[]
  loading: boolean
  error: string | null
}

function hydrateReceipt(id: string, data: Record<string, unknown>): OrderReceipt {
  // Firestore Timestamp → Date for downstream rendering.
  const toDate = (v: unknown): Date | undefined => {
    if (!v) return undefined
    if (v instanceof Date) return v
    const t = v as { toDate?: () => Date }
    if (typeof t.toDate === 'function') return t.toDate()
    const d = new Date(v as string)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  const out = { id, ...data } as unknown as OrderReceipt
  const createdAt = toDate(data.createdAt) ?? new Date()
  out.createdAt = createdAt
  const editingSince = toDate(data.editingSince)
  if (editingSince) out.editingSince = editingSince
  const appliedAt = toDate(data.appliedAt)
  if (appliedAt) out.appliedAt = appliedAt
  return out
}

export function useRealtimeOrderReceipts(options?: UseRealtimeOrderReceiptsOptions) {
  const [state, setState] = useState<RealtimeOrderReceiptsState>({
    receipts: [],
    loading: true,
    error: null,
  })

  const userId = auth.currentUser?.uid
  const householdId = options?.householdId
  const max = options?.max ?? 50

  useEffect(() => {
    if (!userId) {
      setState({ receipts: [], loading: false, error: null })
      return
    }

    const baseQuery = householdId
      ? query(
          collection(db, COLLECTIONS.ORDER_RECEIPTS),
          where('householdId', '==', householdId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(max),
        )
      : query(
          collection(db, COLLECTIONS.ORDER_RECEIPTS),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          firestoreLimit(max),
        )

    const unsubscribe = onSnapshot(
      baseQuery,
      (snapshot) => {
        const receipts: OrderReceipt[] = snapshot.docs.map((d) =>
          hydrateReceipt(d.id, d.data()),
        )
        setState({ receipts, loading: false, error: null })
      },
      (err) => {
        logger.error('[useRealtimeOrderReceipts] Snapshot failed', err as Error)
        setState({ receipts: [], loading: false, error: err.message })
      },
    )

    return () => unsubscribe()
  }, [userId, householdId, max])

  return state
}

interface RealtimeSingleReceiptState {
  receipt: OrderReceipt | null
  loading: boolean
  error: string | null
}

/**
 * Single-receipt listener. Used by the detail view so concurrent edits
 * by another caregiver are reflected without a manual refresh, and so
 * the lock UI updates the moment another user releases or claims it.
 */
export function useRealtimeOrderReceipt(receiptId: string | null) {
  const [state, setState] = useState<RealtimeSingleReceiptState>({
    receipt: null,
    loading: !!receiptId,
    error: null,
  })

  useEffect(() => {
    if (!receiptId) {
      setState({ receipt: null, loading: false, error: null })
      return
    }
    const ref = doc(db, COLLECTIONS.ORDER_RECEIPTS, receiptId)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setState({ receipt: null, loading: false, error: 'Receipt not found' })
          return
        }
        setState({
          receipt: hydrateReceipt(snap.id, snap.data() as Record<string, unknown>),
          loading: false,
          error: null,
        })
      },
      (err) => {
        logger.error('[useRealtimeOrderReceipt] Snapshot failed', err as Error)
        setState({ receipt: null, loading: false, error: err.message })
      },
    )
    return () => unsubscribe()
  }, [receiptId])

  return state
}
