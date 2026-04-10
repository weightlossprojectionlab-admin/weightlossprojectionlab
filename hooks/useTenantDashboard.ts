/**
 * useTenantDashboard Hook
 *
 * Franchise counterpart of useDashboard. Same structure, same return
 * type conventions, different endpoints. Calls the tenant-scoped
 * /api/tenant/[tenantId]/dashboard/stats and /activity.
 *
 * Mirrors hooks/useDashboard.ts — DRY at the pattern level so the
 * franchise dashboard page can be a near-copy of the family-admin page.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiClient } from '@/lib/api-client'
import { logger, toLogContext } from '@/lib/logger'
import type {
  DashboardStats,
  PatientSnapshot,
  ActivityItem,
  ActionItem,
  UpcomingAppointment,
} from '@/hooks/useDashboard'

// Extended snapshot with franchise-specific fields
export interface FranchiseFamilySnapshot extends PatientSnapshot {
  email: string
  lastActiveAt: string | null
  lastMealAt: string | null
  lastMealName: string | null
  joinedPlatformAt: string | null
}

export interface PendingRequest {
  id: string
  familyName: string
  familyEmail: string
  message: string
  submittedAt: string | null
}

interface UseTenantDashboardReturn {
  stats: DashboardStats | null
  patientSnapshots: FranchiseFamilySnapshot[]
  activity: ActivityItem[]
  actionItems: ActionItem[]
  upcomingAppointments: UpcomingAppointment[]
  pendingRequests: PendingRequest[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTenantDashboard(tenantId: string | null): UseTenantDashboardReturn {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [patientSnapshots, setPatientSnapshots] = useState<FranchiseFamilySnapshot[]>([])
  const [activity, setActivity] = useState<ActivityItem[]>([])
  const [actionItems, setActionItems] = useState<ActionItem[]>([])
  const [upcomingAppointments] = useState<UpcomingAppointment[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboardData = useCallback(async () => {
    if (!tenantId) return
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useTenantDashboard] Fetching dashboard data', { tenantId })

      const [statsData, activityData] = await Promise.all([
        apiClient.get<{
          stats: DashboardStats
          patientSnapshots: FranchiseFamilySnapshot[]
          upcomingAppointments: UpcomingAppointment[]
          actionItems: ActionItem[]
          pendingRequests: PendingRequest[]
        }>(`/tenant/${tenantId}/dashboard/stats`),
        apiClient.get<{
          activity: ActivityItem[]
        }>(`/tenant/${tenantId}/dashboard/activity?limit=15`),
      ])

      if (statsData) {
        logger.debug('[useTenantDashboard] Stats:', toLogContext(statsData.stats))
        setStats(statsData.stats)
        setPatientSnapshots(statsData.patientSnapshots || [])
        setActionItems(statsData.actionItems || [])
        setPendingRequests(statsData.pendingRequests || [])
      }

      if (activityData) {
        setActivity(activityData.activity || [])
      }

      logger.info('[useTenantDashboard] Dashboard data fetched successfully')
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to fetch dashboard data'
      logger.error('[useTenantDashboard] Error', err instanceof Error ? err : undefined, {
        status: err.status,
        tenantId,
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  return {
    stats,
    patientSnapshots,
    activity,
    actionItems,
    upcomingAppointments,
    pendingRequests,
    loading,
    error,
    refetch: fetchDashboardData,
  }
}
