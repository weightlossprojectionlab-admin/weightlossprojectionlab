'use client'

import { useMemo } from 'react'
import type { UserProfileData } from './useUserProfile'

interface MealLog {
  totalCalories?: number
  loggedAt: string
}

interface StepLog {
  steps: number
  date: string
}

export interface WeightProjection {
  projectedWeight: number
  weeklyDeficit: number
  dailyAvgDeficit: number
  projectedWeightLoss: number
  daysToGoal: number
  estimatedGoalDate: Date | null
  isOnTrack: boolean
  weeklyPace: number // lbs per week
  goalWeight: number // target weight from user goals
  // Plateau detection
  currentWeight: number // actual current weight from logs
  weightDivergence: number // difference between projected and actual (lbs)
  isPlateaued: boolean // true if divergence > 5% of goal
  needsAdjustment: boolean // true if plateaued OR not on track
  // Data sufficiency
  hasEnoughData: boolean // true if sufficient data for insights (3+ days of meals)
  daysWithData: number // number of days with actual meal logs
  canDetectPlateau: boolean // true if can validate plateau (2+ weight logs, 7+ days data)
}

/**
 * Weight Projection Hook
 *
 * Calculates projected weight based on calorie deficit and activity.
 *
 * Formula:
 * - Daily Deficit = (GoalCal - ActualCal) + (Steps × 0.04 × weight/150)
 * - Weight Loss = Total Deficit ÷ 3500 cal
 * - Projected Weight = Start Weight - Weight Loss
 *
 * Plateau Detection:
 * - Compares projected weight (from deficit) vs actual weight (from logs)
 * - Flags plateau if divergence > 5% of total weight to lose
 */
export function useWeightProjection(
  mealLogs: MealLog[],
  stepLogs: StepLog[],
  userProfile: UserProfileData | null,
  currentWeight: number = 0 // actual current weight from weight logs
): WeightProjection {
  return useMemo(() => {
    // Default values if no data
    if (!userProfile?.goals || !userProfile?.profile) {
      return {
        projectedWeight: 0,
        weeklyDeficit: 0,
        dailyAvgDeficit: 0,
        projectedWeightLoss: 0,
        daysToGoal: 0,
        estimatedGoalDate: null,
        isOnTrack: false,
        weeklyPace: 0,
        goalWeight: 0,
        currentWeight: 0,
        weightDivergence: 0,
        isPlateaued: false,
        needsAdjustment: false,
        hasEnoughData: false,
        daysWithData: 0,
        canDetectPlateau: false
      }
    }

    const goalCalories = userProfile.goals.dailyCalorieGoal || 2000
    const startWeight = userProfile.goals.startWeight || userProfile.profile.currentWeight || 0
    const goalWeight = userProfile.goals.targetWeight || startWeight
    const currentWeight = userProfile.profile.currentWeight || startWeight

    // Weight adjustment for step calories (heavier people burn more)
    const weightAdjustment = currentWeight / 150

    // Calculate deficit for each day (last 7 days)
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Group meals and steps by date
    const caloriesByDate: Record<string, number> = {}
    const stepsByDate: Record<string, number> = {}

    // Initialize last 7 days
    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      dates.push(dateStr)
      caloriesByDate[dateStr] = 0
      stepsByDate[dateStr] = 0
    }

    // Sum calories eaten per day
    mealLogs.forEach(meal => {
      const mealDate = new Date(meal.loggedAt)
      if (mealDate >= sevenDaysAgo) {
        const dateStr = mealDate.toISOString().split('T')[0]
        if (caloriesByDate[dateStr] !== undefined) {
          caloriesByDate[dateStr] += (meal.totalCalories || 0)
        }
      }
    })

    // Sum steps per day
    stepLogs.forEach(stepLog => {
      if (stepsByDate[stepLog.date] !== undefined) {
        stepsByDate[stepLog.date] = stepLog.steps
      }
    })

    // Calculate daily deficits ONLY for days with actual meal data
    const deficitsByDate: Record<string, number> = {}
    const daysWithMeals: string[] = []

    dates.forEach(date => {
      const caloriesEaten = caloriesByDate[date] || 0
      const steps = stepsByDate[date] || 0

      // Only count days where user actually logged meals
      if (caloriesEaten > 0) {
        // Deficit = (GoalCal - ActualCal) + (Steps × 0.04 × weight adjustment)
        const calorieDeficit = goalCalories - caloriesEaten
        const stepCalories = steps * 0.04 * weightAdjustment
        deficitsByDate[date] = calorieDeficit + stepCalories
        daysWithMeals.push(date)
      }
    })

    // Data sufficiency checks
    // Only count COMPLETED days (exclude today since it's not done yet)
    const today = now.toISOString().split('T')[0]
    const completedDaysWithData = daysWithMeals.filter(date => date !== today)
    const daysWithData = completedDaysWithData.length
    const hasEnoughData = daysWithData >= 7 // Need 7 completed days for weekly insights

    // Can only detect plateau if we have:
    // 1. At least 2 weight log entries (to see actual change)
    // 2. At least 7 days of meal/activity data (full week for valid projection)
    const weightLogs = mealLogs.filter(m => m.loggedAt) // Proxy for weight logs count
    const canDetectPlateau = daysWithData >= 7 && currentWeight > 0

    // If insufficient data, return zeros with flags set
    if (!hasEnoughData) {
      return {
        projectedWeight: 0,
        weeklyDeficit: 0,
        dailyAvgDeficit: 0,
        projectedWeightLoss: 0,
        daysToGoal: 0,
        estimatedGoalDate: null,
        isOnTrack: false,
        weeklyPace: 0,
        goalWeight,
        currentWeight: currentWeight || (userProfile.profile.currentWeight || startWeight),
        weightDivergence: 0,
        isPlateaued: false,
        needsAdjustment: false,
        hasEnoughData: false,
        daysWithData,
        canDetectPlateau: false
      }
    }

    // Calculate totals (only from days with actual data)
    const dailyDeficits = Object.values(deficitsByDate)
    const weeklyDeficit = dailyDeficits.reduce((sum, deficit) => sum + deficit, 0)
    const dailyAvgDeficit = daysWithData > 0 ? weeklyDeficit / daysWithData : 0

    // Calculate projected weight loss (3500 cal = 1 lb)
    const projectedWeightLoss = weeklyDeficit / 3500

    // Calculate projected current weight
    const projectedWeight = startWeight - projectedWeightLoss

    // Calculate weekly pace
    const weeklyPace = projectedWeightLoss // lbs lost this week

    // Check if on track (within 10% of target weekly loss goal)
    const targetWeeklyLoss = userProfile.goals.weeklyWeightLossGoal || 1
    const isOnTrack = Math.abs(weeklyPace - targetWeeklyLoss) <= (targetWeeklyLoss * 0.1)

    // Calculate days to goal weight
    const weightToLose = currentWeight - goalWeight
    const daysToGoal = weightToLose > 0 && dailyAvgDeficit > 0
      ? Math.ceil((weightToLose * 3500) / dailyAvgDeficit)
      : 0

    // Calculate estimated goal date
    const estimatedGoalDate = daysToGoal > 0
      ? new Date(now.getTime() + daysToGoal * 24 * 60 * 60 * 1000)
      : null

    // Plateau Detection (only if we have sufficient data)
    // Use provided currentWeight (from weight logs) or fall back to profile weight
    const actualCurrentWeight = currentWeight > 0 ? currentWeight : (userProfile.profile.currentWeight || startWeight)

    let weightDivergence = 0
    let isPlateaued = false
    let needsAdjustment = false

    if (canDetectPlateau) {
      // Calculate divergence: how much actual weight differs from projected weight
      weightDivergence = Math.abs(projectedWeight - actualCurrentWeight)

      // Plateau threshold: 5% of total weight to lose (or minimum 2 lbs)
      const totalToLose = Math.abs(startWeight - goalWeight)
      const plateauThreshold = Math.max(2, totalToLose * 0.05)

      // Flag plateau if actual weight is higher than projected by threshold
      isPlateaued = (actualCurrentWeight - projectedWeight) > plateauThreshold

      // Need adjustment if plateaued OR not on track with weekly goal
      needsAdjustment = isPlateaued || !isOnTrack
    }

    return {
      projectedWeight,
      weeklyDeficit,
      dailyAvgDeficit,
      projectedWeightLoss,
      daysToGoal,
      estimatedGoalDate,
      isOnTrack,
      weeklyPace,
      goalWeight,
      currentWeight: actualCurrentWeight,
      weightDivergence,
      isPlateaued,
      needsAdjustment,
      hasEnoughData,
      daysWithData,
      canDetectPlateau
    }
  }, [mealLogs, stepLogs, userProfile, currentWeight])
}
