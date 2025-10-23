import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

interface MealLog {
  totalCalories?: number
  loggedAt: string
  mealType: string
}

interface StepLog {
  steps: number
  date: string
}

interface WeightLog {
  weight: number
  loggedAt: string
}

interface UserProfile {
  goals: {
    dailyCalorieGoal: number
    startWeight: number
    targetWeight: number
    weeklyWeightLossGoal: number
  }
  profile: {
    currentWeight: number
  }
}

interface ProjectionResponse {
  projectedWeight: number
  weeklyDeficit: number
  dailyAvgDeficit: number
  projectedWeightLoss: number
  daysToGoal: number
  estimatedGoalDate: string | null
  isOnTrack: boolean
  weeklyPace: number
  goalWeight: number
  currentWeight: number
  weightDivergence: number
  isPlateaued: boolean
  needsAdjustment: boolean
  hasEnoughData: boolean
  daysWithData: number
  canDetectPlateau: boolean
}

/**
 * GET /api/projection
 *
 * Returns weight projection based on calorie deficit and activity.
 * Requires authentication.
 *
 * Formula:
 * - Daily Deficit = (GoalCal - ActualCal) + (Steps × 0.04 × weight/150)
 * - Weight Loss = Total Deficit ÷ 3500 cal
 * - Projected Weight = Start Weight - Weight Loss
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authentication - get token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)

    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      console.error('Token verification failed:', error)
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Fetch user profile from Firestore
    const userProfileDoc = await adminDb.collection('users').doc(userId).get()

    if (!userProfileDoc.exists) {
      return NextResponse.json(
        { error: 'User profile not found - Please complete onboarding' },
        { status: 404 }
      )
    }

    const userProfile = userProfileDoc.data() as UserProfile

    if (!userProfile?.goals || !userProfile?.profile) {
      return NextResponse.json(
        { error: 'User profile incomplete - Please complete onboarding' },
        { status: 404 }
      )
    }

    // Fetch meal logs (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const mealLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('meals')
      .where('loggedAt', '>=', sevenDaysAgo.toISOString())
      .orderBy('loggedAt', 'desc')
      .get()

    const mealLogs: MealLog[] = mealLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        totalCalories: data.totalCalories,
        loggedAt: data.loggedAt,
        mealType: data.mealType
      }
    })

    // Fetch step logs (last 7 days)
    const stepLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('steps')
      .where('date', '>=', sevenDaysAgo.toISOString().split('T')[0])
      .get()

    const stepLogs: StepLog[] = stepLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        steps: data.steps || 0,
        date: data.date
      }
    })

    // Fetch weight logs (last 30 days for trend)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const weightLogsSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('weightLogs')
      .where('loggedAt', '>=', thirtyDaysAgo.toISOString())
      .orderBy('loggedAt', 'asc')
      .get()

    const weightLogs: WeightLog[] = weightLogsSnapshot.docs.map(doc => {
      const data = doc.data()
      return {
        weight: data.weight,
        loggedAt: data.loggedAt
      }
    })

    // Calculate projection
    const projection = calculateProjection(
      mealLogs,
      stepLogs,
      userProfile,
      weightLogs
    )

    return NextResponse.json(projection, {
      headers: {
        'Cache-Control': 'private, max-age=300' // Cache for 5 minutes
      }
    })
  } catch (error) {
    console.error('Error calculating projection:', error)
    return NextResponse.json(
      { error: 'Failed to calculate projection' },
      { status: 500 }
    )
  }
}

/**
 * Calculate weight projection from user data
 *
 * This mirrors the logic in hooks/useWeightProjection.ts
 */
function calculateProjection(
  mealLogs: MealLog[],
  stepLogs: StepLog[],
  userProfile: UserProfile,
  weightLogs: WeightLog[]
): ProjectionResponse {
  // Extract profile data
  const goalCalories = userProfile.goals.dailyCalorieGoal || 2000
  const startWeight = userProfile.goals.startWeight || userProfile.profile.currentWeight || 0
  const goalWeight = userProfile.goals.targetWeight || startWeight
  const currentWeight = weightLogs.length > 0
    ? weightLogs[weightLogs.length - 1].weight
    : (userProfile.profile.currentWeight || startWeight)

  // Weight adjustment for step calories (heavier people burn more)
  const weightAdjustment = currentWeight / 150

  // Calculate deficit for last 7 days
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

  // Can only detect plateau if we have 7+ days of data and current weight
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
    ? new Date(now.getTime() + daysToGoal * 24 * 60 * 60 * 1000).toISOString()
    : null

  // Plateau Detection (only if we have sufficient data)
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
}
