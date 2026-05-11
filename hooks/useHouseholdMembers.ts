/**
 * useHouseholdMembers Hook
 *
 * Returns the patients whose `householdId` points to the given
 * household. `Patient.householdId` is the single source of truth —
 * household docs do NOT store a membership array.
 *
 * Loads all patients via /api/patients (which respects RBAC + caregiver
 * permissions) and filters client-side. The filtering is cheap; the
 * API endpoint is the one source of truth for "patients this user can
 * see," so we delegate to it rather than duplicating that logic here.
 */

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import type { PatientProfile } from '@/types/medical'

export function useHouseholdMembers(householdId: string) {
  const [members, setMembers] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) {
      setMembers([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    apiClient.get<PatientProfile[]>('/patients')
      .then(allPatients => {
        if (cancelled) return
        const householdMembers = (allPatients || []).filter(
          patient => patient.householdId === householdId,
        )
        setMembers(householdMembers)
        setError(null)
      })
      .catch(err => {
        if (cancelled) return
        logger.error('[useHouseholdMembers] Failed to fetch patients', err as Error, {
          householdId,
        })
        setError('Failed to load members')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [householdId])

  return { members, loading, error }
}
