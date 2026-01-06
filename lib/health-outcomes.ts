/**
 * Health Outcomes Tracking
 *
 * Monitors health progress for specific conditions/goals over time.
 * Tracks vitals improvements, interventions, and milestones.
 *
 * Key Functions:
 * - trackVitalsProgress() - Monitor vital changes over time
 * - identifyEffectiveFoods() - Which foods correlated with improvements
 * - generateProgressReport() - User-facing health progress report
 * - createHealthOutcome() - Initialize outcome tracking for a condition
 * - updateHealthOutcome() - Update with new vitals/milestones
 */

'use client'

import { logger } from '@/lib/logger'
import type {
  HealthOutcome,
  OutcomeResult,
  HealthCondition,
  InterventionType,
  VitalTrend,
  HealthProgressReport,
  HealthPrediction,
} from '@/types/health-outcomes'
import type { VitalSign, VitalType } from '@/types/medical'
import { correlateNutritionWithVitals } from './nutrition-vitals-correlation'

// ==================== HEALTH OUTCOME CREATION ====================

/**
 * Create a new health outcome tracker
 */
export async function createHealthOutcome(
  patientId: string,
  userId: string,
  conditionType: HealthCondition,
  baselineVital: VitalSign
): Promise<HealthOutcome> {
  try {
    logger.info('[Health Outcomes] Creating health outcome', {
      patientId,
      conditionType,
    })

    const outcome: HealthOutcome = {
      id: generateId(),
      patientId,
      userId,
      conditionType,
      conditionName: formatConditionName(conditionType),
      baseline: {
        date: new Date(baselineVital.recordedAt),
        vitalType: baselineVital.type,
        value: extractVitalValue(baselineVital),
        unit: baselineVital.unit,
      },
      current: {
        date: new Date(baselineVital.recordedAt),
        value: extractVitalValue(baselineVital),
        unit: baselineVital.unit,
      },
      milestones: [],
      interventions: [],
      outcome: {
        result: 'no_change',
        changeAbsolute: 0,
        changePercent: 0,
        improved: false,
        sustainedImprovement: false,
        targetReached: false,
        onTrackForTarget: false,
      },
      healthScore: {
        current: 50,
        baseline: 50,
        trend: 'stable',
        factors: [],
      },
      createdAt: new Date(),
      lastUpdated: new Date(),
      trackingStatus: 'active',
    }

    // Save to Firestore
    // await saveToFirestore(`health_outcomes/${patientId}/outcomes/${outcome.id}`, outcome)

    logger.info('[Health Outcomes] Health outcome created', {
      patientId,
      outcomeId: outcome.id,
    })

    return outcome
  } catch (error) {
    logger.error('[Health Outcomes] Error creating outcome', error as Error, {
      patientId,
      conditionType,
    })
    throw error
  }
}

// ==================== VITALS PROGRESS TRACKING ====================

/**
 * Track vitals progress over time
 */
export async function trackVitalsProgress(
  patientId: string,
  userId: string,
  outcomeId: string,
  newVital: VitalSign
): Promise<HealthOutcome> {
  try {
    logger.info('[Health Outcomes] Tracking vitals progress', {
      patientId,
      outcomeId,
      vitalType: newVital.type,
    })

    // Fetch existing outcome
    const outcome = await fetchHealthOutcome(patientId, outcomeId)

    // Update current vital
    const previousValue = outcome.current.value
    const newValue = extractVitalValue(newVital)

    outcome.current = {
      date: new Date(newVital.recordedAt),
      value: newValue,
      unit: newVital.unit,
    }

    // Calculate change from baseline
    const changeAbsolute = newValue - outcome.baseline.value
    const changePercent = (changeAbsolute / outcome.baseline.value) * 100

    // Determine if improved
    const improved = isImprovement(outcome.conditionType, changeAbsolute, outcome.baseline.value)

    // Classify outcome result
    const result = classifyOutcome(changePercent, improved)

    // Check for sustained improvement (>30 days)
    const daysSinceBaseline = daysBetween(outcome.baseline.date, outcome.current.date)
    const sustainedImprovement = improved && daysSinceBaseline >= 30

    // Update outcome
    outcome.outcome = {
      result,
      changeAbsolute,
      changePercent: Math.round(changePercent * 10) / 10,
      improved,
      sustainedImprovement,
      sustainedDays: sustainedImprovement ? daysSinceBaseline : undefined,
      targetReached: outcome.outcome.targetValue
        ? hasReachedTarget(newValue, outcome.outcome.targetValue, outcome.conditionType)
        : false,
      onTrackForTarget: outcome.outcome.targetValue
        ? isOnTrackForTarget(outcome, newValue)
        : false,
      targetValue: outcome.outcome.targetValue,
      targetDate: outcome.outcome.targetDate,
    }

    // Check for milestones
    const milestone = checkForMilestone(outcome, previousValue, newValue)
    if (milestone) {
      outcome.milestones.push(milestone)
    }

    // Update health score
    outcome.healthScore = calculateHealthScore(outcome)

    outcome.lastUpdated = new Date()

    // Save to Firestore
    // await saveToFirestore(`health_outcomes/${patientId}/outcomes/${outcome.id}`, outcome)

    logger.info('[Health Outcomes] Vitals progress tracked', {
      patientId,
      outcomeId,
      result: outcome.outcome.result,
      improved: outcome.outcome.improved,
    })

    return outcome
  } catch (error) {
    logger.error('[Health Outcomes] Error tracking vitals progress', error as Error, {
      patientId,
      outcomeId,
    })
    throw error
  }
}

// ==================== EFFECTIVE FOODS IDENTIFICATION ====================

/**
 * Identify which foods correlated with improvements
 */
export async function identifyEffectiveFoods(
  patientId: string,
  userId: string,
  outcomeId: string
): Promise<Array<{ food: string; impact: string; confidence: string }>> {
  try {
    logger.info('[Health Outcomes] Identifying effective foods', {
      patientId,
      outcomeId,
    })

    const outcome = await fetchHealthOutcome(patientId, outcomeId)

    // Run correlation analysis
    const correlation = await correlateNutritionWithVitals(
      patientId,
      userId,
      outcome.baseline.vitalType,
      60 // 60 days
    )

    if (!correlation) {
      return []
    }

    // Extract foods that were increased and correlated with improvement
    const effectiveFoods = correlation.nutritionChanges.increasedFoods
      .filter((_, index) => index < 5) // Top 5
      .map(food => ({
        food: food.productName,
        impact: correlation.vitalChange.improved ? 'Positive' : 'Neutral',
        confidence: correlation.correlation.confidence,
      }))

    logger.info('[Health Outcomes] Effective foods identified', {
      patientId,
      outcomeId,
      count: effectiveFoods.length,
    })

    return effectiveFoods
  } catch (error) {
    logger.error('[Health Outcomes] Error identifying effective foods', error as Error, {
      patientId,
      outcomeId,
    })
    return []
  }
}

// ==================== PROGRESS REPORT GENERATION ====================

/**
 * Generate user-facing health progress report
 */
export async function generateProgressReport(
  patientId: string,
  userId: string,
  reportType: 'weekly' | 'monthly' | 'quarterly' = 'weekly'
): Promise<HealthProgressReport> {
  try {
    logger.info('[Health Outcomes] Generating progress report', {
      patientId,
      reportType,
    })

    const daysInPeriod = reportType === 'weekly' ? 7 : reportType === 'monthly' ? 30 : 90
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysInPeriod)

    // Fetch all vitals in period
    const vitals = await fetchVitalsInPeriod(patientId, startDate, endDate)

    // Group by vital type and calculate progress
    const vitalProgress = calculateVitalProgress(vitals)

    // Fetch correlations for insights
    const insights = await generateInsights(patientId, userId, startDate, endDate)

    // Calculate achievements
    const nutritionAchievements = await calculateAchievements(patientId, startDate, endDate)

    // Calculate badges and streaks
    const { badges, streaks } = await calculateGamification(patientId, startDate, endDate)

    // Generate recommendations
    const recommendations = generateRecommendations(vitalProgress, insights)
    const warnings = generateWarnings()

    const report: HealthProgressReport = {
      id: generateId(),
      patientId,
      userId,
      period: {
        start: startDate,
        end: endDate,
        label: reportType === 'weekly' ? 'This Week' : reportType === 'monthly' ? 'This Month' : 'This Quarter',
      },
      vitalProgress,
      nutritionAchievements,
      insights,
      badges,
      streaks,
      goals: [],
      recommendations,
      warnings,
      generatedAt: new Date(),
      reportType,
    }

    logger.info('[Health Outcomes] Progress report generated', {
      patientId,
      vitalCount: vitalProgress.length,
      achievementCount: nutritionAchievements.length,
      insightCount: insights.length,
    })

    return report
  } catch (error) {
    logger.error('[Health Outcomes] Error generating progress report', error as Error, {
      patientId,
      reportType,
    })
    throw error
  }
}

// ==================== HELPER FUNCTIONS ====================

function extractVitalValue(vital: VitalSign): number {
  if (vital.type === 'blood_pressure' && typeof vital.value === 'object') {
    return (vital.value as any).systolic || 0
  }
  return typeof vital.value === 'number' ? vital.value : 0
}

function formatConditionName(condition: HealthCondition): string {
  return condition.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function isImprovement(condition: HealthCondition, change: number, baseline: number): boolean {
  const lowerIsBetter = ['high_blood_pressure', 'hypertension', 'diabetes', 'high_cholesterol', 'weight_loss']
  return lowerIsBetter.includes(condition) ? change < 0 : change > 0
}

function classifyOutcome(changePercent: number, improved: boolean): OutcomeResult {
  const absChange = Math.abs(changePercent)

  if (!improved) {
    if (absChange > 5) return 'worsening'
    if (absChange > 1) return 'slight_worsening'
    return 'no_change'
  }

  if (absChange > 15) return 'significant_improvement'
  if (absChange > 5) return 'improvement'
  if (absChange > 1) return 'slight_improvement'
  return 'no_change'
}

function hasReachedTarget(currentValue: number, targetValue: number, condition: HealthCondition): boolean {
  const lowerIsBetter = ['high_blood_pressure', 'hypertension', 'diabetes', 'high_cholesterol', 'weight_loss']
  return lowerIsBetter.includes(condition)
    ? currentValue <= targetValue
    : currentValue >= targetValue
}

function isOnTrackForTarget(outcome: HealthOutcome, currentValue: number): boolean {
  if (!outcome.outcome.targetValue || !outcome.outcome.targetDate) return false

  const daysElapsed = daysBetween(outcome.baseline.date, outcome.current.date)
  const totalDays = daysBetween(outcome.baseline.date, outcome.outcome.targetDate)

  if (totalDays === 0) return false

  const expectedProgress = (daysElapsed / totalDays) * (outcome.outcome.targetValue - outcome.baseline.value)
  const actualProgress = currentValue - outcome.baseline.value

  return Math.abs(actualProgress) >= Math.abs(expectedProgress) * 0.8 // 80% of expected progress
}

function checkForMilestone(outcome: HealthOutcome, previousValue: number, newValue: number): any | null {
  const improvement = outcome.baseline.value - newValue

  // Check for 10-point improvement
  if (improvement >= 10 && outcome.baseline.value - previousValue < 10) {
    return {
      date: outcome.current.date,
      value: newValue,
      description: `Improved ${Math.round(improvement)} points from baseline!`,
      celebratory: true,
    }
  }

  // Check for reaching target
  if (outcome.outcome.targetValue && hasReachedTarget(newValue, outcome.outcome.targetValue, outcome.conditionType)) {
    return {
      date: outcome.current.date,
      value: newValue,
      description: 'Reached target goal!',
      celebratory: true,
    }
  }

  return null
}

function calculateHealthScore(outcome: HealthOutcome): any {
  let score = 50 // Base score

  // Improvement adds points
  if (outcome.outcome.improved) {
    score += Math.min(30, Math.abs(outcome.outcome.changePercent))
  } else if (outcome.outcome.changePercent < 0) {
    score -= Math.min(30, Math.abs(outcome.outcome.changePercent))
  }

  // Sustained improvement bonus
  if (outcome.outcome.sustainedImprovement) {
    score += 20
  }

  score = Math.max(0, Math.min(100, score))

  const trend: 'improving' | 'stable' | 'declining' =
    outcome.outcome.improved ? 'improving' :
    outcome.outcome.changePercent < -5 ? 'declining' : 'stable'

  return {
    current: Math.round(score),
    baseline: 50,
    trend,
    factors: [
      { name: 'Vital Improvement', score: outcome.outcome.improved ? 80 : 40, weight: 0.6 },
      { name: 'Sustained Progress', score: outcome.outcome.sustainedImprovement ? 100 : 50, weight: 0.4 },
    ],
  }
}

function calculateVitalProgress(vitals: VitalSign[]): any[] {
  const vitalsByType = new Map<VitalType, VitalSign[]>()

  for (const vital of vitals) {
    const existing = vitalsByType.get(vital.type) || []
    existing.push(vital)
    vitalsByType.set(vital.type, existing)
  }

  const progress: any[] = []

  for (const [vitalType, vitalList] of vitalsByType) {
    if (vitalList.length < 2) continue

    const sorted = vitalList.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    const baseline = sorted[0]
    const current = sorted[sorted.length - 1]

    const baselineValue = extractVitalValue(baseline)
    const currentValue = extractVitalValue(current)
    const change = currentValue - baselineValue
    const changePercent = (change / baselineValue) * 100

    progress.push({
      vitalType,
      vitalName: formatVitalName(vitalType),
      baseline: baselineValue,
      current: currentValue,
      change,
      changePercent: Math.round(changePercent * 10) / 10,
      improved: change < 0, // Assuming lower is better
      trend: change < 0 ? 'improved' : change > 0 ? 'worsened' : 'stable',
      unit: baseline.unit,
      icon: getVitalIcon(vitalType),
      color: change < 0 ? 'green' : change > 0 ? 'red' : 'yellow',
    })
  }

  return progress
}

async function generateInsights(
  patientId: string,
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  // Fetch correlations
  const correlations = await fetchCorrelations(patientId, startDate, endDate)

  return correlations.map(corr => ({
    text: corr.insights[0] || 'Keep tracking your health!',
    confidence: corr.correlation.confidence,
    impact: corr.correlation.strength === 'strong' ? 'high' : corr.correlation.strength === 'moderate' ? 'medium' : 'low',
    actionable: true,
    recommendation: corr.recommendations[0],
  }))
}

async function calculateAchievements(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  // Placeholder - would fetch actual achievement data
  return []
}

async function calculateGamification(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<{ badges: any[]; streaks: any }> {
  // Placeholder - would calculate actual badges and streaks
  return {
    badges: [],
    streaks: {
      healthyShopping: 0,
      mealLogging: 0,
      vitalsTracking: 0,
      aiAdherence: 0,
    },
  }
}

function generateRecommendations(vitalProgress: any[], insights: any[]): string[] {
  const recommendations: string[] = []

  if (vitalProgress.some(v => v.improved)) {
    recommendations.push('Great progress! Keep up your healthy habits.')
  } else {
    recommendations.push('Try following more AI suggestions for better results.')
  }

  recommendations.push('Log your meals consistently to track patterns.')

  return recommendations
}

function generateWarnings(): string[] {
  return [
    'This report shows correlations, not medical advice.',
    'Always consult your healthcare provider for medical decisions.',
  ]
}

function formatVitalName(vitalType: VitalType): string {
  const names: Record<VitalType, string> = {
    blood_pressure: 'Blood Pressure',
    blood_sugar: 'Blood Sugar',
    pulse_oximeter: 'Oxygen Level',
    temperature: 'Temperature',
    weight: 'Weight',
    mood: 'Mood',
    // Pet-specific vitals
    heartRate: 'Heart Rate',
    respiratoryRate: 'Respiratory Rate',
    bodyConditionScore: 'Body Condition Score',
    // Fish-specific vitals
    waterTemp: 'Water Temperature',
    pH: 'pH Level',
    ammonia: 'Ammonia',
    nitrite: 'Nitrite',
    nitrate: 'Nitrate',
    // Reptile-specific vitals
    baskingTemp: 'Basking Temperature',
    coolSideTemp: 'Cool Side Temperature',
    humidity: 'Humidity',
  }
  return names[vitalType] || vitalType
}

function getVitalIcon(vitalType: VitalType): string {
  const icons: Record<VitalType, string> = {
    blood_pressure: '💓',
    blood_sugar: '🩸',
    pulse_oximeter: '🫁',
    temperature: '🌡️',
    weight: '⚖️',
    mood: '😊',
    // Pet-specific vitals
    heartRate: '💗',
    respiratoryRate: '🫁',
    bodyConditionScore: '📏',
    // Fish-specific vitals
    waterTemp: '🌡️',
    pH: '⚗️',
    ammonia: '⚠️',
    nitrite: '⚠️',
    nitrate: '⚠️',
    // Reptile-specific vitals
    baskingTemp: '🔥',
    coolSideTemp: '❄️',
    humidity: '💧',
  }
  return icons[vitalType] || '📊'
}

function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function generateId(): string {
  return `outcome-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== DATA FETCHING (Stubs) ====================

async function fetchHealthOutcome(patientId: string, outcomeId: string): Promise<HealthOutcome> {
  // Stub - implement with Firebase query
  throw new Error('Not implemented')
}

async function fetchVitalsInPeriod(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<VitalSign[]> {
  // Stub - implement with Firebase query
  return []
}

async function fetchCorrelations(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<any[]> {
  // Stub - implement with Firebase query
  return []
}
