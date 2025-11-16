'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { useUserProfile } from '@/hooks/useUserProfile'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { ProgressPageSkeleton } from '@/components/ui/skeleton'
import { ShareButton } from '@/components/social/ShareButton'
import { ShareModal } from '@/components/social/ShareModal'

// Dynamic imports for charts to reduce initial bundle size
const WeightTrendChart = dynamic(() => import('@/components/charts/WeightTrendChart').then(mod => ({ default: mod.WeightTrendChart })), {
  loading: () => <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const CalorieIntakeChart = dynamic(() => import('@/components/charts/CalorieIntakeChart').then(mod => ({ default: mod.CalorieIntakeChart })), {
  loading: () => <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const MacroDistributionChart = dynamic(() => import('@/components/charts/MacroDistributionChart').then(mod => ({ default: mod.MacroDistributionChart })), {
  loading: () => <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const StepCountChart = dynamic(() => import('@/components/charts/StepCountChart').then(mod => ({ default: mod.StepCountChart })), {
  loading: () => <div className="h-80 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
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
  loading: () => <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 animate-pulse"><div className="h-32 bg-gray-100 dark:bg-gray-800 rounded"></div></div>,
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
import type { WeightLog } from '@/types'

export default function ProgressPage() {
  return (
    <AuthGuard>
      <ProgressContent />
    </AuthGuard>
  )
}

function ProgressContent() {
  const { user } = useAuth()
  const { profile, refetch: refetchProfile } = useUserProfile()

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
    if (!user) return

    setLoading(true)

    try {
      const calorieGoal = profile?.goals?.dailyCalorieGoal || 2000

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeRange)

      const stepGoal = profile?.goals?.dailySteps || 10000

      // Load calorie, macro, step data, and stats (weight is real-time via useEffect)
      const [calories, macros, steps, stats] = await Promise.all([
        getCalorieIntakeLastNDays(user.uid, timeRange, calorieGoal),
        getMacroDistributionLastNDays(user.uid, timeRange),
        getStepCountLastNDays(user.uid, timeRange, stepGoal),
        getSummaryStatistics(user.uid, startDate, endDate)
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
  }, [user, timeRange, profile?.goals?.dailyCalorieGoal, profile?.goals?.dailySteps])

  // Real-time weight data subscription for chart
  useEffect(() => {
    if (!user) return

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - timeRange)

    const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs')
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
  }, [user, timeRange])

  // Separate subscription for most recent weight log (for reminder modal)
  const [mostRecentWeightLog, setMostRecentWeightLog] = useState<WeightLog | null>(null)

  useEffect(() => {
    if (!user) return

    const weightLogsRef = collection(db, 'users', user.uid, 'weightLogs')
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
            userId: user.uid,
            weight: data.weight,
            unit: data.unit,
            loggedAt: data.loggedAt.toDate(),
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
  }, [user])

  useEffect(() => {
    if (!user) return

    loadChartData()
  }, [user, loadChartData])

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

  const targetWeight = profile?.goals?.targetWeight

  // Calculate goal progress metrics
  const goalProgress = useMemo(() => {
    if (!profile?.goals || weightData.length === 0) return null

    const currentWeight = weightData[weightData.length - 1].weight

    // Use the first weight log as starting weight if startWeight is unrealistic (< 50 lbs)
    // This handles cases where startWeight was incorrectly set during onboarding
    let startWeight = profile.goals.startWeight
    if (!startWeight || startWeight < 50) {
      // Use the first weight log entry (oldest) as the starting weight
      startWeight = weightData[0].weight
      console.log('Using first weight log as starting weight:', startWeight)
    }

    // Debug logging
    console.log('Progress page - Goal data:', {
      startWeight: profile.goals.startWeight,
      weeklyWeightLossGoal: profile.goals.weeklyWeightLossGoal,
      targetWeight: profile.goals.targetWeight,
      currentWeight,
      calculatedStartWeight: startWeight
    })

    // Convert WeightDataPoint[] to WeightLog[] format
    const weightLogs = weightData.map(w => ({
      id: '',
      userId: user?.uid || '',
      weight: w.weight,
      unit: 'lbs' as const,
      loggedAt: w.timestamp,
      dataSource: 'manual' as const
    }))

    return calculateGoalProgress(currentWeight, startWeight, profile.goals, weightLogs)
  }, [profile, weightData, user])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Progress & Trends"
        subtitle="Visualize your weight loss journey with interactive charts"
        actions={
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
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Time Range Selector */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Time Range</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select the period to visualize</p>
            </div>
            <div className="flex gap-2">
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeRange(days)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    timeRange === days
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 60 ? '2 Months' : days === 90 ? '3 Months' : `${days} Days`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Health Context Section */}
        {profile && !loading && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Health Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Activity Level */}
              {profile.profile?.activityLevel && (
                <div className="border-l-4 border-purple-500 pl-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Activity Level</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 capitalize">
                    {profile.profile.activityLevel.replace('-', ' ')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    TDEE: {getActivityMultiplier(profile.profile.activityLevel)}x BMR
                  </p>
                </div>
              )}

              {/* Health Conditions */}
              {profile.profile?.healthConditions && profile.profile.healthConditions.length > 0 && (
                <div className="border-l-4 border-red-500 pl-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    Health Conditions
                    <span className="ml-1 text-gray-500 dark:text-gray-500">(tap to manage medications)</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(showAllHealthConditions
                      ? profile.profile.healthConditions
                      : profile.profile.healthConditions.slice(0, 3)
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
                    {profile.profile.healthConditions.length > 3 && (
                      <button
                        onClick={() => setShowAllHealthConditions(!showAllHealthConditions)}
                        className="px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-h-[44px] sm:min-h-0 sm:py-1 flex items-center"
                      >
                        {showAllHealthConditions
                          ? 'Show less'
                          : `+${profile.profile.healthConditions.length - 3} more`}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Medications */}
              <div className="border-l-4 border-blue-500 pl-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Medications
                    {/* DEBUG */}
                    {profile.profile?.medications && (
                      <span className="ml-2 text-purple-600">({profile.profile.medications.length} total)</span>
                    )}
                  </p>
                  <div className="flex items-center gap-2">
                    {profile.profile?.medications && profile.profile.medications.length > 0 && (
                      <Link
                        href="/medications"
                        className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline min-h-[44px] sm:min-h-0 flex items-center active:scale-95 transition-transform"
                      >
                        View All
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        console.log('[DEBUG] Profile medications:', profile.profile?.medications)
                        setSelectedCondition(undefined)
                        setShowMedicationModal(true)
                      }}
                      className="px-3 py-2 sm:px-2 sm:py-1 text-sm sm:text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 font-medium underline min-h-[44px] sm:min-h-0 flex items-center active:scale-95 transition-transform"
                    >
                      {profile.profile?.medications && profile.profile.medications.length > 0 ? '⚙️ Manage' : '➕ Add'}
                    </button>
                  </div>
                </div>
                {profile.profile?.medications && profile.profile.medications.length > 0 ? (
                  <>
                    <p className="font-bold text-gray-900 dark:text-gray-100">
                      {profile.profile.medications.length} Active
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {(showAllMedications
                        ? profile.profile.medications
                        : profile.profile.medications.slice(0, 2)
                      ).map((med: ScannedMedication, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded flex items-center gap-1">
                          {med.name}
                          {med.patientName && (
                            <span className="text-blue-600 dark:text-blue-300 font-semibold">
                              ({med.patientName})
                            </span>
                          )}
                        </span>
                      ))}
                      {profile.profile.medications.length > 2 && (
                        <button
                          onClick={() => setShowAllMedications(!showAllMedications)}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-xs rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          {showAllMedications
                            ? 'Show less'
                            : `+${profile.profile.medications.length - 2} more`}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No medications added yet
                  </p>
                )}
              </div>

              {/* Lifestyle Factors */}
              {((profile.profile?.lifestyle?.smoking && profile.profile.lifestyle.smoking !== 'never') ||
                (profile.profile?.lifestyle?.alcoholFrequency && profile.profile.lifestyle.alcoholFrequency !== 'never') ||
                (profile.profile?.lifestyle?.recreationalDrugs && profile.profile.lifestyle.recreationalDrugs !== 'no')) && (
                <div className="border-l-4 border-yellow-500 pl-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Lifestyle Factors</p>
                  <div className="space-y-1">
                    {profile.profile.lifestyle.smoking !== 'never' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🚬</span>
                        <span className="text-gray-900 dark:text-gray-100 capitalize">
                          {profile.profile.lifestyle.smoking.replace('-', ' ')}
                        </span>
                      </div>
                    )}
                    {profile.profile.lifestyle.alcoholFrequency !== 'never' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🍺</span>
                        <span className="text-gray-900 dark:text-gray-100 capitalize">
                          {profile.profile.lifestyle.alcoholFrequency} drinker
                        </span>
                      </div>
                    )}
                    {profile.profile.lifestyle.recreationalDrugs !== 'no' && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>⚠️</span>
                        <span className="text-gray-900 dark:text-gray-100 capitalize">
                          {profile.profile.lifestyle.recreationalDrugs} use
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
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">Your Journey</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Current Weight */}
              {weightData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Current Weight</p>
                  <p className="text-xl font-bold text-purple-600">{weightData[weightData.length - 1].weight} lbs</p>
                </div>
              )}

              {/* Starting Weight */}
              {weightData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Starting Weight</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {profile.goals?.startWeight && profile.goals.startWeight >= 50
                      ? profile.goals.startWeight
                      : weightData[0].weight} lbs
                  </p>
                  {profile.goals?.startWeight && profile.goals.startWeight < 50 && (
                    <button
                      onClick={handleFixStartWeight}
                      disabled={fixingStartWeight}
                      className="mt-1 text-xs text-purple-600 hover:text-purple-700 underline"
                    >
                      {fixingStartWeight ? 'Fixing...' : 'Fix in database'}
                    </button>
                  )}
                </div>
              )}

              {/* Goal Weight */}
              {profile.goals?.targetWeight && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Goal Weight</p>
                  <p className="text-xl font-bold text-green-600">{profile.goals.targetWeight} lbs</p>
                </div>
              )}

              {/* BMI (calculated) */}
              {profile.height && weightData.length > 0 && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Current BMI</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                    {(() => {
                      const heightInInches = profile.height
                      const currentWeight = weightData[weightData.length - 1].weight
                      const bmi = (currentWeight / (heightInInches * heightInInches)) * 703
                      return bmi.toFixed(1)
                    })()}
                  </p>
                </div>
              )}

              {/* BMR */}
              {profile.goals?.bmr && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">BMR</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(profile.goals.bmr)}</p>
                </div>
              )}

              {/* TDEE */}
              {profile.goals?.tdee && (
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">TDEE</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{Math.round(profile.goals.tdee)}</p>
                </div>
              )}
            </div>

            {/* Log New Weight Button */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowWeightModal(true)}
                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-xl">⚖️</span>
                Log New Weight Entry
              </button>
              <p className="text-xs text-center text-gray-500 dark:text-gray-500 mt-2">
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
              : 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {goalProgress.isWeightGain ? 'Weight Gain Alert' : goalProgress.hasExceededGoal ? 'Goal Exceeded! 🎉' : 'Goal Progress'}
              </h2>
              <div className="flex items-center gap-3">
                <Link
                  href="/weight-history"
                  className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
                >
                  View History
                </Link>
                <span className={`px-3 py-1 text-white text-sm font-semibold rounded-full ${
                  goalProgress.isWeightGain ? 'bg-red-600' : goalProgress.hasExceededGoal ? 'bg-green-600' : 'bg-purple-600'
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
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
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
                    <p className="text-sm text-green-700 dark:text-green-300 mt-1">
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
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-600 text-lg font-bold">
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
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  {goalProgress.isWeightGain ? 'Weight Gained' : 'Weight Lost'}
                </p>
                <p className={`text-2xl font-bold ${goalProgress.isWeightGain ? 'text-red-600' : 'text-purple-600'}`}>
                  {goalProgress.totalWeightLoss} lbs
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {goalProgress.isWeightGain ? 'Moving away from' : 'of'} {goalProgress.goalWeightLoss} lbs total goal
                </p>
              </div>

              {/* Current Pace */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Pace</p>
                <p className={`text-2xl font-bold ${
                  goalProgress.isWeightGain ? 'text-red-600' :
                  goalProgress.isPaceOnTrack ? 'text-green-600' :
                  goalProgress.isPaceTooFast ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {goalProgress.avgWeeklyLoss} lbs/week {goalProgress.isWeightGain ? 'gaining' : 'losing'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {goalProgress.isWeightGain ? 'Target: Weight loss' : `Goal: ${goalProgress.targetWeeklyLoss} lbs/week`}
                  {goalProgress.isPaceOnTrack && ' ✓'}
                </p>
              </div>

              {/* ETA to Goal */}
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">ETA to Goal</p>
                <p className="text-2xl font-bold text-blue-600">
                  {goalProgress.weeksRemaining ? `${goalProgress.weeksRemaining} weeks` : 'N/A'}
                </p>
                {goalProgress.estimatedCompletionDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    ~{new Date(goalProgress.estimatedCompletionDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Pace Warnings */}
            {goalProgress.isPaceTooFast && (
              <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <p className="font-semibold text-red-900 dark:text-red-200">Losing Weight Too Fast</p>
                    <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                      Losing more than 2 lbs/week can be unsafe and lead to muscle loss. Consider increasing your calorie intake slightly.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {goalProgress.isPaceTooSlow && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🐌</span>
                  <div>
                    <p className="font-semibold text-yellow-900 dark:text-yellow-200">Progress Slower Than Goal</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      You're losing {goalProgress.avgWeeklyLoss} lbs/week but targeting {goalProgress.targetWeeklyLoss} lbs/week.
                      Consider reducing calorie intake or increasing activity.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Schedule Comparison */}
            {goalProgress.daysAheadOrBehind !== null && goalProgress.targetCompletionDate && (
              <div className={`rounded-lg p-4 ${
                goalProgress.daysAheadOrBehind >= 0
                  ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
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
                        ? 'text-green-700 dark:text-green-300'
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
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Weight Change</p>
                  <p className={`text-2xl font-bold ${summaryStats.weightChange < 0 ? 'text-green-600' : 'text-gray-900 dark:text-gray-100'}`}>
                    {summaryStats.weightChange > 0 ? '+' : ''}{summaryStats.weightChange} lbs
                  </p>
                  {profile?.goals?.startWeight && weightData.length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Total: {(profile.goals.startWeight - weightData[weightData.length - 1].weight).toFixed(1)} lbs
                    </p>
                  )}
                </div>
                <div className="text-3xl">
                  {summaryStats.weightChange < 0 ? '📉' : summaryStats.weightChange > 0 ? '📈' : '➡️'}
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Avg Calories/Day</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.avgCalories}</p>
                  {profile?.goals?.dailyCalorieGoal && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Goal: {profile.goals.dailyCalorieGoal} cal
                    </p>
                  )}
                </div>
                <div className="text-3xl">🔥</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meals Logged</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.mealsLogged}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    Last {timeRange} days
                  </p>
                </div>
                <div className="text-3xl">🍽️</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Macro Split</p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-600 font-semibold">P: {summaryStats.macroPercentages.protein}%</span>
                  <span className="text-yellow-600 font-semibold">C: {summaryStats.macroPercentages.carbs}%</span>
                  <span className="text-green-600 font-semibold">F: {summaryStats.macroPercentages.fat}%</span>
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="bg-red-500" style={{ width: `${summaryStats.macroPercentages.protein}%` }} />
                  <div className="bg-yellow-500" style={{ width: `${summaryStats.macroPercentages.carbs}%` }} />
                  <div className="bg-green-500" style={{ width: `${summaryStats.macroPercentages.fat}%` }} />
                </div>
                {profile?.goals?.macroTargets && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Goal: {profile.goals.macroTargets.protein}% / {profile.goals.macroTargets.carbs}% / {profile.goals.macroTargets.fat}%
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
            {/* Weight Trend Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Weight Trend</h2>
              <WeightTrendChart
                data={weightData}
                targetWeight={targetWeight}
                loading={loading}
              />
            </div>

            {/* Calorie Intake Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Calorie Intake</h2>
              <CalorieIntakeChart
                data={calorieData}
                loading={loading}
              />
            </div>

            {/* Macro Distribution Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Macronutrient Distribution</h2>
              <MacroDistributionChart
                data={macroData}
                loading={loading}
              />
            </div>

            {/* Step Count Chart */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Daily Step Count</h2>
              <StepCountChart
                data={stepData}
                loading={loading}
                isTrackingEnabled={isStepTrackingEnabled}
                todaysSteps={todaysSteps}
              />
            </div>
          </div>
        )}

        {/* AI Appointment Recommendations */}
        {!loading && (
          <div id="recommendations">
            <RecommendationsSection className="mb-6" />
          </div>
        )}

        {/* Empty State */}
        {!loading && weightData.length === 0 && calorieData.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <p className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Data Available Yet</p>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start logging meals and tracking your weight to see your progress visualized here!
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="/log-meal"
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                Log a Meal
              </a>
              <a
                href="/dashboard"
                className="px-6 py-3 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button - Log Weight */}
      <button
        onClick={() => setShowWeightModal(true)}
        className="fixed bottom-6 right-6 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all z-50 flex items-center gap-2 group"
        aria-label="Log weight"
      >
        <span className="text-2xl">⚖️</span>
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap text-sm font-medium">
          Log Weight
        </span>
      </button>

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
      {weightDataLoaded && (
        <WeightReminderModal
          lastWeightLog={mostRecentWeightLog}
          frequency={profile?.preferences?.weightCheckInFrequency || 'weekly'}
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
      />

      {/* Medication Management Modal */}
      {profile?.profile && (
        <MedicationManagementModal
          isOpen={showMedicationModal}
          onClose={() => {
            setShowMedicationModal(false)
            setSelectedCondition(undefined)
          }}
          medications={profile.profile.medications || []}
          onSave={handleSaveMedications}
          prescribedFor={selectedCondition}
        />
      )}
    </div>
  )
}
