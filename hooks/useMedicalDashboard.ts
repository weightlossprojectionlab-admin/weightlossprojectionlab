/**
 * Medical Dashboard Hook
 *
 * Unified hook for fetching all medical records data for dashboard overview
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { PatientProfile, Provider, Appointment } from '@/types/medical'

interface MedicalDashboardData {
  patients: PatientProfile[]
  providers: Provider[]
  upcomingAppointments: Appointment[]
  recentAppointments: Appointment[]
  totalPatients: number
  totalProviders: number
  totalAppointments: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMedicalDashboard(): MedicalDashboardData {
  const [patients, setPatients] = useState<PatientProfile[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch all data in parallel
      const [patientsData, providersData, appointmentsData] = await Promise.all([
        medicalOperations.patients.getPatients(),
        medicalOperations.providers.getProviders(),
        medicalOperations.appointments.getAppointments()
      ])

      setPatients(patientsData)
      setProviders(providersData)
      setAppointments(appointmentsData)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load dashboard data'
      setError(errorMsg)
      console.error('Error fetching dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter appointments
  const now = new Date()
  const upcomingAppointments = appointments
    .filter(apt => {
      const aptDate = new Date(apt.dateTime)
      return aptDate >= now && apt.status !== 'cancelled' && apt.status !== 'completed'
    })
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
    .slice(0, 5)

  const recentAppointments = appointments
    .filter(apt => apt.status === 'completed')
    .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
    .slice(0, 5)

  return {
    patients,
    providers,
    upcomingAppointments,
    recentAppointments,
    totalPatients: patients.length,
    totalProviders: providers.length,
    totalAppointments: appointments.length,
    loading,
    error,
    refetch: fetchData
  }
}
