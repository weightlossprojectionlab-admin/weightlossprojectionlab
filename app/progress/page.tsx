'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useSubscription } from '@/hooks/useSubscription'
import { canAccessFeature } from '@/lib/feature-gates'
import { medicalOperations } from '@/lib/medical-operations'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressPageSkeleton } from '@/components/ui/skeleton'
import { ShareButton } from '@/components/social/ShareButton'
import { ShareModal } from '@/components/social/ShareModal'

// Dynamic imports for charts to reduce initial bundle size
const WeightTrendChart = dynamic(() => import('@/components/charts/WeightTrendChart').then(mod => ({ default: mod.WeightTrendChart })), {
  loading: () => <div className="h-80 bg-muted rounded-lg animate-pulse" />,
  ssr: false
})

const CalorieIntakeChart = dynamic(() => import('@/components/charts/CalorieIntakeChart').then(mod => ({ default: mod.CalorieIntakeChart })), {
  loading: () => <div className="h-80 bg-muted rounded-lg animate-pulse" />,
  ssr: false
})

const MacroDistributionChart = dynamic(() => import('@/components/charts/MacroDistributionChart').then(mod => ({ default: mod.MacroDistributionChart })), {
  loading: () => <div className="h-80 bg-muted rounded-lg animate-pulse" />,
  ssr: false
})

const StepCountChart = dynamic(() => import('@/components/charts/StepCountChart').then(mod => ({ default: mod.StepCountChart })), {
  loading: () => <div className="h-80 bg-muted rounded-lg animate-pulse" />,
  ssr: false
})

const QuickWeightLogModal = dynamic(() => import('@/components/ui/QuickWeightLogModal').then(mod => ({ default: mod.QuickWeightLogModal })), {
  loading: () => null,
  ssr: false
})

const WeightReminderModal = dynamic(() => import('@/components/ui/WeightReminderModal').then(mod => ({ default: mod.WeightReminderModal })), {
  ssr: false
})

const MedicationManagementModal = dynamic(() => import('@/components/health/MedicationManagementModal').then(mod => ({ default: mod.MedicationManagementModal })), {
  ssr: false
})

const RecommendationsSection = dynamic(() => import('@/components/appointments/RecommendationsSection').then(mod => ({ default: mod.RecommendationsSection })), {
  loading: () => <div className="bg-card rounded-lg shadow-sm p-6 animate-pulse"><div className="h-32 bg-muted rounded"></div></div>,
  ssr: false
})

const DataCompletenessTracker = dynamic(() => import('@/components/health/DataCompletenessTracker').then(mod => ({ default: mod.DataCompletenessTracker })), {
  loading: () => <div className="bg-card rounded-lg shadow-sm p-6 animate-pulse"><div className="h-32 bg-muted rounded"></div></div>,
  ssr: false
})

import {
  getCalorieIntakeLastNDays,
  getMacroDistributionLastNDays,
  getStepCountLastNDays,
  getSummaryStatistics,
  WeightDataPoint,
  CalorieDataPoint,
  MacroDataPoint,
  StepDataPoint
} from '@/lib/chart-data-aggregator'
import { logger } from '@/lib/logger'
import { getActivityMultiplier, calculateGoalProgress } from '@/lib/progress-analytics'
import { mealLogOperations } from '@/lib/firebase-operations'
import { db } from '@/lib/firebase'
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore'
import toast from 'react-hot-toast'
import { ScannedMedication } from '@/lib/medication-lookup'
import type { WeightLog } from '@/types/medical'
import { TrustBadge } from '@/components/ui/TrustBadge'

import { getCSRFToken } from '@/lib/csrf'
export default function ProgressPage() {
  return (
    <AuthGuard>
      <ProgressContent />
    </AuthGuard>
  )
}

function ProgressContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { profile, refetch: refetchProfile } = useUserProfile()
  const { subscription } = useSubscription()

  // Get patientId from URL query parameter (for family member view)
  const patientIdParam = searchParams.get('patientId')
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(patientIdParam)
  const [patientProfile, setPatientProfile] = useState<any>(null)
  const [patients, setPatients] = useState<any[]>([])

  const [timeRange, setTimeRange] = useState(30) // Days
  const [loading, setLoading] = useState(true)
  const [weightDataLoaded, setWeightDataLoaded] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [isStepTrackingEnabled, setIsStepTrackingEnabled] = useState<boolean | undefined>(undefined)
  const [todaysSteps, setTodaysSteps] = useState<number>(0)
  const [lastMealLogDate, setLastMealLogDate] = useState<Date | null>(null)
  const [fixingStartWeight, setFixingStartWeight] = useState(false)
  const [showAllHealthConditions, setShowAllHealthConditions] = useState(false)
  const [showAllMedications, setShowAllMedications] = useState(false)
  const [showMedicationModal, setShowMedicationModal] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<string | undefined>(undefined)

  // Determine the effective userId to use for data fetching
  // If viewing a family member/patient, use their userId, otherwise use current user
  const effectiveUserId = patientProfile?.userId || user?.uid

  // Chart data
  const [weightData, setWeightData] = useState<WeightDataPoint[]>([])
  const [calorieData, setCalorieData] = useState<CalorieDataPoint[]>([])
  const [macroData, setMacroData] = useState<MacroDataPoint[]>([])
  const [stepData, setStepData] = useState<StepDataPoint[]>([])

  // Summary stats
  const [summaryStats, setSummaryStats] = useState<{
    weightChange: number
    avgCalories: number
    mealsLogged: number
    macroPercentages: { protein: number; carbs: number; fat: number }
  } | null>(null)

  // Load available patients/family members
  useEffect(() => {
    const loadPatients = async () => {
      if (!user) return

      try {
        const patientList = await medicalOperations.patients.getPatients()
        setPatients(patientList)
      } catch (error) {
        logger.error('Error loading patients', error as Error)
      }
    }

    loadPatients()
  }, [user])

  // Load selected patient profile
  useEffect(() => {
    const loadPatientProfile = async () => {
      if (!selectedPatientId) {
        setPatientProfile(null)
        return
      }

      try {
        const patientData = await medicalOperations.patients.getPatient(selectedPatientId)
        setPatientProfile(patientData)

        // Check if patient has completed onboarding (has goals set)
        if (!patientData.goals || !patientData.goals.dailyCalorieGoal) {
          logger.warn('[Progress] Family member has not completed onboarding', {
            patientId: selectedPatientId,
            patientName: patientData.name
          })
        }
      } catch (error) {
        logger.error('Error loading patient profile', error as Error)
        toast.error('Failed to load family member profile')
        setPatientProfile(null)
      }
    }

    loadPatientProfile()
  }, [selectedPatientId])

  // Load step tracking status from localStorage
  useEffect(() => {
    // SSR guard - only access localStorage in browser
    if (typeof window === 'undefined') return

    try {
      const enabled = localStorage.getItem('step-tracking-enabled')
      setIsStepTrackingEnabled(enabled === 'true')

      // Get today's step count from localStorage (live count before save)
      const steps = localStorage.getItem('step-count-session')
      if (steps) {
        try {
          const sessionData = JSON.parse(steps)
          setTodaysSteps(sessionData.totalSteps || 0)
        } catch {
          setTodaysSteps(0)
        }
      }
    } catch (err) {
      logger.error('Failed to load step tracking status', err as Error)
      setIsStepTrackingEnabled(undefined)
    }
  }, [])

  const loadChartData = useCallback(async () => {
    if (!effectiveUserId) return

    setLoading(true)

    try {
      // Use patientProfile goals if viewing a family member, otherwise use current user's profile
      const activeProfile = patientProfile || profile
      const calorieGoal = activeProfile?.goals?.dailyCalorieGoal || 2000

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeRange)

      const stepGoal = activeProfile?.goals?.dailySteps || 10000

      // Load calorie, macro, step data, and stats (weight is real-time via useEffect)
      const [calories, macros, steps, stats] = await Promise.all([
        getCalorieIntakeLastNDays(effectiveUserId, timeRange, calorieGoal),
        getMacroDistributionLastNDays(effectiveUserId, timeRange),
        getStepCountLastNDays(effectiveUserId, timeRange, stepGoal),
        getSummaryStatistics(effectiveUserId, startDate, endDate)
      ])

      setCalorieData(calories)
      setMacroData(macros)
      setStepData(steps)
      setSummaryStats(stats)

      // Fetch last meal log for activity-aware reminders
      try {
        const mealLogs = await mealLogOperations.getMealLogs({ limit: 1 })
        if (mealLogs && mealLogs.length > 0) {
          setLastMealLogDate(new Date(mealLogs[0].loggedAt))
        }
      } catch (error) {
        logger.error('Error fetching last meal log', error as Error)
      }
    } catch (error) {
      logger.error('Error loading chart data', error as Error)
    } finally {
      setLoading(false)
    }
  }, [effectiveUserId, timeRange, profile?.goals?.dailyCalorieGoal, profile?.goals?.dailySteps, patientProfile])

  // Real-time weight data subscription for chart
  useEffect(() => {
    if (!effectiveUserId) return

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRange)

    const weightLogsRef = collection(db, 'users', effectiveUserId, 'weightLogs')
    const q = query(
      weightLogsRef,
      where('loggedAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('loggedAt', 'asc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dataPoints: WeightDataPoint[] = snapshot.docs.map(doc => {
          const data = doc.data()
          const timestamp = data.loggedAt.toDate()

          return {
            date: timestamp.toISOString().split('T')[0],
            weight: data.weight,
            timestamp
          }
        })
        setWeightData(dataPoints)
      },
      (error) => {
        logger.error('Error in weight data snapshot (progress page)', error as Error)
        setWeightData([])
      }
    )

    return () => unsubscribe()
  }, [effectiveUserId, timeRange])

  // Separate subscription for most recent weight log (for reminder modal)
  const [mostRecentWeightLog, setMostRecentWeightLog] = useState<WeightLog | null>(null)

  useEffect(() => {
    if (!effectiveUserId) return

    const weightLogsRef = collection(db, 'users', effectiveUserId, 'weightLogs')
    const q = query(
      weightLogsRef,
      orderBy('loggedAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.docs.length > 0) {
          const doc = snapshot.docs[0]
          const data = doc.data()
          const weightLog = {
            id: doc.id,
            userId: effectiveUserId,
            patientId: data.patientId || effectiveUserId,
            weight: data.weight,
            unit: data.unit,
            loggedAt: data.loggedAt.toDate(),
            loggedBy: data.loggedBy || effectiveUserId,
            source: data.source || data.dataSource || 'manual',
            notes: data.notes,
            dataSource: data.dataSource || 'manual'
          }
          console.log('Progress page - Most recent weight log:', {
            date: weightLog.loggedAt,
            dateString: weightLog.loggedAt.toISOString(),
            weight: weightLog.weight
          })
          setMostRecentWeightLog(weightLog)
        } else {
          console.log('Progress page - No weight logs found')
          setMostRecentWeightLog(null)
        }
        setWeightDataLoaded(true)
      },
      (error) => {
        logger.error('Error fetching most recent weight log', error as Error)
        setMostRecentWeightLog(null)
        setWeightDataLoaded(true)
      }
    )

    return () => unsubscribe()
  }, [effectiveUserId])

  useEffect(() => {
    if (!effectiveUserId) return

    loadChartData()
  }, [effectiveUserId, loadChartData])

  // Function to fix start weight in Firestore
  const handleFixStartWeight = async () => {
    if (!user) return

    setFixingStartWeight(true)
    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/fix-start-weight', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(`Start weight updated to ${data.newStartWeight} lbs`)
        // Reload the page to fetch updated profile
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to fix start weight')
      }
    } catch (error) {
      logger.error('Error fixing start weight', error as Error)
      toast.error('Failed to fix start weight')
    } finally {
      setFixingStartWeight(false)
    }
  }

  // Function to save medications to Firestore
  const handleSaveMedications = async (medications: ScannedMedication[]) => {
    if (!user) return

    try {
      const token = await user.getIdToken()

      logger.debug('[Progress] Saving medications', { count: medications.length })

      // API now uses Firestore dot notation for deep merge, safe to send partial updates
      const response = await fetch('/api/user-profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          profile: {
            medications
          }
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        logger.error('[Progress] Failed to save medications', new Error(errorData.error || 'Unknown error'))
        throw new Error(errorData.error || 'Failed to update medications')
      }

      // Refetch profile to get updated medications
      const responseData = await response.json()
      if (responseData.success) {
        await refetchProfile()
        logger.debug('[Progress] Profile refetched with new medications')
      }
    } catch (error) {
      logger.error('[Progress] Error in handleSaveMedications', error as Error)
      throw error
    }
  }

  // Use patientProfile if viewing a family member, otherwise use current user's profile
  const activeProfile = patientProfile || profile
  const targetWeight = activeProfile?.goals?.targetWeight

  // Check if the active profile has completed onboarding
  const hasCompletedOnboarding = activeProfile && activeProfile.goals && activeProfile.goals.dailyCalorieGoal && activeProfile.height

  // Forward projection — linear-fit extrapolation from the historical
  // weightData, extended `timeRange` days into the future. This is the
  // simplest honest "if trend continues..." curve; the deficit-based
  // useWeightProjection hook answers a different question ("are you
  // on track to your goal?") and isn't right for plotting the chart.
  // The first projection point reuses the last historical value so the
  // dashed line visually connects to the solid one.
  const projectedWeightData = useMemo(() => {
    if (!weightData || weightData.length < 2) return []
    const first = weightData[0]
    const last = weightData[weightData.length - 1]
    const firstTime = new Date(first.date).getTime()
    const lastTime = new Date(last.date).getTime()
    const daysSpan = (lastTime - firstTime) / (24 * 60 * 60 * 1000)
    if (daysSpan <= 0) return []
    const slopePerDay = (last.weight - first.weight) / daysSpan
    const lastDate = new Date(last.date)
    const points: typeof weightData = []
    // Start at i=0 so the projection visually connects to the last
    // historical dot; advance one day per step out to timeRange.
    for (let i = 0; i <= timeRange; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      points.push({
        date: futureDate.toISOString().split('T')[0],
        weight: Math.round((last.weight + slopePerDay * i) * 10) / 10,
        timestamp: futureDate,
      })
    }
    return points
  }, [weightData, timeRange])

  // Layer 2 — weight-goal ETA. From the same linear-fit slope used
  // for projection, compute when (if ever) the user reaches their
  // target weight at the current pace. Returns one of three states
  // that drive the colored chip rendered below the Weight Trend chart:
  //
  //   on-pace   — heading toward target; ETA ≤ user's targetDate (or
  //               no targetDate set). Green.
  //   slipping  — heading toward target but ETA > targetDate. Yellow.
  //               Quantifies the gap so the user can self-correct.
  //   off-track — trend is flat or moving away from target. Red.
  //   achieved  — already at or past target. Green celebratory.
  //
  // Null when there's no target or insufficient data — the chip just
  // doesn't render in those cases, no degraded placeholder.
  const targetWeightEta = useMemo(() => {
    const target = activeProfile?.goals?.targetWeight
    if (typeof target !== 'number' || !weightData || weightData.length < 2) return null

    const first = weightData[0]
    const last = weightData[weightData.length - 1]
    const firstTime = new Date(first.date).getTime()
    const lastTime = new Date(last.date).getTime()
    const daysSpan = (lastTime - firstTime) / (24 * 60 * 60 * 1000)
    if (daysSpan <= 0) return null

    const slopePerDay = (last.weight - first.weight) / daysSpan
    const currentWeight = last.weight

    // Already at goal — celebratory short-circuit.
    if (Math.abs(currentWeight - target) < 0.5) {
      return { status: 'achieved' as const, target, currentWeight }
    }

    // Direction analysis. Slope under 0.01 lb/day is treated as flat
    // — sub-noise rate that wouldn't reach a meaningful goal delta
    // in any reasonable horizon.
    const goalIsLoss = target < currentWeight
    const trendIsLoss = slopePerDay < -0.01
    const trendIsGain = slopePerDay > 0.01
    const onRightTrack =
      (goalIsLoss && trendIsLoss) || (!goalIsLoss && trendIsGain)

    if (!onRightTrack) {
      return {
        status: 'off-track' as const,
        target,
        currentWeight,
        slopePerDay,
      }
    }

    const remainingDelta = Math.abs(currentWeight - target)
    const dailyPace = Math.abs(slopePerDay)
    const daysToGoal = Math.ceil(remainingDelta / dailyPace)

    const etaDate = new Date(last.date)
    etaDate.setDate(etaDate.getDate() + daysToGoal)

    // Compare ETA against user-stated goal date if present. Slipping
    // = on-the-right-track but won't make the self-set deadline.
    const targetDateRaw = activeProfile?.goals?.targetDate
    const targetDate = targetDateRaw ? new Date(targetDateRaw) : null
    const isSlipping = targetDate ? etaDate > targetDate : false

    return {
      status: isSlipping ? ('slipping' as const) : ('on-pace' as const),
      target,
      currentWeight,
      daysToGoal,
      etaDate,
      targetDate,
      dailyPace,
    }
  }, [activeProfile, weightData])

  // Forward projection for daily calorie intake — same linear-fit
  // approach as weightData, but starting at i=1 (tomorrow) to avoid
  // rendering a duplicate bar at today's date. Bars don't benefit
  // from the visual connect-point that the line chart's i=0 overlap
  // gives — they just look like two stacked bars at the same label.
  // Result is per-day projected intake to the RIGHT of the "Today"
  // divider in CalorieIntakeChart.
  const projectedCalorieData = useMemo(() => {
    if (!calorieData || calorieData.length < 2) return []
    const first = calorieData[0]
    const last = calorieData[calorieData.length - 1]
    const firstTime = new Date(first.date).getTime()
    const lastTime = new Date(last.date).getTime()
    const daysSpan = (lastTime - firstTime) / (24 * 60 * 60 * 1000)
    if (daysSpan <= 0) return []
    const slopePerDay = (last.calories - first.calories) / daysSpan
    const lastDate = new Date(last.date)
    const points: typeof calorieData = []
    for (let i = 1; i <= timeRange; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      points.push({
        date: futureDate.toISOString().split('T')[0],
        calories: Math.max(0, Math.round(last.calories + slopePerDay * i)),
        goal: last.goal,
        timestamp: futureDate,
      })
    }
    return points
  }, [calorieData, timeRange])

  // Forward projection for daily step count — same shape as calories.
  const projectedStepData = useMemo(() => {
    if (!stepData || stepData.length < 2) return []
    const first = stepData[0]
    const last = stepData[stepData.length - 1]
    const firstTime = new Date(first.date).getTime()
    const lastTime = new Date(last.date).getTime()
    const daysSpan = (lastTime - firstTime) / (24 * 60 * 60 * 1000)
    if (daysSpan <= 0) return []
    const slopePerDay = (last.steps - first.steps) / daysSpan
    const lastDate = new Date(last.date)
    const points: typeof stepData = []
    for (let i = 1; i <= timeRange; i++) {
      const futureDate = new Date(lastDate)
      futureDate.setDate(futureDate.getDate() + i)
      points.push({
        date: futureDate.toISOString().split('T')[0],
        steps: Math.max(0, Math.round(last.steps + slopePerDay * i)),
        goal: last.goal,
        timestamp: futureDate,
      })
    }
    return points
  }, [stepData, timeRange])

  // Identity-of-subject: /progress needs an explicit Patient as the
  // subject — never default silently to caregiver data masquerading
  // as "Your Progress." That muddle hid which family member's
  // numbers were being charted, especially for Family Premium
  // accounts where the caregiver almost never has their own goal.
  //
  // Rules:
  //   - 0 patients → empty state, prompt to add one (no charts)
  //   - 1 patient → auto-select it (URL replace so refresh keeps context)
  //   - 2+ patients → require explicit selection (URL param or selector)
  const hasNoPatients = patients.length === 0
  const showPatientSelector = patients.length > 1 && !selectedPatientId

  // When the user has exactly one patient and no URL context, treat
  // that patient as the implicit subject — they have no other choice
  // to make, but we still want a named subject + URL-stable context
  // for refresh / sharing / bookmarking.
  useEffect(() => {
    if (!selectedPatientId && patients.length === 1) {
      const onlyPatient = patients[0]
      setSelectedPatientId(onlyPatient.id)
      router.replace(`/progress?patientId=${onlyPatient.id}`)
    }
  }, [patients, selectedPatientId, router])

  // Feature access checks
  const hasAdvancedAnalytics = canAccessFeature(user as any, 'advanced-analytics')
  const hasHealthInsights = canAccessFeature(user as any, 'health-insights')
  const hasTrendAnalysis = canAccessFeature(user as any, 'trend-analysis')

  // Calculate goal progress metrics
  const goalProgress = useMemo(() => {
    if (!activeProfile?.goals || weightData.length === 0) return null

    const currentWeight = weightData[weightData.length - 1].weight

    // Resolve start weight: goals.startWeight → first weight log → currentWeight
    let startWeight = activeProfile.goals.startWeight
    if (!startWeight || startWeight <= 0) {
      // Fallback to first weight log entry (oldest)
      if (weightData.length > 0) {
        startWeight = weightData[0].weight
      }
      // Final fallback to currentWeight from profile
      if (!startWeight && activeProfile.profile?.currentWeight) {
        startWeight = activeProfile.profile.currentWeight
      }
    }

    // Debug logging
    console.log('Progress page - Goal data:', {
      startWeight: activeProfile.goals.startWeight,
      weeklyWeightLossGoal: activeProfile.goals.weeklyWeightLossGoal,
      targetWeight: activeProfile.goals.targetWeight,
      currentWeight,
      calculatedStartWeight: startWeight
    })

    // Convert WeightDataPoint[] to WeightLog[] format
    const weightLogs = weightData.map(w => ({
      id: '',
      userId: effectiveUserId || '',
      weight: w.weight,
      unit: 'lbs' as const,
      loggedAt: w.timestamp,
      dataSource: 'manual' as const
    }))

    return calculateGoalProgress(currentWeight, startWeight, activeProfile.goals, weightLogs)
  }, [activeProfile, weightData, effectiveUserId])

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={
          patientProfile
            ? patientProfile.relationship === 'self'
              ? `Your Progress (${patientProfile.name})`
              : `${patientProfile.name}'s Progress`
            : hasNoPatients
              ? 'Add a family member to start tracking'
              : 'Choose a family member'
        }
        subtitle={
          patientProfile
            ? patientProfile.relationship === 'self'
              ? 'Your weight loss journey, projected forward from your history'
              : `${patientProfile.name}'s weight loss journey, projected forward from their history`
            : hasNoPatients
              ? 'Once added, you can chart their progress and see where their trend is heading.'
              : 'Pick whose progress you want to view.'
        }
        actions={
          <div className="flex items-center gap-3">
            {/* Family Member Selector — shown when the caller hasn't
                established a subject yet (2+ patients, no URL context).
                The empty "My Progress" option that used to live here
                was removed: it was the path back into silent
                caregiver-data-as-self mode, which is exactly the
                identity-of-subject muddle this refactor closes. */}
            {showPatientSelector && (
              <select
                value={selectedPatientId || ''}
                onChange={(e) => {
                  const newPatientId = e.target.value
                  if (!newPatientId) return
                  setSelectedPatientId(newPatientId)
                  router.push(`/progress?patientId=${newPatientId}`)
                }}
                className="px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm"
              >
                <option value="" disabled>Pick a family member…</option>
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name}
                  </option>
                ))}
              </select>
            )}
            <ShareButton
              shareOptions={{
                type: 'progress',
                data: {
                  weightLoss: Math.abs(summaryStats?.weightChange || 0),
                  daysActive: timeRange
                }
              }}
              variant="default"
              size="md"
              onShareModalOpen={() => setShowShareModal(true)}
            />
          </div>
        }
        helpRoute="/docs/user-guides/progress-tracking"
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Onboarding Required Message for Family Members */}
        {selectedPatientId && patientProfile && (!patientProfile.goals || !patientProfile.goals.dailyCalorieGoal) && (
          <div className="bg-warning-light border-2 border-warning rounded-lg p-6 mb-6">
            <div className="flex items-start gap-4">
              <span className="text-4xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {patientProfile.name} Needs to Complete Onboarding
                </h3>
                <p className="text-sm text-foreground mb-4">
                  {patientProfile.name} hasn't completed their health profile setup yet. They need to set their goals, height, and weight to start tracking progress.
                </p>
                <div className="flex gap-3">
                  <Link
                    href={`/patients/${selectedPatientId}`}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                  >
                    View {patientProfile.name}'s Profile
                  </Link>
                  <button
                    onClick={() => {
                      setSelectedPatientId(null)
                      router.push('/progress')
                    }}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    View My Progress
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Health Alerts & Data Completeness - Show at top */}
        {hasCompletedOnboarding && (
          <>
            {/* Urgent Health Alerts */}
            <div id="health-alerts" className="mb-6">
              <RecommendationsSection
                patientId={selectedPatientId}
                showOnlyUrgent={true}
              />
            </div>

            {/* Data Completeness Tracker - Advanced Analytics Feature */}
            {hasAdvancedAnalytics ? (
              <>
                <DataCompletenessTracker
                  patientId={selectedPatientId}
                  className="mb-6"
                />
                {/* Trust Badge - Health Insights Privacy */}
                <div className="mb-6">
                  <TrustBadge variant="compact" />
                </div>
              </>
            ) : (
              <div className="bg-card rounded-lg shadow-sm p-6 mb-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-card rounded-lg shadow-xl p-8 max-w-md text-center border-2 border-primary">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Data Completeness Tracker</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Monitor your health data quality with Family Plus or Premium
                    </p>
                    <Link
                      href="/profile?tab=subscription"
                      className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                    >
                      Upgrade to Family Plus
                    </Link>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">Data Quality</h3>
                <div className="h-32 bg-muted rounded-lg opacity-30" />
              </div>
            )}
          </>
        )}

        {/* Only show content if onboarding is complete OR viewing own profile */}
        {hasCompletedOnboarding && (
          <>
            {/* Time Range Selector */}
            <div className="bg-card rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Time Window</h2>
                  <p className="text-sm text-muted-foreground">How far back to look — and how far ahead to project</p>
                </div>
                <div className="flex gap-2">
                  {[7, 14, 30, 60, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setTimeRange(days)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        timeRange === days
                          ? 'bg-primary text-white'
                          : 'bg-muted text-foreground hover:bg-gray-200'
                      }`}
                    >
                      {days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 60 ? '2 Months' : days === 90 ? '3 Months' : `${days} Days`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

        {/* Health Context Section */}
        {activeProfile && !loading && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Health Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Activity Level */}
              {activeProfile.profile?.activityLevel && (
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-xs text-muted-foreground mb-1">Activity Level</p>
                  <p className="font-bold text-foreground capitalize">
                    {activeProfile.profile.activityLevel.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    TDEE: {getActivityMultiplier(activeProfile.profile.activityLevel)}x BMR
                  </p>
                </div>
              )}

              {/* Health Conditions */}
              {activeProfile.profile?.healthConditions && activeProfile.profile.healthConditions.length > 0 && (
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Health Conditions
                    <span className="ml-1 text-muted-foreground dark:text-muted-foreground">(tap to manage medications)</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(showAllHealthConditions
                      ? activeProfile.profile.healthConditions
                      : activeProfile.profile.healthConditions.slice(0, 3)
                    ).map((condition: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedCondition(condition)
                          setShowMedicationModal(true)
                        }}
                        className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-xs rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors cursor-pointer active:scale-95 min-h-[44px] sm:min-h-0 sm:py-1 flex items-center"
                      >
                        {condition}
                      </button>
                    ))}
                    {activeProfile.profile.healthConditions.length > 3 && (
                      <button
                        onClick={() => setShowAllHealthConditions(!showAllHealthConditions)}
                        className="px-3 py-2 bg-muted text-muted-foreground text-xs rounded hover:bg-gray-200 transition-colors min-h-[44px] sm:min-h-0 sm:py-1 flex items-center"
                      >
                        {showAllHealthConditions
                          ? 'Show less'
                          : `+${activeProfile.profile.healthConditions.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Medications */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground">
                    Medications
                    {/* DEBUG */}
                    {activeProfile.profile?.medications && (
                      <span className="ml-2 text-primary">({activeProfile.profile.medications.length} total)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {activeProfile.profile?.medications && activeProfile.profile.medications.length > 0 && (
                      <Link
                        href="/medications"
                        className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-secondary hover:text-blue-700 dark:hover:text-blue-300 font-medium underline min-h-[44px] sm:min-h-0 flex items-center active:scale-95 transition-transform"
                      >
                        View All
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        console.log('[DEBUG] Profile medications:', activeProfile.profile?.medications)
                        setSelectedCondition(undefined)
                        setShowMedicationModal(true)
                      }}
                      className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-primary hover:text-primary-dark dark:text-purple-400 dark:hover:text-purple-300 font-medium underline min-h-[44px] sm:min-h-0 flex items-center active:scale-95 transition-transform"
                    >
                      {activeProfile.profile?.medications && activeProfile.profile.medications.length > 0 ? '⚙️ Manage' : '➕ Add'}
                    </button>
                  </div>
                </div>
                {activeProfile.profile?.medications && activeProfile.profile.medications.length > 0 ? (
                  <>
                    <p className="font-bold text-foreground">
                      {activeProfile.profile.medications.length} Active
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(showAllMedications
                        ? activeProfile.profile.medications
                        : activeProfile.profile.medications.slice(0, 2)
                      ).map((med: ScannedMedication, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-secondary-dark text-xs rounded flex items-center gap-1">
                          {med.name}
                          {med.patientName && (
                            <span className="text-secondary dark:text-blue-300 font-semibold">
                              ({med.patientName})
                            </span>
                          )}
                        </span>
                      ))}
                      {activeProfile.profile.medications.length > 2 && (
                        <button
                          onClick={() => setShowAllMedications(!showAllMedications)}
                          className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded hover:bg-gray-200 transition-colors"
                        >
                          {showAllMedications
                            ? 'Show less'
                            : `+${activeProfile.profile.medications.length - 2} more`}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                    No medications added yet
                  </p>
                )}
              </div>

              {/* Lifestyle Factors */}
              {((activeProfile.profile?.lifestyle?.smoking && activeProfile.profile.lifestyle.smoking !== 'never') ||
                (activeProfile.profile?.lifestyle?.alcoholFrequency && activeProfile.profile.lifestyle.alcoholFrequency !== 'never') ||
                (activeProfile.profile?.lifestyle?.recreationalDrugs && activeProfile.profile.lifestyle.recreationalDrugs !== 'no')) && (
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="text-xs text-muted-foreground mb-2">Lifestyle Factors</p>
                  <div className="space-y-1">
                    {activeProfile.profile.lifestyle.smoking !== 'never' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🚬</span>
                        <span className="text-foreground capitalize">
                          {activeProfile.profile.lifestyle.smoking.replace('-', ' ')}
                        </span>
                      </div>
                    )}
                    {activeProfile.profile.lifestyle.alcoholFrequency !== 'never' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🍺</span>
                        <span className="text-foreground capitalize">
                          {activeProfile.profile.lifestyle.alcoholFrequency} drinker
                        </span>
                      </div>
                    )}
                    {activeProfile.profile.lifestyle.recreationalDrugs !== 'no' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>⚠️</span>
                        <span className="text-foreground capitalize">
                          {activeProfile.profile.lifestyle.recreationalDrugs} use
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Profile & Goals Summary */}
        {profile && !loading && (
          <div className="bg-card rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Your Journey</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Current Weight */}
              {weightData.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Current Weight</p>
                  <p className="text-xl font-bold text-primary">{weightData[weightData.length - 1].weight} lbs</p>
                </div>
              )}

              {/* Starting Weight */}
              {weightData.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Starting Weight</p>
                  <p className="text-xl font-bold text-foreground">
                    {activeProfile.goals?.startWeight && activeProfile.goals.startWeight >= 50
                      ? activeProfile.goals.startWeight
                      : weightData[0].weight} lbs
                  </p>
                  {/* Only show fix button for current user, not family members */}
                  {activeProfile.goals?.startWeight && activeProfile.goals.startWeight < 50 && !selectedPatientId && (
                    <button
                      onClick={handleFixStartWeight}
                      disabled={fixingStartWeight}
                      className="mt-1 text-xs text-primary hover:text-primary-dark underline"
                    >
                      {fixingStartWeight ? 'Fixing...' : 'Fix in database'}
                    </button>
                  )}
                </div>
              )}

              {/* Goal Weight */}
              {activeProfile.goals?.targetWeight && (
                <div>
                  <p className="text-xs text-muted-foreground">Goal Weight</p>
                  <p className="text-xl font-bold text-success">{activeProfile.goals.targetWeight} lbs</p>
                </div>
              )}

              {/* BMI (calculated) */}
              {activeProfile.height && weightData.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground">Current BMI</p>
                  <p className="text-xl font-bold text-foreground">
                    {(() => {
                      const heightInInches = activeProfile.height
                      const currentWeight = weightData[weightData.length - 1].weight
                      const bmi = (currentWeight / (heightInInches * heightInInches)) * 703
                      return bmi.toFixed(1)
                    })()}
                  </p>
                </div>
              )}

              {/* BMR */}
              {activeProfile.goals?.bmr && (
                <div>
                  <p className="text-xs text-muted-foreground">BMR</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(activeProfile.goals.bmr)}</p>
                </div>
              )}

              {/* TDEE */}
              {activeProfile.goals?.tdee && (
                <div>
                  <p className="text-xs text-muted-foreground">TDEE</p>
                  <p className="text-xl font-bold text-foreground">{Math.round(activeProfile.goals.tdee)}</p>
                </div>
              )}
            </div>

            {/* Log New Weight Button */}
            <div className="mt-6 pt-6 border-t border-border">
              <button
                onClick={() => setShowWeightModal(true)}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">⚖️</span>
                Log New Weight Entry
              </button>
              <p className="text-xs text-center text-muted-foreground dark:text-muted-foreground mt-2">
                Keep your progress up to date
              </p>
            </div>
          </div>
        )}

        {/* Goal Progress Tracker */}
        {goalProgress && profile?.goals && !loading && (
          <div className={`bg-gradient-to-r rounded-lg shadow-sm p-6 mb-6 border-2 ${
            goalProgress.isWeightGain
              ? 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
              : goalProgress.hasExceededGoal
              ? 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
              : 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-primary-light'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">
                {goalProgress.isWeightGain ? 'Weight Gain Alert' : goalProgress.hasExceededGoal ? 'Goal Exceeded! 🎉' : 'Goal Progress'}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/weight-history"
                  className="text-sm text-primary dark:text-purple-400 hover:text-primary-dark dark:hover:text-purple-300 font-medium"
                >
                  View History
                </Link>
                <span className={`px-3 py-1 text-white text-sm font-semibold rounded-full ${
                  goalProgress.isWeightGain ? 'bg-error' : goalProgress.hasExceededGoal ? 'bg-success' : 'bg-primary'
                }`}>
                  {goalProgress.progressPercentage}% Complete
                </span>
              </div>
            </div>

            {/* Weight Gain Warning */}
            {goalProgress.isWeightGain && (
              <div className="bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <p className="font-bold text-red-900 dark:text-red-200">You've gained {goalProgress.totalWeightLoss} lbs since starting</p>
                    <p className="text-sm text-error-dark dark:text-red-300 mt-1">
                      This is the opposite direction of your goal. Review your calorie intake and activity levels.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Goal Exceeded Celebration */}
            {goalProgress.hasExceededGoal && !goalProgress.isWeightGain && (
              <div className="bg-green-100 dark:bg-green-900/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="font-bold text-green-900 dark:text-green-200">Congratulations! You've exceeded your goal!</p>
                    <p className="text-sm text-success-dark dark:text-green-300 mt-1">
                      You've lost {goalProgress.totalWeightLoss} lbs (Goal was {goalProgress.goalWeightLoss} lbs). Consider setting a new goal or switching to maintenance mode.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Progress Bar */}
            {goalProgress.isWeightGain ? (
              // Reverse progress bar for weight gain (fills right-to-left in red)
              <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
                <div
                  className="absolute right-0 h-full bg-gradient-to-l from-red-600 to-orange-600 rounded-full transition-all duration-500 flex items-center justify-start pl-3"
                  style={{ width: `${Math.min((goalProgress.totalWeightLoss / goalProgress.goalWeightLoss) * 100, 100)}%` }}
                >
                  {((goalProgress.totalWeightLoss / goalProgress.goalWeightLoss) * 100) >= 10 && (
                    <span className="text-white text-xs font-bold">
                      +{goalProgress.totalWeightLoss} lbs gained
                    </span>
                  )}
                </div>
                {/* Arrow indicator showing wrong direction */}
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-error text-lg font-bold">
                  →
                </div>
              </div>
            ) : (
              // Normal progress bar for weight loss (fills left-to-right)
              <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 overflow-hidden">
                <div
                  className="absolute h-full bg-gradient-to-r from-purple-600 to-blue-600 rounded-full transition-all duration-500 flex items-center justify-end pr-3"
                  style={{ width: `${Math.min(goalProgress.progressPercentage, 100)}%` }}
                >
                  {goalProgress.progressPercentage >= 10 && (
                    <span className="text-white text-xs font-bold">
                      {goalProgress.totalWeightLoss} of {goalProgress.goalWeightLoss} lbs
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {/* Weight Lost/Gained */}
              <div className="bg-card rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">
                  {goalProgress.isWeightGain ? 'Weight Gained' : 'Weight Lost'}
                </p>
                <p className={`text-2xl font-bold ${goalProgress.isWeightGain ? 'text-error' : 'text-primary'}`}>
                  {goalProgress.totalWeightLoss} lbs
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  {goalProgress.isWeightGain ? 'Moving away from' : 'of'} {goalProgress.goalWeightLoss} lbs total goal
                </p>
              </div>

              {/* Current Pace */}
              <div className="bg-card rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">Current Pace</p>
                <p className={`text-2xl font-bold ${
                  goalProgress.isWeightGain ? 'text-error' :
                  goalProgress.isPaceOnTrack ? 'text-success' :
                  goalProgress.isPaceTooFast ? 'text-error' :
                  'text-warning'
                }`}>
                  {goalProgress.avgWeeklyLoss} lbs/week {goalProgress.isWeightGain ? 'gaining' : 'losing'}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  {goalProgress.isWeightGain ? 'Target: Weight loss' : `Goal: ${goalProgress.targetWeeklyLoss} lbs/week`}
                  {goalProgress.isPaceOnTrack && ' ✓'}
                </p>
              </div>

              {/* ETA to Goal */}
              <div className="bg-card rounded-lg p-4">
                <p className="text-xs text-muted-foreground mb-1">ETA to Goal</p>
                <p className="text-2xl font-bold text-secondary">
                  {goalProgress.weeksRemaining ? `${goalProgress.weeksRemaining} weeks` : 'N/A'}
                </p>
                {goalProgress.estimatedCompletionDate && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    ~{new Date(goalProgress.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Pace Warnings - Advanced Analytics Feature */}
            {hasAdvancedAnalytics && goalProgress.isPaceTooFast && (
              <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-200">Losing Weight Too Fast</p>
                    <p className="text-sm text-error-dark dark:text-red-300 mt-1">
                      Losing more than 2 lbs/week can be unsafe and lead to muscle loss. Consider increasing your calorie intake slightly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {hasAdvancedAnalytics && goalProgress.isPaceTooSlow && (
              <div className="bg-warning-light border-2 border-warning-light rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🐌</span>
                  <div>
                    <p className="font-semibold text-yellow-900">Progress Slower Than Goal</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You're losing {goalProgress.avgWeeklyLoss} lbs/week but targeting {goalProgress.targetWeeklyLoss} lbs/week.
                      Consider reducing calorie intake or increasing activity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Comparison - Advanced Analytics Feature */}
            {hasAdvancedAnalytics && goalProgress.daysAheadOrBehind !== null && goalProgress.targetCompletionDate && (
              <div className={`rounded-lg p-4 ${
                goalProgress.daysAheadOrBehind >= 0
                  ? 'bg-success-light dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                  : 'bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-200 dark:border-orange-800'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`font-semibold ${
                      goalProgress.daysAheadOrBehind >= 0
                        ? 'text-green-900 dark:text-green-200'
                        : 'text-orange-900 dark:text-orange-200'
                    }`}>
                      {goalProgress.daysAheadOrBehind >= 0
                        ? `🎉 ${Math.abs(goalProgress.daysAheadOrBehind)} days ahead of schedule!`
                        : `${Math.abs(goalProgress.daysAheadOrBehind)} days behind schedule`}
                    </p>
                    <p className={`text-sm mt-1 ${
                      goalProgress.daysAheadOrBehind >= 0
                        ? 'text-success-dark dark:text-green-300'
                        : 'text-orange-700 dark:text-orange-300'
                    }`}>
                      Target date: {new Date(goalProgress.targetCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {summaryStats && !loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Weight Change</p>
                  <p className={`text-2xl font-bold ${summaryStats.weightChange < 0 ? 'text-success' : 'text-foreground'}`}>
                    {summaryStats.weightChange > 0 ? '+' : ''}{summaryStats.weightChange} lbs
                  </p>
                  {profile?.goals?.startWeight && weightData.length > 0 && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      Total: {(activeProfile.goals.startWeight - weightData[weightData.length - 1].weight).toFixed(1)} lbs
                    </p>
                  )}
                </div>
                <div className="text-3xl">
                  {summaryStats.weightChange < 0 ? '📉' : summaryStats.weightChange > 0 ? '📈' : '➡️'}
                </div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Calories/Day</p>
                  <p className="text-2xl font-bold text-foreground">{summaryStats.avgCalories}</p>
                  {profile?.goals?.dailyCalorieGoal && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                      Goal: {activeProfile.goals.dailyCalorieGoal} cal
                    </p>
                  )}
                </div>
                <div className="text-3xl">🔥</div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Meals Logged</p>
                  <p className="text-2xl font-bold text-foreground">{summaryStats.mealsLogged}</p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                    Last {timeRange} days
                  </p>
                </div>
                <div className="text-3xl">🍽️</div>
              </div>
            </div>

            <div className="bg-card rounded-lg shadow-sm p-6">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Macro Split</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-error font-semibold">P: {summaryStats.macroPercentages.protein}%</span>
                  <span className="text-warning font-semibold">C: {summaryStats.macroPercentages.carbs}%</span>
                  <span className="text-success font-semibold">F: {summaryStats.macroPercentages.fat}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="bg-error-light0" style={{ width: `${summaryStats.macroPercentages.protein}%` }} />
                  <div className="bg-warning-light0" style={{ width: `${summaryStats.macroPercentages.carbs}%` }} />
                  <div className="bg-success-light0" style={{ width: `${summaryStats.macroPercentages.fat}%` }} />
                </div>
                {/* Guard on activeProfile (which can be the patient
                    OR the caregiver), not on `profile` (the caregiver
                    only). Before the identity-of-subject refactor
                    these were the same object, so this guard happened
                    to work; now activeProfile is the selected patient
                    and the inner read crashed when the patient had no
                    macroTargets even though the caregiver did. */}
                {activeProfile?.goals?.macroTargets && (
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-2">
                    Goal: {activeProfile.goals.macroTargets.protein}% / {activeProfile.goals.macroTargets.carbs}% / {activeProfile.goals.macroTargets.fat}%
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && <ProgressPageSkeleton />}

        {/* Charts */}
        {!loading && (
          <div className="space-y-6">
            {/* Weight Trend Chart — solid line for measured history,
                dashed line for forward projection (linear-fit on the
                same trend, extended by `timeRange` days). The chart
                renders both in one view so a user sees where they
                came from AND where they're headed if the trend holds.
                Layer 2 ETA chip below the chart turns the projection
                into an accountability signal: when will they hit
                target, and are they on pace? */}
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Weight Trend & Projection</h2>
              <WeightTrendChart
                data={weightData}
                projectionData={projectedWeightData}
                targetWeight={targetWeight}
                loading={loading}
              />
              {targetWeightEta && (
                <div
                  data-testid="weight-goal-eta"
                  data-status={targetWeightEta.status}
                  className={`mt-4 px-4 py-3 rounded-lg text-sm font-medium ${
                    targetWeightEta.status === 'achieved' || targetWeightEta.status === 'on-pace'
                      ? 'bg-success-light text-success-dark border border-success/30'
                      : targetWeightEta.status === 'slipping'
                        ? 'bg-warning-light text-warning-dark border border-warning/30'
                        : 'bg-error-light text-error-dark border border-error/30'
                  }`}
                >
                  {targetWeightEta.status === 'achieved' && (
                    <>🎉 Goal reached — you're at your target weight of {targetWeightEta.target} lbs.</>
                  )}
                  {targetWeightEta.status === 'on-pace' && (
                    <>
                      🟢 At this rate you&apos;ll hit {targetWeightEta.target} lbs on{' '}
                      <strong>{targetWeightEta.etaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>{' '}
                      (~{targetWeightEta.daysToGoal} day{targetWeightEta.daysToGoal === 1 ? '' : 's'} from today).
                    </>
                  )}
                  {targetWeightEta.status === 'slipping' && (
                    <>
                      🟡 At this rate you&apos;ll hit {targetWeightEta.target} lbs on{' '}
                      <strong>{targetWeightEta.etaDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>{' '}
                      (~{targetWeightEta.daysToGoal} days).{' '}
                      {targetWeightEta.targetDate && (
                        <>Goal date was {targetWeightEta.targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}.</>
                      )}
                    </>
                  )}
                  {targetWeightEta.status === 'off-track' && (
                    <>
                      🔴 Current trend is{' '}
                      {Math.abs(targetWeightEta.slopePerDay) < 0.01
                        ? 'flat'
                        : targetWeightEta.slopePerDay > 0
                          ? 'moving away from your goal'
                          : 'moving away from your goal'}
                      . Your target is {targetWeightEta.target} lbs and you&apos;re at{' '}
                      {targetWeightEta.currentWeight.toFixed(1)} lbs.
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Calorie Intake Chart — historical bars + projected
                bars (lower opacity) extending `timeRange` days ahead.
                Layer 1 rinse of the same projection pattern shipped
                on WeightTrendChart. */}
            <div className="bg-card rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-foreground mb-4">Daily Calorie Intake & Projection</h2>
              <CalorieIntakeChart
                data={calorieData}
                projectionData={projectedCalorieData}
                loading={loading}
              />
            </div>

            {/* Macro Distribution Chart - Advanced Analytics Feature */}
            {hasAdvancedAnalytics ? (
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Macronutrient Distribution</h2>
                <MacroDistributionChart
                  data={macroData}
                  loading={loading}
                />
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-card rounded-lg shadow-xl p-8 max-w-md text-center border-2 border-primary">
                    <div className="text-5xl mb-4">📊</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Advanced Analytics</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Unlock macro distribution tracking with Family Plus or Premium
                    </p>
                    <Link
                      href="/profile?tab=subscription"
                      className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                    >
                      Upgrade to Family Plus
                    </Link>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-4">Macronutrient Distribution</h2>
                <div className="h-80 bg-muted rounded-lg opacity-30" />
              </div>
            )}

            {/* Step Count Chart - Trend Analysis Feature.
                Historical bars + projected bars (lower opacity)
                extending `timeRange` days ahead. Same projection
                pattern as the Weight + Calorie charts. */}
            {hasTrendAnalysis ? (
              <div className="bg-card rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-foreground mb-4">Daily Step Count & Projection</h2>
                <StepCountChart
                  data={stepData}
                  projectionData={projectedStepData}
                  loading={loading}
                  isTrackingEnabled={isStepTrackingEnabled}
                  todaysSteps={todaysSteps}
                />
              </div>
            ) : (
              <div className="bg-card rounded-lg shadow-sm p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-card rounded-lg shadow-xl p-8 max-w-md text-center border-2 border-primary">
                    <div className="text-5xl mb-4">👟</div>
                    <h3 className="text-xl font-bold text-foreground mb-2">Trend Analysis</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Track step count trends with Family Plus or Premium
                    </p>
                    <Link
                      href="/profile?tab=subscription"
                      className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                    >
                      Upgrade to Family Plus
                    </Link>
                  </div>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-4">Daily Step Count</h2>
                <div className="h-80 bg-muted rounded-lg opacity-30" />
              </div>
            )}
          </div>
        )}

        {/* AI Health Insights - Full recommendations (non-urgent) - Health Insights Feature */}
        {!loading && hasCompletedOnboarding && (
          hasHealthInsights ? (
            <div id="recommendations">
              <RecommendationsSection
                className="mb-6"
                patientId={selectedPatientId}
                showOnlyUrgent={false}
              />
            </div>
          ) : (
            <div className="bg-card rounded-lg shadow-sm p-6 mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 to-blue-50/80 dark:from-purple-900/20 dark:to-blue-900/20 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="bg-card rounded-lg shadow-xl p-8 max-w-md text-center border-2 border-primary">
                  <div className="text-5xl mb-4">🤖</div>
                  <h3 className="text-xl font-bold text-foreground mb-2">AI Health Insights</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get personalized AI recommendations with Family Plus or Premium
                  </p>
                  <Link
                    href="/profile?tab=subscription"
                    className="inline-block px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
                  >
                    Upgrade to Family Plus
                  </Link>
                </div>
              </div>
              <h2 className="text-xl font-bold text-foreground mb-4">AI Health Recommendations</h2>
              <div className="h-32 bg-muted rounded-lg opacity-30" />
            </div>
          )
        )}

        {/* Empty State */}
        {!loading && weightData.length === 0 && calorieData.length === 0 && hasCompletedOnboarding && (
          <div className="bg-card rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-xl font-bold text-foreground mb-2">No Data Available Yet</p>
            <p className="text-muted-foreground mb-6">
              Start logging meals and tracking your weight to see your progress visualized here!
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/log-meal"
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
              >
                Log a Meal
              </a>
              <a
                href="/dashboard"
                className="px-6 py-3 bg-muted text-foreground rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        )}
          </>
        )}
      </main>

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareOptions={{
          type: 'progress',
          data: {
            weightLoss: Math.abs(summaryStats?.weightChange || 0),
            daysActive: timeRange
          }
        }}
      />

      {/* Weight Reminder Modal (auto-shows on mount if due) - only after weight data loads */}
      {/* Only show for current user's own progress, not for family members */}
      {/* Respect user preference to disable reminders */}
      {weightDataLoaded && !selectedPatientId && profile?.reminders?.weight?.enabled && (
        <WeightReminderModal
          lastWeightLog={mostRecentWeightLog}
          frequency={profile?.reminders?.weight?.frequency || profile?.preferences?.weightCheckInFrequency || 'weekly'}
          lastMealLogDate={lastMealLogDate}
          onLogWeight={() => setShowWeightModal(true)}
          onDismiss={() => {
            logger.debug('Weight reminder dismissed on Progress page')
          }}
        />
      )}

      {/* Quick Weight Log Modal */}
      <QuickWeightLogModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSuccess={() => {
          setShowWeightModal(false)
          // Weight data updates automatically via real-time subscription
        }}
        patientId={selectedPatientId || activeProfile?.preferences?.primaryPatientId}
      />

      {/* Medication Management Modal */}
      {activeProfile?.profile && (
        <MedicationManagementModal
          isOpen={showMedicationModal}
          onClose={() => {
            setShowMedicationModal(false)
            setSelectedCondition(undefined)
          }}
          medications={activeProfile.profile.medications || []}
          onSave={handleSaveMedications}
          prescribedFor={selectedCondition}
        />
      )}
    </div>
  )
}
