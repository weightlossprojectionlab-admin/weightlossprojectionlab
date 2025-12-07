/**
 * useDailyActivity Hook
 *
 * Aggregates today's activity data for a patient
 * Provides daily completion scores and overdue status
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { logger } from '@/lib/logger'
import { useVitals } from '@/hooks/useVitals'
import { useMedications } from '@/hooks/useMedications'
import { useMeals } from '@/hooks/useMeals'

export interface ActivityStatus {
  logged: boolean
  time?: string // ISO 8601
  by?: string // User who logged it
  isOverdue: boolean
  dueTime?: string // Expected time
}

export interface DailyActivityData {
  vitals: {
    bloodPressure: ActivityStatus
    temperature: ActivityStatus
    heartRate: ActivityStatus
    bloodSugar: ActivityStatus
    weight: ActivityStatus
    totalLogged: number
    totalExpected: number
  }
  medications: {
    taken: number
    scheduled: number
    overdue: number
    pending: number
  }
  meals: {
    breakfast: ActivityStatus
    lunch: ActivityStatus
    dinner: ActivityStatus
    snack: ActivityStatus
    totalLogged: number
    totalExpected: number // Typically 3 (breakfast, lunch, dinner)
  }
  completionScore: number // 0-100 weighted score
  lastUpdated: string
}

interface UseDailyActivityOptions {
  patientId: string
  autoFetch?: boolean
}

interface UseDailyActivityReturn {
  activity: DailyActivityData | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const defaultActivityStatus: ActivityStatus = {
  logged: false,
  isOverdue: false
}

const defaultActivity: DailyActivityData = {
  vitals: {
    bloodPressure: { ...defaultActivityStatus },
    temperature: { ...defaultActivityStatus },
    heartRate: { ...defaultActivityStatus },
    bloodSugar: { ...defaultActivityStatus },
    weight: { ...defaultActivityStatus },
    totalLogged: 0,
    totalExpected: 5
  },
  medications: {
    taken: 0,
    scheduled: 0,
    overdue: 0,
    pending: 0
  },
  meals: {
    breakfast: { ...defaultActivityStatus },
    lunch: { ...defaultActivityStatus },
    dinner: { ...defaultActivityStatus },
    snack: { ...defaultActivityStatus },
    totalLogged: 0,
    totalExpected: 3 // Breakfast, lunch, dinner
  },
  completionScore: 0,
  lastUpdated: new Date().toISOString()
}

export function useDailyActivity({
  patientId,
  autoFetch = true
}: UseDailyActivityOptions): UseDailyActivityReturn {
  const [activity, setActivity] = useState<DailyActivityData | null>(null)
  const [loading, setLoading] = useState<boolean>(autoFetch)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from child hooks
  const { vitals, loading: vitalsLoading } = useVitals({ patientId, autoFetch })
  const { medications, logs: medLogs, loading: medsLoading } = useMedications({ patientId, autoFetch })
  const { meals, loading: mealsLoading } = useMeals({ patientId, autoFetch })

  // Calculate daily activity
  const calculateActivity = useCallback((): DailyActivityData => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const now = new Date()

    // Filter today's data
    const todayVitals = vitals.filter(v => {
      const vitalDate = new Date(v.recordedAt)
      return vitalDate >= today
    })

    const todayMeals = meals.filter(m => {
      const mealDate = new Date(m.loggedAt)
      return mealDate >= today
    })

    // Vitals activity
    const vitalTypes = ['blood_pressure', 'temperature', 'heart_rate', 'blood_sugar', 'weight'] as const
    const vitalsActivity = {
      bloodPressure: { ...defaultActivityStatus },
      temperature: { ...defaultActivityStatus },
      heartRate: { ...defaultActivityStatus },
      bloodSugar: { ...defaultActivityStatus },
      weight: { ...defaultActivityStatus },
      totalLogged: 0,
      totalExpected: 5
    }

    vitalTypes.forEach((type) => {
      const vitalKey = type.replace(/_/g, '') as keyof typeof vitalsActivity
      if (vitalKey === 'totalLogged' || vitalKey === 'totalExpected') return

      const vitalLog = todayVitals.find(v => v.type === type)
      if (vitalLog) {
        vitalsActivity[vitalKey as keyof Omit<typeof vitalsActivity, 'totalLogged' | 'totalExpected'>] = {
          logged: true,
          time: vitalLog.recordedAt,
          by: vitalLog.takenBy,
          isOverdue: false
        }
        vitalsActivity.totalLogged++
      }
    })

    // Meals activity
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const
    const mealsActivity = {
      breakfast: { ...defaultActivityStatus },
      lunch: { ...defaultActivityStatus },
      dinner: { ...defaultActivityStatus },
      snack: { ...defaultActivityStatus },
      totalLogged: 0,
      totalExpected: 3 // Breakfast, lunch, dinner
    }

    mealTypes.forEach((mealType) => {
      const mealLog = todayMeals.find(m => m.mealType === mealType)
      if (mealLog) {
        mealsActivity[mealType] = {
          logged: true,
          time: mealLog.loggedAt,
          by: mealLog.loggedBy,
          isOverdue: false
        }
        mealsActivity.totalLogged++
      } else {
        // Check if overdue (more than 3 hours past typical meal time)
        const typicalTimes = {
          breakfast: 8, // 8 AM
          lunch: 12,    // 12 PM
          dinner: 18,   // 6 PM
          snack: 0      // Not tracked for overdue
        }
        const expectedHour = typicalTimes[mealType]
        if (expectedHour && now.getHours() > expectedHour + 3) {
          mealsActivity[mealType].isOverdue = true
        }
      }
    })

    // Medications activity (simplified - full implementation needs scheduling)
    const medicationsActivity = {
      taken: medLogs.filter(log => log.status === 'taken').length,
      scheduled: medications.length, // Simplified
      overdue: medLogs.filter(log => log.status === 'late' || log.status === 'missed').length,
      pending: 0
    }

    // Calculate completion score (weighted)
    const vitalsWeight = 0.40
    const medicationsWeight = 0.35
    const mealsWeight = 0.25

    const vitalsScore = vitalsActivity.totalExpected > 0
      ? (vitalsActivity.totalLogged / vitalsActivity.totalExpected) * vitalsWeight
      : 0

    const medsScore = medicationsActivity.scheduled > 0
      ? (medicationsActivity.taken / medicationsActivity.scheduled) * medicationsWeight
      : 0

    const mealsScore = mealsActivity.totalExpected > 0
      ? (mealsActivity.totalLogged / mealsActivity.totalExpected) * mealsWeight
      : 0

    const completionScore = Math.round((vitalsScore + medsScore + mealsScore) * 100)

    return {
      vitals: vitalsActivity,
      medications: medicationsActivity,
      meals: mealsActivity,
      completionScore,
      lastUpdated: new Date().toISOString()
    }
  }, [vitals, meals, medications, medLogs])

  // Aggregate activity data
  const aggregateActivity = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      logger.debug('[useDailyActivity] Aggregating activity', { patientId })

      const activityData = calculateActivity()
      setActivity(activityData)

      logger.info('[useDailyActivity] Activity aggregated successfully', {
        patientId,
        completionScore: activityData.completionScore
      })
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to aggregate activity'
      logger.error('[useDailyActivity] Error aggregating activity', err, { patientId })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [patientId, calculateActivity])

  // Initial fetch and recalculate when data changes
  useEffect(() => {
    if (autoFetch && !vitalsLoading && !medsLoading && !mealsLoading) {
      aggregateActivity()
    }
  }, [autoFetch, vitalsLoading, medsLoading, mealsLoading, aggregateActivity])

  return {
    activity,
    loading: loading || vitalsLoading || medsLoading || mealsLoading,
    error,
    refetch: aggregateActivity
  }
}
