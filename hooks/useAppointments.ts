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
import { useAuth } from '@/hooks/useAuth'

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
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch appointments on mount and when filters change
  useEffect(() => {
    if (!autoFetch || !user) {
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await medicalOperations.appointments.getAppointments({
          patientId,
          providerId
        })
        setAppointments(data)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch appointments')
        console.error('Error fetching appointments:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [autoFetch, user, patientId, providerId])

  const fetchAppointments = useCallback(async () => {
    // Keep for manual refetch if needed
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

  const createAppointment = useCallback(
    async (data: Omit<Appointment, 'id' | 'createdAt' | 'createdBy' | 'lastModified' | 'modifiedBy' | 'conflictSeverity'>): Promise<Appointment> => {
      try {
        const newAppointment = await medicalOperations.appointments.createAppointment(data)

        // Optimistic update for immediate UI feedback
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
        const updatedAppointment = await medicalOperations.appointments.updateAppointment(
          appointmentId,
          updates
        )

        // Optimistic update for immediate UI feedback
        setAppointments(prev =>
          prev.map(apt => apt.id === appointmentId ? updatedAppointment : apt)
        )
        toast.success('Appointment updated')
        return updatedAppointment
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to update appointment'
        toast.error(errorMsg)
        throw err
      }
    },
    []
  )

  const deleteAppointment = useCallback(
    async (appointmentId: string): Promise<void> => {
      try {
        await medicalOperations.appointments.deleteAppointment(appointmentId)

        // Optimistic update for immediate UI feedback
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId))
        toast.success('Appointment deleted')
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to delete appointment'
        toast.error(errorMsg)
        throw err
      }
    },
    []
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
