'use client'

/**
 * useHouseholdDuties Hook
 *
 * Manages household duty data: fetching, creating, updating,
 * assigning, completing, and deleting duties.
 *
 * Usage:
 * ```tsx
 * const { duties, stats, loading, createDuty, completeDuty } =
 *   useHouseholdDuties({ householdId, forPatientId, statusFilter })
 * ```
 */

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import type {
  HouseholdDuty,
  DutyStats,
  DutyStatus,
  CreateDutyRequest,
  UpdateDutyRequest,
  CompleteDutyRequest,
  DutyListResponse
} from '@/types/household-duties'

// ==================== TYPES ====================

export interface UseHouseholdDutiesOptions {
  householdId: string
  forPatientId?: string
  statusFilter?: DutyStatus | 'all'
  autoFetch?: boolean
}

export interface UseHouseholdDutiesReturn {
  duties: HouseholdDuty[]
  stats: DutyStats | null
  total: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createDuty: (payload: Omit<CreateDutyRequest, 'householdId'>) => Promise<HouseholdDuty>
  updateDuty: (dutyId: string, payload: UpdateDutyRequest) => Promise<HouseholdDuty>
  deleteDuty: (dutyId: string) => Promise<void>
  completeDuty: (dutyId: string, payload?: CompleteDutyRequest) => Promise<void>
}

// ==================== HOOK ====================

export function useHouseholdDuties({
  householdId,
  forPatientId,
  statusFilter = 'all',
  autoFetch = true
}: UseHouseholdDutiesOptions): UseHouseholdDutiesReturn {
  const [duties, setDuties] = useState<HouseholdDuty[]>([])
  const [stats, setStats] = useState<DutyStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const getToken = useCallback(async (): Promise<string> => {
    const user = auth.currentUser
    if (!user) throw new Error('Not authenticated')
    return user.getIdToken()
  }, [])

  const refetch = useCallback(async () => {
    if (!householdId) return

    try {
      setLoading(true)
      setError(null)

      const token = await getToken()

      let url = `/api/household-duties?householdId=${householdId}`
      if (forPatientId) url += `&forPatientId=${forPatientId}`
      if (statusFilter && statusFilter !== 'all') url += `&status=${statusFilter}`

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch duties')
      }

      const data: DutyListResponse = await response.json()
      setDuties(data.duties || [])
      setStats(data.stats || null)
      setTotal(data.total || 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load duties'
      logger.error('[useHouseholdDuties] Fetch error', err as Error, { householdId })
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [householdId, forPatientId, statusFilter, getToken])

  useEffect(() => {
    if (autoFetch && householdId) {
      refetch()
    }
  }, [autoFetch, householdId, forPatientId, statusFilter, refetch])

  const createDuty = useCallback(
    async (payload: Omit<CreateDutyRequest, 'householdId'>): Promise<HouseholdDuty> => {
      const token = await getToken()

      const response = await fetch('/api/household-duties', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ...payload, householdId })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create duty')
      }

      const newDuty: HouseholdDuty = await response.json()

      // Optimistic update
      setDuties(prev => [newDuty, ...prev])
      setTotal(prev => prev + 1)

      return newDuty
    },
    [householdId, getToken]
  )

  const updateDuty = useCallback(
    async (dutyId: string, payload: UpdateDutyRequest): Promise<HouseholdDuty> => {
      const token = await getToken()

      const response = await fetch(`/api/household-duties/${dutyId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update duty')
      }

      const updatedDuty: HouseholdDuty = await response.json()

      // Update in local state
      setDuties(prev =>
        prev.map(d => (d.id === dutyId ? updatedDuty : d))
      )

      return updatedDuty
    },
    [getToken]
  )

  const deleteDuty = useCallback(
    async (dutyId: string): Promise<void> => {
      const token = await getToken()

      const response = await fetch(`/api/household-duties/${dutyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to delete duty')
      }

      // Remove from local state
      setDuties(prev => prev.filter(d => d.id !== dutyId))
      setTotal(prev => Math.max(0, prev - 1))
    },
    [getToken]
  )

  const completeDuty = useCallback(
    async (dutyId: string, payload: CompleteDutyRequest = {}): Promise<void> => {
      const token = await getToken()

      const response = await fetch(`/api/household-duties/${dutyId}/complete`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to complete duty')
      }

      const { duty: updatedDuty } = await response.json()

      // Update local state with the returned duty (may have reset to pending with new due date)
      setDuties(prev =>
        prev.map(d => (d.id === dutyId ? updatedDuty : d))
      )
    },
    [getToken]
  )

  return {
    duties,
    stats,
    total,
    loading,
    error,
    refetch,
    createDuty,
    updateDuty,
    deleteDuty,
    completeDuty
  }
}
