/**
 * useHouseholdMembers Hook
 *
 * Real-time hook to fetch and monitor household members
 * Uses onSnapshot for live updates when members are added/removed
 */

import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { apiClient } from '@/lib/api-client'
import type { PatientProfile } from '@/types/medical'
import type { Household } from '@/types/household'

export function useHouseholdMembers(householdId: string) {
  const [members, setMembers] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!householdId) {
      setLoading(false)
      return
    }

    // Set up real-time listener for household document
    const householdRef = doc(db, 'households', householdId)

    const unsubscribe = onSnapshot(
      householdRef,
      async (snapshot) => {
        if (!snapshot.exists()) {
          logger.warn('[useHouseholdMembers] Household not found', { householdId })
          setError('Household not found')
          setMembers([])
          setLoading(false)
          return
        }

        const householdData = snapshot.data() as Household
        const memberIds = householdData.memberIds || []

        logger.info('[useHouseholdMembers] Household data received', {
          householdId,
          memberIds,
          memberCount: memberIds.length,
          householdData
        })

        if (memberIds.length === 0) {
          logger.info('[useHouseholdMembers] No members in household', { householdId })
          setMembers([])
          setLoading(false)
          return
        }

        try {
          // Fetch member details using API (which handles auth and permissions)
          const allPatients = await apiClient.get<PatientProfile[]>('/patients')

          logger.info('[useHouseholdMembers] All patients fetched', {
            householdId,
            totalPatients: allPatients.length,
            patientIds: allPatients.map(p => p.id)
          })

          // Filter to only members in this household
          const householdMembers = allPatients.filter(patient =>
            memberIds.includes(patient.id)
          )

          logger.info('[useHouseholdMembers] Filtered household members', {
            householdId,
            memberIds,
            foundMembers: householdMembers.length,
            members: householdMembers.map(m => ({ id: m.id, name: m.name }))
          })

          setMembers(householdMembers)
          setError(null)
        } catch (err) {
          logger.error('[useHouseholdMembers] Failed to fetch members', err as Error, {
            householdId,
            memberCount: memberIds.length
          })
          setError('Failed to load members')
        } finally {
          setLoading(false)
        }
      },
      (err) => {
        logger.error('[useHouseholdMembers] Snapshot error', err as Error, { householdId })
        setError('Failed to monitor household changes')
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [householdId])

  return { members, loading, error }
}
