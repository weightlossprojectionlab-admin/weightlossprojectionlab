/**
 * useVitals Hook
 *
 * React hook for managing vital signs for a specific patient
 * Provides operations to log, fetch, and manage vital sign readings
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import type { VitalSign, VitalType } from '@/types/medical'

interface UseVitalsOptions {
  patientId: string
  type?: VitalType
  limit?: number
  autoFetch?: boolean
}

interface UseVitalsReturn {
  vitals: VitalSign[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  logVital: (data: Omit<VitalSign, 'id' | 'patientId' | 'takenBy'>) => Promise<VitalSign>
  updateVital: (vitalId: string, updates: Partial<VitalSign>) => Promise<VitalSign>
  deleteVital: (vitalId: string) => Promise<void>
  getLatestVital: (type: VitalType) => VitalSign | null
}

export function useVitals({
  patientId,
  type,
  limit,
  autoFetch = true
}: UseVitalsOptions): UseVitalsReturn {
  const [vitals, setVitals] = useState<VitalSign[]>([])
  const [loading, setLoading] = useState<boolean>(autoFetch)
  const [error, setError] = useState<string | null>(null)

  // Fetch vitals
  const fetchVitals = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useVitals] Fetching vitals', { patientId, type, limit })

      const data = await medicalOperations.vitals.getVitals(patientId, { type, limit })
      setVitals(data)

      logger.info('[useVitals] Vitals fetched successfully', {
        patientId,
        count: data.length
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch vitals'
      logger.error('[useVitals] Error fetching vitals', err, { patientId })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [patientId, type, limit])

  // Initial fetch (if autoFetch is true)
  useEffect(() => {
    if (autoFetch) {
      fetchVitals()
    }
  }, [fetchVitals, autoFetch])

  // Log vital sign
  const logVital = useCallback(async (
    data: Omit<VitalSign, 'id' | 'patientId' | 'takenBy'>
  ): Promise<VitalSign> => {
    try {
      logger.info('[useVitals] Logging vital sign', { patientId, type: data.type })

      const newVital = await medicalOperations.vitals.logVital(patientId, data)

      // Add to local state (prepend to maintain chronological order)
      setVitals(prev => [newVital, ...prev])

      logger.info('[useVitals] Vital sign logged successfully', {
        patientId,
        vitalId: newVital.id
      })
      return newVital
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to log vital sign'
      logger.error('[useVitals] Error logging vital sign', err, { patientId })
      throw new Error(errorMessage)
    }
  }, [patientId])

  // Update vital sign
  const updateVital = useCallback(async (
    vitalId: string,
    updates: Partial<VitalSign>
  ): Promise<VitalSign> => {
    try {
      logger.info('[useVitals] Updating vital sign', { patientId, vitalId, updates })

      const updatedVital = await medicalOperations.vitals.updateVital(
        patientId,
        vitalId,
        updates
      )

      // Update local state
      setVitals(prev =>
        prev.map(v => (v.id === vitalId ? updatedVital : v))
      )

      logger.info('[useVitals] Vital sign updated successfully', {
        patientId,
        vitalId
      })
      return updatedVital
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update vital sign'
      logger.error('[useVitals] Error updating vital sign', err, { patientId, vitalId })
      throw new Error(errorMessage)
    }
  }, [patientId])

  // Delete vital sign
  const deleteVital = useCallback(async (vitalId: string): Promise<void> => {
    try {
      logger.info('[useVitals] Deleting vital sign', { patientId, vitalId })

      await medicalOperations.vitals.deleteVital(patientId, vitalId)

      // Remove from local state
      setVitals(prev => prev.filter(v => v.id !== vitalId))

      logger.info('[useVitals] Vital sign deleted successfully', {
        patientId,
        vitalId
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete vital sign'
      logger.error('[useVitals] Error deleting vital sign', err, { patientId, vitalId })
      throw new Error(errorMessage)
    }
  }, [patientId])

  // Get latest vital of a specific type
  const getLatestVital = useCallback((type: VitalType): VitalSign | null => {
    const filtered = vitals.filter(v => v.type === type)
    return filtered.length > 0 ? filtered[0] : null
  }, [vitals])

  return {
    vitals,
    loading,
    error,
    refetch: fetchVitals,
    logVital,
    updateVital,
    deleteVital,
    getLatestVital
  }
}
