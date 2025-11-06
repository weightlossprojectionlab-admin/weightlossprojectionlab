'use client'

import { useState, useEffect, Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import {
  UsersIcon,
  CameraIcon,
  ScaleIcon,
  FireIcon,
  ChartBarIcon,
  ClockIcon,
  ArrowLeftIcon,
  HeartIcon,
  BeakerIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import Link from 'next/link'
import { auth } from '@/lib/firebase'
import type { HealthVitalsSummary } from '@/types'

// Dynamic imports for Recharts components to reduce bundle size
const AdminWeightLogsChart = dynamic(() => import('@/components/charts/AdminWeightLogsChart').then(m => ({ default: m.AdminWeightLogsChart })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const AdminDailyCaloriesChart = dynamic(() => import('@/components/charts/AdminDailyCaloriesChart').then(m => ({ default: m.AdminDailyCaloriesChart })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

const AdminStepLogsChart = dynamic(() => import('@/components/charts/AdminStepLogsChart').then(m => ({ default: m.AdminStepLogsChart })), {
  loading: () => <div className="h-[300px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />,
  ssr: false
})

interface AIHealthProfileSummary {
  hasProfile: boolean
  profileStatus: 'unreviewed' | 'approved' | 'modified' | null
  profileConfidence: number | null
  profileGeneratedAt: string | null
  restrictionsCount: number
  criticalWarnings: string[]
  recentDecisions: {
    total: number
    unreviewed: number
    healthProfileDecisions: number
    mealSafetyChecks: number
    criticalMealSafety: number
  }
}

interface AnalyticsData {
  userMetrics: {
    totalUsers: number
    dau: number // Daily Active Users
    wau: number // Weekly Active Users
    mau: number // Monthly Active Users
    newUsersToday: number
    newUsersThisWeek: number
    newUsersThisMonth: number
  }
  activityMetrics: {
    totalMealLogs: number
    mealLogsToday: number
    mealLogsThisWeek: number
    totalWeightLogs: number
    weightLogsToday: number
    weightLogsThisWeek: number
    totalStepLogs: number
    stepLogsToday: number
    stepLogsThisWeek: number
  }
  recipeMetrics: {
    totalRecipes: number
    totalCookingSessions: number
    recipeQueueSize: number
    avgSessionsPerRecipe: number
  }
  engagementMetrics: {
    avgMealsPerUser: number
    avgWeightLogsPerUser: number
    retentionRate7Day: number
    retentionRate30Day: number
  }
}

interface UserAnalyticsData {
  user: {
    uid: string
    email: string
    displayName: string
    createdAt: string
    lastActiveAt: string | null
    role: string
    disabled: boolean
  }
  preferences: {
    units?: 'metric' | 'imperial'
    notifications?: boolean
    biometricEnabled?: boolean
    themePreference?: 'light' | 'dark' | 'system'
    dietaryPreferences?: string[]
    mealReminderTimes?: {
      breakfast?: string
      lunch?: string
      dinner?: string
      snacks?: string
    }
    mealSchedule?: {
      breakfastTime: string
      lunchTime: string
      dinnerTime: string
      hasSnacks: boolean
      snackWindows?: string[]
    }
    weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
    [key: string]: any
  }
  profile: {
    birthDate?: string
    age?: number
    gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'
    height?: number
    currentWeight?: number
    activityLevel?: string
    healthConditions?: string[]
    foodAllergies?: string[]
    lifestyle?: {
      smoking?: string
      smokingQuitDate?: string
      alcoholFrequency?: string
      weeklyDrinks?: number
      recreationalDrugs?: string
      drugTypes?: string[]
    }
    bodyMeasurements?: {
      waist?: number
      hips?: number
      chest?: number
      arms?: number
      thighs?: number
    }
    onboardingCompleted?: boolean
    onboardingCompletedAt?: string
    currentOnboardingStep?: number
    [key: string]: any
  }
  goals: {
    targetWeight?: number
    startWeight?: number
    weeklyWeightLossGoal?: number
    targetDate?: string
    primaryGoal?: string
    dailyCalorieGoal?: number
    dailySteps?: number
    macroTargets?: {
      protein: number
      carbs: number
      fat: number
    }
    bmr?: number
    tdee?: number
    [key: string]: any
  }
  summary: {
    totalMeals: number
    totalCalories: number
    avgCaloriesPerDay: number
    totalSteps: number
    avgStepsPerDay: number
    weightChange: number
    currentWeight: { date: string; weight: number; unit: string } | null
    streak: number
  }
  charts: {
    weightLogs: { date: string; weight: number; unit: string; loggedAt?: string }[]
    dailyCalories: { date: string; calories: number }[]
    stepLogs: { date: string; steps: number; goal?: number }[]
  }
  logs: {
    weightLogs: {
      id: string
      date: string
      weight: number
      unit: string
      notes?: string
      dataSource?: string
      photoUrl?: string
      loggedAt?: string
    }[]
    stepLogs: {
      id: string
      date: string
      steps: number
      goal?: number
      source: string
      notes?: string
      loggedAt?: string
    }[]
    mealLogs: {
      id: string
      date: string
      calories: number
      mealType: string
      title?: string
      photoUrl?: string
      notes?: string
      macros: { protein: number; carbs: number; fat: number }
      foodItems?: any[]
      manualEntries?: any[]
      loggedAt?: string
    }[]
  }
  healthVitals?: HealthVitalsSummary
  aiHealthProfile?: AIHealthProfileSummary
  range: string
}

function UserAnalytics({ uid, email }: { uid: string; email: string }) {
  const [data, setData] = useState<UserAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')

  useEffect(() => {
    loadUserAnalytics()
  }, [uid, dateRange])

  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')
    return await user.getIdToken()
  }

  const loadUserAnalytics = async () => {
    setLoading(true)
    setError(null)
    const url = `/api/admin/users/${uid}/analytics?range=${dateRange}`
    try {
      const token = await getAuthToken()

      // Fetch main analytics
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load user analytics' }))
        throw new Error(errorData.error || 'Failed to load user analytics')
      }
      const result = await response.json()

      // Fetch health vitals (optional - don't fail if unavailable)
      try {
        const vitalsResponse = await fetch(`/api/admin/users/${uid}/health-vitals`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (vitalsResponse.ok) {
          const vitalsData = await vitalsResponse.json()
          result.healthVitals = vitalsData.summary
        }
      } catch (vitalsErr) {
        // Health vitals are optional, don't fail the whole page
        logger.warn('Failed to load health vitals', {
          error: vitalsErr instanceof Error ? vitalsErr.message : String(vitalsErr)
        })
      }

      // Fetch AI health profile (optional - don't fail if unavailable)
      try {
        const aiProfileResponse = await fetch(`/api/admin/users/${uid}/ai-health-profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (aiProfileResponse.ok) {
          const aiProfileData = await aiProfileResponse.json()
          result.aiHealthProfile = aiProfileData.summary
        }
      } catch (aiProfileErr) {
        // AI health profile is optional, don't fail the whole page
        logger.warn('Failed to load AI health profile', {
          error: aiProfileErr instanceof Error ? aiProfileErr.message : String(aiProfileErr)
        })
      }

      setData(result)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('Error loading user analytics', err as Error, {
        uid,
        email,
        url,
        dateRange,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorMessage
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading user analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Platform Analytics
        </Link>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading User Analytics</h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link href="/admin/analytics" className="inline-flex items-center gap-2 text-primary hover:underline mb-4">
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Platform Analytics
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{data.user.displayName}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{data.user.email}</p>
            <div className="flex gap-4 mt-2 text-sm text-gray-500 dark:text-gray-500">
              <span>Role: <span className="font-medium">{data.user.role}</span></span>
              <span>Joined: <span className="font-medium">{new Date(data.user.createdAt).toLocaleDateString()}</span></span>
              {data.user.lastActiveAt && (
                <span>Last Active: <span className="font-medium">{new Date(data.user.lastActiveAt).toLocaleDateString()}</span></span>
              )}
            </div>
          </div>
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg shadow p-6">
          <div className="text-orange-800 dark:text-orange-200 text-sm mb-1">Total Meals</div>
          <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
            {data.summary.totalMeals.toLocaleString()}
          </div>
          <div className="text-xs text-orange-700 dark:text-orange-300 mt-1">
            {data.summary.totalCalories.toLocaleString()} total calories
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-6">
          <div className="text-blue-800 dark:text-blue-200 text-sm mb-1">Avg Calories/Day</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            {data.summary.avgCaloriesPerDay.toLocaleString()}
          </div>
          <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            {data.summary.totalMeals > 0 ? `${(data.summary.totalCalories / data.summary.totalMeals).toFixed(0)} per meal` : 'No meals'}
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-6">
          <div className="text-green-800 dark:text-green-200 text-sm mb-1">Avg Steps/Day</div>
          <div className="text-3xl font-bold text-green-900 dark:text-green-100">
            {data.summary.avgStepsPerDay.toLocaleString()}
          </div>
          <div className="text-xs text-green-700 dark:text-green-300 mt-1">
            {data.summary.totalSteps.toLocaleString()} total steps
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow p-6">
          <div className="text-purple-800 dark:text-purple-200 text-sm mb-1">Streak</div>
          <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
            {data.summary.streak} days
          </div>
          <div className="text-xs text-purple-700 dark:text-purple-300 mt-1">
            Consecutive logging
          </div>
        </div>
      </div>

      {/* User Settings & Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* User Preferences */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Preferences
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Units:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.preferences.units || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Theme:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.preferences.themePreference || 'Not set'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Notifications:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.preferences.notifications ? 'Enabled' : 'Disabled'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Biometric:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">{data.preferences.biometricEnabled ? 'Enabled' : 'Disabled'}</span>
            </div>
            {data.preferences.weightCheckInFrequency && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Weight Check-in:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.preferences.weightCheckInFrequency}</span>
              </div>
            )}
            {data.preferences.dietaryPreferences && data.preferences.dietaryPreferences.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 mb-2">Dietary Preferences:</div>
                <div className="flex flex-wrap gap-1">
                  {data.preferences.dietaryPreferences.map((pref: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs">
                      {pref}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Profile */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Profile
          </h2>
          <div className="space-y-3 text-sm">
            {data.profile.age && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Age:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{data.profile.age} years</span>
              </div>
            )}
            {data.profile.gender && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Gender:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.profile.gender}</span>
              </div>
            )}
            {data.profile.height && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Height:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.profile.height} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                </span>
              </div>
            )}
            {data.profile.activityLevel && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Activity:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.profile.activityLevel.replace('-', ' ')}</span>
              </div>
            )}
            {data.profile.healthConditions && data.profile.healthConditions.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 mb-2">Health Conditions:</div>
                <div className="flex flex-wrap gap-1">
                  {data.profile.healthConditions.map((condition: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-xs">
                      {condition}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.profile.foodAllergies && data.profile.foodAllergies.length > 0 && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 mb-2">Allergies:</div>
                <div className="flex flex-wrap gap-1">
                  {data.profile.foodAllergies.map((allergy: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 rounded text-xs">
                      {allergy}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* User Goals */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Goals
          </h2>
          <div className="space-y-3 text-sm">
            {data.goals.primaryGoal && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Primary Goal:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{data.goals.primaryGoal.replace('-', ' ')}</span>
              </div>
            )}
            {data.goals.targetWeight && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Target Weight:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.goals.targetWeight} {data.summary.currentWeight?.unit || 'kg'}
                </span>
              </div>
            )}
            {data.goals.dailyCalorieGoal && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Daily Calories:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{data.goals.dailyCalorieGoal.toLocaleString()} cal</span>
              </div>
            )}
            {data.goals.dailySteps && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Daily Steps:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{data.goals.dailySteps.toLocaleString()}</span>
              </div>
            )}
            {data.goals.macroTargets && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-gray-600 dark:text-gray-400 mb-2">Macro Targets:</div>
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.goals.macroTargets.protein}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.goals.macroTargets.carbs}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{data.goals.macroTargets.fat}%</span>
                  </div>
                </div>
              </div>
            )}
            {data.goals.bmr && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">BMR:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(data.goals.bmr)} cal/day</span>
                </div>
                {data.goals.tdee && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-gray-600 dark:text-gray-400">TDEE:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">{Math.round(data.goals.tdee)} cal/day</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Onboarding Status */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Onboarding
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Status:</span>
              <span className={`font-medium ${data.profile.onboardingCompleted ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                {data.profile.onboardingCompleted ? 'Completed' : 'Incomplete'}
              </span>
            </div>
            {data.profile.onboardingCompletedAt && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Completed:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {new Date(data.profile.onboardingCompletedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            {data.profile.currentOnboardingStep && !data.profile.onboardingCompleted && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Step:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  Step {data.profile.currentOnboardingStep} of 6
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Lifestyle Factors */}
        {data.profile.lifestyle && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Lifestyle
            </h2>
            <div className="space-y-3 text-sm">
              {data.profile.lifestyle.smoking && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Smoking:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                    {data.profile.lifestyle.smoking.replace('-', ' ')}
                  </span>
                </div>
              )}
              {data.profile.lifestyle.smokingQuitDate && (
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Quit Date:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(data.profile.lifestyle.smokingQuitDate).toLocaleDateString()}
                  </span>
                </div>
              )}
              {data.profile.lifestyle.alcoholFrequency && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Alcohol:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {data.profile.lifestyle.alcoholFrequency}
                    </span>
                  </div>
                  {(data.profile.lifestyle.weeklyDrinks ?? 0) > 0 && (
                    <div className="flex justify-between text-xs mt-1">
                      <span className="text-gray-600 dark:text-gray-400">Weekly Drinks:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {data.profile.lifestyle.weeklyDrinks}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {data.profile.lifestyle.recreationalDrugs && data.profile.lifestyle.recreationalDrugs !== 'no' && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Recreational Drugs:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {data.profile.lifestyle.recreationalDrugs}
                    </span>
                  </div>
                  {data.profile.lifestyle.drugTypes && data.profile.lifestyle.drugTypes.length > 0 && (
                    <div className="mt-2">
                      <div className="flex flex-wrap gap-1">
                        {data.profile.lifestyle.drugTypes.map((drug: string, i: number) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded text-xs">
                            {drug}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Body Measurements */}
        {data.profile.bodyMeasurements && Object.keys(data.profile.bodyMeasurements).length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              Body Measurements
            </h2>
            <div className="space-y-3 text-sm">
              {data.profile.bodyMeasurements.waist && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Waist:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.profile.bodyMeasurements.waist} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              )}
              {data.profile.bodyMeasurements.hips && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Hips:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.profile.bodyMeasurements.hips} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              )}
              {data.profile.bodyMeasurements.chest && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Chest:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.profile.bodyMeasurements.chest} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              )}
              {data.profile.bodyMeasurements.arms && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Arms:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.profile.bodyMeasurements.arms} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              )}
              {data.profile.bodyMeasurements.thighs && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Thighs:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {data.profile.bodyMeasurements.thighs} {data.preferences.units === 'imperial' ? 'in' : 'cm'}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Health Vitals */}
        {data.healthVitals && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <HeartIcon className="h-5 w-5 text-red-500" />
              Health Vitals
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Blood Sugar */}
              {data.healthVitals.latestBloodSugar && (
                <div className={`p-4 rounded-lg border ${
                  data.healthVitals.latestBloodSugar.isAbnormal
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <BeakerIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Blood Sugar</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      data.healthVitals.latestBloodSugar.isAbnormal
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {data.healthVitals.latestBloodSugar.value}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">mg/dL</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 capitalize">
                    {data.healthVitals.latestBloodSugar.type.replace('-', ' ')}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {new Date(data.healthVitals.latestBloodSugar.date).toLocaleDateString()}
                  </div>
                  {data.healthVitals.latestBloodSugar.isAbnormal && (
                    <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      ⚠️ {data.healthVitals.latestBloodSugar.value < 70 ? 'Low' : 'High'}
                    </div>
                  )}
                </div>
              )}

              {/* Blood Pressure */}
              {data.healthVitals.latestBloodPressure && (
                <div className={`p-4 rounded-lg border ${
                  data.healthVitals.latestBloodPressure.isAbnormal
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <HeartIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Blood Pressure</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-2xl font-bold ${
                      data.healthVitals.latestBloodPressure.isAbnormal
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {data.healthVitals.latestBloodPressure.systolic}/{data.healthVitals.latestBloodPressure.diastolic}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">mmHg</span>
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                    {new Date(data.healthVitals.latestBloodPressure.date).toLocaleDateString()}
                  </div>
                  {data.healthVitals.latestBloodPressure.isAbnormal && (
                    <div className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                      ⚠️ Abnormal
                    </div>
                  )}
                </div>
              )}

              {/* Weekly Exercise */}
              <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 md:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <FireIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Weekly Exercise</span>
                </div>
                <div className="flex gap-6">
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data.healthVitals.weeklyExercise.totalMinutes}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">minutes</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data.healthVitals.weeklyExercise.sessionsCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">sessions</div>
                  </div>
                  <div>
                    <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 capitalize">
                      {data.healthVitals.weeklyExercise.avgIntensity}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">avg intensity</div>
                  </div>
                </div>
                {data.healthVitals.weeklyExercise.totalMinutes < 150 && (
                  <div className="mt-2 text-xs text-yellow-600 dark:text-yellow-400">
                    ℹ️ CDC recommends 150+ minutes/week
                  </div>
                )}
              </div>

              {/* 30-Day Trends */}
              <div className="md:col-span-2 p-4 rounded-lg border bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">30-Day Trends</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Blood Sugar</div>
                    <div className={`text-sm font-semibold capitalize ${
                      data.healthVitals.trends.bloodSugarTrend === 'improving' ? 'text-green-600 dark:text-green-400' :
                      data.healthVitals.trends.bloodSugarTrend === 'worsening' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {data.healthVitals.trends.bloodSugarTrend === 'insufficient-data' ? 'N/A' : data.healthVitals.trends.bloodSugarTrend}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Blood Pressure</div>
                    <div className={`text-sm font-semibold capitalize ${
                      data.healthVitals.trends.bloodPressureTrend === 'improving' ? 'text-green-600 dark:text-green-400' :
                      data.healthVitals.trends.bloodPressureTrend === 'worsening' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {data.healthVitals.trends.bloodPressureTrend === 'insufficient-data' ? 'N/A' : data.healthVitals.trends.bloodPressureTrend}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Exercise</div>
                    <div className={`text-sm font-semibold capitalize ${
                      data.healthVitals.trends.exerciseTrend === 'improving' ? 'text-green-600 dark:text-green-400' :
                      data.healthVitals.trends.exerciseTrend === 'worsening' ? 'text-red-600 dark:text-red-400' :
                      'text-gray-600 dark:text-gray-400'
                    }`}>
                      {data.healthVitals.trends.exerciseTrend === 'insufficient-data' ? 'N/A' : data.healthVitals.trends.exerciseTrend}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Health Analysis */}
        {data.aiHealthProfile && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-purple-500" />
              AI Health Analysis
            </h2>

            <div className="space-y-4">
              {/* Profile Status */}
              {data.aiHealthProfile.hasProfile ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status Badge */}
                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Profile Status</div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        data.aiHealthProfile.profileStatus === 'approved'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          : data.aiHealthProfile.profileStatus === 'modified'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      }`}>
                        {data.aiHealthProfile.profileStatus || 'Unknown'}
                      </span>
                    </div>
                    {data.aiHealthProfile.profileConfidence !== null && (
                      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {data.aiHealthProfile.profileConfidence}%
                      </div>
                    )}
                  </div>

                  {/* Restrictions Count */}
                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Dietary Restrictions</div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {data.aiHealthProfile.restrictionsCount}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {data.aiHealthProfile.restrictionsCount === 1 ? 'restriction' : 'restrictions'}
                    </div>
                  </div>

                  {/* Generated Date */}
                  <div className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Last Generated</div>
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {data.aiHealthProfile.profileGeneratedAt
                        ? new Date(data.aiHealthProfile.profileGeneratedAt).toLocaleDateString()
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                  <div className="text-sm text-gray-600 dark:text-gray-400">No AI health profile generated yet</div>
                </div>
              )}

              {/* Critical Warnings */}
              {data.aiHealthProfile.criticalWarnings && data.aiHealthProfile.criticalWarnings.length > 0 && (
                <div className="p-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
                  <div className="flex items-center gap-2 mb-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-semibold text-red-900 dark:text-red-300">Critical Warnings</span>
                  </div>
                  <ul className="list-disc list-inside space-y-1">
                    {data.aiHealthProfile.criticalWarnings.map((warning, idx) => (
                      <li key={idx} className="text-xs text-red-800 dark:text-red-300">
                        {warning}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recent AI Decisions */}
              <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20">
                <div className="text-sm font-medium text-purple-900 dark:text-purple-300 mb-3">
                  Recent AI Decisions (30 days)
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {data.aiHealthProfile.recentDecisions.total}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-400">Total</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.aiHealthProfile.recentDecisions.unreviewed > 0
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-purple-900 dark:text-purple-100'
                    }`}>
                      {data.aiHealthProfile.recentDecisions.unreviewed}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-400">Unreviewed</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {data.aiHealthProfile.recentDecisions.mealSafetyChecks}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-400">Meal Checks</div>
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${
                      data.aiHealthProfile.recentDecisions.criticalMealSafety > 0
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-purple-900 dark:text-purple-100'
                    }`}>
                      {data.aiHealthProfile.recentDecisions.criticalMealSafety}
                    </div>
                    <div className="text-xs text-purple-700 dark:text-purple-400">Critical</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Weight Stats */}
      {data.summary.currentWeight && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            <ScaleIcon className="h-5 w-5 text-primary" />
            Weight Progress
          </h2>
          <div className="flex gap-8 items-center">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Current Weight</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {data.summary.currentWeight.weight.toFixed(1)} {data.summary.currentWeight.unit}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Change</div>
              <div className={`text-2xl font-bold ${data.summary.weightChange < 0 ? 'text-green-600' : data.summary.weightChange > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {data.summary.weightChange > 0 ? '+' : ''}{data.summary.weightChange.toFixed(1)} {data.summary.currentWeight.unit}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Weight Chart */}
        {data.charts.weightLogs.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Weight Trend</h3>
            <AdminWeightLogsChart data={data.charts.weightLogs} formatDate={formatDate} />
          </div>
        )}

        {/* Daily Calories Chart */}
        {data.charts.dailyCalories.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Calories</h3>
            <AdminDailyCaloriesChart data={data.charts.dailyCalories} formatDate={formatDate} />
          </div>
        )}

        {/* Steps Chart */}
        {data.charts.stepLogs.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Steps</h3>
            <AdminStepLogsChart data={data.charts.stepLogs} formatDate={formatDate} />
          </div>
        )}
      </div>

      {/* Empty State */}
      {data.charts.weightLogs.length === 0 && data.charts.dailyCalories.length === 0 && data.charts.stepLogs.length === 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center">
          <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Data Available</p>
          <p className="text-gray-600 dark:text-gray-400">
            This user has no activity data in the selected date range.
          </p>
        </div>
      )}

      {/* Detailed Activity Logs */}
      {(data.logs.stepLogs.length > 0 || data.logs.weightLogs.length > 0 || data.logs.mealLogs.length > 0) && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Detailed Activity Logs</h2>

          {/* Step Logs Table */}
          {data.logs.stepLogs.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <FireIcon className="h-5 w-5 text-green-600" />
                  Step Logs ({data.logs.stepLogs.length} entries)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Steps</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Goal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.logs.stepLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(log.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.steps.toLocaleString()}
                          {log.goal && log.steps >= log.goal && (
                            <span className="ml-2 text-green-600 dark:text-green-400">✓</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {log.goal ? log.goal.toLocaleString() : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            log.source === 'apple-health' ? 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300' :
                            log.source === 'google-fit' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                            log.source === 'device' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' :
                            'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                          }`}>
                            {log.source}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {log.notes || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {log.loggedAt ? new Date(log.loggedAt).toLocaleString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Weight Logs Table */}
          {data.logs.weightLogs.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <ScaleIcon className="h-5 w-5 text-blue-600" />
                  Weight Logs ({data.logs.weightLogs.length} entries)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Change</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Source</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Logged At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.logs.weightLogs.map((log, index) => {
                      const prevWeight = index < data.logs.weightLogs.length - 1 ? data.logs.weightLogs[index + 1].weight : null
                      const change = prevWeight ? log.weight - prevWeight : 0
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                            {new Date(log.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {log.weight.toFixed(1)} {log.unit}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {prevWeight ? (
                              <span className={change < 0 ? 'text-green-600 dark:text-green-400' : change > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}>
                                {change > 0 ? '+' : ''}{change.toFixed(1)} {log.unit}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              log.dataSource === 'bluetooth-scale' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                              log.dataSource === 'photo-verified' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300' :
                              'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'
                            }`}>
                              {log.dataSource}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                            {log.notes || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                            {log.loggedAt ? new Date(log.loggedAt).toLocaleString() : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Meal Logs Table */}
          {data.logs.mealLogs.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow mb-6 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <CameraIcon className="h-5 w-5 text-orange-600" />
                  Meal Logs ({data.logs.mealLogs.length} entries)
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date/Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Meal Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Calories</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Macros (P/C/F)</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Title</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {data.logs.mealLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {new Date(log.date).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                            log.mealType === 'breakfast' ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300' :
                            log.mealType === 'lunch' ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300' :
                            log.mealType === 'dinner' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300' :
                            'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
                          }`}>
                            {log.mealType}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {log.calories.toLocaleString()} cal
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                          {log.macros.protein}g / {log.macros.carbs}g / {log.macros.fat}g
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                          {log.title || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {log.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function AnalyticsPageContent() {
  const searchParams = useSearchParams()
  const uid = searchParams.get('uid')
  const email = searchParams.get('email')

  // If uid is present, show user analytics
  if (uid && email) {
    return <UserAnalytics uid={uid} email={email} />
  }

  // Otherwise show platform analytics
  return <PlatformAnalytics />
}

function PlatformAnalytics() {
  const { isAdmin } = useAdminAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isAdmin) {
      loadAnalytics()
    }
  }, [isAdmin, dateRange])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)
    const url = `/api/admin/analytics?range=${dateRange}`
    try {
      const response = await fetch(url)
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load analytics' }))
        throw new Error(errorData.error || 'Failed to load analytics')
      }
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      logger.error('Error loading platform analytics', err as Error, {
        url,
        dateRange,
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorMessage
      })
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access analytics.
          </p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <h2 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Analytics</h2>
          <p className="text-red-700 dark:text-red-300">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Platform metrics and insights</p>
          </div>
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <UsersIcon className="h-6 w-6 text-primary" />
          User Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Total Users</div>
            <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              {data.userMetrics.totalUsers.toLocaleString()}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Daily Active</div>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">
              {data.userMetrics.dau.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.userMetrics.totalUsers > 0
                ? ((data.userMetrics.dau / data.userMetrics.totalUsers) * 100).toFixed(1)
                : 0}% of total
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Weekly Active</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {data.userMetrics.wau.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.userMetrics.totalUsers > 0
                ? ((data.userMetrics.wau / data.userMetrics.totalUsers) * 100).toFixed(1)
                : 0}% of total
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="text-gray-600 dark:text-gray-400 text-sm mb-1">Monthly Active</div>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
              {data.userMetrics.mau.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {data.userMetrics.totalUsers > 0
                ? ((data.userMetrics.mau / data.userMetrics.totalUsers) * 100).toFixed(1)
                : 0}% of total
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg shadow p-6">
            <div className="text-green-800 dark:text-green-200 text-sm mb-1">New Users Today</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              +{data.userMetrics.newUsersToday.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg shadow p-6">
            <div className="text-blue-800 dark:text-blue-200 text-sm mb-1">New Users This Week</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              +{data.userMetrics.newUsersThisWeek.toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg shadow p-6">
            <div className="text-purple-800 dark:text-purple-200 text-sm mb-1">New Users This Month</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              +{data.userMetrics.newUsersThisMonth.toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <ChartBarIcon className="h-6 w-6 text-primary" />
          Activity Metrics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Meal Logs */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <CameraIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Meal Logs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.totalMealLogs.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Today:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.mealLogsToday.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">This Week:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.mealLogsThisWeek.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Weight Logs */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <ScaleIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Weight Logs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.totalWeightLogs.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Today:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.weightLogsToday.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">This Week:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.weightLogsThisWeek.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Step Logs */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <FireIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-gray-600 dark:text-gray-400 text-sm">Step Logs</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.totalStepLogs.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Today:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.stepLogsToday.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">This Week:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {data.activityMetrics.stepLogsThisWeek.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Engagement & Recipe Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Engagement Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Engagement</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Avg Meals per User</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {data.engagementMetrics.avgMealsPerUser.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-orange-500 h-2 rounded-full"
                  style={{ width: `${Math.min((data.engagementMetrics.avgMealsPerUser / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 dark:text-gray-400 text-sm">Avg Weight Logs per User</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {data.engagementMetrics.avgWeightLogsPerUser.toFixed(1)}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full"
                  style={{ width: `${Math.min((data.engagementMetrics.avgWeightLogsPerUser / 50) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 dark:text-gray-400 text-sm">7-Day Retention Rate</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {(data.engagementMetrics.retentionRate7Day * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${data.engagementMetrics.retentionRate7Day * 100}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-gray-600 dark:text-gray-400 text-sm">30-Day Retention Rate</span>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                  {(data.engagementMetrics.retentionRate30Day * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${data.engagementMetrics.retentionRate30Day * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recipe Metrics */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Recipe Platform</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div>
                <div className="text-sm text-purple-800 dark:text-purple-200">Total Recipes</div>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                  {data.recipeMetrics.totalRecipes}
                </div>
              </div>
              <ClockIcon className="h-10 w-10 text-purple-400" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
              <div>
                <div className="text-sm text-orange-800 dark:text-orange-200">Cooking Sessions</div>
                <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                  {data.recipeMetrics.totalCookingSessions.toLocaleString()}
                </div>
              </div>
              <FireIcon className="h-10 w-10 text-orange-400" />
            </div>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
              <div>
                <div className="text-sm text-blue-800 dark:text-blue-200">Recipes in Queue</div>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {data.recipeMetrics.recipeQueueSize.toLocaleString()}
                </div>
              </div>
              <ChartBarIcon className="h-10 w-10 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h3 className="text-lg font-semibold text-accent-dark mb-2">Analytics Notes</h3>
        <ul className="space-y-2 text-sm text-accent-dark">
          <li>• DAU/WAU/MAU are calculated based on lastActiveAt timestamps</li>
          <li>• Retention rates measure users who return after signup</li>
          <li>• Activity metrics aggregate all user logs across the platform</li>
          <li>• Data refreshes every 5 minutes for real-time insights</li>
        </ul>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    }>
      <AnalyticsPageContent />
    </Suspense>
  )
}
