'use client'

/**
 * useUserNames
 *
 * Client-side hook that resolves a list of auth uids → display names
 * via /api/users/names. Includes a module-level cache so multiple
 * components asking for the same uid only pay one round-trip per
 * session, and a "currentUser → 'You'" override.
 *
 * Pass an array of uids; the hook returns:
 *   - `names: Record<uid, string>`   — known names so far (resolved
 *                                       progressively as the request
 *                                       completes)
 *   - `getName(uid)`                 — convenience getter that returns
 *                                       'You' for the current user, the
 *                                       resolved name if known, or a
 *                                       fallback ('Member') while
 *                                       loading or for unresolved uids
 *
 * Re-rendering when names arrive: the hook bumps a counter on cache
 * fills so consumers re-render. Don't depend on the cache directly.
 */

import { useEffect, useMemo, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

const cache = new Map<string, string>()
const inFlight = new Set<string>()

const FALLBACK = 'Member'

async function fetchNames(uids: string[]): Promise<Record<string, string> | null> {
  const user = auth.currentUser
  if (!user) return null // Not signed in yet — let the caller retry.
  const idToken = await user.getIdToken()
  const res = await fetch('/api/users/names', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uids }),
  })
  if (!res.ok) return null
  const body = await res.json().catch(() => ({}))
  return (body?.names as Record<string, string>) ?? {}
}

export function useUserNames(uids: (string | undefined | null)[]) {
  // Stable string of distinct uids so the effect re-runs only when the
  // actual set changes, not on every render.
  const distinct = useMemo(() => {
    const set = new Set<string>()
    for (const u of uids) if (typeof u === 'string' && u) set.add(u)
    return Array.from(set).sort()
  }, [uids])
  const key = distinct.join(',')

  const [tick, setTick] = useState(0)

  useEffect(() => {
    const missing = distinct.filter(u => !cache.has(u) && !inFlight.has(u))
    if (missing.length === 0) return

    missing.forEach(u => inFlight.add(u))

    let cancelled = false
    fetchNames(missing)
      .then(map => {
        if (cancelled) return
        // map === null means we couldn't resolve (no auth, network error,
        // server error). Don't poison the cache with FALLBACK in that
        // case — release the inFlight lock so a later effect run can
        // retry.
        if (map === null) {
          for (const uid of missing) inFlight.delete(uid)
          return
        }
        for (const uid of missing) {
          cache.set(uid, map[uid] || FALLBACK)
          inFlight.delete(uid)
        }
        setTick(t => t + 1)
      })
      .catch(err => {
        logger.warn('[useUserNames] resolution failed', { error: (err as Error)?.message })
        for (const uid of missing) inFlight.delete(uid)
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // Build the current snapshot (tick is in deps so consumers re-render
  // on cache fills).
  const names = useMemo(() => {
    const out: Record<string, string> = {}
    for (const u of distinct) {
      const cached = cache.get(u)
      if (cached) out[u] = cached
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick])

  function getName(uid?: string | null, opts: { selfLabel?: string } = {}): string {
    if (!uid) return ''
    if (auth.currentUser?.uid === uid) return opts.selfLabel ?? 'You'
    return names[uid] || cache.get(uid) || FALLBACK
  }

  return { names, getName }
}
