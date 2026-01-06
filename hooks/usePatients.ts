/**
 * usePatients Hook
 *
 * React hook for managing patient profiles
 * Provides CRUD operations and state management for patients
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import type { PatientProfile } from '@/types/medical'

interface UsePatientsReturn {
  patients: PatientProfile[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createPatient: (data: Omit<PatientProfile, 'id' | 'userId' | 'createdAt' | 'lastModified'>) => Promise<PatientProfile>
  updatePatient: (patientId: string, updates: Partial<PatientProfile>) => Promise<PatientProfile>
  deletePatient: (patientId: string) => Promise<void>
}

export function usePatients(): UsePatientsReturn {
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch patients
  const fetchPatients = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[usePatients] Fetching patients')

      const data = await medicalOperations.patients.getPatients()
      setPatients(data)

      logger.info('[usePatients] Patients fetched successfully', { count: data.length })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch patients'
      logger.error('[usePatients] Error fetching patients', err instanceof Error ? err : new Error(String(err)))
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  // Create patient
  const createPatient = useCallback(async (
    data: Omit<PatientProfile, 'id' | 'userId' | 'createdAt' | 'lastModified'>
  ): Promise<PatientProfile> => {
    try {
      logger.info('[usePatients] Creating patient', { type: data.type, name: data.name })

      const newPatient = await medicalOperations.patients.createPatient(data as any) // API adds userId server-side

      // Add to local state
      setPatients(prev => [newPatient, ...prev])

      logger.info('[usePatients] Patient created successfully', { patientId: newPatient.id })
      return newPatient
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to create patient'
      logger.error('[usePatients] Error creating patient', err instanceof Error ? err : new Error(String(err)))
      throw new Error(errorMessage)
    }
  }, [])

  // Update patient
  const updatePatient = useCallback(async (
    patientId: string,
    updates: Partial<PatientProfile>
  ): Promise<PatientProfile> => {
    try {
      logger.info('[usePatients] Updating patient', { patientId, updates })

      const updatedPatient = await medicalOperations.patients.updatePatient(patientId, updates)

      // Update local state
      setPatients(prev =>
        prev.map(p => (p.id === patientId ? updatedPatient : p))
      )

      logger.info('[usePatients] Patient updated successfully', { patientId })
      return updatedPatient
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to update patient'
      logger.error('[usePatients] Error updating patient', err instanceof Error ? err : new Error(String(err)), { patientId })
      throw new Error(errorMessage)
    }
  }, [])

  // Delete patient
  const deletePatient = useCallback(async (patientId: string): Promise<void> => {
    try {
      logger.info('[usePatients] Deleting patient', { patientId })

      await medicalOperations.patients.deletePatient(patientId)

      // Remove from local state
      setPatients(prev => prev.filter(p => p.id !== patientId))

      logger.info('[usePatients] Patient deleted successfully', { patientId })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to delete patient'
      logger.error('[usePatients] Error deleting patient', err instanceof Error ? err : new Error(String(err)), { patientId })
      throw new Error(errorMessage)
    }
  }, [])

  return {
    patients,
    loading,
    error,
    refetch: fetchPatients,
    createPatient,
    updatePatient,
    deletePatient
  }
}
