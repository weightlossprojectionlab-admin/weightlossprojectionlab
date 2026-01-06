/**
 * Health Summary Generator Utility
 *
 * Centralized health data analysis and summary generation for both human and pet patients.
 * Follows DRY principles and separation of concerns.
 *
 * This module extracts reusable logic from the health report API route and provides
 * type-safe, species-aware analysis functions.
 */

import { logger } from '@/lib/logger'
import type {
  PatientProfile,
  VitalSign,
  PatientMedication,
  WeightLog,
  StepLog,
  MealLog
} from '@/types/medical'

// ==================== CORE INTERFACES ====================

/**
 * Generic input for health summary generation
 * Works for both human and pet patients
 */
export interface HealthSummaryInput<T = any> {
  patient: PatientProfile
  medications?: PatientMedication[]
  vitals?: VitalSign[]
  documents?: any[]
  weightData?: WeightLog[]
  stepsData?: StepLog[]
  todayMeals?: MealLog[]
  // Pet-specific data (optional)
  feedingData?: T[]
  vaccinations?: T[]
  customData?: Record<string, any>
}

/**
 * Structured output from health summary generation
 */
export interface HealthSummaryOutput {
  reportText: string
  analyses: AnalysisResults
  metadata: {
    method: 'rule-based' | 'ai-enhanced'
    dataPoints: {
      vitals: number
      medications: number
      weightLogs: number
      stepLogs: number
      meals: number
      documents: number
      [key: string]: number
    }
    generatedAt: string
    patientType: 'human' | 'pet'
    species?: string
  }
}

/**
 * Weight analysis results
 */
export interface WeightAnalysis {
  status: 'no_data' | 'insufficient' | 'stable' | 'losing' | 'gaining'
  message: string
  current?: number
  target?: number
  diff?: number
  percentChange?: string
  logsCount?: number
  trend: 'up' | 'down' | 'stable' | null
}

/**
 * Vitals analysis results
 */
export interface VitalsAnalysis {
  status: 'no_data' | 'recorded'
  message: string
  recent: Array<{
    type: string
    value: string
    date: string
    status?: string
  }>
  totalCount: number
  alerts?: Array<{
    type: string
    severity: 'info' | 'warning' | 'critical'
    message: string
  }>
}

/**
 * Medication analysis results
 */
export interface MedicationAnalysis {
  status: 'none' | 'active'
  message: string
  count: number
  medications: PatientMedication[]
  list: string[]
  expiringMedications?: Array<{
    name: string
    expirationDate: string
    daysUntilExpired: number
  }>
}

/**
 * Activity analysis results (human-specific)
 */
export interface ActivityAnalysis {
  status: 'no_data' | 'below_goal' | 'close_to_goal' | 'meeting_goal'
  message: string
  average?: number
  goal?: number
  logsCount?: number
}

/**
 * Nutrition analysis results (human-specific)
 */
export interface NutritionAnalysis {
  status: 'no_data' | 'under_goal' | 'on_track' | 'over_goal'
  message: string
  calories?: number
  goal?: number
  mealsCount?: number
}

/**
 * Combined analysis results
 */
export interface AnalysisResults {
  age: number
  isPet: boolean
  species?: string
  weightAnalysis: WeightAnalysis
  vitalsAnalysis: VitalsAnalysis
  medicationAnalysis: MedicationAnalysis
  activityAnalysis?: ActivityAnalysis
  nutritionAnalysis?: NutritionAnalysis
  petFeedingAnalysis?: any
  petVaccinationAnalysis?: any
}

// ==================== REFERENCE RANGES ====================

/**
 * Species-specific vital sign reference ranges
 * Loaded from pet-health-reference-ranges.ts or default human ranges
 */
export interface VitalReferenceRanges {
  temperature?: { min: number; max: number; unit: string }
  heartRate?: { min: number; max: number; unit: string }
  respiratoryRate?: { min: number; max: number; unit: string }
  bloodPressure?: { systolic: { min: number; max: number }; diastolic: { min: number; max: number } }
  bloodSugar?: { min: number; max: number; unit: string }
  [key: string]: any
}

// ==================== AGE CALCULATION ====================

/**
 * Calculate patient age from date of birth
 *
 * @param dateOfBirth - ISO 8601 date string
 * @returns Age in years
 */
export function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// ==================== WEIGHT ANALYSIS ====================

/**
 * Analyze weight trend data for both humans and pets
 *
 * @param weightData - Array of weight log entries
 * @param targetWeight - Target weight goal (optional)
 * @param species - Pet species for species-specific analysis (optional)
 * @returns Weight analysis with trend information
 */
export function analyzeWeightTrend(
  weightData: WeightLog[] | any[],
  targetWeight?: number,
  species?: string
): WeightAnalysis {
  if (!weightData || weightData.length === 0) {
    return { status: 'no_data', message: 'No weight data available', trend: null }
  }

  const latestWeight = weightData[0]?.weight

  if (weightData.length < 2) {
    return {
      status: 'insufficient',
      message: 'Keep logging to see trends',
      current: latestWeight,
      target: targetWeight,
      trend: null,
      logsCount: weightData.length
    }
  }

  const firstWeight = weightData[weightData.length - 1]?.weight
  const diff = latestWeight - firstWeight
  const percentChange = ((diff / firstWeight) * 100).toFixed(1)

  let status: 'stable' | 'losing' | 'gaining' = 'stable'
  let message = 'Weight is stable'
  let trend: 'up' | 'down' | 'stable' = 'stable'

  // Species-aware thresholds
  const threshold = species ? 0.5 : 1.0 // Smaller threshold for pets

  if (diff < -threshold) {
    status = 'losing'
    trend = 'down'
    message = `Down ${Math.abs(diff).toFixed(1)} lbs (${Math.abs(parseFloat(percentChange))}%)`
  } else if (diff > threshold) {
    status = 'gaining'
    trend = 'up'
    message = `Up ${diff.toFixed(1)} lbs (${percentChange}%)`
  }

  return {
    status,
    message,
    current: latestWeight,
    target: targetWeight,
    diff,
    percentChange,
    logsCount: weightData.length,
    trend
  }
}

// ==================== VITALS ANALYSIS ====================

/**
 * Format vital sign value for display
 * Species-aware formatting for different vital types
 *
 * @param vital - Vital sign record
 * @param species - Pet species (optional)
 * @returns Formatted string representation
 */
export function formatVitalValue(vital: VitalSign, species?: string): string {
  if (vital.type === 'blood_pressure') {
    const systolic = (vital.value as any)?.systolic || (vital as any).systolic || 'N/A'
    const diastolic = (vital.value as any)?.diastolic || (vital as any).diastolic || 'N/A'
    return `${systolic}/${diastolic} mmHg`
  } else if (vital.type === 'blood_sugar') {
    return `${vital.value} mg/dL`
  } else if (vital.type === 'pulse_oximeter') {
    return `${vital.value}%`
  } else if (vital.type === 'temperature') {
    const unit = (vital as any).unit === 'celsius' ? 'C' : 'F'
    return `${vital.value}°${unit}`
  } else if (vital.type === 'weight') {
    return `${vital.value} ${(vital as any).unit || 'lbs'}`
  } else if (vital.type === 'mood') {
    // Pet mood tracking
    if (typeof vital.value === 'object') {
      const mood = vital.value as any
      return `Energy: ${mood.energy}/10, Appetite: ${mood.appetite}/10, Overall: ${mood.overall}/10`
    }
  }
  return `${vital.value || 'N/A'}`
}

/**
 * Get status classification for a vital sign
 * Uses reference ranges to determine if vital is normal, elevated, etc.
 *
 * @param vital - Vital sign record
 * @param referenceRanges - Species-specific reference ranges (optional)
 * @returns Status string ('Normal', 'Elevated', 'Low', etc.)
 */
export function getVitalStatus(vital: any, referenceRanges?: VitalReferenceRanges): string {
  if (vital.type === 'blood_pressure') {
    const systolic = vital.systolic || vital.value?.systolic
    const diastolic = vital.diastolic || vital.value?.diastolic

    if (!systolic || !diastolic) return 'N/A'

    // Human reference ranges
    if (systolic >= 140 || diastolic >= 90) return 'Elevated'
    if (systolic >= 130 || diastolic >= 80) return 'High Normal'
    if (systolic < 90 || diastolic < 60) return 'Low'
    return 'Normal'
  }

  if (vital.type === 'blood_sugar') {
    const value = vital.value
    if (!value) return 'N/A'

    // Human reference ranges (fasting)
    if (value > 125) return 'Elevated'
    if (value > 100) return 'High Normal'
    if (value < 70) return 'Low'
    return 'Normal'
  }

  if (vital.type === 'temperature') {
    const value = vital.value
    if (!value) return 'N/A'

    // Human reference ranges (adjust for Celsius if needed)
    const unit = vital.unit === 'celsius' ? 'C' : 'F'
    if (unit === 'F') {
      if (value > 100.4) return 'Fever'
      if (value < 95) return 'Low'
    } else {
      if (value > 38) return 'Fever'
      if (value < 35) return 'Low'
    }
    return 'Normal'
  }

  if (vital.type === 'pulse_oximeter') {
    const value = vital.value
    if (!value) return 'N/A'

    if (value < 90) return 'Low'
    if (value >= 95) return 'Normal'
    return 'Monitor'
  }

  return 'Recorded'
}

/**
 * Analyze vital signs data for patient
 *
 * @param vitals - Array of vital sign records
 * @param patient - Patient profile for context
 * @param referenceRanges - Species-specific reference ranges (optional)
 * @returns Vitals analysis with recent measurements and alerts
 */
export function analyzeVitals(
  vitals: VitalSign[] | any[],
  patient?: PatientProfile,
  referenceRanges?: VitalReferenceRanges
): VitalsAnalysis {
  if (!vitals || vitals.length === 0) {
    return { status: 'no_data', message: 'No vitals recorded', recent: [], totalCount: 0 }
  }

  const alerts: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; message: string }> = []
  const recentVitals = vitals.slice(0, 5).map((v: any) => {
    // Parse recordedAt - handle both Firestore timestamp and ISO string
    let dateStr = 'N/A'
    try {
      if (v.recordedAt) {
        if (typeof v.recordedAt === 'string') {
          dateStr = new Date(v.recordedAt).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          })
        } else if (v.recordedAt.toDate) {
          // Firestore Timestamp
          dateStr = v.recordedAt.toDate().toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          })
        } else if (v.recordedAt.seconds) {
          // Firestore Timestamp as object
          dateStr = new Date(v.recordedAt.seconds * 1000).toLocaleDateString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric'
          })
        }
      }
    } catch (e) {
      logger.error('[analyzeVitals] Error parsing recordedAt', e as Error, { vitalId: v.id })
      dateStr = 'N/A'
    }

    const status = getVitalStatus(v, referenceRanges)

    // Generate alerts for abnormal vitals
    if (status === 'Elevated' || status === 'Fever') {
      alerts.push({
        type: v.type,
        severity: 'warning',
        message: `${v.type.replace(/_/g, ' ')} reading ${formatVitalValue(v, patient?.species)} is ${status.toLowerCase()}`
      })
    } else if (status === 'Low') {
      alerts.push({
        type: v.type,
        severity: 'critical',
        message: `${v.type.replace(/_/g, ' ')} reading ${formatVitalValue(v, patient?.species)} is low`
      })
    }

    return {
      type: v.type,
      value: formatVitalValue(v, patient?.species),
      date: dateStr,
      status
    }
  })

  return {
    status: 'recorded',
    message: `${vitals.length} vitals recorded`,
    recent: recentVitals,
    totalCount: vitals.length,
    alerts: alerts.length > 0 ? alerts : undefined
  }
}

// ==================== MEDICATION ANALYSIS ====================

/**
 * Analyze medications for patient
 * Works for both human and pet medications
 *
 * @param medications - Array of medication records
 * @param isPet - Whether patient is a pet
 * @returns Medication analysis with expiration tracking
 */
export function analyzeMedications(
  medications: PatientMedication[] | any[],
  isPet: boolean = false
): MedicationAnalysis {
  if (!medications || medications.length === 0) {
    return {
      status: 'none',
      message: 'No medications recorded',
      count: 0,
      medications: [],
      list: []
    }
  }

  // Check for expiring medications
  const expiringMedications: Array<{
    name: string
    expirationDate: string
    daysUntilExpired: number
  }> = []

  const now = new Date()
  medications.forEach((med: any) => {
    if (med.expirationDate) {
      const expDate = new Date(med.expirationDate)
      const daysUntilExpired = Math.floor((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntilExpired <= 30 && daysUntilExpired >= 0) {
        expiringMedications.push({
          name: med.name,
          expirationDate: med.expirationDate,
          daysUntilExpired
        })
      }
    }
  })

  return {
    status: 'active',
    message: `${medications.length} active medication${medications.length > 1 ? 's' : ''}`,
    count: medications.length,
    medications: medications,
    list: medications.slice(0, 5).map((m: any) => {
      if (isPet) {
        return `${m.name} (${m.strength || ''} ${m.dosageForm || ''})`
      }
      return `${m.name} (${m.strength} ${m.dosageForm})`
    }),
    expiringMedications: expiringMedications.length > 0 ? expiringMedications : undefined
  }
}

// ==================== HUMAN-SPECIFIC ANALYSIS ====================

/**
 * Analyze human activity data (steps)
 *
 * @param stepsData - Array of step log entries
 * @param goals - Patient goals with daily step target
 * @returns Activity analysis
 */
export function analyzeHumanActivity(
  stepsData: StepLog[] | any[],
  goals?: any
): ActivityAnalysis {
  if (!stepsData || stepsData.length === 0) {
    return { status: 'no_data', message: 'No activity data available' }
  }

  const totalSteps = stepsData.reduce((sum: number, log: any) => sum + (log.steps || 0), 0)
  const avgSteps = Math.round(totalSteps / stepsData.length)
  const dailyGoal = goals?.dailyStepGoal || 10000

  let status: 'below_goal' | 'close_to_goal' | 'meeting_goal' = 'below_goal'
  let message = `Averaging ${avgSteps.toLocaleString()} steps/day`

  if (avgSteps >= dailyGoal) {
    status = 'meeting_goal'
    message = `Great! Averaging ${avgSteps.toLocaleString()} steps/day`
  } else if (avgSteps >= dailyGoal * 0.75) {
    status = 'close_to_goal'
    message = `Almost there! ${avgSteps.toLocaleString()} steps/day`
  }

  return {
    status,
    message,
    average: avgSteps,
    goal: dailyGoal,
    logsCount: stepsData.length
  }
}

/**
 * Analyze human nutrition data (meals)
 *
 * @param todayMeals - Array of meal log entries for today
 * @param goals - Patient goals with daily calorie target
 * @returns Nutrition analysis
 */
export function analyzeHumanNutrition(
  todayMeals: MealLog[] | any[],
  goals?: any
): NutritionAnalysis {
  if (!todayMeals || todayMeals.length === 0) {
    return { status: 'no_data', message: 'No meals logged today' }
  }

  const totalCalories = todayMeals.reduce((sum: number, meal: any) => {
    return sum + (meal.calories || meal.nutritionEstimate?.calories || 0)
  }, 0)

  const dailyGoal = goals?.dailyCalorieGoal || 2000

  let status: 'under_goal' | 'on_track' | 'over_goal' = 'on_track'
  let message = `${totalCalories} calories logged today`

  if (totalCalories > dailyGoal * 1.15) {
    status = 'over_goal'
    message = `${totalCalories} cal (${Math.round((totalCalories / dailyGoal) * 100)}% of goal)`
  } else if (totalCalories < dailyGoal * 0.85) {
    status = 'under_goal'
    message = `${totalCalories} cal (${Math.round((totalCalories / dailyGoal) * 100)}% of goal)`
  }

  return {
    status,
    message,
    calories: totalCalories,
    goal: dailyGoal,
    mealsCount: todayMeals.length
  }
}

// ==================== PET-SPECIFIC ANALYSIS (STUBS) ====================

/**
 * Analyze pet feeding compliance
 * TODO: Implement full feeding analysis with compliance tracking
 *
 * @param feedingData - Array of feeding log entries
 * @param schedule - Feeding schedule configuration
 * @returns Feeding analysis
 */
export function analyzePetFeeding(
  feedingData: any[],
  schedule?: any
): any {
  // Stub implementation - to be expanded in future
  if (!feedingData || feedingData.length === 0) {
    return {
      status: 'no_data',
      message: 'No feeding data available',
      complianceRate: null
    }
  }

  return {
    status: 'tracked',
    message: `${feedingData.length} feedings logged`,
    complianceRate: 100, // TODO: Calculate actual compliance
    totalFeedings: feedingData.length
  }
}

/**
 * Analyze pet vaccination status
 * TODO: Implement vaccination compliance and due date tracking
 *
 * @param vaccinations - Array of vaccination records
 * @returns Vaccination analysis
 */
export function analyzePetVaccinations(
  vaccinations: any[]
): any {
  // Stub implementation - to be expanded in future
  if (!vaccinations || vaccinations.length === 0) {
    return {
      status: 'no_data',
      message: 'No vaccination records',
      upToDate: null
    }
  }

  const now = new Date()
  const upToDate = vaccinations.every((v: any) => {
    if (!v.nextDueDate) return true
    return new Date(v.nextDueDate) > now
  })

  return {
    status: upToDate ? 'current' : 'due',
    message: `${vaccinations.length} vaccination records`,
    upToDate,
    totalVaccinations: vaccinations.length
  }
}

// ==================== ALERTS & SCORING ====================

/**
 * Get critical health alerts from analysis results
 *
 * @param analyses - Combined analysis results
 * @param patient - Patient profile
 * @returns Array of critical alerts
 */
export function getCriticalAlerts(
  analyses: Partial<AnalysisResults>,
  patient: PatientProfile
): Array<{
  severity: 'CRITICAL' | 'WARNING' | 'ATTENTION REQUIRED'
  message: string
  details?: string[]
}> {
  const alerts: Array<{
    severity: 'CRITICAL' | 'WARNING' | 'ATTENTION REQUIRED'
    message: string
    details?: string[]
  }> = []

  // Critical calorie deficit (human-specific)
  if (analyses.nutritionAnalysis &&
      analyses.nutritionAnalysis.status !== 'no_data' &&
      analyses.nutritionAnalysis.calories &&
      analyses.nutritionAnalysis.goal &&
      analyses.nutritionAnalysis.calories < analyses.nutritionAnalysis.goal * 0.5) {
    alerts.push({
      severity: 'CRITICAL',
      message: 'Severely inadequate caloric intake detected',
      details: [
        `Current intake: ${analyses.nutritionAnalysis.calories} calories (${Math.round((analyses.nutritionAnalysis.calories / analyses.nutritionAnalysis.goal) * 100)}% of target)`,
        `Target: ${analyses.nutritionAnalysis.goal} calories`,
        `Deficit: ${analyses.nutritionAnalysis.goal - analyses.nutritionAnalysis.calories} calories`,
        `Risk: Prolonged inadequate nutrition may impact health, energy levels, and metabolic function`,
        `Recommendation: Increase meal frequency and portion sizes immediately. Consult healthcare provider if persistent.`
      ]
    })
  }

  // Significant weight increase
  if (analyses.weightAnalysis &&
      analyses.weightAnalysis.status === 'gaining' &&
      analyses.weightAnalysis.diff &&
      analyses.weightAnalysis.diff > 20) {
    alerts.push({
      severity: 'ATTENTION REQUIRED',
      message: `Significant weight increase observed`,
      details: [
        `Change: +${analyses.weightAnalysis.diff.toFixed(1)} lbs`,
        `Measurements: ${analyses.weightAnalysis.logsCount} recorded`,
        `Recommendation: Schedule consultation with healthcare provider to discuss weight trend`
      ]
    })
  }

  // Vital signs alerts
  if (analyses.vitalsAnalysis?.alerts && analyses.vitalsAnalysis.alerts.length > 0) {
    analyses.vitalsAnalysis.alerts.forEach(alert => {
      if (alert.severity === 'critical') {
        alerts.push({
          severity: 'CRITICAL',
          message: alert.message
        })
      } else if (alert.severity === 'warning') {
        alerts.push({
          severity: 'WARNING',
          message: alert.message
        })
      }
    })
  }

  return alerts
}

/**
 * Calculate overall health score from analysis results
 *
 * @param analyses - Combined analysis results
 * @param patient - Patient profile
 * @returns Health score with message
 */
export function calculateHealthScore(
  analyses: Partial<AnalysisResults>,
  patient: PatientProfile
): { score: number; message: string } {
  const scores: number[] = []

  // Weight progress
  if (analyses.weightAnalysis) {
    if (analyses.weightAnalysis.status === 'losing') scores.push(3)
    else if (analyses.weightAnalysis.status === 'stable') scores.push(2)
    else if (analyses.weightAnalysis.status === 'gaining') scores.push(1)
  }

  // Activity (human-specific)
  if (analyses.activityAnalysis) {
    if (analyses.activityAnalysis.status === 'meeting_goal') scores.push(3)
    else if (analyses.activityAnalysis.status === 'close_to_goal') scores.push(2)
    else if (analyses.activityAnalysis.status === 'below_goal') scores.push(1)
  }

  // Nutrition (human-specific)
  if (analyses.nutritionAnalysis) {
    if (analyses.nutritionAnalysis.status === 'on_track') scores.push(3)
    else if (analyses.nutritionAnalysis.status === 'under_goal' || analyses.nutritionAnalysis.status === 'over_goal') scores.push(2)
  }

  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 2

  if (avgScore >= 2.5) {
    return { score: avgScore, message: 'Overall health metrics are looking great! Keep up the excellent work.' }
  } else if (avgScore >= 1.5) {
    return { score: avgScore, message: 'Making good progress with some areas to improve. Consistency is key!' }
  } else {
    return { score: avgScore, message: 'Getting started on the health journey. Small steps lead to big changes!' }
  }
}

// ==================== MAIN SUMMARY GENERATORS ====================

/**
 * Generate comprehensive health summary for human patient
 *
 * @param input - Health summary input data
 * @returns Complete health summary output
 */
export function generateHumanHealthSummary(input: HealthSummaryInput): AnalysisResults {
  const age = calculateAge(input.patient.dateOfBirth)
  const isPet = input.patient.type === 'pet'

  // Analyze all data sources
  const weightAnalysis = analyzeWeightTrend(
    input.weightData || [],
    input.patient.goals?.targetWeight
  )

  const activityAnalysis = analyzeHumanActivity(
    input.stepsData || [],
    input.patient.goals
  )

  const nutritionAnalysis = analyzeHumanNutrition(
    input.todayMeals || [],
    input.patient.goals
  )

  const vitalsAnalysis = analyzeVitals(
    input.vitals || [],
    input.patient
  )

  const medicationAnalysis = analyzeMedications(
    input.medications || [],
    isPet
  )

  return {
    age,
    isPet,
    weightAnalysis,
    activityAnalysis,
    nutritionAnalysis,
    vitalsAnalysis,
    medicationAnalysis
  }
}

/**
 * Generate comprehensive health summary for pet patient
 * TODO: Expand with pet-specific feeding, vaccination, and behavioral analysis
 *
 * @param input - Health summary input data
 * @returns Complete health summary output
 */
export function generatePetHealthSummary(input: HealthSummaryInput): AnalysisResults {
  const age = calculateAge(input.patient.dateOfBirth)
  const isPet = input.patient.type === 'pet'
  const species = input.patient.species

  // Analyze common data sources
  const weightAnalysis = analyzeWeightTrend(
    input.weightData || [],
    input.patient.goals?.targetWeight,
    species
  )

  const vitalsAnalysis = analyzeVitals(
    input.vitals || [],
    input.patient
  )

  const medicationAnalysis = analyzeMedications(
    input.medications || [],
    isPet
  )

  // Pet-specific analyses (stubs for now)
  const petFeedingAnalysis = analyzePetFeeding(input.feedingData || [])
  const petVaccinationAnalysis = analyzePetVaccinations(input.vaccinations || [])

  return {
    age,
    isPet,
    species,
    weightAnalysis,
    vitalsAnalysis,
    medicationAnalysis,
    petFeedingAnalysis,
    petVaccinationAnalysis
  }
}

/**
 * Universal health summary generator
 * Automatically routes to human or pet summary based on patient type
 *
 * @param input - Health summary input data
 * @returns Complete analysis results
 */
export function generateHealthSummary(input: HealthSummaryInput): AnalysisResults {
  if (input.patient.type === 'pet') {
    return generatePetHealthSummary(input)
  } else {
    return generateHumanHealthSummary(input)
  }
}
