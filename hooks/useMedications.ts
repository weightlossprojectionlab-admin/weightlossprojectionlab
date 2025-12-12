/**
 * useMedications Hook
 *
 * React hook for managing medications for a specific patient
 * Provides operations to log, fetch, and manage medication administration
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import type { PatientMedication } from '@/types/medical'

interface MedicationLog {
  id: string
  patientId: string
  medicationId: string
  medicationName: string
  dose: string
  scheduledTime: string // ISO 8601
  actualTime?: string // ISO 8601
  status: 'taken' | 'refused' | 'missed' | 'late'
  givenBy: string // userId
  notes?: string
  createdAt: string
}

interface UseMedicationsOptions {
  patientId?: string // Optional - will use current user's ID if not provided
  autoFetch?: boolean
}

interface UseMedicationsReturn {
  medications: PatientMedication[]
  logs: MedicationLog[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  logMedication: (data: Omit<MedicationLog, 'id' | 'patientId' | 'createdAt'>) => Promise<MedicationLog>
  checkScheduleCompliance: (medicationId: string, scheduledTime: string) => Promise<{
    isOnTime: boolean
    minutesOff: number
    status: 'on-time' | 'early' | 'late' | 'overdue'
  }>
  getTodaySchedule: () => Promise<Array<{
    medicationId: string
    medicationName: string
    scheduledTime: string
    status: 'pending' | 'taken' | 'overdue'
  }>>
}

export function useMedications({
  patientId,
  autoFetch = true
}: UseMedicationsOptions): UseMedicationsReturn {
  const [medications, setMedications] = useState<PatientMedication[]>([])
  const [logs, setLogs] = useState<MedicationLog[]>([])
  const [loading, setLoading] = useState<boolean>(autoFetch)
  const [error, setError] = useState<string | null>(null)

  // DRY: Get patient ID - use provided patientId, or default to empty string if not available
  // The caller should ensure a valid patientId is passed
  const effectivePatientId = patientId || ''

  // Fetch medications (one-time, used for manual refetch)
  const fetchMedications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useMedications] Fetching medications', { patientId })

      const data = await medicalOperations.medications.getMedications(patientId)
      setMedications(data)

      // TODO: Fetch medication logs when endpoint is ready
      // const logsData = await medicalOperations.medications.getLogs(patientId)
      // setLogs(logsData)

      logger.info('[useMedications] Medications fetched successfully', {
        patientId,
        count: data.length
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch medications'
      logger.error('[useMedications] Error fetching medications', err, { patientId })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  // Set up real-time listener (if autoFetch is true AND patientId exists)
  useEffect(() => {
    if (!autoFetch || !effectivePatientId) return

    setLoading(true)
    setError(null)
    logger.debug('[useMedications] Setting up real-time medication listener', { patientId: effectivePatientId })

    const unsubscribe = medicalOperations.medications.listenToMedications(
      effectivePatientId,
      (data) => {
        setMedications(data)
        setLoading(false)
        logger.info('[useMedications] Medications updated via real-time listener', {
          patientId: effectivePatientId,
          count: data.length
        })
      },
      (err) => {
        const errorMessage = err.message || 'Failed to fetch medications'
        logger.error('[useMedications] Real-time listener error', err, { patientId: effectivePatientId })
        setError(errorMessage)
        setLoading(false)
      }
    )

    // Cleanup listener on unmount
    return () => {
      logger.debug('[useMedications] Cleaning up real-time medication listener', { patientId: effectivePatientId })
      unsubscribe()
    }
  }, [effectivePatientId, autoFetch])

  // Log medication administration
  const logMedication = useCallback(async (
    data: Omit<MedicationLog, 'id' | 'patientId' | 'createdAt'>
  ): Promise<MedicationLog> => {
    try {
      logger.info('[useMedications] Logging medication', { patientId, medicationId: data.medicationId })

      // TODO: Replace with actual API call when endpoint is ready
      const newLog: MedicationLog = {
        id: `log_${Date.now()}`,
        patientId,
        createdAt: new Date().toISOString(),
        ...data,
        actualTime: data.actualTime || new Date().toISOString()
      }

      // Add to local state (prepend to maintain chronological order)
      setLogs(prev => [newLog, ...prev])

      logger.info('[useMedications] Medication logged successfully', {
        patientId,
        logId: newLog.id
      })
      return newLog
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to log medication'
      logger.error('[useMedications] Error logging medication', err, { patientId })
      throw new Error(errorMessage)
    }
  }, [patientId])

  // Check medication schedule compliance
  const checkScheduleCompliance = useCallback(async (
    medicationId: string,
    scheduledTime: string
  ): Promise<{
    isOnTime: boolean
    minutesOff: number
    status: 'on-time' | 'early' | 'late' | 'overdue'
  }> => {
    const scheduled = new Date(scheduledTime)
    const now = new Date()
    const minutesOff = Math.abs((now.getTime() - scheduled.getTime()) / (1000 * 60))

    let status: 'on-time' | 'early' | 'late' | 'overdue' = 'on-time'
    let isOnTime = true

    if (now < scheduled) {
      // Early
      if (minutesOff > 60) {
        status = 'early'
        isOnTime = false
      }
    } else {
      // Late or overdue
      if (minutesOff > 120) {
        status = 'overdue'
        isOnTime = false
      } else if (minutesOff > 60) {
        status = 'late'
        isOnTime = false
      }
    }

    logger.debug('[useMedications] Schedule compliance check', {
      medicationId,
      scheduledTime,
      minutesOff,
      status,
      isOnTime
    })

    return {
      isOnTime,
      minutesOff: Math.round(minutesOff),
      status
    }
  }, [])

  // Get today's medication schedule
  const getTodaySchedule = useCallback(async (): Promise<Array<{
    medicationId: string
    medicationName: string
    scheduledTime: string
    status: 'pending' | 'taken' | 'overdue'
  }>> => {
    try {
      // TODO: Implement when medication scheduling is added
      // For now, return empty array
      logger.debug('[useMedications] Getting today\'s schedule', { patientId })
      return []
    } catch (err: any) {
      logger.error('[useMedications] Error getting today\'s schedule', err, { patientId })
      return []
    }
  }, [patientId])

  return {
    medications,
    logs,
    loading,
    error,
    refetch: fetchMedications,
    logMedication,
    checkScheduleCompliance,
    getTodaySchedule
  }
}
