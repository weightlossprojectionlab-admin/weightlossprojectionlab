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
