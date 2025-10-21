'use client'

import { useState, useEffect, useMemo } from 'react'
import { useUserProfile } from './useUserProfile'
import { useMealLogsRealtime } from './useMealLogs'
import { weightLogOperations, stepLogOperations } from '@/lib/firebase-operations'

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

  // Fetch user profile (handles auto-creation)
  const { profile: userProfile, loading: profileLoading, error: profileError } = useUserProfile()

  // Fetch last 7 days of meals in real-time (for weight projection)
  const { mealLogs: allMeals, loading: loadingMeals } = useMealLogsRealtime({
    startDate: dateRange.sevenDaysAgo.toISOString(),
    endDate: dateRange.tomorrow.toISOString(),
    limitCount: 30
  })

  // Filter today's meals from all meals
  const todayMeals = useMemo(() => {
    return allMeals.filter(meal => {
      const mealDate = new Date(meal.loggedAt)
      return mealDate >= dateRange.today && mealDate < dateRange.tomorrow
    })
  }, [allMeals, dateRange.today, dateRange.tomorrow])

  // State for weight and steps data
  const [weightData, setWeightData] = useState<any[]>([])
  const [stepsData, setStepsData] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<Error | null>(null)

  // Fetch weight and steps data in parallel
  useEffect(() => {
    const fetchData = async () => {
      try {
        setDataLoading(true)
        setDataError(null)

        // Parallel API calls for better performance
        const [weightResponse, stepsResponse] = await Promise.all([
          weightLogOperations.getWeightLogs({ limit: 10 }),
          stepLogOperations.getStepLogs({
            startDate: dateRange.sevenDaysAgo.toISOString().split('T')[0],
            endDate: dateRange.tomorrow.toISOString().split('T')[0]
          })
        ])

        setWeightData(weightResponse.data || [])
        setStepsData(stepsResponse.data || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        setDataError(error as Error)
      } finally {
        setDataLoading(false)
      }
    }

    fetchData()
  }, [dateRange.sevenDaysAgo, dateRange.tomorrow])

  // Combined loading state
  const loading = profileLoading || loadingMeals || dataLoading

  return {
    userProfile,
    todayMeals,
    allMeals, // Last 7 days of meals for weight projection
    weightData,
    stepsData,
    loading,
    loadingMeals,
    error: profileError || dataError,
    dateRange
  }
}
