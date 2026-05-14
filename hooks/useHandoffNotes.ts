'use client'

/**
 * useHandoffNotes — fetch + post handoff notes for one owner's household.
 *
 * Semantic intent: a caregiver writing a note for the next shift, OR
 * the owner reading what their caregivers said. One ledger per owner,
 * scoped to the household. Multiple consumers (one per household
 * section on the shift view) share the same hook — DRY at the data
 * layer.
 *
 * Lifecycle:
 *   - On mount, fetches the most-recent notes (default 20).
 *   - After a successful post, refetches so the new note appears
 *     without reloading the page.
 *   - `posting` flag lets the composer disable its button during
 *     the round-trip.
 */

import { useCallback, useEffect, useState } from 'react'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { userProfileOperations } from '@/lib/firebase-operations'
import type { HandoffNote } from '@/types/handoff'

interface UseHandoffNotesReturn {
  notes: HandoffNote[]
  loading: boolean
  posting: boolean
  error: string | null
  /** Submit a new note. Resolves true on success, false on failure. */
  post: (body: string, opts?: { patientIds?: string[]; flaggedForOwner?: boolean }) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useHandoffNotes(ownerId: string | null | undefined, limit = 10): UseHandoffNotesReturn {
  const [notes, setNotes] = useState<HandoffNote[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!ownerId) {
      setNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = (await userProfileOperations.listHandoffNotes(ownerId, limit)) as { items?: HandoffNote[] }
      setNotes(response?.items || [])
    } catch (err: any) {
      setError(err?.message || 'Failed to load notes')
      setNotes([])
    } finally {
      setLoading(false)
    }
  }, [ownerId, limit])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Real-time piggyback: the notifications collection already streams to
  // the caller via the bell, and the POST endpoint fans out a
  // handoff_note row for every recipient. So when ANOTHER party posts to
  // this household's ledger, this user's notifications collection gets a
  // new doc — we listen for it and refresh the feed. The author's own
  // POST refreshes inline via post() above; this listener handles every
  // other party's writes.
  //
  // Path used: notifications.where(userId == me).where(type ==
  // 'handoff_note'). The handoffNotes collection itself isn't readable
  // by caregivers through the client SDK (Firestore rules) — going
  // through notifications avoids the rule complexity AND avoids polling.
  useEffect(() => {
    if (!ownerId) return
    const currentUid = auth.currentUser?.uid
    if (!currentUid) return

    const mountedAt = Date.now()
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUid),
      where('type', '==', 'handoff_note'),
    )

    const unsubscribe = onSnapshot(q, (snap) => {
      let shouldRefresh = false
      snap.docChanges().forEach((change) => {
        if (change.type !== 'added') return
        const data = change.doc.data()
        if (data?.metadata?.ownerId !== ownerId) return
        // Skip the initial-snapshot backfill — onSnapshot delivers every
        // existing doc as 'added' on first call. Filter to docs created
        // after this listener mounted so we only fire on REAL new posts.
        const createdAtMs =
          typeof data.createdAt === 'string' ? Date.parse(data.createdAt) : 0
        if (!Number.isFinite(createdAtMs) || createdAtMs < mountedAt) return
        shouldRefresh = true
      })
      if (shouldRefresh) refresh()
    }, (error) => {
      // Don't surface listener errors to the UI — feed still works via
      // initial fetch + manual refresh-after-post. Just log.
      console.warn('[useHandoffNotes] live-listener error', error)
    })

    return unsubscribe
  }, [ownerId, refresh])

  const post = useCallback<UseHandoffNotesReturn['post']>(async (body, opts) => {
    if (!ownerId) return false
    const trimmed = body.trim()
    if (!trimmed) return false
    setPosting(true)
    setError(null)
    try {
      await userProfileOperations.createHandoffNote(ownerId, {
        body: trimmed,
        patientIds: opts?.patientIds,
        flaggedForOwner: opts?.flaggedForOwner,
      })
      await refresh()
      return true
    } catch (err: any) {
      setError(err?.message || 'Failed to post note')
      return false
    } finally {
      setPosting(false)
    }
  }, [ownerId, refresh])

  return { notes, loading, posting, error, post, refresh }
}
