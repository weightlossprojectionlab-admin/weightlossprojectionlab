/**
 * useDashboard Hook
 *
 * Comprehensive hook for family admin dashboard
 * Aggregates data from multiple sources for centralized view
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger } from '@/lib/logger'

export interface DashboardStats {
  patients: {
    total: number
    humans: number
    pets: number
  }
  familyMembers: number
  notifications: {
    unread: number
    urgent: number
  }
  recommendations: {
    active: number
    urgent: number
  }
  appointments: {
    upcoming: number
  }
  actionItems: {
    total: number
    overdue: number
    dueToday: number
  }
  recentActivity: {
    medications: number
    vitals: number
  }
}

export interface PatientSnapshot {
  id: string
  name: string
  photo?: string
  type: 'human' | 'pet'
  relationship: string
  activeMedications: number
  lastVitalCheck: string | null
  latestWeight: {
    weight: number
    unit: 'lbs' | 'kg'
    loggedAt: string
  } | null
}

export interface ActivityItem {
  id: string
  type: 'medication' | 'vital' | 'meal' | 'weight' | 'document' | 'appointment' | 'family'
  title: string
  description: string
  timestamp: string
  patientId?: string
  patientName?: string
  actionBy?: string
  actionByName?: string
  icon: string
  priority?: 'low' | 'normal' | 'high'
}

export interface ActionItem {
  id: string
  title: string
  description: string
  type: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  dueDate: string
  patientId?: string
  patientName?: string
  completed: boolean
}

export interface UpcomingAppointment {
  id: string
  patientId: string
  patientName: string
  providerName: string
  appointmentType: string
  dateTime: string
  location?: string
  requiresDriver: boolean
}

interface UseDashboardReturn {
  stats: DashboardStats | null
  patientSnapshots: PatientSnapshot[]
  activity: ActivityItem[]
  actionItems: ActionItem[]
  upcomingAppointments: UpcomingAppointment[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useDashboard(): UseDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [patientSnapshots, setPatientSnapshots] = useState<PatientSnapshot[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useDashboard] Fetching dashboard data')

      // Fetch stats and activity in parallel
      const [statsData, activityData] = await Promise.all([
        apiClient.get<{
          stats: DashboardStats
          patientSnapshots: PatientSnapshot[]
          upcomingAppointments: UpcomingAppointment[]
          actionItems: ActionItem[]
        }>('/dashboard/stats'),
        apiClient.get<{
          activity: ActivityItem[]
        }>('/dashboard/activity?limit=15')
      ])

      logger.debug('[useDashboard] Raw statsData:', statsData)

      if (statsData) {
        logger.debug('[useDashboard] Stats:', statsData.stats)
        setStats(statsData.stats)
        setPatientSnapshots(statsData.patientSnapshots || [])
        setUpcomingAppointments(statsData.upcomingAppointments || [])
        setActionItems(statsData.actionItems || [])
      } else {
        logger.error('[useDashboard] statsData is undefined/null')
      }

      if (activityData) {
        setActivity(activityData.activity || [])
      }

      logger.info('[useDashboard] Dashboard data fetched successfully')
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch dashboard data'
      logger.error('[useDashboard] Error fetching dashboard data', {
        message: err.message,
        status: err.status,
        details: err.details,
        stack: err.stack
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    stats,
    patientSnapshots,
    activity,
    actionItems,
    upcomingAppointments,
    loading,
    error,
    refetch: fetchDashboardData
  }
}
