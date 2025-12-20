/**
 * Nutrition-Vitals Correlation Engine
 *
 * Tracks the impact of shopping/nutrition choices on health vitals.
 * Provides bidirectional feedback loop between dietary changes and health outcomes.
 *
 * MEDICAL DISCLAIMER:
 * This system identifies correlations, not causation. Results should not be used
 * for medical diagnosis or treatment decisions. Always consult healthcare providers.
 *
 * Key Functions:
 * - trackShoppingImpact() - Record when AI-suggested items are purchased
 * - trackConsumption() - Link purchases to meal logs (actual eating)
 * - correlateNutritionWithVitals() - Statistical correlation analysis
 * - calculateNutritionAdherence() - % of healthy suggestions followed
 * - analyzeDietaryPatterns() - Identify eating pattern changes
 */

'use client'

import { logger } from '@/lib/logger'
import type {
  NutritionVitalsCorrelation,
  ConsumptionEvent,
  DietaryPattern,
  SuggestionEffectiveness,
  CorrelationStatistics,
  CorrelationStrength,
  ConfidenceLevel,
  VitalTrend,
  AdherenceMetrics,
  CORRELATION_THRESHOLDS,
  CONFIDENCE_THRESHOLDS,
  MIN_DATA_REQUIREMENTS,
} from '@/types/health-outcomes'
import type { VitalSign, VitalType, MealLog } from '@/types/medical'
import type { ShoppingItem, HealthBasedSuggestion } from '@/types/shopping'

// Import thresholds
const CORR_THRESHOLDS = { strong: 0.7, moderate: 0.5, weak: 0.3 }
const CONF_THRESHOLDS = {
  high: { minSampleSize: 10, maxPValue: 0.05 },
  medium: { minSampleSize: 5, maxPValue: 0.1 },
  low: { minSampleSize: 3, maxPValue: 0.2 },
}
const MIN_DATA = {
  vitals: 2,
  meals: 3,
  shoppingItems: 1,
  durationDays: 14,
  maxDurationDays: 84,
}

// ==================== SHOPPING IMPACT TRACKING ====================

/**
 * Track when AI-suggested items are purchased
 *
 * Links shopping purchases to the health suggestions that triggered them.
 * This enables effectiveness tracking.
 */
export async function trackShoppingImpact(
  patientId: string,
  userId: string,
  shoppingItem: ShoppingItem,
  suggestion?: HealthBasedSuggestion
): Promise<void> {
  try {
    logger.info('[Nutrition Correlation] Tracking shopping impact', {
      patientId,
      productName: shoppingItem.productName,
      wasSuggested: !!suggestion,
    })

    // If this purchase was from an AI suggestion, record it
    if (suggestion) {
      const effectiveness: Partial<SuggestionEffectiveness> = {
        patientId,
        userId,
        suggestionId: suggestion.id,
        productName: suggestion.productName,
        category: suggestion.category,
        reason: suggestion.reason,
        suggestedAt: suggestion.generatedAt,
        adoption: {
          wasPurchased: true,
          purchaseDate: shoppingItem.lastPurchased || new Date(),
          purchaseCount: 1,
          wasConsumed: false, // Will be updated when meal is logged
          consumptionCount: 0,
          averageServingsPerMeal: 0,
          daysInDiet: 0,
          stillConsuming: false,
        },
        impact: {
          confidence: 'insufficient',
          vitalImproved: false,
        },
        effectivenessScore: 40, // 40% for purchase alone
        reinforcementSignal: 'neutral',
        trackingStartDate: new Date(),
        status: 'tracking',
        lastEvaluated: new Date(),
      }

      // Store in Firestore (implementation depends on your Firebase setup)
      // await saveToFirestore(`suggestion_effectiveness/${patientId}/suggestions/${suggestion.id}`, effectiveness)

      logger.info('[Nutrition Correlation] Shopping impact tracked', {
        patientId,
        suggestionId: suggestion.id,
        effectivenessScore: 40,
      })
    }
  } catch (error) {
    logger.error('[Nutrition Correlation] Error tracking shopping impact', error as Error, {
      patientId,
      productName: shoppingItem.productName,
    })
    throw error
  }
}

// ==================== CONSUMPTION TRACKING ====================

/**
 * Track consumption - Link purchases to meal logs
 *
 * When a user logs a meal, this function identifies which purchased items
 * were consumed and creates ConsumptionEvent records.
 */
export async function trackConsumption(
  patientId: string,
  userId: string,
  mealLog: MealLog,
  shoppingItems: ShoppingItem[]
): Promise<ConsumptionEvent[]> {
  try {
    logger.info('[Nutrition Correlation] Tracking consumption', {
      patientId,
      mealType: mealLog.mealType,
      foodItemCount: mealLog.foodItems?.length || 0,
    })

    const consumptionEvents: ConsumptionEvent[] = []

    // Match meal log food items to shopping items
    for (const foodItemName of mealLog.foodItems || []) {
      // Find matching shopping items (fuzzy match on product name)
      const matchedItems = shoppingItems.filter(item =>
        fuzzyMatch(item.productName, foodItemName)
      )

      for (const shoppingItem of matchedItems) {
        const consumptionEvent: ConsumptionEvent = {
          id: generateId(),
          patientId,
          userId,
          shoppingItemId: shoppingItem.id,
          productName: shoppingItem.productName,
          category: shoppingItem.category,
          mealLogId: mealLog.id,
          mealType: mealLog.mealType,
          consumedAt: new Date(mealLog.loggedAt),
          servings: 1, // Default, could be parsed from food item
          servingSize: shoppingItem.nutrition?.servingSize || 'unknown',
          nutritionConsumed: shoppingItem.nutrition
            ? {
                calories: shoppingItem.nutrition.calories,
                protein: shoppingItem.nutrition.protein,
                carbs: shoppingItem.nutrition.carbs,
                fat: shoppingItem.nutrition.fat,
                fiber: shoppingItem.nutrition.fiber,
              }
            : undefined,
          wasAISuggested: false, // Will be updated if linked to suggestion
          loggedAt: new Date(),
          loggedBy: userId,
        }

        consumptionEvents.push(consumptionEvent)

        // Save to Firestore
        // await saveToFirestore(`consumption_events/${patientId}/events/${consumptionEvent.id}`, consumptionEvent)
      }
    }

    logger.info('[Nutrition Correlation] Consumption tracked', {
      patientId,
      mealLogId: mealLog.id,
      consumptionEventCount: consumptionEvents.length,
    })

    return consumptionEvents
  } catch (error) {
    logger.error('[Nutrition Correlation] Error tracking consumption', error as Error, {
      patientId,
      mealLogId: mealLog.id,
    })
    throw error
  }
}

// ==================== CORRELATION ANALYSIS ====================

/**
 * Correlate nutrition changes with vital changes
 *
 * Performs statistical analysis to identify relationships between
 * dietary changes and health outcome improvements.
 */
export async function correlateNutritionWithVitals(
  patientId: string,
  userId: string,
  vitalType: VitalType,
  timeRangeDays: number = 30
): Promise<NutritionVitalsCorrelation | null> {
  try {
    logger.info('[Nutrition Correlation] Starting correlation analysis', {
      patientId,
      vitalType,
      timeRangeDays,
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRangeDays)

    // 1. Fetch vitals for this period
    const vitals = await fetchVitals(patientId, vitalType, startDate, endDate)

    if (vitals.length < MIN_DATA.vitals) {
      logger.warn('[Nutrition Correlation] Insufficient vitals data', {
        patientId,
        vitalType,
        required: MIN_DATA.vitals,
        found: vitals.length,
      })
      return null
    }

    // 2. Fetch meal logs for this period
    const mealLogs = await fetchMealLogs(patientId, startDate, endDate)

    if (mealLogs.length < MIN_DATA.meals) {
      logger.warn('[Nutrition Correlation] Insufficient meal data', {
        patientId,
        required: MIN_DATA.meals,
        found: mealLogs.length,
      })
      return null
    }

    // 3. Fetch consumption events
    const consumptionEvents = await fetchConsumptionEvents(patientId, startDate, endDate)

    // 4. Fetch AI suggestions for this period
    const aiSuggestions = await fetchAISuggestions(patientId, startDate, endDate)

    // 5. Calculate vital change
    const baselineVital = vitals[0] // Earliest
    const currentVital = vitals[vitals.length - 1] // Latest
    const vitalChange = calculateVitalChange(baselineVital, currentVital, vitalType)

    // 6. Analyze nutrition changes
    const nutritionChanges = analyzeDietaryChanges(
      mealLogs,
      consumptionEvents,
      aiSuggestions,
      startDate,
      endDate
    )

    // 7. Perform statistical correlation
    const correlation = calculateStatisticalCorrelation(
      vitals,
      mealLogs,
      consumptionEvents,
      vitalType
    )

    // 8. Check for confounding factors
    const confoundingFactors = await checkConfoundingFactors(
      patientId,
      startDate,
      endDate
    )

    // 9. Generate insights
    const insights = generateInsights(vitalChange, nutritionChanges, correlation)
    const recommendations = generateRecommendations(vitalChange, nutritionChanges, correlation)
    const warnings = generateWarnings(correlation, confoundingFactors)

    // 10. Create correlation record
    const correlationRecord: NutritionVitalsCorrelation = {
      id: generateId(),
      patientId,
      userId,
      timeRange: {
        start: startDate,
        end: endDate,
        durationDays: timeRangeDays,
      },
      vitalType,
      vitalChange,
      nutritionChanges,
      correlation,
      confoundingFactors,
      insights,
      recommendations,
      warnings,
      generatedAt: new Date(),
      lastUpdated: new Date(),
      version: 1,
      reviewStatus: 'unreviewed',
    }

    // Save to Firestore
    // await saveToFirestore(`nutrition_vitals_correlations/${patientId}/correlations/${correlationRecord.id}`, correlationRecord)

    logger.info('[Nutrition Correlation] Correlation analysis complete', {
      patientId,
      vitalType,
      correlationStrength: correlation.strength,
      vitalImproved: vitalChange.improved,
    })

    return correlationRecord
  } catch (error) {
    logger.error('[Nutrition Correlation] Error in correlation analysis', error as Error, {
      patientId,
      vitalType,
    })
    throw error
  }
}

// ==================== ADHERENCE CALCULATION ====================

/**
 * Calculate nutrition adherence
 *
 * Measures how well the patient is following AI suggestions and
 * healthy eating patterns.
 */
export async function calculateNutritionAdherence(
  patientId: string,
  userId: string,
  timeRangeDays: number = 30
): Promise<AdherenceMetrics> {
  try {
    logger.info('[Nutrition Correlation] Calculating adherence', {
      patientId,
      timeRangeDays,
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRangeDays)

    // Fetch AI suggestions
    const aiSuggestions = await fetchAISuggestions(patientId, startDate, endDate)

    // Fetch shopping items (purchases)
    const shoppingItems = await fetchShoppingItems(patientId, startDate, endDate)

    // Fetch consumption events
    const consumptionEvents = await fetchConsumptionEvents(patientId, startDate, endDate)

    // Calculate purchase rate
    const suggestedProductNames = aiSuggestions.map(s => s.productName.toLowerCase())
    const purchasedSuggestions = shoppingItems.filter(item =>
      suggestedProductNames.includes(item.productName.toLowerCase())
    )
    const purchaseRate = aiSuggestions.length > 0
      ? (purchasedSuggestions.length / aiSuggestions.length) * 100
      : 0

    // Calculate consumption rate
    const consumedSuggestions = consumptionEvents.filter(event =>
      suggestedProductNames.includes(event.productName.toLowerCase())
    )
    const consumptionRate = purchasedSuggestions.length > 0
      ? (consumedSuggestions.length / purchasedSuggestions.length) * 100
      : 0

    // Calculate healthy vs unhealthy choices
    const healthyChoices = shoppingItems.filter(item =>
      isHealthyChoice(item)
    ).length
    const unhealthyChoices = shoppingItems.filter(item =>
      !isHealthyChoice(item)
    ).length
    const healthyRatio = shoppingItems.length > 0
      ? (healthyChoices / shoppingItems.length) * 100
      : 0

    // Calculate streaks
    const { longestStreak, currentStreak } = calculateStreaks(shoppingItems)

    // Overall adherence score
    const adherenceScore = Math.round(
      (purchaseRate * 0.4) + (consumptionRate * 0.3) + (healthyRatio * 0.3)
    )

    const metrics: AdherenceMetrics = {
      patientId,
      period: { start: startDate, end: endDate },
      aiSuggestions: {
        total: aiSuggestions.length,
        purchased: purchasedSuggestions.length,
        consumed: consumedSuggestions.length,
        purchaseRate: Math.round(purchaseRate),
        consumptionRate: Math.round(consumptionRate),
      },
      healthyChoices,
      unhealthyChoices,
      healthyRatio: Math.round(healthyRatio),
      longestStreak,
      currentStreak,
      adherenceScore,
    }

    logger.info('[Nutrition Correlation] Adherence calculated', {
      patientId,
      adherenceScore,
      purchaseRate: Math.round(purchaseRate),
      consumptionRate: Math.round(consumptionRate),
    })

    return metrics
  } catch (error) {
    logger.error('[Nutrition Correlation] Error calculating adherence', error as Error, {
      patientId,
    })
    throw error
  }
}

// ==================== DIETARY PATTERN ANALYSIS ====================

/**
 * Analyze dietary patterns
 *
 * Identifies changes in eating patterns over time and their
 * alignment with health goals.
 */
export async function analyzeDietaryPatterns(
  patientId: string,
  userId: string,
  timeRangeDays: number = 30
): Promise<DietaryPattern> {
  try {
    logger.info('[Nutrition Correlation] Analyzing dietary patterns', {
      patientId,
      timeRangeDays,
    })

    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRangeDays)

    // Fetch data
    const mealLogs = await fetchMealLogs(patientId, startDate, endDate)
    const consumptionEvents = await fetchConsumptionEvents(patientId, startDate, endDate)
    const aiSuggestions = await fetchAISuggestions(patientId, startDate, endDate)

    // Calculate food frequency
    const foodFrequency = calculateFoodFrequency(consumptionEvents, timeRangeDays)

    // Calculate average nutrition
    const averageNutrition = calculateAverageNutrition(mealLogs, timeRangeDays)

    // Detect pattern changes (compare to previous period)
    const previousStartDate = new Date(startDate)
    previousStartDate.setDate(previousStartDate.getDate() - timeRangeDays)
    const previousMealLogs = await fetchMealLogs(patientId, previousStartDate, startDate)
    const changes = detectNutritionChanges(previousMealLogs, mealLogs)

    // Identify healthy and concerning patterns
    const healthyPatterns = identifyHealthyPatterns(changes, foodFrequency)
    const concerningPatterns = identifyConcerningPatterns(changes, foodFrequency)

    // Calculate adherence
    const adherenceMetrics = await calculateNutritionAdherence(patientId, userId, timeRangeDays)

    const pattern: DietaryPattern = {
      id: generateId(),
      patientId,
      userId,
      period: {
        start: startDate,
        end: endDate,
        durationDays: timeRangeDays,
      },
      frequentFoods: foodFrequency,
      averageNutrition,
      changes,
      healthyPatterns,
      concerningPatterns,
      adherenceToAI: adherenceMetrics.aiSuggestions.purchaseRate,
      adherenceToMedical: adherenceMetrics.healthyRatio,
      generatedAt: new Date(),
      analysisVersion: 1,
    }

    logger.info('[Nutrition Correlation] Dietary patterns analyzed', {
      patientId,
      frequentFoodCount: foodFrequency.length,
      healthyPatternCount: healthyPatterns.length,
      concerningPatternCount: concerningPatterns.length,
    })

    return pattern
  } catch (error) {
    logger.error('[Nutrition Correlation] Error analyzing dietary patterns', error as Error, {
      patientId,
    })
    throw error
  }
}

// ==================== STATISTICAL HELPERS ====================

/**
 * Calculate statistical correlation using Pearson's r
 */
function calculateStatisticalCorrelation(
  vitals: VitalSign[],
  mealLogs: MealLog[],
  consumptionEvents: ConsumptionEvent[],
  vitalType: VitalType
): CorrelationStatistics {
  // Sort by date
  const sortedVitals = [...vitals].sort((a, b) =>
    new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
  )

  // Extract values
  const vitalValues = sortedVitals.map(v => extractVitalValue(v, vitalType))
  const n = vitalValues.length

  if (n < 2) {
    return {
      coefficient: 0,
      pValue: 1,
      strength: 'none',
      confidence: 'insufficient',
      sampleSize: n,
      degreesOfFreedom: 0,
    }
  }

  // For time-series, calculate trend correlation
  const timePoints = vitalValues.map((_, i) => i)
  const correlation = pearsonCorrelation(timePoints, vitalValues)

  // Calculate p-value
  const pValue = calculatePValue(correlation.coefficient, n)

  // Classify strength
  const strength = classifyCorrelationStrength(Math.abs(correlation.coefficient))

  // Determine confidence
  const confidence = determineConfidence(n, pValue)

  return {
    coefficient: correlation.coefficient,
    pValue,
    strength,
    confidence,
    sampleSize: n,
    degreesOfFreedom: n - 2,
    effectSize: correlation.effectSize,
  }
}

/**
 * Pearson correlation coefficient
 */
function pearsonCorrelation(
  x: number[],
  y: number[]
): { coefficient: number; effectSize?: number } {
  const n = x.length
  if (n === 0) return { coefficient: 0 }

  const meanX = mean(x)
  const meanY = mean(y)

  const numerator = sum(x.map((xi, i) => (xi - meanX) * (y[i] - meanY)))
  const denominator = Math.sqrt(
    sum(x.map(xi => Math.pow(xi - meanX, 2))) *
    sum(y.map(yi => Math.pow(yi - meanY, 2)))
  )

  const r = denominator === 0 ? 0 : numerator / denominator

  // Calculate Cohen's d (effect size)
  const pooledStd = Math.sqrt(
    (variance(x) + variance(y)) / 2
  )
  const effectSize = pooledStd === 0 ? 0 : Math.abs(meanY - meanX) / pooledStd

  return { coefficient: r, effectSize }
}

/**
 * Calculate p-value for correlation
 */
function calculatePValue(r: number, n: number): number {
  if (n < 3) return 1

  const t = r * Math.sqrt(n - 2) / Math.sqrt(1 - r * r)
  const df = n - 2

  // Simplified p-value calculation (two-tailed)
  // In production, use a proper statistical library
  return 2 * (1 - tDistribution(Math.abs(t), df))
}

/**
 * Simplified t-distribution CDF
 */
function tDistribution(t: number, df: number): number {
  // Approximation for t-distribution
  // In production, use a proper statistical library like jStat or simple-statistics
  const x = df / (df + t * t)
  return 0.5 + 0.5 * Math.sign(t) * (1 - betaIncomplete(df / 2, 0.5, x))
}

/**
 * Incomplete beta function (approximation)
 */
function betaIncomplete(a: number, b: number, x: number): number {
  // Simplified approximation
  // In production, use a proper statistical library
  if (x === 0) return 0
  if (x === 1) return 1
  return Math.pow(x, a) * Math.pow(1 - x, b - 1)
}

/**
 * Classify correlation strength
 */
function classifyCorrelationStrength(r: number): CorrelationStrength {
  if (r > CORR_THRESHOLDS.strong) return 'strong'
  if (r > CORR_THRESHOLDS.moderate) return 'moderate'
  if (r > CORR_THRESHOLDS.weak) return 'weak'
  return 'none'
}

/**
 * Determine confidence level
 */
function determineConfidence(sampleSize: number, pValue: number): ConfidenceLevel {
  if (sampleSize >= CONF_THRESHOLDS.high.minSampleSize && pValue <= CONF_THRESHOLDS.high.maxPValue) {
    return 'high'
  }
  if (sampleSize >= CONF_THRESHOLDS.medium.minSampleSize && pValue <= CONF_THRESHOLDS.medium.maxPValue) {
    return 'medium'
  }
  if (sampleSize >= CONF_THRESHOLDS.low.minSampleSize && pValue <= CONF_THRESHOLDS.low.maxPValue) {
    return 'low'
  }
  return 'insufficient'
}

// ==================== DATA ANALYSIS HELPERS ====================

/**
 * Calculate vital change
 */
function calculateVitalChange(
  baseline: VitalSign,
  current: VitalSign,
  vitalType: VitalType
): any {
  const baselineValue = extractVitalValue(baseline, vitalType)
  const currentValue = extractVitalValue(current, vitalType)
  const changeAbsolute = currentValue - baselineValue
  const changePercent = (changeAbsolute / baselineValue) * 100

  // Determine if improved (depends on vital type and direction)
  const improved = isVitalImproved(vitalType, changeAbsolute, baselineValue)

  const trend: VitalTrend = improved ? 'improved' : changeAbsolute < 0 ? 'worsened' : 'stable'

  return {
    baselineValue,
    currentValue,
    changeAbsolute,
    changePercent: Math.round(changePercent * 10) / 10,
    improved,
    trend,
    unit: baseline.unit,
  }
}

/**
 * Extract numeric value from vital sign
 */
function extractVitalValue(vital: VitalSign, vitalType: VitalType): number {
  if (vitalType === 'blood_pressure' && typeof vital.value === 'object') {
    // Use systolic for blood pressure
    return (vital.value as any).systolic || 0
  }
  return typeof vital.value === 'number' ? vital.value : 0
}

/**
 * Determine if vital improved
 */
function isVitalImproved(vitalType: VitalType, change: number, baseline: number): boolean {
  switch (vitalType) {
    case 'blood_pressure':
      return change < 0 // Lower is better
    case 'blood_sugar':
      return baseline > 100 ? change < 0 : false // Lower is better if elevated
    case 'weight':
      return change < 0 // Usually lower is better (context-dependent)
    default:
      return change < 0
  }
}

/**
 * Analyze dietary changes
 */
function analyzeDietaryChanges(
  mealLogs: MealLog[],
  consumptionEvents: ConsumptionEvent[],
  aiSuggestions: HealthBasedSuggestion[],
  startDate: Date,
  endDate: Date
): any {
  // Count AI suggestions followed
  const suggestedProducts = aiSuggestions.map(s => s.productName.toLowerCase())
  const purchasedProducts = consumptionEvents.map(e => e.productName.toLowerCase())
  const aiSuggestionsFollowed = suggestedProducts.filter(p => purchasedProducts.includes(p)).length

  const adherenceRate = aiSuggestions.length > 0
    ? (aiSuggestionsFollowed / aiSuggestions.length) * 100
    : 0

  // Identify increased foods (foods consumed in recent period)
  const increasedFoods = identifyIncreasedFoods(consumptionEvents)

  // Placeholder for nutrient changes (would require detailed meal log analysis)
  const nutrientChanges: any[] = []

  return {
    increasedFoods,
    decreasedFoods: [],
    aiSuggestionsFollowed,
    aiSuggestionsTotal: aiSuggestions.length,
    adherenceRate: Math.round(adherenceRate),
    nutrientChanges,
  }
}

/**
 * Identify increased foods
 */
function identifyIncreasedFoods(consumptionEvents: ConsumptionEvent[]): any[] {
  const foodCounts = new Map<string, number>()

  for (const event of consumptionEvents) {
    const count = foodCounts.get(event.productName) || 0
    foodCounts.set(event.productName, count + 1)
  }

  return Array.from(foodCounts.entries())
    .map(([productName, count]) => ({
      productName,
      category: 'produce' as any, // Would need to lookup from shopping items
      timesConsumed: count,
      averageServings: 1,
      keyNutrients: [],
    }))
    .sort((a, b) => b.timesConsumed - a.timesConsumed)
    .slice(0, 10) // Top 10
}

/**
 * Check for confounding factors
 */
async function checkConfoundingFactors(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<any> {
  // In production, check patient medication changes, exercise logs, etc.
  return {
    medicationChanges: false,
    exerciseChanges: false,
    stressEvents: false,
    seasonalFactors: false,
  }
}

/**
 * Generate insights
 */
function generateInsights(
  vitalChange: any,
  nutritionChanges: any,
  correlation: CorrelationStatistics
): string[] {
  const insights: string[] = []

  if (vitalChange.improved && correlation.strength !== 'none') {
    insights.push(
      `Your vitals improved by ${Math.abs(vitalChange.changePercent)}% during this period.`
    )

    if (nutritionChanges.adherenceRate > 50) {
      insights.push(
        `You followed ${nutritionChanges.adherenceRate}% of AI suggestions. Great job!`
      )
    }

    if (nutritionChanges.increasedFoods.length > 0) {
      const topFood = nutritionChanges.increasedFoods[0]
      insights.push(
        `You ate more ${topFood.productName} (${topFood.timesConsumed} times). This may have contributed to your improvement.`
      )
    }
  }

  if (correlation.confidence === 'insufficient') {
    insights.push(
      'Keep tracking your meals and vitals! We need more data to identify patterns.'
    )
  }

  return insights
}

/**
 * Generate recommendations
 */
function generateRecommendations(
  vitalChange: any,
  nutritionChanges: any,
  correlation: CorrelationStatistics
): string[] {
  const recommendations: string[] = []

  if (vitalChange.improved) {
    recommendations.push('Keep up your healthy eating habits!')

    if (nutritionChanges.increasedFoods.length > 0) {
      const topFood = nutritionChanges.increasedFoods[0]
      recommendations.push(`Continue eating ${topFood.productName} regularly.`)
    }
  } else {
    recommendations.push('Try following more AI suggestions for better results.')
    recommendations.push('Log your meals consistently to track patterns.')
  }

  return recommendations
}

/**
 * Generate warnings
 */
function generateWarnings(
  correlation: CorrelationStatistics,
  confoundingFactors: any
): string[] {
  const warnings: string[] = [
    'Correlation does not imply causation. Many factors affect your health.',
    'Always consult your healthcare provider before making medical decisions.',
  ]

  if (correlation.confidence === 'low' || correlation.confidence === 'insufficient') {
    warnings.push('Limited data available. Results should be interpreted with caution.')
  }

  if (confoundingFactors.medicationChanges) {
    warnings.push('Medication changes may have affected your vitals during this period.')
  }

  return warnings
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate food frequency
 */
function calculateFoodFrequency(
  events: ConsumptionEvent[],
  durationDays: number
): any[] {
  const frequency = new Map<string, any>()

  for (const event of events) {
    const existing = frequency.get(event.productName) || {
      productName: event.productName,
      category: event.category,
      timesConsumed: 0,
      daysConsumed: new Set(),
    }

    existing.timesConsumed++
    existing.daysConsumed.add(new Date(event.consumedAt).toDateString())

    frequency.set(event.productName, existing)
  }

  return Array.from(frequency.values()).map(f => ({
    ...f,
    daysConsumed: f.daysConsumed.size,
    frequencyPerWeek: (f.timesConsumed / durationDays) * 7,
    trend: 'stable' as any,
  }))
}

/**
 * Calculate average nutrition
 */
function calculateAverageNutrition(mealLogs: MealLog[], durationDays: number): any {
  const totals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
    potassium: 0,
  }

  let count = 0
  for (const meal of mealLogs) {
    if (meal.calories) {
      totals.calories += meal.calories
      totals.protein += meal.protein || 0
      totals.carbs += meal.carbs || 0
      totals.fat += meal.fat || 0
      totals.fiber += meal.fiber || 0
      count++
    }
  }

  const daily = count > 0 ? {
    calories: Math.round(totals.calories / count),
    protein: Math.round(totals.protein / count),
    carbs: Math.round(totals.carbs / count),
    fat: Math.round(totals.fat / count),
    fiber: Math.round(totals.fiber / count),
    sodium: Math.round(totals.sodium / count),
    potassium: Math.round(totals.potassium / count),
  } : totals

  return {
    daily,
    weekly: {
      calories: daily.calories * 7,
      protein: daily.protein * 7,
    },
  }
}

/**
 * Detect nutrition changes
 */
function detectNutritionChanges(previousMeals: MealLog[], currentMeals: MealLog[]): any[] {
  // Placeholder - would compare average nutrient intake between periods
  return []
}

/**
 * Identify healthy patterns
 */
function identifyHealthyPatterns(changes: any[], foodFrequency: any[]): string[] {
  const patterns: string[] = []

  // Check if eating more fruits/vegetables
  const vegetables = foodFrequency.filter(f => f.category === 'produce').length
  if (vegetables > 5) {
    patterns.push('Eating a variety of fruits and vegetables')
  }

  return patterns
}

/**
 * Identify concerning patterns
 */
function identifyConcerningPatterns(changes: any[], foodFrequency: any[]): string[] {
  const patterns: string[] = []

  // Check for high processed food consumption
  const processedCount = foodFrequency.filter(f =>
    f.category === 'frozen' || f.category === 'pantry'
  ).length

  if (processedCount > vegetables) {
    patterns.push('High proportion of processed foods')
  }

  return patterns
}

/**
 * Calculate streaks
 */
function calculateStreaks(items: ShoppingItem[]): { longestStreak: number; currentStreak: number } {
  // Placeholder - would analyze shopping dates for consecutive days
  return { longestStreak: 0, currentStreak: 0 }
}

/**
 * Check if shopping item is healthy
 */
function isHealthyChoice(item: ShoppingItem): boolean {
  const healthyCategories = ['produce', 'meat', 'seafood', 'dairy', 'eggs']
  return healthyCategories.includes(item.category)
}

/**
 * Fuzzy string matching
 */
function fuzzyMatch(str1: string, str2: string): boolean {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()
  return s1.includes(s2) || s2.includes(s1)
}

/**
 * Math utilities
 */
function mean(arr: number[]): number {
  return arr.length > 0 ? sum(arr) / arr.length : 0
}

function sum(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0)
}

function variance(arr: number[]): number {
  const m = mean(arr)
  return mean(arr.map(x => Math.pow(x - m, 2)))
}

function standardDeviation(arr: number[]): number {
  return Math.sqrt(variance(arr))
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// ==================== DATA FETCHING (Stubs) ====================
// These would be implemented with actual Firebase queries

async function fetchVitals(
  patientId: string,
  vitalType: VitalType,
  startDate: Date,
  endDate: Date
): Promise<VitalSign[]> {
  // Stub - implement with Firebase query
  return []
}

async function fetchMealLogs(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<MealLog[]> {
  // Stub - implement with Firebase query
  return []
}

async function fetchConsumptionEvents(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<ConsumptionEvent[]> {
  // Stub - implement with Firebase query
  return []
}

async function fetchAISuggestions(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<HealthBasedSuggestion[]> {
  // Stub - implement with Firebase query
  return []
}

async function fetchShoppingItems(
  patientId: string,
  startDate: Date,
  endDate: Date
): Promise<ShoppingItem[]> {
  // Stub - implement with Firebase query
  return []
}
