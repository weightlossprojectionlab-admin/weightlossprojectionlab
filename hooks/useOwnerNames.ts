'use client'

/**
 * useOwnerNames — fetch live display names for a list of account-owner UIDs.
 *
 * Semantic intent: an owner's name belongs to the owner. The source of truth
 * is THEIR user doc (users/{uid}.name). Storing a denormalized copy elsewhere
 * — like caregiverOf[i].accountOwnerName — breaks DRY: two places to keep in
 * sync, and the copy ages out the moment the owner renames themselves.
 *
 * Use this hook anywhere a caregiver needs to display the name of an account
 * owner they care for (AccountSwitcher, shift-view worklist, handoff log,
 * etc.). One predicate, one truth, one place to fix bugs.
 *
 * Returns:
 *   - names: { [ownerId]: string } — display name per owner. Missing owners
 *     (doc unreadable, no name field) fall back to "Family" so the UI always
 *     has something printable.
 *   - loading: true while the initial batch is in flight.
 *
 * One-shot getDoc, not onSnapshot. Owner names change rarely; pay the read
 * cost once and move on. Swap to onSnapshot here if a later feature needs
 * live updates — consumers won't have to change.
 */
import { useEffect, useState } from 'react'
import { userProfileOperations } from '@/lib/firebase-operations'

export function useOwnerNames(ownerIds: string[]) {
  const [names, setNames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  // Stable key for the effect — array identity changes every render, but
  // the joined string only changes when the ID set actually changes.
  const key = ownerIds.join('|')

  useEffect(() => {
    if (ownerIds.length === 0) {
      setNames({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    Promise.all(
      ownerIds.map(async (id) => {
        try {
          // Server endpoint composes the display name from name / displayName /
          // firstName+lastName / email and enforces caregiver-access auth.
          const response = await userProfileOperations.getOwnerDisplayName(id)
          const name = (response as any)?.displayName || 'Family'
          return [id, name] as const
        } catch (err) {
          // Fail soft — UI still has something to render.
          return [id, 'Family'] as const
        }
      }),
    ).then((entries) => {
      if (cancelled) return
      setNames(Object.fromEntries(entries))
      setLoading(false)
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return { names, loading }
}
