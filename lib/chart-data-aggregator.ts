/**
 * Chart Data Aggregator
 *
 * Fetches and aggregates data from Firestore for chart visualizations:
 * - Weight trend over time
 * - Daily calorie intake
 * - Macro distribution
 * - Weekly averages
 *
 * Charts & Trends Feature - v1.6.5
 */

import { db } from '@/lib/firebase'
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  Timestamp
} from 'firebase/firestore'
import { logger } from '@/lib/logger'
import { COLLECTIONS } from '@/constants/firestore'

// ============================================================================
// Types
// ============================================================================

export interface WeightDataPoint {
  date: string // YYYY-MM-DD
  weight: number
  timestamp: Date
}

export interface CalorieDataPoint {
  date: string // YYYY-MM-DD
  calories: number
  goal: number
  timestamp: Date
}

export interface MacroData {
  protein: number
  carbs: number
  fat: number
  total: number
}

export interface MacroDataPoint {
  date: string // YYYY-MM-DD
  protein: number
  carbs: number
  fat: number
  timestamp: Date
}

export interface StepDataPoint {
  date: string // YYYY-MM-DD
  steps: number
  goal: number
  timestamp: Date
}

export interface WeeklyAverages {
  weekStart: string // YYYY-MM-DD
  avgWeight: number | null
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  mealsLogged: number
}

// ============================================================================
// Weight Trend Data
// ============================================================================

/**
 * Get weight trend data for the specified date range
 */
/**
 * Build a per-patient-scoped log query.
 *
 * WHY THIS EXISTS: these aggregators previously queried only by `userId`, so a
 * multi-patient account's calorie / step / summary stats summed EVERY patient's
 * logs together — a cross-patient data leak (one patient's Progress page showed
 * another's totals). Passing `patientId` scopes them.
 *
 * When `patientId` is given we scope on it and apply the date range in JS: the
 * `patientId == X` + loggedAt-range + orderBy combo needs a composite index
 * that isn't deployed — the same trade-off the /progress weightLogs
 * subscription makes; per-patient volume is small. Without `patientId`, the
 * legacy account-wide ranged query is preserved (callers that don't scope are
 * unchanged).
 */
function buildLogQuery(
  userId: string,
  subcollection: string,
  startDate: Date,
  endDate: Date,
  patientId?: string | null,
) {
  const ref = collection(db, COLLECTIONS.USERS, userId, subcollection)
  return patientId
    ? query(ref, where('patientId', '==', patientId))
    : query(
        ref,
        where('loggedAt', '>=', Timestamp.fromDate(startDate)),
        where('loggedAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('loggedAt', 'asc'),
      )
}

/**
 * True when `ts` is within [startDate, endDate]. Only enforced for the scoped
 * branch (which has no server-side range); the unscoped branch already ranged
 * in Firestore, so it short-circuits to true.
 */
function withinRange(ts: Date, startDate: Date, endDate: Date, patientId?: string | null): boolean {
  if (!patientId) return true
  const t = ts.getTime()
  return t >= startDate.getTime() && t <= endDate.getTime()
}

export async function getWeightTrendData(
  userId: string,
  startDate: Date,
  endDate: Date,
  patientId?: string | null
): Promise<WeightDataPoint[]> {
  try {
    const q = buildLogQuery(userId, 'weightLogs', startDate, endDate, patientId)
    const snapshot = await getDocs(q)

    // .sort() handles the scoped branch (no server-side orderBy); the unscoped
    // branch is already ordered but re-sorting is harmless + keeps weightChange
    // (last − first) correct.
    const dataPoints: WeightDataPoint[] = snapshot.docs
      .filter(doc => withinRange(doc.data().loggedAt.toDate(), startDate, endDate, patientId))
      .map(doc => {
        const data = doc.data()
        const timestamp = data.loggedAt.toDate()

        return {
          date: timestamp.toISOString().split('T')[0],
          weight: data.weight,
          timestamp
        }
      })
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return dataPoints
  } catch (error) {
    logger.error('Error fetching weight trend data', error as Error)
    return []
  }
}

/**
 * Get weight trend data for last N days
 */
export async function getWeightTrendLastNDays(
  userId: string,
  days: number = 30,
  patientId?: string | null
): Promise<WeightDataPoint[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getWeightTrendData(userId, startDate, endDate, patientId)
}

// ============================================================================
// Calorie Intake Data
// ============================================================================

/**
 * Get daily calorie intake for the specified date range
 */
export async function getCalorieIntakeData(
  userId: string,
  startDate: Date,
  endDate: Date,
  calorieGoal: number,
  patientId?: string | null
): Promise<CalorieDataPoint[]> {
  try {
    const q = buildLogQuery(userId, 'mealLogs', startDate, endDate, patientId)
    const snapshot = await getDocs(q)

    // Group meals by date and sum calories
    const dailyCalories = new Map<string, number>()

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const timestamp = data.loggedAt.toDate()
      if (!withinRange(timestamp, startDate, endDate, patientId)) return
      const dateKey = timestamp.toISOString().split('T')[0]
      const calories = data.totalCalories || data.estimatedCalories || 0

      const currentCalories = dailyCalories.get(dateKey) || 0
      dailyCalories.set(dateKey, currentCalories + calories)
    })

    // Convert to array and sort
    const dataPoints: CalorieDataPoint[] = Array.from(dailyCalories.entries())
      .map(([date, calories]) => ({
        date,
        calories: Math.round(calories),
        goal: calorieGoal,
        timestamp: new Date(date)
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return dataPoints
  } catch (error) {
    logger.error('Error fetching calorie intake data', error as Error)
    return []
  }
}

/**
 * Get calorie intake for last N days
 */
export async function getCalorieIntakeLastNDays(
  userId: string,
  days: number = 30,
  calorieGoal: number = 2000,
  patientId?: string | null
): Promise<CalorieDataPoint[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getCalorieIntakeData(userId, startDate, endDate, calorieGoal, patientId)
}

// ============================================================================
// Macro Distribution Data
// ============================================================================

/**
 * Get daily macro distribution for the specified date range
 */
export async function getMacroDistributionData(
  userId: string,
  startDate: Date,
  endDate: Date,
  patientId?: string | null
): Promise<MacroDataPoint[]> {
  try {
    const q = buildLogQuery(userId, 'mealLogs', startDate, endDate, patientId)
    const snapshot = await getDocs(q)

    // Group meals by date and sum macros
    const dailyMacros = new Map<string, MacroData>()

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const timestamp = data.loggedAt.toDate()
      if (!withinRange(timestamp, startDate, endDate, patientId)) return
      const dateKey = timestamp.toISOString().split('T')[0]

      const protein = data.macros?.protein || 0
      const carbs = data.macros?.carbs || 0
      const fat = data.macros?.fat || 0

      const current = dailyMacros.get(dateKey) || { protein: 0, carbs: 0, fat: 0, total: 0 }

      dailyMacros.set(dateKey, {
        protein: current.protein + protein,
        carbs: current.carbs + carbs,
        fat: current.fat + fat,
        total: current.total + protein + carbs + fat
      })
    })

    // Convert to array and sort
    const dataPoints: MacroDataPoint[] = Array.from(dailyMacros.entries())
      .map(([date, macros]) => ({
        date,
        protein: Math.round(macros.protein),
        carbs: Math.round(macros.carbs),
        fat: Math.round(macros.fat),
        timestamp: new Date(date)
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return dataPoints
  } catch (error) {
    logger.error('Error fetching macro distribution data', error as Error)
    return []
  }
}

/**
 * Get macro distribution for last N days
 */
export async function getMacroDistributionLastNDays(
  userId: string,
  days: number = 30,
  patientId?: string | null
): Promise<MacroDataPoint[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getMacroDistributionData(userId, startDate, endDate, patientId)
}

// ============================================================================
// Step Count Data
// ============================================================================

/**
 * Get step count data for the specified date range
 */
export async function getStepCountData(
  userId: string,
  startDate: Date,
  endDate: Date,
  goalSteps: number = 10000,
  patientId?: string | null
): Promise<StepDataPoint[]> {
  try {
    const q = buildLogQuery(userId, 'stepLogs', startDate, endDate, patientId)
    const snapshot = await getDocs(q)

    // Group steps by date
    const dailySteps = new Map<string, number>()

    snapshot.docs.forEach(doc => {
      const data = doc.data()
      const timestamp = data.loggedAt.toDate()
      if (!withinRange(timestamp, startDate, endDate, patientId)) return
      const dateKey = timestamp.toISOString().split('T')[0]

      const steps = data.steps || 0
      const current = dailySteps.get(dateKey) || 0

      dailySteps.set(dateKey, current + steps)
    })

    // Convert to array and sort
    const dataPoints: StepDataPoint[] = Array.from(dailySteps.entries())
      .map(([date, steps]) => ({
        date,
        steps,
        goal: goalSteps,
        timestamp: new Date(date)
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())

    return dataPoints
  } catch (error) {
    logger.error('Error fetching step count data', error as Error)
    return []
  }
}

/**
 * Get step count for last N days
 */
export async function getStepCountLastNDays(
  userId: string,
  days: number = 30,
  goalSteps: number = 10000,
  patientId?: string | null
): Promise<StepDataPoint[]> {
  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  return getStepCountData(userId, startDate, endDate, goalSteps, patientId)
}

// ============================================================================
// Weekly Averages
// ============================================================================

/**
 * Calculate weekly averages for weight, calories, and macros
 */
export async function getWeeklyAverages(
  userId: string,
  weeks: number = 4,
  patientId?: string | null
): Promise<WeeklyAverages[]> {
  try {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - (weeks * 7))

    // Get all data for the period
    const [weightData, calorieData, macroData] = await Promise.all([
      getWeightTrendData(userId, startDate, endDate, patientId),
      getCalorieIntakeData(userId, startDate, endDate, 2000, patientId), // Goal doesn't matter for averages
      getMacroDistributionData(userId, startDate, endDate, patientId)
    ])

    // Group by week
    const weeklyData = new Map<string, {
      weights: number[]
      calories: number[]
      protein: number[]
      carbs: number[]
      fat: number[]
      mealsLogged: number
    }>()

    // Helper to get week start date (Monday)
    const getWeekStart = (date: Date): string => {
      const d = new Date(date)
      const day = d.getDay()
      const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
      d.setDate(diff)
      return d.toISOString().split('T')[0]
    }

    // Aggregate weight data
    weightData.forEach(point => {
      const weekStart = getWeekStart(point.timestamp)
      const week = weeklyData.get(weekStart) || {
        weights: [],
        calories: [],
        protein: [],
        carbs: [],
        fat: [],
        mealsLogged: 0
      }
      week.weights.push(point.weight)
      weeklyData.set(weekStart, week)
    })

    // Aggregate calorie data
    calorieData.forEach(point => {
      const weekStart = getWeekStart(point.timestamp)
      const week = weeklyData.get(weekStart) || {
        weights: [],
        calories: [],
        protein: [],
        carbs: [],
        fat: [],
        mealsLogged: 0
      }
      week.calories.push(point.calories)
      week.mealsLogged++
      weeklyData.set(weekStart, week)
    })

    // Aggregate macro data
    macroData.forEach(point => {
      const weekStart = getWeekStart(point.timestamp)
      const week = weeklyData.get(weekStart) || {
        weights: [],
        calories: [],
        protein: [],
        carbs: [],
        fat: [],
        mealsLogged: 0
      }
      week.protein.push(point.protein)
      week.carbs.push(point.carbs)
      week.fat.push(point.fat)
      weeklyData.set(weekStart, week)
    })

    // Calculate averages
    const averages: WeeklyAverages[] = Array.from(weeklyData.entries())
      .map(([weekStart, data]) => ({
        weekStart,
        avgWeight: data.weights.length > 0
          ? Math.round((data.weights.reduce((a, b) => a + b, 0) / data.weights.length) * 10) / 10
          : null,
        avgCalories: data.calories.length > 0
          ? Math.round(data.calories.reduce((a, b) => a + b, 0) / data.calories.length)
          : 0,
        avgProtein: data.protein.length > 0
          ? Math.round(data.protein.reduce((a, b) => a + b, 0) / data.protein.length)
          : 0,
        avgCarbs: data.carbs.length > 0
          ? Math.round(data.carbs.reduce((a, b) => a + b, 0) / data.carbs.length)
          : 0,
        avgFat: data.fat.length > 0
          ? Math.round(data.fat.reduce((a, b) => a + b, 0) / data.fat.length)
          : 0,
        mealsLogged: data.mealsLogged
      }))
      .sort((a, b) => a.weekStart.localeCompare(b.weekStart))

    return averages
  } catch (error) {
    logger.error('Error calculating weekly averages', error as Error)
    return []
  }
}

// ============================================================================
// Summary Statistics
// ============================================================================

/**
 * Get summary statistics for a date range
 */
export async function getSummaryStatistics(
  userId: string,
  startDate: Date,
  endDate: Date,
  patientId?: string | null
) {
  try {
    const [weightData, calorieData, macroData] = await Promise.all([
      getWeightTrendData(userId, startDate, endDate, patientId),
      getCalorieIntakeData(userId, startDate, endDate, 2000, patientId),
      getMacroDistributionData(userId, startDate, endDate, patientId)
    ])

    // Weight statistics
    const weights = weightData.map(d => d.weight)
    const weightChange = weights.length >= 2
      ? weights[weights.length - 1] - weights[0]
      : 0

    // Calorie statistics
    const totalCalories = calorieData.reduce((sum, d) => sum + d.calories, 0)
    const avgCalories = calorieData.length > 0
      ? Math.round(totalCalories / calorieData.length)
      : 0

    // Macro statistics
    const totalProtein = macroData.reduce((sum, d) => sum + d.protein, 0)
    const totalCarbs = macroData.reduce((sum, d) => sum + d.carbs, 0)
    const totalFat = macroData.reduce((sum, d) => sum + d.fat, 0)
    const totalMacros = totalProtein + totalCarbs + totalFat

    const macroPercentages = totalMacros > 0 ? {
      protein: Math.round((totalProtein / totalMacros) * 100),
      carbs: Math.round((totalCarbs / totalMacros) * 100),
      fat: Math.round((totalFat / totalMacros) * 100)
    } : { protein: 0, carbs: 0, fat: 0 }

    return {
      weightChange: Math.round(weightChange * 10) / 10,
      avgCalories,
      mealsLogged: calorieData.length,
      macroPercentages
    }
  } catch (error) {
    logger.error('Error calculating summary statistics', error as Error)
    return {
      weightChange: 0,
      avgCalories: 0,
      mealsLogged: 0,
      macroPercentages: { protein: 0, carbs: 0, fat: 0 }
    }
  }
}
