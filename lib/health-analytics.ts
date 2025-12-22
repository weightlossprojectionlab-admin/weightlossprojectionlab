/**
 * Health Analytics & Reporting
 *
 * Advanced analytics for health outcomes, predictions, and ROI calculations.
 *
 * Key Functions:
 * - generateHealthReport() - Comprehensive health report
 * - calculateROI() - Health improvement vs dietary changes
 * - predictFutureVitals() - ML prediction based on current diet
 * - identifyRiskPatterns() - Early warning system
 */

'use client'

import { logger } from '@/lib/logger'
import type {
  HealthPrediction,
  HealthProgressReport,
  ConfidenceLevel,
  VitalTrend,
} from '@/types/health-outcomes'
import type { VitalType, VitalSign } from '@/types/medical'

// ==================== HEALTH REPORT GENERATION ====================

/**
 * Generate comprehensive health report
 */
export async function generateHealthReport(
  patientId: string,
  userId: string,
  options: {
    period: 'weekly' | 'monthly' | 'quarterly'
    includeVitals?: boolean
    includeNutrition?: boolean
    includeCorrelations?: boolean
    includePredictions?: boolean
  }
): Promise<HealthProgressReport> {
  try {
    logger.info('[Health Analytics] Generating health report', {
      patientId,
      period: options.period,
    })

    // Use existing function from health-outcomes.ts
    const { generateProgressReport } = await import('./health-outcomes')
    return generateProgressReport(patientId, userId, options.period)
  } catch (error) {
    logger.error('[Health Analytics] Error generating health report', error as Error, {
      patientId,
    })
    throw error
  }
}

// ==================== ROI CALCULATION ====================

/**
 * Calculate ROI: Health improvement vs dietary changes
 */
export async function calculateROI(
  patientId: string,
  userId: string,
  timeRangeDays: number = 90
): Promise<{
  healthImprovement: number
  dietaryEffort: number
  roi: number
  interpretation: string
}> {
  try {
    logger.info('[Health Analytics] Calculating health ROI', {
      patientId,
      timeRangeDays,
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRangeDays)

    // Fetch vitals to measure improvement
    const vitals = await fetchVitalsInPeriod(patientId, startDate, endDate)

    // Calculate health improvement (0-100 scale)
    const healthImprovement = calculateHealthImprovement(vitals)

    // Fetch adherence to measure effort
    const { calculateNutritionAdherence } = await import('./nutrition-vitals-correlation')
    const adherence = await calculateNutritionAdherence(patientId, userId, timeRangeDays)

    // Dietary effort (0-100 scale)
    const dietaryEffort = adherence.adherenceScore

    // ROI = Improvement / Effort
    const roi = dietaryEffort > 0 ? (healthImprovement / dietaryEffort) * 100 : 0

    // Interpretation
    let interpretation = ''
    if (roi > 100) {
      interpretation = 'Excellent! Your healthy choices are paying off significantly.'
    } else if (roi > 50) {
      interpretation = 'Good progress! Your efforts are showing positive results.'
    } else if (roi > 0) {
      interpretation = 'Keep going! Results take time. Stay consistent.'
    } else {
      interpretation = 'Consider adjusting your strategy. Talk to your healthcare provider.'
    }

    logger.info('[Health Analytics] Health ROI calculated', {
      patientId,
      roi: Math.round(roi),
      healthImprovement,
      dietaryEffort,
    })

    return {
      healthImprovement: Math.round(healthImprovement),
      dietaryEffort: Math.round(dietaryEffort),
      roi: Math.round(roi),
      interpretation,
    }
  } catch (error) {
    logger.error('[Health Analytics] Error calculating ROI', error as Error, {
      patientId,
    })
    throw error
  }
}

// ==================== PREDICTIVE ANALYTICS ====================

/**
 * Predict future vitals based on current diet and trends
 */
export async function predictFutureVitals(
  patientId: string,
  userId: string,
  vitalType: VitalType,
  daysAhead: number = 30
): Promise<HealthPrediction> {
  try {
    logger.info('[Health Analytics] Predicting future vitals', {
      patientId,
      vitalType,
      daysAhead,
    })

    // Fetch historical vitals (last 90 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)

    const vitals = await fetchVitalsInPeriod(patientId, startDate, endDate)

    if (vitals.length < 3) {
      throw new Error('Insufficient data for prediction')
    }

    // Filter by vital type
    const relevantVitals = vitals.filter(v => v.type === vitalType)

    if (relevantVitals.length < 3) {
      throw new Error('Insufficient vital readings for prediction')
    }

    // Calculate trend (simple linear regression)
    const { slope, intercept } = calculateLinearRegression(relevantVitals, vitalType)

    // Current value
    const currentVital = relevantVitals[relevantVitals.length - 1]
    const currentValue = extractVitalValue(currentVital, vitalType)
    const currentDate = new Date(currentVital.recordedAt)

    // Predicted value
    const predictedDate = new Date()
    predictedDate.setDate(predictedDate.getDate() + daysAhead)

    const daysSinceCurrent = daysAhead
    const predictedValue = currentValue + (slope * daysSinceCurrent)
    const predictedChange = predictedValue - currentValue
    const predictedChangePercent = (predictedChange / currentValue) * 100

    // Confidence (based on R-squared and sample size)
    const rSquared = calculateRSquared(relevantVitals, slope, intercept, vitalType)
    const confidence = determineConfidence(relevantVitals.length, rSquared)
    const confidenceScore = Math.round(rSquared * 100)

    // Fetch adherence for scenarios
    const { calculateNutritionAdherence } = await import('./nutrition-vitals-correlation')
    const adherence = await calculateNutritionAdherence(patientId, userId, 30)

    // Scenarios
    const scenarios = {
      best: {
        value: Math.round(predictedValue - Math.abs(predictedChange) * 0.5),
        condition: 'If you follow all AI suggestions',
      },
      likely: {
        value: Math.round(predictedValue),
        condition: 'Based on current trends',
      },
      worst: {
        value: Math.round(predictedValue + Math.abs(predictedChange) * 0.5),
        condition: 'If current patterns continue without improvement',
      },
    }

    // Recommendations
    const recommendations = generatePredictionRecommendations(
      predictedChange,
      vitalType,
      adherence.adherenceScore
    )

    // Determine trend
    const vitalTrend: VitalTrend = predictedChange < -5 ? 'improved' :
      predictedChange > 5 ? 'worsened' : 'stable'

    const prediction: HealthPrediction = {
      id: generateId(),
      patientId,
      userId,
      vitalType,
      currentValue: Math.round(currentValue),
      currentDate,
      predictedValue: Math.round(predictedValue),
      predictedDate,
      predictedChange: Math.round(predictedChange),
      predictedChangePercent: Math.round(predictedChangePercent * 10) / 10,
      confidence,
      confidenceScore,
      basedOn: {
        historicalData: 90,
        dietaryPatterns: adherence.adherenceScore > 50,
        adherenceRate: adherence.adherenceScore,
        vitalTrends: vitalTrend,
      },
      scenarios,
      recommendations,
      generatedAt: new Date(),
      modelVersion: 'linear-regression-v1',
    }

    logger.info('[Health Analytics] Future vitals predicted', {
      patientId,
      vitalType,
      predictedValue: Math.round(predictedValue),
      confidence,
    })

    return prediction
  } catch (error) {
    logger.error('[Health Analytics] Error predicting vitals', error as Error, {
      patientId,
      vitalType,
    })
    throw error
  }
}

// ==================== RISK PATTERN IDENTIFICATION ====================

/**
 * Identify risk patterns - Early warning system
 */
export async function identifyRiskPatterns(
  patientId: string,
  userId: string
): Promise<Array<{
  risk: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evidence: string
  recommendation: string
}>> {
  try {
    logger.info('[Health Analytics] Identifying risk patterns', { patientId })

    const risks: Array<any> = []

    // Fetch recent vitals (last 30 days)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)

    const vitals = await fetchVitalsInPeriod(patientId, startDate, endDate)

    // Check for trending worse vitals
    for (const vitalType of ['blood_pressure', 'blood_sugar', 'weight'] as VitalType[]) {
      const relevantVitals = vitals.filter(v => v.type === vitalType)

      if (relevantVitals.length >= 3) {
        const trend = calculateTrend(relevantVitals, vitalType)

        if (trend.direction === 'worsening' && trend.magnitude > 5) {
          risks.push({
            risk: `${formatVitalName(vitalType)} trending worse`,
            severity: trend.magnitude > 15 ? 'high' : trend.magnitude > 10 ? 'medium' : 'low',
            evidence: `${formatVitalName(vitalType)} has increased by ${Math.round(trend.magnitude)}% over the last 30 days`,
            recommendation: `Consult your healthcare provider and review your ${vitalType === 'blood_pressure' ? 'sodium intake' : vitalType === 'blood_sugar' ? 'sugar intake' : 'diet'}`,
          })
        }
      }
    }

    // Check for low adherence
    const { calculateNutritionAdherence } = await import('./nutrition-vitals-correlation')
    const adherence = await calculateNutritionAdherence(patientId, userId, 30)

    if (adherence.adherenceScore < 30) {
      risks.push({
        risk: 'Low adherence to healthy eating',
        severity: 'medium',
        evidence: `Only following ${adherence.adherenceScore}% of AI suggestions`,
        recommendation: 'Try following more AI suggestions for better health outcomes',
      })
    }

    // Check for missing vital readings
    const daysSinceLastReading = vitals.length > 0
      ? daysBetween(new Date(vitals[vitals.length - 1].recordedAt), new Date())
      : 999

    if (daysSinceLastReading > 14) {
      risks.push({
        risk: 'Infrequent vital monitoring',
        severity: 'low',
        evidence: `No vital readings in the last ${daysSinceLastReading} days`,
        recommendation: 'Log your vitals regularly to track progress',
      })
    }

    logger.info('[Health Analytics] Risk patterns identified', {
      patientId,
      riskCount: risks.length,
    })

    return risks
  } catch (error) {
    logger.error('[Health Analytics] Error identifying risk patterns', error as Error, {
      patientId,
    })
    return []
  }
}

// ==================== HELPER FUNCTIONS ====================

function calculateHealthImprovement(vitals: VitalSign[]): number {
  if (vitals.length < 2) return 0

  const vitalsByType = new Map<VitalType, VitalSign[]>()

  for (const vital of vitals) {
    const existing = vitalsByType.get(vital.type) || []
    existing.push(vital)
    vitalsByType.set(vital.type, existing)
  }

  let totalImprovement = 0
  let count = 0

  for (const [vitalType, vitalList] of vitalsByType) {
    if (vitalList.length < 2) continue

    const sorted = vitalList.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    const baseline = extractVitalValue(sorted[0], vitalType)
    const current = extractVitalValue(sorted[sorted.length - 1], vitalType)

    const change = ((baseline - current) / baseline) * 100 // Positive = improvement (lower is better)

    // Weight different vitals
    const weight = vitalType === 'blood_pressure' || vitalType === 'blood_sugar' ? 1.5 : 1.0

    totalImprovement += change * weight
    count += weight
  }

  return count > 0 ? Math.max(0, Math.min(100, 50 + (totalImprovement / count))) : 50
}

function calculateLinearRegression(
  vitals: VitalSign[],
  vitalType: VitalType
): { slope: number; intercept: number } {
  const sorted = vitals.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())

  const n = sorted.length
  const x = Array.from({ length: n }, (_, i) => i) // Time index
  const y = sorted.map(v => extractVitalValue(v, vitalType))

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  return { slope, intercept }
}

function calculateRSquared(
  vitals: VitalSign[],
  slope: number,
  intercept: number,
  vitalType: VitalType
): number {
  const sorted = vitals.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())

  const y = sorted.map(v => extractVitalValue(v, vitalType))
  const yMean = y.reduce((a, b) => a + b, 0) / y.length

  let ssRes = 0
  let ssTot = 0

  for (let i = 0; i < y.length; i++) {
    const yPred = intercept + slope * i
    ssRes += Math.pow(y[i] - yPred, 2)
    ssTot += Math.pow(y[i] - yMean, 2)
  }

  return ssTot === 0 ? 0 : 1 - (ssRes / ssTot)
}

function determineConfidence(sampleSize: number, rSquared: number): ConfidenceLevel {
  if (sampleSize >= 10 && rSquared > 0.7) return 'high'
  if (sampleSize >= 5 && rSquared > 0.5) return 'medium'
  if (sampleSize >= 3 && rSquared > 0.3) return 'low'
  return 'insufficient'
}

function generatePredictionRecommendations(
  predictedChange: number,
  vitalType: VitalType,
  adherenceScore: number
): string[] {
  const recommendations: string[] = []

  if (predictedChange > 0) {
    recommendations.push(`Your ${formatVitalName(vitalType)} may worsen. Follow AI suggestions more closely.`)
  } else {
    recommendations.push(`Keep up your current habits! Your ${formatVitalName(vitalType)} is improving.`)
  }

  if (adherenceScore < 50) {
    recommendations.push('Increase adherence to AI suggestions for better results.')
  }

  recommendations.push('Log vitals regularly to improve prediction accuracy.')

  return recommendations
}

function calculateTrend(
  vitals: VitalSign[],
  vitalType: VitalType
): { direction: 'improving' | 'worsening' | 'stable'; magnitude: number } {
  if (vitals.length < 2) return { direction: 'stable', magnitude: 0 }

  const sorted = vitals.sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
  const first = extractVitalValue(sorted[0], vitalType)
  const last = extractVitalValue(sorted[sorted.length - 1], vitalType)

  const change = ((last - first) / first) * 100
  const magnitude = Math.abs(change)

  const direction = change < -1 ? 'improving' : change > 1 ? 'worsening' : 'stable'

  return { direction, magnitude }
}

function extractVitalValue(vital: VitalSign, vitalType: VitalType): number {
  if (vitalType === 'blood_pressure' && typeof vital.value === 'object') {
    return (vital.value as any).systolic || 0
  }
  return typeof vital.value === 'number' ? vital.value : 0
}

function formatVitalName(vitalType: VitalType): string {
  const names: Record<VitalType, string> = {
    blood_pressure: 'Blood Pressure',
    blood_sugar: 'Blood Sugar',
    pulse_oximeter: 'Oxygen Level',
    temperature: 'Temperature',
    weight: 'Weight',
    mood: 'Mood',
  }
  return names[vitalType] || vitalType
}

function daysBetween(date1: Date, date2: Date): number {
  const diff = Math.abs(date2.getTime() - date1.getTime())
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function generateId(): string {
  return `prediction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== DATA FETCHING (Stubs) ====================

async function fetchVitalsInPeriod(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<VitalSign[]> {
  // Stub - implement with Firebase query
  return []
}
