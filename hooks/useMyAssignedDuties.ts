'use client'

/**
 * useMyAssignedDuties — list of active household duties assigned to the
 * current caller across every household they belong to.
 *
 * Backs the duty source generator inside useCaregiverWorklist. The
 * endpoint enforces "only your own assignments"; nothing else to gate
 * on the client.
 *
 * One-shot fetch on mount + a manual refetch. Real-time updates
 * (e.g. owner reassigns a duty) can be wired through the notification
 * stream later if needed — the duty_assigned notification type already
 * exists.
 */

import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type { HouseholdDuty } from '@/types/household-duties'

interface UseMyAssignedDutiesReturn {
  duties: HouseholdDuty[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMyAssignedDuties(): UseMyAssignedDutiesReturn {
  const [duties, setDuties] = useState<HouseholdDuty[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    const user = auth.currentUser
    if (!user) {
      setDuties([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/me/duties', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new Error(`Failed to load duties: ${res.status}`)
      }
      const data = (await res.json()) as { items?: HouseholdDuty[] }
      setDuties(data?.items || [])
    } catch (err: any) {
      logger.error('[useMyAssignedDuties] fetch failed', err instanceof Error ? err : new Error(String(err)))
      setError(err?.message || 'Failed to load duties')
      setDuties([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { duties, loading, error, refetch }
}
