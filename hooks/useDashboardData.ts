'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUserProfile } from './useUserProfile'
import { useMealLogsRealtime } from './useMealLogs'
import { stepLogOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'
import { useAuth } from './useAuth'

/**
 * Progressive loading states for dashboard
 * - phase1: Critical data (profile + today's calories) - instant
 * - phase2: Weight/steps data - delayed 200ms
 * - phase3: Historical data for projections - delayed 500ms
 */
export interface DashboardLoadingPhase {
  phase1Ready: boolean  // Profile + today's meals
  phase2Ready: boolean  // Weight + steps data
  phase3Ready: boolean  // Historical data (7 days meals)
  fullyLoaded: boolean
}

export function useDashboardData(patientId?: string | null, patientOwnerId?: string | null) {
  const { user } = useAuth()

  // Calculate date range once
  const dateRange = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return { today, tomorrow, sevenDaysAgo }
  }, [])

  // Progressive loading phases
  const [loadingPhase, setLoadingPhase] = useState<DashboardLoadingPhase>({
    phase1Ready: false,
    phase2Ready: false,
    phase3Ready: false,
    fullyLoaded: false
  })

  // Fetch user profile (handles auto-creation) - PHASE 1
  const { profile: userProfile, loading: profileLoading, error: profileError } = useUserProfile()

  // Fetch TODAY's meals ONLY (critical data) - PHASE 1
  const { mealLogs: todayMeals, loading: loadingTodayMeals } = useMealLogsRealtime({
    patientId,
    patientOwnerId,
    startDate: dateRange.today.toISOString(),
    endDate: dateRange.tomorrow.toISOString(),
    limitCount: 10
  })

  // Fetch HISTORICAL meals (7 days) - PHASE 3 (delayed)
  const [fetchHistorical, setFetchHistorical] = useState(false)
  const { mealLogs: allMeals, loading: loadingAllMeals } = useMealLogsRealtime(
    fetchHistorical && patientId ? {
      patientId,
      patientOwnerId,
      startDate: dateRange.sevenDaysAgo.toISOString(),
      endDate: dateRange.tomorrow.toISOString(),
      limitCount: 30
    } : undefined as any
  )

  // State for weight and steps data - PHASE 2
  const [weightData, setWeightData] = useState<any[]>([])
  const [stepsData, setStepsData] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<Error | null>(null)

  // PHASE 1: Profile + today's meals loaded
  useEffect(() => {
    if (!profileLoading && !loadingTodayMeals) {
      setLoadingPhase(prev => ({ ...prev, phase1Ready: true }))
    }
  }, [profileLoading, loadingTodayMeals])

  // PHASE 2: Real-time weight subscription + steps fetch after Phase 1 completes (200ms delay)
  useEffect(() => {
    if (!loadingPhase.phase1Ready || !user || !patientId) {
      // If no patientId, set empty data and phase as ready
      if (!patientId) {
        setWeightData([])
        setStepsData([])
        setLoadingPhase(prev => ({ ...prev, phase2Ready: true }))
        setDataLoading(false)
      }
      return
    }

    const timer = setTimeout(async () => {
      try {
        setDataLoading(true)
        setDataError(null)

        // Fetch weight logs via API
        const token = await user.getIdToken()
        const startDate = dateRange.sevenDaysAgo.toISOString()

        const weightResponse = await fetch(
          `/api/patients/${patientId}/weight-logs?limit=10&startDate=${startDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (weightResponse.ok) {
          const weightData = await weightResponse.json()
          setWeightData(weightData.data || [])
        } else {
          logger.error('Error fetching weight logs (dashboard)', new Error(`Status: ${weightResponse.status}`))
          setWeightData([])
        }

        // Fetch steps data via API
        const stepsStartDate = dateRange.sevenDaysAgo.toISOString().split('T')[0]
        const stepsEndDate = dateRange.tomorrow.toISOString().split('T')[0]

        const stepsResponse = await fetch(
          `/api/patients/${patientId}/step-logs?startDate=${stepsStartDate}&endDate=${stepsEndDate}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        if (stepsResponse.ok) {
          const stepsData = await stepsResponse.json()
          setStepsData(stepsData.data || [])
        } else {
          logger.error('Error fetching step logs', new Error(`Status: ${stepsResponse.status}`))
          setStepsData([])
        }

        setLoadingPhase(prev => ({ ...prev, phase2Ready: true }))
        setDataLoading(false)
      } catch (error) {
        logger.error('Error fetching dashboard data', error as Error)
        setDataError(error as Error)
        setWeightData([])
        setStepsData([])
        setLoadingPhase(prev => ({ ...prev, phase2Ready: true }))
        setDataLoading(false)
      }
    }, 200)

    // Cleanup function
    return () => {
      clearTimeout(timer)
    }
  }, [loadingPhase.phase1Ready, user, patientId, patientOwnerId, dateRange.sevenDaysAgo, dateRange.tomorrow])

  // PHASE 3: Fetch historical meals after Phase 2 completes (500ms delay)
  useEffect(() => {
    if (!loadingPhase.phase2Ready) return

    const timer = setTimeout(() => {
      setFetchHistorical(true)
    }, 500)

    return () => clearTimeout(timer)
  }, [loadingPhase.phase2Ready])

  // Mark fully loaded when all phases complete
  useEffect(() => {
    if (loadingPhase.phase2Ready && !loadingAllMeals && fetchHistorical) {
      setLoadingPhase(prev => ({ ...prev, phase3Ready: true, fullyLoaded: true }))
    }
  }, [loadingPhase.phase2Ready, loadingAllMeals, fetchHistorical])

  // Combined loading state (for backward compatibility)
  const loading = profileLoading || loadingTodayMeals || dataLoading

  return {
    userProfile,
    todayMeals,
    allMeals: fetchHistorical ? allMeals : todayMeals, // Use today's meals until historical loads
    weightData,
    stepsData,
    loading,
    loadingMeals: loadingTodayMeals,
    loadingPhase, // NEW: Expose progressive loading states
    error: profileError || dataError,
    dateRange
  }
}
