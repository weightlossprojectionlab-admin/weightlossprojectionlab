'use client'

/**
 * useStoreRoster — read/write the household's chosen store list.
 *
 * Phase 0a-i substrate. The owner picks chains from a curated catalog
 * (constants/store-roster.ts) and we persist the chosen ids on their
 * user doc as a flat array — `users/{ownerId}.householdStoreIds:
 * string[]`. A field, not a subcollection — the list is small (a
 * handful of stores per household), denormalized reads are cheap, and
 * the existing /users/{userId} firestore.rules update rule already
 * allows the owner to write to their own doc.
 *
 * Real-time: subscribes via onSnapshot so a save reflects immediately
 * on every open dashboard. Returns:
 *   • selectedIds — current chosen ids in catalog order
 *   • saving — true while a write is in flight
 *   • error — last write error (null on success / no-op)
 *   • setSelected(ids) — replace the full roster with this set
 *   • toggle(id) — flip a single chain on/off, debounced via setSelected
 *
 * Idempotent + de-duplicating on the write side: the saved array is
 * the unique ordered intersection of the input ids and the catalog,
 * so external mutations (a bad import, a renamed entry) can't pollute
 * the field.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { STORE_CATALOG, STORE_CATALOG_BY_ID } from '@/constants/store-roster'

interface UseStoreRosterReturn {
  selectedIds: string[]
  loading: boolean
  saving: boolean
  error: string | null
  setSelected: (ids: string[]) => Promise<void>
  toggle: (id: string) => Promise<void>
}

/**
 * @param ownerId — whose roster to read/write. Defaults to the
 *  signed-in user (owner-self path). Caregivers passing an explicit
 *  ownerId can READ but writes will fail at the firestore.rules layer
 *  (owner-only update on /users/{userId}); the hook surfaces that as
 *  an `error` string rather than crashing.
 */
export function useStoreRoster(ownerId?: string): UseStoreRosterReturn {
  const targetUid = ownerId || auth.currentUser?.uid || null

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Maintain catalog order regardless of how the user ticked them in
  // the picker — keeps display stable across re-renders.
  const orderedFromCatalog = useCallback((ids: string[]): string[] => {
    const set = new Set(ids.filter((id) => STORE_CATALOG_BY_ID[id]))
    return STORE_CATALOG.map((s) => s.id).filter((id) => set.has(id))
  }, [])

  useEffect(() => {
    if (!targetUid) {
      setLoading(false)
      return
    }
    const ref = doc(db, 'users', targetUid)
    const unsub = onSnapshot(
      ref,
      (snap) => {
        const data = snap.data() || {}
        const raw = Array.isArray(data.householdStoreIds) ? data.householdStoreIds : []
        setSelectedIds(orderedFromCatalog(raw))
        setLoading(false)
      },
      (err) => {
        logger.warn('[useStoreRoster] snapshot error', { error: err.message })
        setError(err.message || 'Failed to load roster')
        setLoading(false)
      },
    )
    return unsub
  }, [targetUid, orderedFromCatalog])

  const setSelected = useCallback(async (ids: string[]) => {
    if (!targetUid) {
      setError('Not signed in')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const cleaned = orderedFromCatalog(ids)
      await updateDoc(doc(db, 'users', targetUid), {
        householdStoreIds: cleaned,
      })
      // Optimistic — listener will also confirm, but updating local
      // state avoids a tick of flicker on slow networks.
      setSelectedIds(cleaned)
    } catch (err: any) {
      logger.warn('[useStoreRoster] write failed', { error: err?.message })
      setError(err?.message || 'Failed to save roster')
    } finally {
      setSaving(false)
    }
  }, [targetUid, orderedFromCatalog])

  const toggle = useCallback(async (id: string) => {
    if (!STORE_CATALOG_BY_ID[id]) return
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id]
    await setSelected(next)
  }, [selectedIds, setSelected])

  return useMemo(
    () => ({ selectedIds, loading, saving, error, setSelected, toggle }),
    [selectedIds, loading, saving, error, setSelected, toggle],
  )
}
