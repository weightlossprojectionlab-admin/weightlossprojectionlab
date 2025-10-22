/**
 * Readiness Analyzer - ML/Statistical Model for User Engagement
 *
 * Assesses user "readiness to change" by analyzing behavior patterns
 * and calculating engagement scores to predict churn risk.
 *
 * Phase 3 Backend Agent - v1.6.3
 */

import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp,
  doc,
  setDoc,
  getDoc
} from 'firebase/firestore'

// ============================================================================
// Types
// ============================================================================

export type EngagementLevel = 'high' | 'medium' | 'at-risk' | 'high-risk'
export type InterventionType = 'none' | 'gentle-nudge' | 'motivational' | 'ai-coach' | 'email-campaign'

export interface EngagementMetrics {
  // Core Behaviors (weighted heavily)
  mealLoggingFrequency: number      // 0-100 (% of days with meals logged)
  weightTrackingFrequency: number   // 0-100 (% of expected check-ins)
  currentStreak: number              // Days (normalized to 0-100)

  // Secondary Behaviors (weighted moderately)
  missionCompletionRate: number     // 0-100 (% of available missions completed)
  goalProgressRate: number          // 0-100 (% progress toward weight goal)

  // Optional Features (weighted lightly)
  recipeEngagement: number          // 0-100 (cooking sessions, queue activity)
  profileCompleteness: number       // 0-100 (profile filled out)

  // Temporal Patterns
  daysActive: number                // Total days active in period
  consecutiveInactiveDays: number   // Current inactive streak
  lastActivityDate: Date | null
}

export interface EngagementScore {
  overallScore: number              // 0-100 weighted composite score
  level: EngagementLevel
  metrics: EngagementMetrics
  trend: 'improving' | 'stable' | 'declining'
  trendPercentage: number           // % change from previous period
  riskFactors: string[]             // List of concerning behaviors
  strengths: string[]               // List of positive behaviors
}

export interface InterventionRecommendation {
  type: InterventionType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  message: string
  actions: string[]
}

export interface ReadinessAnalysis {
  userId: string
  timestamp: Date
  engagementScore: EngagementScore
  intervention: InterventionRecommendation
  churnProbability: number          // 0-1 probability of churning in next 30 days
  analyzedAt: Date
}

// ============================================================================
// Configuration
// ============================================================================

const ANALYSIS_PERIOD_DAYS = 14    // Analyze last 14 days of activity
const COMPARISON_PERIOD_DAYS = 14  // Compare to previous 14 days
const MAX_STREAK_DAYS = 30         // Cap for normalization

// Weights for composite score (must sum to 1.0)
const WEIGHTS = {
  mealLogging: 0.30,       // Most important - core behavior
  weightTracking: 0.25,    // Very important - core behavior
  streak: 0.15,            // Important - consistency indicator
  missions: 0.10,          // Moderate - engagement indicator
  goalProgress: 0.10,      // Moderate - motivation indicator
  recipes: 0.05,           // Optional - nice to have
  profile: 0.05            // Optional - initial engagement
}

// Thresholds for engagement levels
const THRESHOLDS = {
  high: 80,        // 80-100: Highly engaged
  medium: 50,      // 50-79: Moderately engaged
  atRisk: 30,      // 30-49: At risk of disengagement
  highRisk: 0      // 0-29: High risk of churn
}

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * Main entry point: Analyze user engagement and readiness
 */
export async function analyzeUserReadiness(userId: string): Promise<ReadinessAnalysis> {
  const metrics = await calculateEngagementMetrics(userId)
  const previousMetrics = await calculateEngagementMetrics(userId, COMPARISON_PERIOD_DAYS)

  const overallScore = calculateCompositeScore(metrics)
  const previousScore = calculateCompositeScore(previousMetrics)

  const level = determineEngagementLevel(overallScore)
  const trend = determineTrend(overallScore, previousScore)
  const trendPercentage = previousScore > 0
    ? ((overallScore - previousScore) / previousScore) * 100
    : 0

  const riskFactors = identifyRiskFactors(metrics)
  const strengths = identifyStrengths(metrics)

  const engagementScore: EngagementScore = {
    overallScore,
    level,
    metrics,
    trend,
    trendPercentage,
    riskFactors,
    strengths
  }

  const intervention = recommendIntervention(engagementScore)
  const churnProbability = calculateChurnProbability(engagementScore)

  const analysis: ReadinessAnalysis = {
    userId,
    timestamp: new Date(),
    engagementScore,
    intervention,
    churnProbability,
    analyzedAt: new Date()
  }

  // Store analysis in Firestore
  await saveAnalysis(userId, analysis)

  return analysis
}

/**
 * Calculate all engagement metrics for a user
 */
async function calculateEngagementMetrics(
  userId: string,
  daysAgo: number = 0
): Promise<EngagementMetrics> {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() - daysAgo)

  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - ANALYSIS_PERIOD_DAYS)

  // Parallel data fetching for performance
  const [
    mealLoggingFreq,
    weightTrackingFreq,
    streakData,
    missionRate,
    goalProgress,
    recipeEngagement,
    profileComplete,
    activityData
  ] = await Promise.all([
    calculateMealLoggingFrequency(userId, startDate, endDate),
    calculateWeightTrackingFrequency(userId, startDate, endDate),
    getCurrentStreak(userId),
    calculateMissionCompletionRate(userId, startDate, endDate),
    calculateGoalProgressRate(userId),
    calculateRecipeEngagement(userId, startDate, endDate),
    calculateProfileCompleteness(userId),
    calculateActivityData(userId, startDate, endDate)
  ])

  return {
    mealLoggingFrequency: mealLoggingFreq,
    weightTrackingFrequency: weightTrackingFreq,
    currentStreak: normalizeStreak(streakData.current),
    missionCompletionRate: missionRate,
    goalProgressRate: goalProgress,
    recipeEngagement: recipeEngagement,
    profileCompleteness: profileComplete,
    daysActive: activityData.daysActive,
    consecutiveInactiveDays: activityData.consecutiveInactiveDays,
    lastActivityDate: activityData.lastActivityDate
  }
}

/**
 * Calculate meal logging frequency (% of days with at least 1 meal)
 */
async function calculateMealLoggingFrequency(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const mealsRef = collection(db, 'meals')
    const q = query(
      mealsRef,
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate))
    )

    const snapshot = await getDocs(q)

    // Get unique days with meals
    const daysWithMeals = new Set<string>()
    snapshot.forEach(doc => {
      const timestamp = doc.data().timestamp.toDate()
      const dateKey = timestamp.toISOString().split('T')[0]
      daysWithMeals.add(dateKey)
    })

    const totalDays = ANALYSIS_PERIOD_DAYS
    const percentage = (daysWithMeals.size / totalDays) * 100

    return Math.min(100, Math.round(percentage))
  } catch (error) {
    console.error('Error calculating meal logging frequency:', error)
    return 0
  }
}

/**
 * Calculate weight tracking frequency (% of expected weekly check-ins)
 */
async function calculateWeightTrackingFrequency(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const weightsRef = collection(db, 'weight_entries')
    const q = query(
      weightsRef,
      where('userId', '==', userId),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    )

    const snapshot = await getDocs(q)
    const actualCheckIns = snapshot.size

    // Expected: 2 check-ins per week (14 days = 2 weeks = 4 check-ins)
    const weeks = ANALYSIS_PERIOD_DAYS / 7
    const expectedCheckIns = weeks * 2

    const percentage = (actualCheckIns / expectedCheckIns) * 100

    return Math.min(100, Math.round(percentage))
  } catch (error) {
    console.error('Error calculating weight tracking frequency:', error)
    return 0
  }
}

/**
 * Get current streak from user profile
 */
async function getCurrentStreak(userId: string): Promise<{ current: number; longest: number }> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return { current: 0, longest: 0 }
    }

    const data = userSnap.data()
    return {
      current: data.profile?.currentStreak || 0,
      longest: data.profile?.longestStreak || 0
    }
  } catch (error) {
    console.error('Error getting current streak:', error)
    return { current: 0, longest: 0 }
  }
}

/**
 * Normalize streak to 0-100 scale
 */
function normalizeStreak(days: number): number {
  return Math.min(100, Math.round((days / MAX_STREAK_DAYS) * 100))
}

/**
 * Calculate mission completion rate
 */
async function calculateMissionCompletionRate(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    const missionsRef = collection(db, 'weekly_missions')
    const q = query(
      missionsRef,
      where('userId', '==', userId),
      where('weekStart', '>=', Timestamp.fromDate(startDate)),
      where('weekStart', '<=', Timestamp.fromDate(endDate))
    )

    const snapshot = await getDocs(q)

    let totalMissions = 0
    let completedMissions = 0

    snapshot.forEach(doc => {
      const missions = doc.data().missions || []
      totalMissions += missions.length
      completedMissions += missions.filter((m: any) => m.completed).length
    })

    if (totalMissions === 0) return 0

    const percentage = (completedMissions / totalMissions) * 100
    return Math.round(percentage)
  } catch (error) {
    console.error('Error calculating mission completion rate:', error)
    return 0
  }
}

/**
 * Calculate goal progress rate
 */
async function calculateGoalProgressRate(userId: string): Promise<number> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) return 0

    const data = userSnap.data()
    const profile = data.profile
    const goals = data.goals

    if (!profile || !goals) return 0

    const startWeight = profile.startWeight || profile.currentWeight || 0
    const currentWeight = profile.currentWeight || startWeight
    const targetWeight = goals.targetWeight || startWeight

    if (startWeight === targetWeight) return 100 // Already at goal

    const totalToLose = Math.abs(startWeight - targetWeight)
    const lostSoFar = Math.abs(startWeight - currentWeight)

    const percentage = (lostSoFar / totalToLose) * 100
    return Math.min(100, Math.round(percentage))
  } catch (error) {
    console.error('Error calculating goal progress rate:', error)
    return 0
  }
}

/**
 * Calculate recipe engagement (cooking sessions, queue activity)
 */
async function calculateRecipeEngagement(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  try {
    // Count cooking sessions
    const sessionsRef = collection(db, 'cooking_sessions')
    const sessionsQuery = query(
      sessionsRef,
      where('userId', '==', userId),
      where('startedAt', '>=', Timestamp.fromDate(startDate)),
      where('startedAt', '<=', Timestamp.fromDate(endDate))
    )

    const sessionsSnapshot = await getDocs(sessionsQuery)
    const sessionsCount = sessionsSnapshot.size

    // Count completed sessions
    const completedCount = sessionsSnapshot.docs.filter(
      doc => doc.data().status === 'completed'
    ).length

    // Get recipe queue activity
    const queueRef = collection(db, 'recipe_queue')
    const queueQuery = query(
      queueRef,
      where('userId', '==', userId),
      where('addedAt', '>=', Timestamp.fromDate(startDate)),
      where('addedAt', '<=', Timestamp.fromDate(endDate))
    )

    const queueSnapshot = await getDocs(queueQuery)
    const queueAdds = queueSnapshot.size

    // Scoring: 1 point per queue add, 2 points per session started, 3 points per session completed
    const score = (queueAdds * 1) + (sessionsCount * 2) + (completedCount * 3)

    // Normalize to 0-100 (assuming 10+ activities = 100%)
    const percentage = Math.min(100, (score / 10) * 100)

    return Math.round(percentage)
  } catch (error) {
    console.error('Error calculating recipe engagement:', error)
    return 0
  }
}

/**
 * Calculate profile completeness
 */
async function calculateProfileCompleteness(userId: string): Promise<number> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) return 0

    const data = userSnap.data()
    const profile = data.profile || {}
    const goals = data.goals || {}

    const requiredFields = [
      profile.name,
      profile.email,
      profile.age,
      profile.gender,
      profile.height,
      profile.currentWeight,
      profile.activityLevel,
      goals.targetWeight,
      goals.weeklyWeightLossGoal,
      goals.dailyCalorieGoal
    ]

    const filledFields = requiredFields.filter(field =>
      field !== undefined && field !== null && field !== ''
    ).length

    const percentage = (filledFields / requiredFields.length) * 100
    return Math.round(percentage)
  } catch (error) {
    console.error('Error calculating profile completeness:', error)
    return 0
  }
}

/**
 * Calculate activity data (days active, consecutive inactive days)
 */
async function calculateActivityData(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  daysActive: number
  consecutiveInactiveDays: number
  lastActivityDate: Date | null
}> {
  try {
    // Get all activity from meals (primary indicator)
    const mealsRef = collection(db, 'meals')
    const mealsQuery = query(
      mealsRef,
      where('userId', '==', userId),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'desc')
    )

    const mealsSnapshot = await getDocs(mealsQuery)

    const activeDays = new Set<string>()
    let lastActivityDate: Date | null = null

    mealsSnapshot.forEach(doc => {
      const timestamp = doc.data().timestamp.toDate()
      const dateKey = timestamp.toISOString().split('T')[0]
      activeDays.add(dateKey)

      if (!lastActivityDate || timestamp > lastActivityDate) {
        lastActivityDate = timestamp
      }
    })

    // Calculate consecutive inactive days from today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let consecutiveInactiveDays = 0
    if (lastActivityDate) {
      const daysSinceActivity = Math.floor(
        (today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
      )
      consecutiveInactiveDays = daysSinceActivity
    } else {
      consecutiveInactiveDays = ANALYSIS_PERIOD_DAYS
    }

    return {
      daysActive: activeDays.size,
      consecutiveInactiveDays,
      lastActivityDate
    }
  } catch (error) {
    console.error('Error calculating activity data:', error)
    return {
      daysActive: 0,
      consecutiveInactiveDays: ANALYSIS_PERIOD_DAYS,
      lastActivityDate: null
    }
  }
}

/**
 * Calculate weighted composite engagement score
 */
function calculateCompositeScore(metrics: EngagementMetrics): number {
  const score =
    (metrics.mealLoggingFrequency * WEIGHTS.mealLogging) +
    (metrics.weightTrackingFrequency * WEIGHTS.weightTracking) +
    (metrics.currentStreak * WEIGHTS.streak) +
    (metrics.missionCompletionRate * WEIGHTS.missions) +
    (metrics.goalProgressRate * WEIGHTS.goalProgress) +
    (metrics.recipeEngagement * WEIGHTS.recipes) +
    (metrics.profileCompleteness * WEIGHTS.profile)

  return Math.round(score)
}

/**
 * Determine engagement level from score
 */
function determineEngagementLevel(score: number): EngagementLevel {
  if (score >= THRESHOLDS.high) return 'high'
  if (score >= THRESHOLDS.medium) return 'medium'
  if (score >= THRESHOLDS.atRisk) return 'at-risk'
  return 'high-risk'
}

/**
 * Determine trend by comparing current vs previous period
 */
function determineTrend(currentScore: number, previousScore: number): 'improving' | 'stable' | 'declining' {
  const diff = currentScore - previousScore

  if (diff >= 10) return 'improving'
  if (diff <= -10) return 'declining'
  return 'stable'
}

/**
 * Identify specific risk factors
 */
function identifyRiskFactors(metrics: EngagementMetrics): string[] {
  const risks: string[] = []

  if (metrics.mealLoggingFrequency < 50) {
    risks.push('Low meal logging frequency')
  }

  if (metrics.weightTrackingFrequency < 50) {
    risks.push('Infrequent weight tracking')
  }

  if (metrics.currentStreak < 20) {
    risks.push('Short or broken streak')
  }

  if (metrics.consecutiveInactiveDays >= 3) {
    risks.push(`${metrics.consecutiveInactiveDays} consecutive inactive days`)
  }

  if (metrics.missionCompletionRate < 30) {
    risks.push('Low mission completion rate')
  }

  if (metrics.daysActive < 5) {
    risks.push('Low overall activity')
  }

  return risks
}

/**
 * Identify user strengths
 */
function identifyStrengths(metrics: EngagementMetrics): string[] {
  const strengths: string[] = []

  if (metrics.mealLoggingFrequency >= 80) {
    strengths.push('Consistent meal logging')
  }

  if (metrics.weightTrackingFrequency >= 80) {
    strengths.push('Regular weight tracking')
  }

  if (metrics.currentStreak >= 70) {
    strengths.push('Strong streak maintenance')
  }

  if (metrics.missionCompletionRate >= 70) {
    strengths.push('High mission completion')
  }

  if (metrics.goalProgressRate >= 50) {
    strengths.push('Good progress toward goal')
  }

  if (metrics.recipeEngagement >= 50) {
    strengths.push('Active recipe cooking')
  }

  return strengths
}

/**
 * Recommend intervention based on engagement score
 */
function recommendIntervention(score: EngagementScore): InterventionRecommendation {
  const { level, metrics, trend, riskFactors } = score

  // High engagement - no intervention needed
  if (level === 'high') {
    return {
      type: 'none',
      priority: 'low',
      message: 'User is highly engaged. Continue current support.',
      actions: ['Monitor for any sudden changes']
    }
  }

  // Medium engagement - gentle support
  if (level === 'medium') {
    return {
      type: 'gentle-nudge',
      priority: 'low',
      message: 'User is moderately engaged. Provide gentle encouragement.',
      actions: [
        'Send weekly progress summary',
        'Highlight achievements',
        'Suggest new recipes or missions'
      ]
    }
  }

  // At risk - active intervention
  if (level === 'at-risk') {
    const priority = trend === 'declining' ? 'high' : 'medium'

    return {
      type: trend === 'declining' ? 'ai-coach' : 'motivational',
      priority,
      message: 'User showing signs of disengagement. Provide targeted support.',
      actions: [
        'Send personalized motivational message',
        'Offer AI Coach conversation',
        'Suggest easier goals or habits',
        ...riskFactors.map(risk => `Address: ${risk}`)
      ]
    }
  }

  // High risk - urgent intervention
  return {
    type: 'email-campaign',
    priority: 'urgent',
    message: 'User at high risk of churning. Immediate intervention required.',
    actions: [
      'Send re-engagement email campaign',
      'Trigger AI Coach proactive outreach',
      'Offer personalized support session',
      'Simplify goals and provide quick wins',
      ...riskFactors.map(risk => `Urgent: ${risk}`)
    ]
  }
}

/**
 * Calculate churn probability (0-1)
 *
 * Simple model based on engagement score and trend
 * Future: Replace with proper ML model trained on historical data
 */
function calculateChurnProbability(score: EngagementScore): number {
  const { overallScore, trend, metrics } = score

  // Base probability from score (inverted: low score = high churn)
  let probability = (100 - overallScore) / 100

  // Adjust for trend
  if (trend === 'declining') {
    probability += 0.2
  } else if (trend === 'improving') {
    probability -= 0.2
  }

  // Adjust for consecutive inactive days (strong predictor)
  if (metrics.consecutiveInactiveDays >= 7) {
    probability += 0.3
  } else if (metrics.consecutiveInactiveDays >= 3) {
    probability += 0.15
  }

  // Clamp to 0-1 range
  return Math.max(0, Math.min(1, probability))
}

/**
 * Save analysis to Firestore
 */
async function saveAnalysis(userId: string, analysis: ReadinessAnalysis): Promise<void> {
  try {
    const analysisRef = doc(db, 'readiness_analysis', `${userId}_${Date.now()}`)

    await setDoc(analysisRef, {
      userId: analysis.userId,
      timestamp: Timestamp.fromDate(analysis.timestamp),
      overallScore: analysis.engagementScore.overallScore,
      level: analysis.engagementScore.level,
      trend: analysis.engagementScore.trend,
      trendPercentage: analysis.engagementScore.trendPercentage,
      metrics: analysis.engagementScore.metrics,
      riskFactors: analysis.engagementScore.riskFactors,
      strengths: analysis.engagementScore.strengths,
      interventionType: analysis.intervention.type,
      interventionPriority: analysis.intervention.priority,
      interventionMessage: analysis.intervention.message,
      interventionActions: analysis.intervention.actions,
      churnProbability: analysis.churnProbability,
      analyzedAt: Timestamp.fromDate(analysis.analyzedAt)
    })

    // Also update latest analysis in user doc
    const userRef = doc(db, 'users', userId)
    await setDoc(userRef, {
      latestReadinessAnalysis: {
        score: analysis.engagementScore.overallScore,
        level: analysis.engagementScore.level,
        trend: analysis.engagementScore.trend,
        churnProbability: analysis.churnProbability,
        analyzedAt: Timestamp.fromDate(analysis.analyzedAt)
      }
    }, { merge: true })
  } catch (error) {
    console.error('Error saving readiness analysis:', error)
    throw error
  }
}

/**
 * Get latest analysis for a user
 */
export async function getLatestAnalysis(userId: string): Promise<ReadinessAnalysis | null> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists() || !userSnap.data().latestReadinessAnalysis) {
      return null
    }

    const latest = userSnap.data().latestReadinessAnalysis

    // Return simplified version from user doc
    return {
      userId,
      timestamp: latest.analyzedAt.toDate(),
      engagementScore: {
        overallScore: latest.score,
        level: latest.level,
        trend: latest.trend,
        trendPercentage: 0,
        metrics: {} as EngagementMetrics,
        riskFactors: [],
        strengths: []
      },
      intervention: {
        type: 'none',
        priority: 'low',
        message: '',
        actions: []
      },
      churnProbability: latest.churnProbability,
      analyzedAt: latest.analyzedAt.toDate()
    }
  } catch (error) {
    console.error('Error getting latest analysis:', error)
    return null
  }
}
