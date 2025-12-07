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

interface DuplicateCheckResult {
  isDuplicate: boolean
  existing: VitalSign | null
  takenBy: string | null
  recordedAt: string | null
  hoursAgo: number
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
  checkDuplicateToday: (type: VitalType) => Promise<DuplicateCheckResult>
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
    // Don't fetch if no patientId
    if (!patientId) {
      setLoading(false)
      return
    }

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

  // Check for duplicate vital reading today
  const checkDuplicateToday = useCallback(async (
    type: VitalType
  ): Promise<DuplicateCheckResult> => {
    try {
      logger.debug('[useVitals] Checking for duplicate', { patientId, type })

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      // Filter vitals recorded today for this type
      const todayVitals = vitals.filter(vital => {
        const vitalDate = new Date(vital.recordedAt)
        return vital.type === type && vitalDate >= today
      })

      if (todayVitals.length > 0) {
        const existing = todayVitals[0] // Most recent
        const recordedAt = new Date(existing.recordedAt)
        const now = new Date()
        const hoursAgo = (now.getTime() - recordedAt.getTime()) / (1000 * 60 * 60)

        // Warn if logged within 30 minutes (matches AI supervisor logic)
        const isDuplicate = hoursAgo < 0.5

        logger.info('[useVitals] Duplicate check result', {
          patientId,
          type,
          isDuplicate,
          hoursAgo: hoursAgo.toFixed(1)
        })

        return {
          isDuplicate,
          existing,
          takenBy: existing.takenBy,
          recordedAt: existing.recordedAt,
          hoursAgo: Math.round(hoursAgo * 10) / 10 // Round to 1 decimal
        }
      }

      return {
        isDuplicate: false,
        existing: null,
        takenBy: null,
        recordedAt: null,
        hoursAgo: 0
      }
    } catch (err: any) {
      logger.error('[useVitals] Error checking duplicate', err, { patientId, type })
      // Return safe default on error
      return {
        isDuplicate: false,
        existing: null,
        takenBy: null,
        recordedAt: null,
        hoursAgo: 0
      }
    }
  }, [vitals, patientId])

  return {
    vitals,
    loading,
    error,
    refetch: fetchVitals,
    logVital,
    updateVital,
    deleteVital,
    getLatestVital,
    checkDuplicateToday
  }
}
