'use client'

/**
 * useActiveShoppers — real-time list of shopping_sessions in-progress
 * for a given household.
 *
 * Backs Phase 3's "Sarah is shopping at X" pill on /family/dashboard.
 * Subscribes to shopping_sessions where householdId == ownerId AND
 * status == 'active', then filters client-side to sessions whose
 * lastActivityAt is fresh (within ACTIVITY_TO_PAUSED). Stale-but-
 * not-yet-cleaned-up sessions don't get rendered as active.
 *
 * DRY: this hook is the canonical "who's shopping in this household
 * right now?" answer. Family-dashboard strip + (future) caregiver-side
 * cross-shopper visibility both consume the same shape.
 *
 * Real-time: piggybacks on Firestore's onSnapshot. The session manager
 * heartbeats every 30s; the listener stream pushes those updates to
 * every subscribed dashboard automatically.
 */

import { useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { SESSION_TIMEOUTS, type ShoppingSession } from '@/types/shopping-session'

interface UseActiveShoppersReturn {
  sessions: ShoppingSession[]
  loading: boolean
}

export function useActiveShoppers(householdId: string | null | undefined): UseActiveShoppersReturn {
  const [sessions, setSessions] = useState<ShoppingSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!householdId) {
      setSessions([])
      setLoading(false)
      return
    }

    // No orderBy — Firestore would need a composite index on
    // (householdId asc, status asc, startedAt desc). Two-where queries
    // work without one, and the dataset is bounded (a household won't
    // have more than a handful of shoppers in parallel). Sort
    // client-side by startedAt.
    const q = query(
      collection(db, 'shopping_sessions'),
      where('householdId', '==', householdId),
      where('status', '==', 'active'),
    )

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const now = Date.now()
        // A session is "really" active if its last heartbeat was within
        // the ACTIVITY_TO_PAUSED window. Otherwise the heartbeat died
        // mid-trip and the session is functionally stale even if its
        // status hasn't been flipped yet.
        const staleCutoff = now - SESSION_TIMEOUTS.ACTIVITY_TO_PAUSED

        const fresh = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as ShoppingSession)
          .filter((s) => {
            const t = (s.lastActivityAt as any)?.toMillis?.() ??
              (s.lastActivityAt instanceof Date ? s.lastActivityAt.getTime() : 0)
            return t > staleCutoff
          })
          .sort((a, b) => {
            const aTs = (a.startedAt as any)?.toMillis?.() ??
              (a.startedAt instanceof Date ? a.startedAt.getTime() : 0)
            const bTs = (b.startedAt as any)?.toMillis?.() ??
              (b.startedAt instanceof Date ? b.startedAt.getTime() : 0)
            return aTs - bTs
          })

        setSessions(fresh)
        setLoading(false)
      },
      (err) => {
        logger.warn('[useActiveShoppers] snapshot error', { error: err.message })
        setLoading(false)
      },
    )

    return unsubscribe
  }, [householdId])

  return { sessions, loading }
}
