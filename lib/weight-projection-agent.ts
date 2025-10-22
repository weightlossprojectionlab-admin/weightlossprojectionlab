/**
 * Weight Projection Agent
 *
 * Client-side agent that forecasts weight loss trajectory and goal completion.
 *
 * Features:
 * - Projects weight loss based on user goals and historical data
 * - Calculates on-track status vs. behind schedule
 * - Estimates goal completion date using linear regression
 * - Updates projections as new weight logs come in
 *
 * Status: 🔵 Phase 2 - High Priority
 * Complexity: Low (simple math, no ML needed)
 */

import type { WeightLog, UserGoals, UserProfile } from '@/types'

export interface WeightProjection {
  // Current State
  currentWeight: number
  targetWeight: number
  weightToLose: number
  weightLost: number // From start to current

  // Goal-Based Projection
  weeklyGoalRate: number // lbs/week from user goals
  expectedWeeksRemaining: number
  projectedCompletionDate: Date

  // Trend-Based Projection (using historical data)
  actualWeeklyRate: number | null // Calculated from weight logs (null if insufficient data)
  trendProjectedDate: Date | null // Based on actual trend

  // Status
  status: 'on-track' | 'ahead' | 'behind' | 'insufficient-data'
  statusMessage: string
  progressPercentage: number // 0-100

  // Insights
  daysRemaining: number
  weeksRemaining: number
  isGoalRealistic: boolean // True if weekly rate <= 2 lbs/week (healthy range)
  recommendedAdjustment?: string // Suggestion if behind/ahead
}

/**
 * Calculate weight projection and goal completion estimates
 */
export function calculateWeightProjection(
  profile: UserProfile,
  goals: UserGoals,
  weightLogs: WeightLog[]
): WeightProjection {
  // Get current weight (most recent log or fallback to profile)
  const currentWeight = weightLogs.length > 0
    ? weightLogs[weightLogs.length - 1].weight
    : profile.currentWeight

  const targetWeight = goals.targetWeight
  const startWeight = goals.startWeight
  const weeklyGoalRate = goals.weeklyWeightLossGoal

  // Basic calculations
  const weightToLose = currentWeight - targetWeight
  const weightLost = startWeight - currentWeight
  const progressPercentage = Math.min(100, Math.max(0, (weightLost / (startWeight - targetWeight)) * 100))

  // Goal-based projection
  const expectedWeeksRemaining = weightToLose / weeklyGoalRate
  const projectedCompletionDate = new Date()
  projectedCompletionDate.setDate(projectedCompletionDate.getDate() + (expectedWeeksRemaining * 7))

  // Trend-based projection (requires at least 2 weeks of data)
  const { actualWeeklyRate, trendProjectedDate } = calculateTrendProjection(
    weightLogs,
    targetWeight
  )

  // Determine status
  const { status, statusMessage, recommendedAdjustment } = calculateStatus(
    actualWeeklyRate,
    weeklyGoalRate,
    weightToLose,
    progressPercentage
  )

  // Goal realism check (healthy weight loss: 0.5-2 lbs/week)
  const isGoalRealistic = weeklyGoalRate >= 0.5 && weeklyGoalRate <= 2

  const daysRemaining = Math.ceil(expectedWeeksRemaining * 7)
  const weeksRemaining = Math.ceil(expectedWeeksRemaining)

  return {
    currentWeight,
    targetWeight,
    weightToLose,
    weightLost,
    weeklyGoalRate,
    expectedWeeksRemaining,
    projectedCompletionDate,
    actualWeeklyRate,
    trendProjectedDate,
    status,
    statusMessage,
    progressPercentage,
    daysRemaining,
    weeksRemaining,
    isGoalRealistic,
    recommendedAdjustment
  }
}

/**
 * Calculate actual weight loss trend using linear regression
 * Returns null if insufficient data (< 2 weeks)
 */
function calculateTrendProjection(
  weightLogs: WeightLog[],
  targetWeight: number
): { actualWeeklyRate: number | null; trendProjectedDate: Date | null } {
  // Need at least 2 weeks of data (minimum 3 logs spaced at least 7 days apart)
  if (weightLogs.length < 3) {
    return { actualWeeklyRate: null, trendProjectedDate: null }
  }

  // Sort logs by date (oldest to newest)
  const sortedLogs = [...weightLogs].sort((a, b) =>
    new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime()
  )

  const firstLog = sortedLogs[0]
  const lastLog = sortedLogs[sortedLogs.length - 1]

  // Check if we have at least 2 weeks of data
  const daysBetween = Math.abs(
    new Date(lastLog.loggedAt).getTime() - new Date(firstLog.loggedAt).getTime()
  ) / (1000 * 60 * 60 * 24)

  if (daysBetween < 14) {
    return { actualWeeklyRate: null, trendProjectedDate: null }
  }

  // Simple linear regression: weight loss over time
  const weightChange = firstLog.weight - lastLog.weight // Positive = weight loss
  const weeksElapsed = daysBetween / 7
  const actualWeeklyRate = weightChange / weeksElapsed

  // Project completion date based on trend
  if (actualWeeklyRate <= 0) {
    // No progress or gaining weight - can't project
    return { actualWeeklyRate, trendProjectedDate: null }
  }

  const currentWeight = lastLog.weight
  const weightRemaining = currentWeight - targetWeight
  const weeksToGoal = weightRemaining / actualWeeklyRate

  const trendProjectedDate = new Date(lastLog.loggedAt)
  trendProjectedDate.setDate(trendProjectedDate.getDate() + (weeksToGoal * 7))

  return { actualWeeklyRate, trendProjectedDate }
}

/**
 * Determine status and generate motivational message
 */
function calculateStatus(
  actualWeeklyRate: number | null,
  weeklyGoalRate: number,
  weightToLose: number,
  progressPercentage: number
): {
  status: 'on-track' | 'ahead' | 'behind' | 'insufficient-data'
  statusMessage: string
  recommendedAdjustment?: string
} {
  // Insufficient data
  if (actualWeeklyRate === null) {
    return {
      status: 'insufficient-data',
      statusMessage: 'Keep logging your weight! We need at least 2 weeks of data to project your progress.',
      recommendedAdjustment: undefined
    }
  }

  // No progress or gaining weight
  if (actualWeeklyRate <= 0) {
    return {
      status: 'behind',
      statusMessage: 'Your weight hasn\'t decreased yet. Let\'s review your calorie intake and activity level.',
      recommendedAdjustment: 'Consider reducing daily calories by 200-300 or increasing activity.'
    }
  }

  // Calculate variance (allow 15% tolerance)
  const variance = (actualWeeklyRate - weeklyGoalRate) / weeklyGoalRate

  if (variance >= 0.15) {
    // Losing weight faster than goal (ahead)
    return {
      status: 'ahead',
      statusMessage: `Great work! You're losing ${actualWeeklyRate.toFixed(1)} lbs/week (${Math.abs(variance * 100).toFixed(0)}% ahead of goal).`,
      recommendedAdjustment: actualWeeklyRate > 2
        ? 'Losing >2 lbs/week may be too fast. Consider adding 100-200 calories/day for sustainable progress.'
        : undefined
    }
  } else if (variance <= -0.15) {
    // Losing weight slower than goal (behind)
    return {
      status: 'behind',
      statusMessage: `You're losing ${actualWeeklyRate.toFixed(1)} lbs/week (${Math.abs(variance * 100).toFixed(0)}% behind goal). Small adjustments can help!`,
      recommendedAdjustment: 'Try reducing daily calories by 100-200 or adding 10 minutes of activity.'
    }
  } else {
    // On track (within 15% of goal)
    return {
      status: 'on-track',
      statusMessage: `Perfect pace! You're losing ${actualWeeklyRate.toFixed(1)} lbs/week, right on track with your ${weeklyGoalRate.toFixed(1)} lbs/week goal.`,
      recommendedAdjustment: undefined
    }
  }
}

/**
 * Format projection for display (helper function)
 */
export function formatProjectionDisplay(projection: WeightProjection): {
  headline: string
  subtitle: string
  progressBar: number
  statusColor: 'green' | 'yellow' | 'red' | 'gray'
} {
  const statusColors: Record<WeightProjection['status'], 'green' | 'yellow' | 'red' | 'gray'> = {
    'on-track': 'green',
    'ahead': 'green',
    'behind': 'yellow',
    'insufficient-data': 'gray'
  }

  let headline = ''
  let subtitle = ''

  if (projection.status === 'insufficient-data') {
    headline = 'Building Your Projection...'
    subtitle = 'Log your weight for 2 weeks to see your forecast'
  } else {
    const goalDate = projection.trendProjectedDate || projection.projectedCompletionDate
    const formattedDate = goalDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })

    headline = `Goal Date: ${formattedDate}`

    if (projection.weeksRemaining < 1) {
      subtitle = `${projection.daysRemaining} days remaining`
    } else {
      subtitle = `${projection.weeksRemaining} weeks remaining (${projection.weightToLose.toFixed(1)} lbs to go)`
    }
  }

  return {
    headline,
    subtitle,
    progressBar: projection.progressPercentage,
    statusColor: statusColors[projection.status]
  }
}
