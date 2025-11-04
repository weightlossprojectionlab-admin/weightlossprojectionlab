'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUserProfile } from './useUserProfile'
import { useMealLogsRealtime } from './useMealLogs'
import { weightLogOperations, stepLogOperations } from '@/lib/firebase-operations'
import { logger } from '@/lib/logger'

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

export function useDashboardData() {
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
    startDate: dateRange.today.toISOString(),
    endDate: dateRange.tomorrow.toISOString(),
    limitCount: 10
  })

  // Fetch HISTORICAL meals (7 days) - PHASE 3 (delayed)
  const [fetchHistorical, setFetchHistorical] = useState(false)
  const { mealLogs: allMeals, loading: loadingAllMeals } = useMealLogsRealtime(
    fetchHistorical ? {
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

  // PHASE 2: Fetch weight/steps after Phase 1 completes (200ms delay for smooth UX)
  useEffect(() => {
    if (!loadingPhase.phase1Ready) return

    const timer = setTimeout(async () => {
      try {
        setDataLoading(true)
        setDataError(null)

        const startDate = dateRange.sevenDaysAgo.toISOString().split('T')[0]
        const endDate = dateRange.tomorrow.toISOString().split('T')[0]

        // Parallel API calls for better performance
        const [weightResponse, stepsResponse] = await Promise.all([
          weightLogOperations.getWeightLogs({
            limit: 10,
            startDate,
            endDate
          }),
          stepLogOperations.getStepLogs({
            startDate,
            endDate
          })
        ])

        setWeightData(weightResponse.data || [])
        setStepsData(stepsResponse.data || [])
        setLoadingPhase(prev => ({ ...prev, phase2Ready: true }))
      } catch (error) {
        const errorContext = {
          phase: 'dashboard-phase2',
          apis: ['weight-logs', 'step-logs'],
          startDate: dateRange.sevenDaysAgo.toISOString().split('T')[0],
          endDate: dateRange.tomorrow.toISOString().split('T')[0],
        }

        logger.error('Error fetching dashboard data', error as Error, errorContext)
        setDataError(error as Error)

        // Set empty arrays as fallback so dashboard doesn't break
        setWeightData([])
        setStepsData([])
        // Still mark phase2 ready so app can continue
        setLoadingPhase(prev => ({ ...prev, phase2Ready: true }))
      } finally {
        setDataLoading(false)
      }
    }, 200)

    return () => clearTimeout(timer)
  }, [loadingPhase.phase1Ready, dateRange.sevenDaysAgo, dateRange.tomorrow])

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
