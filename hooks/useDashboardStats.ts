'use client'

import { useMemo } from 'react'
import type { UserProfileData } from './useUserProfile'

interface MealLog {
  totalCalories?: number
  macros?: {
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
  }
}

interface WeightLog {
  weight: number
  loggedAt: string
}

interface StepLog {
  steps: number
}

export function useDashboardStats(
  todayMeals: MealLog[],
  weightData: WeightLog[],
  stepsData: StepLog[],
  userProfile: UserProfileData | null
) {
  // Calculate nutrition summary from today's meals
  const nutritionSummary = useMemo(() => {
    const todayCalories = todayMeals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0)
    const macros = todayMeals.reduce((acc, meal) => ({
      protein: acc.protein + (meal.macros?.protein || 0),
      carbs: acc.carbs + (meal.macros?.carbs || 0),
      fat: acc.fat + (meal.macros?.fat || 0),
      fiber: acc.fiber + (meal.macros?.fiber || 0)
    }), { protein: 0, carbs: 0, fat: 0, fiber: 0 })

    const goalCalories = userProfile?.goals?.dailyCalorieGoal || 2000

    return {
      todayCalories,
      goalCalories,
      macros,
      mealsLogged: todayMeals.length
    }
  }, [todayMeals, userProfile?.goals?.dailyCalorieGoal])

  // Calculate weight trend
  // Weight data priority: weight-logs (primary) > profile.currentWeight (fallback)
  // See types/index.ts for full weight data architecture explanation
  const weightTrend = useMemo(() => {
    // Get fallback weight from profile (static snapshot from onboarding)
    const profileCurrentWeight = userProfile?.profile?.currentWeight || 0

    if (weightData.length === 0) {
      // No weight logs yet - use profile weight if available
      if (profileCurrentWeight > 0) {
        const goalWeight = userProfile?.goals?.targetWeight || profileCurrentWeight
        const startWeight = userProfile?.goals?.startWeight || profileCurrentWeight
        const totalToLose = startWeight - goalWeight
        const lostSoFar = startWeight - profileCurrentWeight
        const goalProgress = totalToLose > 0 ? Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100)) : 0

        return {
          current: profileCurrentWeight,
          change: 0,
          trend: 'neutral' as const,
          goalProgress
        }
      }
      // No weight in logs OR profile
      return { current: 0, change: 0, trend: 'neutral' as const, goalProgress: 0 }
    }

    // Weight logs exist - use most recent log for current weight
    const sortedWeights = [...weightData].sort((a, b) =>
      new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime()
    )
    const current = sortedWeights[0]?.weight || profileCurrentWeight || 0
    const previous = sortedWeights[1]?.weight || current

    // Only show weight change if user has logged 2+ weights
    // Prevents showing bogus "weight increased" for brand new users with only onboarding weight
    const change = weightData.length >= 2 ? current - previous : 0
    const trend = change < 0 ? 'down' : change > 0 ? 'up' : 'neutral'

    // Calculate goal progress
    const goalWeight = userProfile?.goals?.targetWeight || current
    const startWeight = userProfile?.goals?.startWeight || current
    const totalToLose = startWeight - goalWeight
    const lostSoFar = startWeight - current
    const goalProgress = totalToLose > 0 ? Math.min(100, Math.max(0, (lostSoFar / totalToLose) * 100)) : 0

    return { current, change, trend, goalProgress }
  }, [weightData, userProfile?.profile?.currentWeight, userProfile?.goals?.targetWeight, userProfile?.goals?.startWeight])

  // Calculate activity summary
  const activitySummary = useMemo(() => {
    const todaySteps = stepsData.reduce((sum, log) => sum + (log.steps || 0), 0)
    const goalSteps = userProfile?.goals?.dailySteps || 10000

    // For weekly average, we'd need to fetch more data - for now use today's data
    const weeklyAverage = todaySteps

    return { todaySteps, goalSteps, weeklyAverage }
  }, [stepsData, userProfile?.goals?.dailySteps])

  // Calculate progress percentages
  const calorieProgress = (nutritionSummary.todayCalories / nutritionSummary.goalCalories) * 100
  const stepProgress = (activitySummary.todaySteps / activitySummary.goalSteps) * 100

  return {
    nutritionSummary,
    weightTrend,
    activitySummary,
    calorieProgress,
    stepProgress
  }
}
