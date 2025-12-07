/**
 * useVitalSchedules Hook
 *
 * React hook for managing vital monitoring schedules.
 * Provides CRUD operations and real-time updates.
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import {
  VitalMonitoringSchedule,
  CreateScheduleParams,
  UpdateScheduleParams,
  ScheduledVitalInstance,
  ComplianceReport,
  ComplianceTrendDataPoint
} from '@/types/vital-schedules'
import { VitalType } from '@/types/medical'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

interface UseVitalSchedulesParams {
  patientId?: string
  autoFetch?: boolean
}

interface UseVitalSchedulesReturn {
  schedules: VitalMonitoringSchedule[]
  loading: boolean
  error: string | null
  createSchedule: (params: CreateScheduleParams) => Promise<VitalMonitoringSchedule>
  updateSchedule: (scheduleId: string, updates: UpdateScheduleParams) => Promise<void>
  deleteSchedule: (scheduleId: string) => Promise<void>
  refetch: () => Promise<void>
  getScheduleInstances: (
    scheduleId: string,
    filters?: {
      status?: string
      dateStart?: string
      dateEnd?: string
      limit?: number
    }
  ) => Promise<ScheduledVitalInstance[]>
  getCompliance: (
    patientId: string,
    vitalType: VitalType,
    periodType: 'daily' | 'weekly' | 'monthly'
  ) => Promise<ComplianceReport | null>
  getComplianceTrends: (
    patientId: string,
    vitalType: VitalType,
    days: number
  ) => Promise<ComplianceTrendDataPoint[]>
}

/**
 * Hook for managing vital monitoring schedules
 */
export function useVitalSchedules(
  params: UseVitalSchedulesParams = {}
): UseVitalSchedulesReturn {
  const { patientId, autoFetch = true } = params
  const { user } = useAuth()

  const [schedules, setSchedules] = useState<VitalMonitoringSchedule[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Get auth token for API requests
   */
  const getAuthToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null
    try {
      return await user.getIdToken()
    } catch (error) {
      logger.error('[useVitalSchedules] Failed to get auth token', error)
      return null
    }
  }, [user])

  /**
   * Fetch schedules for patient
   */
  const fetchSchedules = useCallback(async () => {
    if (!patientId || !user) return

    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `/api/vital-schedules?patientId=${patientId}&activeOnly=false`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      )

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to fetch schedules')
      }

      const data = await response.json()
      setSchedules(data.schedules || [])

      logger.info('[useVitalSchedules] Schedules fetched', {
        patientId,
        count: data.schedules?.length || 0
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      logger.error('[useVitalSchedules] Failed to fetch schedules', err)
      toast.error(`Failed to load schedules: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }, [patientId, user, getAuthToken])

  /**
   * Create new schedule
   */
  const createSchedule = useCallback(
    async (params: CreateScheduleParams): Promise<VitalMonitoringSchedule> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch('/api/vital-schedules', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(params)
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to create schedule')
        }

        const data = await response.json()
        const newSchedule = data.schedule

        // Update local state
        setSchedules(prev => [newSchedule, ...prev])

        logger.info('[useVitalSchedules] Schedule created', {
          scheduleId: newSchedule.id,
          patientId: params.patientId,
          vitalType: params.vitalType
        })

        toast.success('Monitoring schedule created successfully!')

        return newSchedule
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to create schedule', err)
        toast.error(`Failed to create schedule: ${errorMessage}`)
        throw err
      }
    },
    [getAuthToken]
  )

  /**
   * Update existing schedule
   */
  const updateSchedule = useCallback(
    async (scheduleId: string, updates: UpdateScheduleParams): Promise<void> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(`/api/vital-schedules/${scheduleId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updates)
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to update schedule')
        }

        const data = await response.json()
        const updatedSchedule = data.schedule

        // Update local state
        setSchedules(prev =>
          prev.map(s => (s.id === scheduleId ? updatedSchedule : s))
        )

        logger.info('[useVitalSchedules] Schedule updated', {
          scheduleId,
          updates: Object.keys(updates)
        })

        toast.success('Schedule updated successfully!')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to update schedule', err)
        toast.error(`Failed to update schedule: ${errorMessage}`)
        throw err
      }
    },
    [getAuthToken]
  )

  /**
   * Delete schedule
   */
  const deleteSchedule = useCallback(
    async (scheduleId: string): Promise<void> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(`/api/vital-schedules/${scheduleId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to delete schedule')
        }

        // Update local state
        setSchedules(prev => prev.filter(s => s.id !== scheduleId))

        logger.info('[useVitalSchedules] Schedule deleted', { scheduleId })

        toast.success('Schedule deleted successfully!')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to delete schedule', err)
        toast.error(`Failed to delete schedule: ${errorMessage}`)
        throw err
      }
    },
    [getAuthToken]
  )

  /**
   * Get schedule instances with filters
   */
  const getScheduleInstances = useCallback(
    async (
      scheduleId: string,
      filters?: {
        status?: string
        dateStart?: string
        dateEnd?: string
        limit?: number
      }
    ): Promise<ScheduledVitalInstance[]> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        // Build query string
        const queryParams = new URLSearchParams()
        if (filters?.status) queryParams.append('status', filters.status)
        if (filters?.dateStart) queryParams.append('dateStart', filters.dateStart)
        if (filters?.dateEnd) queryParams.append('dateEnd', filters.dateEnd)
        if (filters?.limit) queryParams.append('limit', filters.limit.toString())

        const queryString = queryParams.toString()
        const url = `/api/vital-schedules/${scheduleId}/instances${queryString ? `?${queryString}` : ''}`

        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch instances')
        }

        const data = await response.json()
        return data.instances || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to fetch instances', err)
        toast.error(`Failed to load schedule instances: ${errorMessage}`)
        return []
      }
    },
    [getAuthToken]
  )

  /**
   * Get compliance report
   */
  const getCompliance = useCallback(
    async (
      patientId: string,
      vitalType: VitalType,
      periodType: 'daily' | 'weekly' | 'monthly'
    ): Promise<ComplianceReport | null> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(
          `/api/patients/${patientId}/compliance?vitalType=${vitalType}&periodType=${periodType}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!response.ok) {
          const data = await response.json()
          // 404 is expected if no schedule exists
          if (response.status === 404) {
            return null
          }
          throw new Error(data.error || 'Failed to fetch compliance')
        }

        const data = await response.json()
        return data.report
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to fetch compliance', err)
        toast.error(`Failed to load compliance report: ${errorMessage}`)
        return null
      }
    },
    [getAuthToken]
  )

  /**
   * Get compliance trends
   */
  const getComplianceTrends = useCallback(
    async (
      patientId: string,
      vitalType: VitalType,
      days: number
    ): Promise<ComplianceTrendDataPoint[]> => {
      try {
        const token = await getAuthToken()
        if (!token) {
          throw new Error('Authentication required')
        }

        const response = await fetch(
          `/api/patients/${patientId}/compliance?vitalType=${vitalType}&trendDays=${days}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        )

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Failed to fetch trends')
        }

        const data = await response.json()
        return data.trends || []
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        logger.error('[useVitalSchedules] Failed to fetch trends', err)
        toast.error(`Failed to load compliance trends: ${errorMessage}`)
        return []
      }
    },
    [getAuthToken]
  )

  /**
   * Refetch schedules
   */
  const refetch = useCallback(async () => {
    await fetchSchedules()
  }, [fetchSchedules])

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch && patientId) {
      fetchSchedules()
    }
  }, [autoFetch, patientId, fetchSchedules])

  return {
    schedules,
    loading,
    error,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    refetch,
    getScheduleInstances,
    getCompliance,
    getComplianceTrends
  }
}
