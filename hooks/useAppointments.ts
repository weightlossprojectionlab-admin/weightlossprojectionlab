/**
 * Appointments Hook
 *
 * React hook for managing medical appointments
 * Provides CRUD operations with optimistic UI updates
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { Appointment } from '@/types/medical'
import toast from 'react-hot-toast'

interface UseAppointmentsOptions {
  patientId?: string
  providerId?: string
  autoFetch?: boolean
}

interface UseAppointmentsReturn {
  appointments: Appointment[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  createAppointment: (data: Omit<Appointment, 'id' | 'createdAt' | 'createdBy' | 'lastModified' | 'modifiedBy' | 'conflictSeverity'>) => Promise<Appointment>
  updateAppointment: (appointmentId: string, updates: Partial<Appointment>) => Promise<Appointment>
  deleteAppointment: (appointmentId: string) => Promise<void>
}

export function useAppointments({
  patientId,
  providerId,
  autoFetch = true
}: UseAppointmentsOptions = {}): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const data = await medicalOperations.appointments.getAppointments({
        patientId,
        providerId
      })

      setAppointments(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch appointments'
      setError(errorMsg)
      console.error('Error fetching appointments:', err)
    } finally {
      setLoading(false)
    }
  }, [patientId, providerId])

  useEffect(() => {
    if (autoFetch) {
      fetchAppointments()
    }
  }, [autoFetch, fetchAppointments])

  const createAppointment = useCallback(
    async (data: Omit<Appointment, 'id' | 'createdAt' | 'createdBy' | 'lastModified' | 'modifiedBy' | 'conflictSeverity'>): Promise<Appointment> => {
      try {
        const newAppointment = await medicalOperations.appointments.createAppointment(data)

        // Add to list
        setAppointments(prev => [newAppointment, ...prev])

        toast.success('Appointment scheduled successfully')
        return newAppointment
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to create appointment'
        toast.error(errorMsg)
        throw err
      }
    },
    []
  )

  const updateAppointment = useCallback(
    async (appointmentId: string, updates: Partial<Appointment>): Promise<Appointment> => {
      try {
        // Optimistic update
        setAppointments(prev =>
          prev.map(appointment =>
            appointment.id === appointmentId ? { ...appointment, ...updates } : appointment
          )
        )

        const updatedAppointment = await medicalOperations.appointments.updateAppointment(
          appointmentId,
          updates
        )

        // Update with server response
        setAppointments(prev =>
          prev.map(appointment =>
            appointment.id === appointmentId ? updatedAppointment : appointment
          )
        )

        toast.success('Appointment updated')
        return updatedAppointment
      } catch (err: any) {
        // Revert optimistic update
        await fetchAppointments()
        const errorMsg = err.message || 'Failed to update appointment'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchAppointments]
  )

  const deleteAppointment = useCallback(
    async (appointmentId: string): Promise<void> => {
      try {
        // Optimistic update
        setAppointments(prev => prev.filter(appointment => appointment.id !== appointmentId))

        await medicalOperations.appointments.deleteAppointment(appointmentId)

        toast.success('Appointment deleted')
      } catch (err: any) {
        // Revert optimistic update
        await fetchAppointments()
        const errorMsg = err.message || 'Failed to delete appointment'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchAppointments]
  )

  return {
    appointments,
    loading,
    error,
    refetch: fetchAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment
  }
}
