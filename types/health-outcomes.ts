/**
 * Health Outcomes & Nutrition-Vitals Correlation Types
 *
 * Implements bidirectional feedback loop between shopping/nutrition and health vitals.
 * Tracks the impact of dietary choices on health outcomes with statistical rigor.
 *
 * MEDICAL DISCLAIMER:
 * This system provides correlations, not medical advice. Correlations do not imply
 * causation. Always consult healthcare providers for medical decisions.
 */

import type { VitalType } from './medical'
import type { HealthSuggestionReason, ProductCategory } from './shopping'

// ==================== CORRELATION ANALYSIS ====================

/**
 * Statistical correlation strength classification
 */
export type CorrelationStrength = 'strong' | 'moderate' | 'weak' | 'none'

/**
 * Confidence level for correlation analysis
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'insufficient'

/**
 * Direction of vital change
 */
export type VitalTrend = 'improved' | 'worsened' | 'stable' | 'insufficient-data'

/**
 * Statistical correlation result
 */
export interface CorrelationStatistics {
  coefficient: number // Pearson's r (-1 to 1)
  pValue: number // Statistical significance (0 to 1)
  strength: CorrelationStrength
  confidence: ConfidenceLevel
  sampleSize: number // Number of data points used
  degreesOfFreedom: number
  effectSize?: number // Cohen's d for effect magnitude
}

/**
 * Nutrition-Vitals Correlation
 *
 * Links dietary changes to health outcome improvements over time.
 * Stores statistical evidence of nutrition impact on vitals.
 */
export interface NutritionVitalsCorrelation {
  id: string
  patientId: string
  userId: string // Account owner

  // Time range for analysis
  timeRange: {
    start: Date
    end: Date
    durationDays: number
  }

  // Vital being tracked
  vitalType: VitalType

  // What changed in vitals
  vitalChange: {
    baselineValue: number
    currentValue: number
    changeAbsolute: number // Current - baseline
    changePercent: number // % change
    improved: boolean // Based on medical guidelines
    trend: VitalTrend
    unit: string // 'mmHg', 'mg/dL', etc.
  }

  // What changed in nutrition during this time
  nutritionChanges: {
    // Foods that were started/increased
    increasedFoods: Array<{
      productName: string
      category: ProductCategory
      timesConsumed: number // How many meals included this
      averageServings: number // Avg servings per meal
      keyNutrients: string[] // ['potassium', 'fiber', etc.]
    }>

    // Foods that were stopped/decreased
    decreasedFoods: Array<{
      productName: string
      category: ProductCategory
      harmfulNutrients: string[] // ['sodium', 'saturated_fat', etc.]
    }>

    // AI suggestions that were followed
    aiSuggestionsFollowed: number // Count
    aiSuggestionsTotal: number // Total suggestions given
    adherenceRate: number // % of suggestions followed (0-100)

    // Nutrient intake changes
    nutrientChanges: Array<{
      nutrient: string // 'sodium', 'potassium', 'fiber', etc.
      beforeValue: number // mg/day average
      afterValue: number // mg/day average
      changeAmount: number // Absolute change
      changePercent: number // % change
      targetDirection: 'increase' | 'decrease' // What's healthy
      achievedTarget: boolean
    }>
  }

  // Statistical analysis
  correlation: CorrelationStatistics

  // Confounding factors (things that might affect correlation)
  confoundingFactors: {
    medicationChanges: boolean // Medications changed during period
    exerciseChanges: boolean // Significant exercise pattern changes
    stressEvents: boolean // Major life events
    seasonalFactors: boolean // Seasonal variations
    notes?: string
  }

  // User-facing insights
  insights: string[] // ["Your BP improved 10 points after eating more bananas"]
  recommendations: string[] // ["Keep eating potassium-rich foods"]
  warnings: string[] // ["Correlation does not prove causation", "Consult your doctor"]

  // Metadata
  generatedAt: Date
  lastUpdated: Date
  version: number // For tracking algorithm versions
  reviewStatus: 'unreviewed' | 'approved' | 'flagged' // For medical review
}

// ==================== HEALTH OUTCOMES ====================

/**
 * Health condition or goal being tracked
 */
export type HealthCondition =
  | 'high_blood_pressure'
  | 'hypertension'
  | 'diabetes'
  | 'high_cholesterol'
  | 'weight_loss'
  | 'weight_gain'
  | 'heart_disease'
  | 'general_health'

/**
 * Type of intervention/change
 */
export type InterventionType =
  | 'dietary_change'
  | 'medication'
  | 'exercise'
  | 'lifestyle'
  | 'ai_suggestion'

/**
 * Outcome result
 */
export type OutcomeResult =
  | 'significant_improvement' // >15% improvement
  | 'improvement' // 5-15% improvement
  | 'slight_improvement' // 1-5% improvement
  | 'no_change' // <1% change
  | 'slight_worsening' // 1-5% worsening
  | 'worsening' // >5% worsening

/**
 * Health Outcome
 *
 * Tracks overall health progress for a specific condition over time.
 * Links interventions (dietary changes, etc.) to health improvements.
 */
export interface HealthOutcome {
  id: string
  patientId: string
  userId: string // Account owner

  // What condition/goal is being tracked
  conditionType: HealthCondition
  conditionName: string // Human-readable name

  // Baseline (starting point)
  baseline: {
    date: Date
    vitalType: VitalType
    value: number
    unit: string
    notes?: string
  }

  // Current state
  current: {
    date: Date
    value: number
    unit: string
    notes?: string
  }

  // Milestones (significant checkpoints)
  milestones: Array<{
    date: Date
    value: number
    description: string // "Reached target BP", "Lost 10 lbs", etc.
    celebratory?: boolean // Trigger achievement badge
  }>

  // Interventions (what they did to improve)
  interventions: Array<{
    id: string
    type: InterventionType
    description: string
    startDate: Date
    endDate?: Date // null if ongoing

    // For dietary interventions
    foodsAdded?: string[]
    foodsRemoved?: string[]

    // Tracking adherence
    adherenceRate?: number // 0-100% (for AI suggestions)
    adherenceNotes?: string

    // Link to correlation analysis
    correlationId?: string // Links to NutritionVitalsCorrelation
  }>

  // Results & Progress
  outcome: {
    result: OutcomeResult
    changeAbsolute: number // Current - baseline
    changePercent: number // % change
    improved: boolean

    // Time to improvement
    daysToFirstImprovement?: number // Days until first 5% improvement
    daysToTarget?: number // Days to reach target (if applicable)

    // Sustained improvement
    sustainedImprovement: boolean // Maintained >30 days
    sustainedDays?: number

    // Goal achievement
    targetValue?: number // Target vital value
    targetReached: boolean
    targetDate?: Date
    onTrackForTarget: boolean
  }

  // Health score (0-100)
  healthScore: {
    current: number
    baseline: number
    trend: 'improving' | 'stable' | 'declining'
    factors: Array<{
      name: string
      score: number
      weight: number
    }>
  }

  // Metadata
  createdAt: Date
  lastUpdated: Date
  trackingStatus: 'active' | 'paused' | 'completed' | 'abandoned'
}

// ==================== SUGGESTION EFFECTIVENESS ====================

/**
 * Tracks effectiveness of AI shopping suggestions
 */
export interface SuggestionEffectiveness {
  id: string
  patientId: string
  userId: string

  // Original suggestion
  suggestionId: string // Reference to HealthBasedSuggestion
  productName: string
  category: ProductCategory
  reason: HealthSuggestionReason
  suggestedAt: Date

  // Adoption tracking
  adoption: {
    wasPurchased: boolean
    purchaseDate?: Date
    purchaseCount: number // How many times purchased

    wasConsumed: boolean // Appears in meal logs
    firstConsumedDate?: Date
    consumptionCount: number // How many meals included this
    averageServingsPerMeal: number

    daysInDiet: number // How many days they've been eating this
    stillConsuming: boolean // Ate it in last 7 days
  }

  // Impact on vitals
  impact: {
    vitalType?: VitalType

    // Before-after comparison
    baselineVital?: {
      value: number
      date: Date
      unit: string
    }

    currentVital?: {
      value: number
      date: Date
      unit: string
    }

    // Change
    vitalImproved: boolean
    changeAbsolute?: number
    changePercent?: number

    // Statistical confidence
    correlationId?: string // Link to NutritionVitalsCorrelation
    confidence: ConfidenceLevel
  }

  // Overall effectiveness score
  effectivenessScore: number // 0-100
  // Score = (adoption 40%) + (consumption 30%) + (vital impact 30%)

  // Feedback to AI learning
  reinforcementSignal: 'positive' | 'negative' | 'neutral' | 'insufficient-data'

  // Metadata
  trackingStartDate: Date
  trackingEndDate?: Date
  lastEvaluated: Date
  status: 'tracking' | 'completed' | 'insufficient-data'
}

// ==================== NUTRITION TRACKING ====================

/**
 * Links purchased items to actual consumption
 */
export interface ConsumptionEvent {
  id: string
  patientId: string
  userId: string

  // Shopping item that was consumed
  shoppingItemId: string
  productName: string
  category: ProductCategory

  // When consumed
  mealLogId: string // Links to MealLog
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  consumedAt: Date

  // How much consumed
  servings: number
  servingSize: string

  // Nutrition consumed
  nutritionConsumed?: {
    calories: number
    protein: number
    carbs: number
    fat: number
    fiber: number
    sodium?: number
    potassium?: number
    // ... other tracked nutrients
  }

  // Links to suggestions
  wasAISuggested: boolean
  suggestionId?: string

  // Metadata
  loggedAt: Date
  loggedBy: string
}

/**
 * Dietary Pattern Analysis
 */
export interface DietaryPattern {
  id: string
  patientId: string
  userId: string

  // Time period analyzed
  period: {
    start: Date
    end: Date
    durationDays: number
  }

  // Food frequency
  frequentFoods: Array<{
    productName: string
    category: ProductCategory
    timesConsumed: number
    daysConsumed: number
    frequencyPerWeek: number
    trend: 'increasing' | 'stable' | 'decreasing'
  }>

  // Nutrient averages
  averageNutrition: {
    daily: {
      calories: number
      protein: number
      carbs: number
      fat: number
      fiber: number
      sodium: number
      potassium: number
      // ... other nutrients
    }
    weekly: {
      calories: number
      protein: number
      // ... other nutrients
    }
  }

  // Pattern changes
  changes: Array<{
    nutrient: string
    previousAverage: number
    currentAverage: number
    changePercent: number
    changeDirection: 'increase' | 'decrease'
    healthImpact: 'positive' | 'negative' | 'neutral'
  }>

  // Health-aligned patterns
  healthyPatterns: string[] // ["Eating more potassium", "Reduced sodium"]
  concerningPatterns: string[] // ["High sodium intake", "Low fiber"]

  // Adherence to recommendations
  adherenceToAI: number // % of AI suggestions being followed
  adherenceToMedical: number // % alignment with medical guidelines

  // Metadata
  generatedAt: Date
  analysisVersion: number
}

// ==================== HEALTH REPORTS ====================

/**
 * Progress Report for User
 */
export interface HealthProgressReport {
  id: string
  patientId: string
  userId: string

  // Report period
  period: {
    start: Date
    end: Date
    label: string // "Weekly", "Monthly", etc.
  }

  // Vital improvements
  vitalProgress: Array<{
    vitalType: VitalType
    vitalName: string
    baseline: number
    current: number
    change: number
    changePercent: number
    improved: boolean
    trend: VitalTrend
    unit: string
    icon: string
    color: 'green' | 'yellow' | 'red'
  }>

  // Nutrition achievements
  nutritionAchievements: Array<{
    title: string
    description: string
    achievedAt: Date
    icon: string
    category: 'diet' | 'shopping' | 'adherence' | 'milestone'
  }>

  // Correlation insights
  insights: Array<{
    text: string
    confidence: ConfidenceLevel
    impact: 'high' | 'medium' | 'low'
    actionable: boolean
    recommendation?: string
  }>

  // Gamification
  badges: Array<{
    id: string
    name: string
    description: string
    icon: string
    earnedAt: Date
    tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  }>

  streaks: {
    healthyShopping: number // Days in a row
    mealLogging: number
    vitalsTracking: number
    aiAdherence: number
  }

  // Goals
  goals: Array<{
    name: string
    target: number
    current: number
    progress: number // 0-100%
    onTrack: boolean
    estimatedCompletion?: Date
  }>

  // Next steps
  recommendations: string[]
  warnings: string[]

  // Metadata
  generatedAt: Date
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom'
}

// ==================== ANALYTICS ====================

/**
 * Predictive Health Analytics
 */
export interface HealthPrediction {
  id: string
  patientId: string
  userId: string

  vitalType: VitalType

  // Current state
  currentValue: number
  currentDate: Date

  // Prediction (30-90 days out)
  predictedValue: number
  predictedDate: Date
  predictedChange: number
  predictedChangePercent: number

  // Confidence
  confidence: ConfidenceLevel
  confidenceScore: number // 0-100

  // Based on
  basedOn: {
    historicalData: number // Days of data used
    dietaryPatterns: boolean
    adherenceRate: number
    vitalTrends: VitalTrend
  }

  // Scenarios
  scenarios: {
    best: { value: number; condition: string } // "If you follow all suggestions"
    likely: { value: number; condition: string } // "Based on current trends"
    worst: { value: number; condition: string } // "If current patterns continue"
  }

  // Recommendations to improve prediction
  recommendations: string[]

  // Metadata
  generatedAt: Date
  modelVersion: string
}

// ==================== CONSENT & PRIVACY ====================

/**
 * User consent for health correlation tracking
 */
export interface HealthCorrelationConsent {
  patientId: string
  userId: string

  // Consent status
  consentGiven: boolean
  consentDate?: Date
  consentVersion: string // Version of terms accepted

  // Granular permissions
  permissions: {
    trackNutritionVitals: boolean
    generateInsights: boolean
    shareWithCaregivers: boolean
    useForAILearning: boolean
    exportData: boolean
  }

  // Privacy preferences
  privacy: {
    dataRetentionDays: number // How long to keep correlation data
    anonymizeData: boolean // Remove personal identifiers
    optOutAnalytics: boolean
  }

  // Metadata
  lastUpdated: Date
  ipAddress?: string
  userAgent?: string
}

// ==================== API TYPES ====================

/**
 * Request to generate correlation analysis
 */
export interface CorrelationAnalysisRequest {
  patientId: string
  vitalType: VitalType
  timeRangeDays: number // How far back to analyze
  minimumDataPoints?: number // Default: 5
}

/**
 * Request to generate health report
 */
export interface HealthReportRequest {
  patientId: string
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  startDate?: Date
  endDate?: Date
  includeVitals?: boolean
  includeNutrition?: boolean
  includeCorrelations?: boolean
  includePredictions?: boolean
}

/**
 * Nutrition adherence calculation
 */
export interface AdherenceMetrics {
  patientId: string
  period: {
    start: Date
    end: Date
  }

  // AI suggestions
  aiSuggestions: {
    total: number
    purchased: number
    consumed: number
    purchaseRate: number // %
    consumptionRate: number // %
  }

  // Dietary patterns
  healthyChoices: number
  unhealthyChoices: number
  healthyRatio: number // %

  // Streak tracking
  longestStreak: number // Days
  currentStreak: number // Days

  // Overall score
  adherenceScore: number // 0-100
}

// ==================== CONSTANTS ====================

/**
 * Statistical thresholds for correlation analysis
 */
export const CORRELATION_THRESHOLDS = {
  strong: 0.7, // r > 0.7
  moderate: 0.5, // r > 0.5
  weak: 0.3, // r > 0.3
} as const

/**
 * Confidence level thresholds
 */
export const CONFIDENCE_THRESHOLDS = {
  high: { minSampleSize: 10, maxPValue: 0.05 },
  medium: { minSampleSize: 5, maxPValue: 0.1 },
  low: { minSampleSize: 3, maxPValue: 0.2 },
} as const

/**
 * Minimum data requirements
 */
export const MIN_DATA_REQUIREMENTS = {
  vitals: 2, // Minimum vital readings (before + after)
  meals: 3, // Minimum meal logs
  shoppingItems: 1, // Minimum purchases
  durationDays: 14, // Minimum tracking period
  maxDurationDays: 84, // Maximum tracking period (12 weeks)
} as const

/**
 * Vital improvement thresholds (for each vital type)
 */
export const VITAL_IMPROVEMENT_THRESHOLDS = {
  blood_pressure: {
    systolic: { significant: -15, moderate: -10, slight: -5 },
    diastolic: { significant: -10, moderate: -5, slight: -3 },
  },
  blood_sugar: {
    fasting: { significant: -40, moderate: -20, slight: -10 },
  },
  weight: {
    lbs: { significant: -10, moderate: -5, slight: -2 },
  },
} as const
