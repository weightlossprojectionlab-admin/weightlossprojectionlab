import { UserProfile, UserGoals, WeightLog, MealLog } from '@/types'

/**
 * Progress Analytics Library
 *
 * Analyzes user progress data from onboarding and daily logs
 * to provide insights, warnings, and recommendations.
 */

// ============================================================================
// Goal Progress Analysis
// ============================================================================

export interface GoalProgressMetrics {
  totalWeightLoss: number // lbs lost since start (absolute value)
  goalWeightLoss: number // total lbs needed to reach goal
  progressPercentage: number // % of goal completed (capped at 100)
  avgWeeklyLoss: number // lbs/week average
  targetWeeklyLoss: number // lbs/week goal
  isPaceOnTrack: boolean
  isPaceTooSlow: boolean
  isPaceTooFast: boolean // >2 lbs/week is unsafe
  weeksElapsed: number
  weeksRemaining: number | null
  estimatedCompletionDate: Date | null
  targetCompletionDate: Date | null
  daysAheadOrBehind: number | null // positive = ahead, negative = behind
  isWeightGain: boolean // true if user gained weight instead of losing
  hasExceededGoal: boolean // true if progress > 100%
}

export function calculateGoalProgress(
  currentWeight: number,
  startWeight: number,
  goals: UserGoals,
  weightLogs: WeightLog[]
): GoalProgressMetrics {
  const rawWeightChange = startWeight - currentWeight
  const goalWeightLoss = startWeight - goals.targetWeight

  // Detect weight gain (user gained weight instead of losing)
  const isWeightGain = rawWeightChange < 0
  const totalWeightLoss = Math.abs(rawWeightChange) // Always positive for display

  // Calculate progress percentage (cap at 100%)
  const uncappedProgress = goalWeightLoss > 0
    ? Math.round((rawWeightChange / goalWeightLoss) * 100)
    : 0
  const progressPercentage = Math.max(0, Math.min(uncappedProgress, 100))
  const hasExceededGoal = uncappedProgress > 100

  // Calculate average weekly loss from actual logs
  if (weightLogs.length < 2) {
    return {
      totalWeightLoss,
      goalWeightLoss,
      progressPercentage,
      avgWeeklyLoss: 0,
      targetWeeklyLoss: goals.weeklyWeightLossGoal,
      isPaceOnTrack: false,
      isPaceTooSlow: false,
      isPaceTooFast: false,
      weeksElapsed: 0,
      weeksRemaining: null,
      estimatedCompletionDate: null,
      targetCompletionDate: goals.targetDate ? new Date(goals.targetDate) : null,
      daysAheadOrBehind: null,
      isWeightGain,
      hasExceededGoal
    }
  }

  const firstLog = weightLogs[0]
  const lastLog = weightLogs[weightLogs.length - 1]
  const daysBetween = Math.floor(
    (new Date(lastLog.loggedAt).getTime() - new Date(firstLog.loggedAt).getTime()) / (1000 * 60 * 60 * 24)
  )
  const weeksElapsed = Math.max(daysBetween / 7, 0.1) // Avoid division by zero

  // Use signed value for weekly rate calculation (positive = loss, negative = gain)
  const avgWeeklyChange = rawWeightChange / weeksElapsed
  // Display value is always positive (for UI display)
  const avgWeeklyLoss = Math.abs(avgWeeklyChange)
  const targetWeeklyLoss = goals.weeklyWeightLossGoal

  // Check if pace is appropriate - only for weight LOSS scenarios
  const paceTolerance = 0.3 // lbs/week tolerance

  // For weight gain, none of these checks apply
  const isPaceOnTrack = isWeightGain ? false : Math.abs(avgWeeklyLoss - targetWeeklyLoss) <= paceTolerance
  const isPaceTooSlow = isWeightGain ? false : avgWeeklyLoss < (targetWeeklyLoss - paceTolerance)
  // Only check "too fast" for weight loss (avgWeeklyChange > 0 means loss)
  const isPaceTooFast = !isWeightGain && avgWeeklyChange > 0 && avgWeeklyLoss > 2.0

  // Calculate weeks remaining
  const remainingLoss = goals.targetWeight - currentWeight
  // For weight gain, no ETA (moving away from goal)
  // Only calculate ETA if losing weight AND moving toward goal
  const weeksRemaining = isWeightGain || avgWeeklyLoss === 0
    ? null
    : Math.ceil(Math.abs(remainingLoss / avgWeeklyLoss))

  // Estimate completion date
  const estimatedCompletionDate = weeksRemaining
    ? new Date(Date.now() + (weeksRemaining * 7 * 24 * 60 * 60 * 1000))
    : null

  const targetCompletionDate = goals.targetDate ? new Date(goals.targetDate) : null

  // Calculate days ahead or behind schedule
  let daysAheadOrBehind: number | null = null
  if (estimatedCompletionDate && targetCompletionDate) {
    const diffDays = Math.floor(
      (targetCompletionDate.getTime() - estimatedCompletionDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    daysAheadOrBehind = diffDays // positive = ahead, negative = behind
  }

  return {
    totalWeightLoss: Math.round(totalWeightLoss * 10) / 10,
    goalWeightLoss: Math.round(goalWeightLoss * 10) / 10,
    progressPercentage,
    avgWeeklyLoss: Math.round(avgWeeklyLoss * 10) / 10,
    targetWeeklyLoss,
    isPaceOnTrack,
    isPaceTooSlow,
    isPaceTooFast,
    weeksElapsed: Math.round(weeksElapsed * 10) / 10,
    weeksRemaining,
    estimatedCompletionDate,
    targetCompletionDate,
    daysAheadOrBehind,
    isWeightGain,
    hasExceededGoal
  }
}

// ============================================================================
// Lifestyle Impact Analysis
// ============================================================================

export interface LifestyleImpact {
  alcoholCaloriesPerWeek: number
  alcoholDeficitReduction: number // % of weekly deficit consumed by alcohol
  smokingWarning: string | null
  recreationalDrugsWarning: string | null
  totalLifestyleCalories: number
}

export function calculateLifestyleImpact(
  profile: UserProfile,
  weeklyCalorieDeficit: number
): LifestyleImpact {
  const lifestyle = profile.lifestyle

  if (!lifestyle) {
    return {
      alcoholCaloriesPerWeek: 0,
      alcoholDeficitReduction: 0,
      smokingWarning: null,
      recreationalDrugsWarning: null,
      totalLifestyleCalories: 0
    }
  }

  // Alcohol calories (assuming ~150 cal per drink average)
  const avgCaloriesPerDrink = 150
  const alcoholCaloriesPerWeek = (lifestyle.weeklyDrinks || 0) * avgCaloriesPerDrink

  // Calculate % of deficit consumed by alcohol
  const alcoholDeficitReduction = weeklyCalorieDeficit > 0
    ? Math.round((alcoholCaloriesPerWeek / weeklyCalorieDeficit) * 100)
    : 0

  // Smoking warnings
  let smokingWarning: string | null = null
  if (lifestyle.smoking === 'current-heavy') {
    smokingWarning = 'Heavy smoking may increase metabolic stress and hinder weight loss progress.'
  } else if (lifestyle.smoking === 'current-light') {
    smokingWarning = 'Smoking can affect metabolism and appetite regulation.'
  } else if (lifestyle.smoking === 'quit-recent') {
    smokingWarning = 'Recent smoking cessation may temporarily affect metabolism. Stay consistent!'
  }

  // Recreational drugs warning
  let recreationalDrugsWarning: string | null = null
  if (lifestyle.recreationalDrugs === 'regular') {
    recreationalDrugsWarning = 'Regular recreational drug use can significantly impact metabolism, appetite, and overall health progress.'
  } else if (lifestyle.recreationalDrugs === 'occasional') {
    recreationalDrugsWarning = 'Be aware that recreational substances can affect hunger signals and recovery.'
  }

  return {
    alcoholCaloriesPerWeek,
    alcoholDeficitReduction,
    smokingWarning,
    recreationalDrugsWarning,
    totalLifestyleCalories: alcoholCaloriesPerWeek
  }
}

// ============================================================================
// Diet Compliance Analysis
// ============================================================================

export interface DietComplianceMetrics {
  totalMeals: number
  compliantMeals: number
  compliancePercentage: number
  violations: Array<{
    date: string
    mealType: string
    violationType: 'preference' | 'allergen'
    details: string
  }>
  allergenViolations: number
  preferenceViolations: number
}

export function analyzeDietCompliance(
  meals: MealLog[],
  dietaryPreferences: string[],
  foodAllergies: string[]
): DietComplianceMetrics {
  const violations: DietComplianceMetrics['violations'] = []
  let compliantMeals = 0

  meals.forEach(meal => {
    let isCompliant = true
    const foodItems = meal.aiAnalysis?.foodItems || []
    const foodNames = foodItems.map(item => item.name.toLowerCase())

    // Check allergen violations
    foodAllergies.forEach(allergen => {
      const allergenLower = allergen.toLowerCase()
      if (foodNames.some(food => food.includes(allergenLower))) {
        isCompliant = false
        violations.push({
          date: new Date(meal.loggedAt).toLocaleDateString(),
          mealType: meal.mealType,
          violationType: 'allergen',
          details: `Contains ${allergen}`
        })
      }
    })

    // Check dietary preference violations
    if (dietaryPreferences.includes('vegetarian') || dietaryPreferences.includes('vegan')) {
      const meatKeywords = ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'bacon', 'sausage', 'meat']
      if (foodNames.some(food => meatKeywords.some(meat => food.includes(meat)))) {
        isCompliant = false
        violations.push({
          date: new Date(meal.loggedAt).toLocaleDateString(),
          mealType: meal.mealType,
          violationType: 'preference',
          details: 'Contains meat (vegetarian diet)'
        })
      }
    }

    if (dietaryPreferences.includes('vegan')) {
      const animalKeywords = ['cheese', 'milk', 'egg', 'butter', 'cream', 'yogurt', 'honey']
      if (foodNames.some(food => animalKeywords.some(animal => food.includes(animal)))) {
        isCompliant = false
        violations.push({
          date: new Date(meal.loggedAt).toLocaleDateString(),
          mealType: meal.mealType,
          violationType: 'preference',
          details: 'Contains animal products (vegan diet)'
        })
      }
    }

    if (isCompliant) {
      compliantMeals++
    }
  })

  const totalMeals = meals.length
  const compliancePercentage = totalMeals > 0
    ? Math.round((compliantMeals / totalMeals) * 100)
    : 100

  const allergenViolations = violations.filter(v => v.violationType === 'allergen').length
  const preferenceViolations = violations.filter(v => v.violationType === 'preference').length

  return {
    totalMeals,
    compliantMeals,
    compliancePercentage,
    violations,
    allergenViolations,
    preferenceViolations
  }
}

// ============================================================================
// Activity Multiplier Helper
// ============================================================================

export function getActivityMultiplier(activityLevel: string): number {
  const multipliers: Record<string, number> = {
    'sedentary': 1.2,
    'lightly-active': 1.375,
    'moderately-active': 1.55,
    'very-active': 1.725,
    'extremely-active': 1.9
  }
  return multipliers[activityLevel] || 1.2
}

export function getActivityLabel(activityLevel: string): string {
  const labels: Record<string, string> = {
    'sedentary': 'Sedentary (little to no exercise)',
    'lightly-active': 'Lightly Active (1-3 days/week)',
    'moderately-active': 'Moderately Active (3-5 days/week)',
    'very-active': 'Very Active (6-7 days/week)',
    'extremely-active': 'Extremely Active (2x/day)'
  }
  return labels[activityLevel] || activityLevel
}
