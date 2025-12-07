'use client'

import { useState, useEffect } from 'react'
import { db } from '@/lib/firebase'
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { medicalOperations } from '@/lib/medical-operations'
import { logger } from '@/lib/logger'
import Link from 'next/link'

export interface DataCompletenessTrackerProps {
  patientId?: string | null
  className?: string
}

interface CompletenessMetric {
  label: string
  current: number
  target: number
  percentage: number
  status: 'complete' | 'warning' | 'missing'
  actionLabel?: string
  actionUrl?: string
  isEnabled: boolean
  message?: string
}

interface WeekData {
  weightLogs: number
  mealLogs: number
  stepLogs: number
  bloodPressureReadings: number
  bloodGlucoseReadings: number
}

export function DataCompletenessTracker({ patientId, className = '' }: DataCompletenessTrackerProps) {
  const { user } = useAuth()
  const { profile } = useUserProfile()
  const [loading, setLoading] = useState(true)
  const [weekData, setWeekData] = useState<WeekData>({
    weightLogs: 0,
    mealLogs: 0,
    stepLogs: 0,
    bloodPressureReadings: 0,
    bloodGlucoseReadings: 0
  })
  const [patientProfile, setPatientProfile] = useState<any>(null)

  // Determine effective user ID (patient or current user)
  const effectiveUserId = patientProfile?.userId || user?.uid

  // Load patient profile if patientId is provided
  useEffect(() => {
    const loadPatientProfile = async () => {
      if (!patientId) {
        setPatientProfile(null)
        return
      }

      try {
        const patient = await medicalOperations.patients.getPatient(patientId)
        setPatientProfile(patient)
      } catch (error) {
        logger.error('[DataCompleteness] Error loading patient profile', error as Error)
      }
    }

    if (patientId) {
      loadPatientProfile()
    }
  }, [patientId])

  // Fetch data for the current week
  useEffect(() => {
    const fetchWeekData = async () => {
      if (!effectiveUserId) return

      setLoading(true)

      try {
        // Calculate start of current week (7 days ago)
        const now = new Date()
        const weekStart = new Date(now)
        weekStart.setDate(weekStart.getDate() - 7)
        weekStart.setHours(0, 0, 0, 0)

        // Fetch weight logs
        const weightLogsRef = collection(db, 'users', effectiveUserId, 'weightLogs')
        const weightQuery = query(
          weightLogsRef,
          where('loggedAt', '>=', Timestamp.fromDate(weekStart))
        )
        const weightSnapshot = await getDocs(weightQuery)
        const weightCount = weightSnapshot.size

        // Fetch meal logs
        const mealLogsRef = collection(db, 'users', effectiveUserId, 'mealLogs')
        const mealQuery = query(
          mealLogsRef,
          where('loggedAt', '>=', Timestamp.fromDate(weekStart))
        )
        const mealSnapshot = await getDocs(mealQuery)

        // Count unique days with meal logs
        const mealDays = new Set<string>()
        mealSnapshot.forEach(doc => {
          const data = doc.data()
          const logDate = data.loggedAt.toDate()
          const dateKey = logDate.toISOString().split('T')[0]
          mealDays.add(dateKey)
        })
        const mealCount = mealDays.size

        // Fetch step logs
        const stepLogsRef = collection(db, 'users', effectiveUserId, 'stepLogs')
        const stepQuery = query(
          stepLogsRef,
          where('loggedAt', '>=', Timestamp.fromDate(weekStart))
        )
        const stepSnapshot = await getDocs(stepQuery)
        const stepCount = stepSnapshot.size

        // Fetch blood pressure readings (vitals collection)
        let bpCount = 0
        let bgCount = 0

        // Check if patient has vitals enabled
        if (patientId) {
          try {
            const vitalsRef = collection(db, 'users', effectiveUserId, 'patients', patientId, 'vitals')
            const bpQuery = query(
              vitalsRef,
              where('type', '==', 'blood_pressure'),
              where('recordedAt', '>=', weekStart.toISOString())
            )
            const bpSnapshot = await getDocs(bpQuery)
            bpCount = bpSnapshot.size

            // Fetch blood glucose readings
            const bgQuery = query(
              vitalsRef,
              where('type', '==', 'blood_sugar'),
              where('recordedAt', '>=', weekStart.toISOString())
            )
            const bgSnapshot = await getDocs(bgQuery)
            bgCount = bgSnapshot.size
          } catch (error) {
            logger.debug('[DataCompleteness] Vitals not available for this user', { error: error instanceof Error ? error.message : String(error) })
          }
        }

        setWeekData({
          weightLogs: weightCount,
          mealLogs: mealCount,
          stepLogs: stepCount,
          bloodPressureReadings: bpCount,
          bloodGlucoseReadings: bgCount
        })
      } catch (error) {
        logger.error('[DataCompleteness] Error fetching week data', error as Error)
      } finally {
        setLoading(false)
      }
    }

    fetchWeekData()
  }, [effectiveUserId, patientId])

  // Use patient profile if viewing a family member, otherwise use current user's profile
  const activeProfile = patientProfile || profile

  // Determine which metrics to track based on user's health conditions
  const hasHypertension = activeProfile?.profile?.healthConditions?.includes('hypertension') || false
  const hasDiabetes = activeProfile?.profile?.healthConditions?.some(
    (condition: string) => condition.toLowerCase().includes('diabetes')
  ) || false

  // Check if step tracking is enabled (from localStorage)
  const [isStepTrackingEnabled, setIsStepTrackingEnabled] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const enabled = localStorage.getItem('step-tracking-enabled')
      setIsStepTrackingEnabled(enabled === 'true')
    }
  }, [])

  // Calculate metrics
  const metrics: CompletenessMetric[] = [
    {
      label: 'Weight logged',
      current: weekData.weightLogs,
      target: 7,
      percentage: Math.round((weekData.weightLogs / 7) * 100),
      status: weekData.weightLogs >= 6 ? 'complete' : weekData.weightLogs >= 3 ? 'warning' : 'missing',
      actionLabel: 'Log Weight',
      actionUrl: '/progress',
      isEnabled: true,
      message: weekData.weightLogs >= 6
        ? 'Great consistency!'
        : weekData.weightLogs >= 3
        ? 'Good progress - try to log daily'
        : 'Log weight at least 3x per week'
    },
    {
      label: 'Meals logged',
      current: weekData.mealLogs,
      target: 7,
      percentage: Math.round((weekData.mealLogs / 7) * 100),
      status: weekData.mealLogs >= 6 ? 'complete' : weekData.mealLogs >= 4 ? 'warning' : 'missing',
      actionLabel: 'Log Meal',
      actionUrl: '/log-meal',
      isEnabled: true,
      message: weekData.mealLogs >= 6
        ? 'Excellent tracking!'
        : weekData.mealLogs >= 4
        ? 'Keep it up - aim for daily logs'
        : 'Track your meals daily for best results'
    },
    {
      label: 'Steps tracked',
      current: weekData.stepLogs,
      target: 7,
      percentage: Math.round((weekData.stepLogs / 7) * 100),
      status: weekData.stepLogs >= 6 ? 'complete' : weekData.stepLogs >= 4 ? 'warning' : 'missing',
      actionLabel: 'Track Steps',
      actionUrl: '/step-tracker',
      isEnabled: isStepTrackingEnabled,
      message: isStepTrackingEnabled
        ? weekData.stepLogs >= 6
          ? 'You are on a roll!'
          : weekData.stepLogs >= 4
          ? 'Nice work - keep moving!'
          : 'Log your steps to track activity'
        : 'Enable step tracking to monitor activity'
    },
    {
      label: 'Blood pressure',
      current: weekData.bloodPressureReadings,
      target: 3,
      percentage: Math.round((weekData.bloodPressureReadings / 3) * 100),
      status: weekData.bloodPressureReadings >= 3 ? 'complete' : weekData.bloodPressureReadings >= 1 ? 'warning' : 'missing',
      actionLabel: 'Log Vitals',
      actionUrl: patientId ? `/patients/${patientId}` : '/profile',
      isEnabled: hasHypertension,
      message: weekData.bloodPressureReadings >= 3
        ? 'Monitoring well done!'
        : weekData.bloodPressureReadings >= 1
        ? 'Log BP at least 3x per week'
        : 'Regular monitoring is important'
    },
    {
      label: 'Blood glucose',
      current: weekData.bloodGlucoseReadings,
      target: 7,
      percentage: Math.round((weekData.bloodGlucoseReadings / 7) * 100),
      status: weekData.bloodGlucoseReadings >= 6 ? 'complete' : weekData.bloodGlucoseReadings >= 4 ? 'warning' : 'missing',
      actionLabel: 'Log Vitals',
      actionUrl: patientId ? `/patients/${patientId}` : '/profile',
      isEnabled: hasDiabetes,
      message: weekData.bloodGlucoseReadings >= 6
        ? 'Excellent glucose monitoring!'
        : weekData.bloodGlucoseReadings >= 4
        ? 'Keep tracking - aim for daily'
        : 'Daily glucose tracking recommended'
    }
  ]

  // Filter to only show enabled metrics
  const enabledMetrics = metrics.filter(m => m.isEnabled)

  // Calculate streak (consecutive days with weight logs in last 7 days)
  const calculateStreak = (): number => {
    // This is a simplified streak calculation
    // In a real implementation, you'd check consecutive days
    if (weekData.weightLogs >= 7) return 7
    if (weekData.weightLogs >= 5) return 5
    if (weekData.weightLogs >= 3) return 3
    return 0
  }

  const streak = calculateStreak()

  if (loading) {
    return (
      <div className={`bg-card rounded-lg shadow-sm p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`bg-card rounded-lg shadow-sm p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <span>📊</span>
          <span>Your Data This Week</span>
        </h2>
        {streak > 0 && (
          <div className="flex items-center gap-2 bg-success-light dark:bg-green-900/30 px-3 py-1 rounded-full">
            <span className="text-xl">🔥</span>
            <span className="text-sm font-semibold text-success-dark dark:text-green-200">
              {streak} day streak!
            </span>
          </div>
        )}
      </div>

      {enabledMetrics.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p className="text-sm">Complete your health profile to see tracking recommendations</p>
          <Link
            href="/profile"
            className="mt-4 inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
          >
            Update Profile
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {enabledMetrics.map((metric, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">
                    {metric.status === 'complete' ? '✅' : metric.status === 'warning' ? '⚠️' : '❌'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {metric.label}: {metric.current} of {metric.target} days
                    </p>
                    {metric.message && (
                      <p className="text-xs text-muted-foreground">{metric.message}</p>
                    )}
                  </div>
                </div>
                {metric.status !== 'complete' && metric.actionUrl && (
                  <Link
                    href={metric.actionUrl}
                    className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-xs font-medium whitespace-nowrap"
                  >
                    {metric.actionLabel}
                  </Link>
                )}
              </div>

              {/* Progress bar */}
              <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`absolute h-full rounded-full transition-all duration-500 ${
                    metric.status === 'complete'
                      ? 'bg-success'
                      : metric.status === 'warning'
                      ? 'bg-warning'
                      : 'bg-error'
                  }`}
                  style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Encouragement message */}
      {enabledMetrics.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-start gap-3 p-3 bg-secondary-light dark:bg-blue-900/20 rounded-lg">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm text-blue-900 dark:text-blue-200">
                {enabledMetrics.filter(m => m.status === 'complete').length === enabledMetrics.length
                  ? '🎉 Perfect week! You have logged all your health data consistently.'
                  : enabledMetrics.filter(m => m.status !== 'missing').length >= enabledMetrics.length / 2
                  ? 'Great progress! Consistent logging helps you reach your goals faster.'
                  : 'Start tracking today! Regular data logging is key to success.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
