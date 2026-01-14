'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardRouter from '@/components/auth/DashboardRouter'
import { DashboardErrorBoundary } from '@/components/error/DashboardErrorBoundary'
import { PageHeader } from '@/components/ui/PageHeader'
import { PlateauDetectionEmpty } from '@/components/ui/EmptyState'
import { RecipeQueue } from '@/components/ui/RecipeQueue'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { NotificationPrompt } from '@/components/ui/NotificationPrompt'
import { useMissions } from '@/hooks/useMissions'
import { MissionList } from '@/components/ui/MissionCard'
import { XPBadge } from '@/components/ui/XPBadge'
import { auth } from '@/lib/auth'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useStepTracking, StepTrackingProvider } from '@/components/StepTrackingProvider'
import { useUserProfile } from '@/hooks/useUserProfile'
import { useWeightProjection } from '@/hooks/useWeightProjection'
import { useTrendProjection } from '@/hooks/useTrendProjection'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { useInventory } from '@/hooks/useInventory'
import { formatProjectionDisplay } from '@/lib/weight-projection-agent'
import { getNextMealContext, getMealCTA } from '@/lib/meal-context'
import { checkProfileCompleteness } from '@/lib/profile-completeness'
import { Spinner } from '@/components/ui/Spinner'
import { MealSuggestion } from '@/lib/meal-suggestions'
import { useRecipes } from '@/hooks/useRecipes'
import { generateRecipeAltText } from '@/lib/utils'
import Image from 'next/image'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'
import { shouldShowWeightReminder, getWeightReminderMessage, getWeightReminderColor } from '@/lib/weight-reminder-logic'
import { useFeatureGate } from '@/hooks/useFeatureGate'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { shouldShowFeatureByPreference } from '@/lib/feature-preference-gate'
import { BRAND_TERMS } from '@/lib/messaging/brand-terms'
import { getProductLabel, getTooltip } from '@/lib/messaging/terminology'
import { TrustBadge } from '@/components/ui/TrustBadge'

// Dynamic imports for heavy components (lazy loaded on demand)
const GoalsEditor = dynamic(() => import('@/components/ui/GoalsEditor').then(mod => ({ default: mod.GoalsEditor })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Spinner /></div>,
  ssr: false
})

const RecipeModal = dynamic(() => import('@/components/ui/RecipeModal').then(mod => ({ default: mod.RecipeModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Spinner /></div>,
  ssr: false
})

const ChatWidget = dynamic(() => import('@/components/ui/ChatInterface').then(mod => ({ default: mod.ChatWidget })), {
  loading: () => null, // Chat widget loads silently in background
  ssr: false
})

const QuickWeightLogModal = dynamic(() => import('@/components/ui/QuickWeightLogModal').then(mod => ({ default: mod.QuickWeightLogModal })), {
  loading: () => <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"><Spinner /></div>,
  ssr: false
})

const WeightReminderModal = dynamic(() => import('@/components/ui/WeightReminderModal').then(mod => ({ default: mod.WeightReminderModal })), {
  ssr: false
})

const UrgentRecommendationsWidget = dynamic(() => import('@/components/appointments/UrgentRecommendationsWidget').then(mod => ({ default: mod.UrgentRecommendationsWidget })), {
  loading: () => null,
  ssr: false
})

// Helper function to get meal type emoji for placeholders
const getMealEmoji = (mealType: string): string => {
  const emojis: Record<string, string> = {
    breakfast: '🍳',
    lunch: '🥗',
    dinner: '🍽️',
    snack: '🍎'
  }
  return emojis[mealType] || '🍴'
}

function DashboardContent() {
  const router = useRouter()
  const [showGoalsEditor, setShowGoalsEditor] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<MealSuggestion | null>(null)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)

  // Check if user has family plan features
  const { canAccess: hasFamilyFeatures } = useFeatureGate('multiple-patients')

  // Get user's onboarding preferences for personalization
  const userPrefs = useUserPreferences()

  // Fetch all dashboard data for current user (no family member selection)
  const {
    userProfile,
    todayMeals,
    allMeals,
    weightData,
    stepsData,
    loading,
    loadingMeals
  } = useDashboardData(null)

  // Get real-time step count from automatic tracking
  const { todaysSteps, isTracking, isEnabled } = useStepTracking()

  // Calculate all statistics with memoization
  const {
    nutritionSummary,
    weightTrend,
    activitySummary,
    calorieProgress,
    stepProgress
  } = useDashboardStats(todayMeals, weightData, stepsData, userProfile)

  // Calculate weight projection based on deficit (with plateau detection)
  const weightProjection = useWeightProjection(allMeals, stepsData, userProfile, weightTrend.current)

  // Calculate trend-based projection using historical weight logs
  const trendProjection = useTrendProjection(weightData, userProfile)
  const projectionDisplay = trendProjection ? formatProjectionDisplay(trendProjection) : null

  // PWA install prompt
  const { isInstallable, promptInstall } = useInstallPrompt()

  // Weekly missions and gamification
  const { missions, gamification, loading: missionsLoading, checkProgress } = useMissions(userProfile?.userId)

  // Get recipes with Firestore media data (images/videos)
  const { recipes: recipesWithMedia } = useRecipes()

  // Get inventory items for ingredient-aware suggestions
  const { allItems: inventoryItems } = useInventory()

  // Calculate weight reminder status
  // weightData is sorted desc (newest first), so [0] is most recent
  const lastWeightLog = weightData.length > 0 ? weightData[0] : null
  const weightReminder = useMemo(() => {
    const reminder = shouldShowWeightReminder(
      lastWeightLog,
      userProfile?.preferences?.weightCheckInFrequency || 'weekly'
    )
    // Debug logging
    if (lastWeightLog) {
      logger.debug('Weight reminder calculation', {
        lastLogDate: lastWeightLog.loggedAt,
        frequency: userProfile?.preferences?.weightCheckInFrequency,
        shouldShow: reminder.shouldShow,
        daysSince: reminder.daysSince,
        status: reminder.status
      })
    }
    return reminder
  }, [lastWeightLog, userProfile?.preferences?.weightCheckInFrequency])

  // Get contextual meal recommendations with personalized suggestions (with images)
  // MEMOIZED: Prevents expensive recalculation on every render (237 lines of logic + 692-line meal array)
  const mealContext = useMemo(() => {
    return getNextMealContext(
      todayMeals
        .filter(m => m && m.mealType && typeof m.calories === 'number')
        .map(m => ({ mealType: m.mealType, totalCalories: m.calories })),
      nutritionSummary.goalCalories || 2000,
      {
        dietaryPreferences: userProfile?.preferences?.dietaryPreferences || [],
        foodAllergies: userProfile?.profile?.foodAllergies || [],
        mealSchedule: userProfile?.preferences?.mealSchedule
      },
      auth.currentUser?.uid,
      recipesWithMedia || [], // Pass recipes with images/videos from Firestore
      inventoryItems // Pass inventory for ingredient checking
    )
  }, [
    todayMeals,
    nutritionSummary.goalCalories,
    userProfile?.preferences?.dietaryPreferences,
    userProfile?.profile?.foodAllergies,
    userProfile?.preferences?.mealSchedule,
    auth.currentUser?.uid,
    recipesWithMedia,
    inventoryItems // Add to dependencies
  ])

  // Check profile completeness for safety warnings
  // MEMOIZED: Prevents expensive recalculation on every render (147 lines of logic)
  const profileCompleteness = useMemo(() => {
    return checkProfileCompleteness(userProfile)
  }, [userProfile])

  // Use sensor steps if tracking is enabled, otherwise use logged steps
  const displaySteps = isEnabled ? todaysSteps : activitySummary.todaySteps
  const displayProgress = (displaySteps / activitySummary.goalSteps) * 100

  // Generate Wellness Coach recommendations based on live data (memoized to prevent recalculation on every render)
  const aiRecommendations = useMemo(() => {
    const recommendations: string[] = []

    // Calorie recommendations (only if user has logged meals)
    if (nutritionSummary.mealsLogged > 0) {
      const calorieDiff = nutritionSummary.todayCalories - nutritionSummary.goalCalories
      const caloriePercent = calorieProgress

      if (caloriePercent < 70) {
        recommendations.push(
          `You're ${Math.abs(calorieDiff).toFixed(0)} calories under your goal. Make sure you're eating enough to stay healthy and energized!`
        )
      } else if (caloriePercent < 90) {
        recommendations.push(
          `You're ${Math.abs(calorieDiff).toFixed(0)} calories under your goal. Consider adding a healthy snack with protein to reach your target.`
        )
      } else if (caloriePercent <= 110) {
        recommendations.push(`Perfect! You're right on track with your calorie goal for today.`)
      } else if (caloriePercent <= 130) {
        recommendations.push(
          `You're ${calorieDiff.toFixed(0)} calories over your goal. That's okay! Just keep it in mind for tomorrow.`
        )
      } else {
        recommendations.push(
          `You're ${calorieDiff.toFixed(0)} calories over your goal today. Consider lighter meals or extra activity to balance it out.`
        )
      }
    } else {
      recommendations.push(mealContext.message)
    }

    // Step recommendations
    if (displaySteps > 0) {
      const stepDiff = activitySummary.goalSteps - displaySteps
      const walkingMinutes = Math.ceil(stepDiff / 100) // ~100 steps per minute

      if (stepProgress >= 100) {
        recommendations.push(`Excellent! You've hit your step goal for today! 🎉`)
      } else if (stepProgress >= 80) {
        recommendations.push(
          `Almost there! Just ${stepDiff.toLocaleString()} more steps (~${walkingMinutes} min walk) to reach your goal!`
        )
      } else if (stepProgress >= 50) {
        recommendations.push(
          `You're ${stepDiff.toLocaleString()} steps away from your goal. A ${walkingMinutes}-minute walk will get you there!`
        )
      } else {
        recommendations.push(
          `Let's get moving! You need ${stepDiff.toLocaleString()} more steps (~${walkingMinutes} min) to reach your goal today.`
        )
      }
    } else {
      recommendations.push(`Start tracking your steps to get personalized activity recommendations!`)
    }

    // Weight trend recommendations (only if user has logged 2+ weights)
    // Don't show for brand new users with only onboarding weight
    const hasActualWeightTrend = weightData.length >= 2 &&
                                  weightTrend.change !== 0 &&
                                  Math.abs(weightTrend.change) >= 0.1

    if (hasActualWeightTrend) {
      if (weightTrend.change < 0) {
        recommendations.push(
          `Great progress! You've lost ${Math.abs(weightTrend.change).toFixed(1)} lbs recently. Keep up the excellent work!`
        )
      } else {
        recommendations.push(
          `Your weight increased by ${weightTrend.change.toFixed(1)} lbs. Stay focused on your calorie deficit and activity goals.`
        )
      }
    }

    return recommendations
  }, [
    nutritionSummary.mealsLogged,
    nutritionSummary.todayCalories,
    nutritionSummary.goalCalories,
    calorieProgress,
    mealContext.message,
    displaySteps,
    activitySummary.goalSteps,
    stepProgress,
    weightData.length,
    weightTrend.change
  ])

  // Onboarding check is now handled by DashboardRouter

  // Debug: Log user preferences on mount (Phase 1 - Proof of Concept)
  useEffect(() => {
    if (userPrefs.preferences && !userPrefs.loading) {
      logger.debug('📊 Dashboard loaded with user preferences:', {
        userMode: userPrefs.preferences.userMode,
        topFeature: userPrefs.getTopFeature(),
        wantsPhotoLogging: userPrefs.wantsPhotoLogging(),
        wantsReminders: userPrefs.wantsReminders(),
        kitchenMode: userPrefs.getKitchenMode(),
        automationLevel: userPrefs.preferences.automationLevel
      })
    }
  }, [userPrefs.preferences, userPrefs.loading])

  // PHASE 2: Widget Personalization Logic
  // Filter and reorder widgets based on user's feature preferences
  const dashboardWidgets = useMemo(() => {
    const preferences = userPrefs.getAllFeatures()

    // Backward compatibility: show all widgets if no preferences
    if (!preferences || preferences.length === 0) {
      return ['progress', 'gallery', 'medical']
    }

    const widgets: string[] = []

    // Priority 1: Top feature gets shown first
    const topFeature = userPrefs.getTopFeature()
    if (topFeature === 'body_fitness') {
      widgets.push('progress')
    } else if (topFeature === 'nutrition_kitchen') {
      widgets.push('gallery')
    } else if (topFeature === 'health_medical') {
      widgets.push('medical')
    }

    // Priority 2: Add remaining widgets ONLY if user selected relevant features
    // Weight/Progress widget - show if user wants body_fitness
    if (preferences.includes('body_fitness') && !widgets.includes('progress')) {
      widgets.push('progress')
    }

    // Meal Gallery widget - show if user wants nutrition_kitchen
    if (preferences.includes('nutrition_kitchen') && !widgets.includes('gallery')) {
      widgets.push('gallery')
    }

    // Medical widget - show if user wants health_medical
    if (preferences.includes('health_medical') && !widgets.includes('medical')) {
      widgets.push('medical')
    }

    logger.debug('📊 Filtered & personalized widgets:', { widgets, topFeature, preferences })
    return widgets
  }, [userPrefs.getAllFeatures, userPrefs.getTopFeature])

  // Quick Action Visibility based on preferences
  const quickActions = useMemo(() => {
    const preferences = userPrefs.getAllFeatures()

    // Backward compatibility: show all if no preferences
    if (!preferences || preferences.length === 0) {
      return {
        showMeal: true,
        showMedications: true,
        showGallery: true,
        showShopping: true,
        showWeight: true,
        showInventory: true,
      }
    }

    return {
      showMeal: preferences.includes('nutrition_kitchen') || preferences.includes('body_fitness'),
      showMedications: preferences.includes('health_medical'),
      showGallery: preferences.includes('nutrition_kitchen'),
      showShopping: preferences.includes('nutrition_kitchen'),
      showWeight: preferences.includes('body_fitness') || preferences.includes('health_medical'),
      showInventory: preferences.includes('nutrition_kitchen'),
    }
  }, [userPrefs.getAllFeatures])

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Offline Indicator */}
      <OfflineIndicator />

      <PageHeader
        title="Dashboard"
      />

      <div className="container-narrow py-6 space-y-6">
        {/* Trial Upgrade Banner */}
        {userProfile?.subscription?.status === 'trialing' && userProfile?.subscription?.trialEndsAt && (
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-2xl p-6 text-white">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🎁</span>
                  <h3 className="text-xl font-bold">You're on a Free Trial!</h3>
                </div>
                <p className="text-blue-100 text-sm mb-1">
                  Trial ends:{' '}
                  <strong className="text-white">
                    {(() => {
                      try {
                        if (!userProfile.subscription.trialEndsAt) return 'Soon'
                        const date = typeof userProfile.subscription.trialEndsAt === 'object' && userProfile.subscription.trialEndsAt && 'toDate' in userProfile.subscription.trialEndsAt && typeof (userProfile.subscription.trialEndsAt as any).toDate === 'function'
                          ? (userProfile.subscription.trialEndsAt as any).toDate()
                          : new Date(userProfile.subscription.trialEndsAt as any)
                        return isNaN(date.getTime()) ? 'Soon' : date.toLocaleDateString()
                      } catch {
                        return 'Soon'
                      }
                    })()}
                  </strong>
                </p>
                <p className="text-blue-50 text-xs">
                  Upgrade now to keep tracking your progress and never lose access to your health data
                </p>
              </div>
              <Link
                href="/pricing"
                className="px-6 py-3 bg-white text-blue-600 hover:bg-blue-50 rounded-lg font-bold shadow-lg hover:shadow-xl transition-all whitespace-nowrap"
              >
                Upgrade Now
              </Link>
            </div>
          </div>
        )}

        {loading || loadingMeals ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Quick Access to Family Health Tracking - Only for family plans */}
            {hasFamilyFeatures && (
              <div className="bg-card rounded-lg shadow-sm p-4 border-l-4 border-primary">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">Family Health Tracking</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Track weight, meals, steps, and vitals for family members
                    </p>
                  </div>
                  <button
                    onClick={() => router.push('/patients')}
                    className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
                  >
                    View Family →
                  </button>
                </div>
              </div>
            )}

            {/* Urgent AI Recommendations Widget */}
            <UrgentRecommendationsWidget />

            {/* PHASE 2: Personalized Dashboard Widgets (ordered by user's feature preferences) */}
            {dashboardWidgets.map((widgetId) => {
              if (widgetId === 'progress') {
                return (
                  <div key="progress" className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-1">📊 Visualize Your Progress</h3>
                        <p className="text-sm text-purple-100">View interactive charts and detailed trends</p>
                      </div>
                      <a
                        href="/progress"
                        className="px-6 py-3 bg-white dark:bg-gray-900 text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2"
                      >
                        <span>View Charts</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )
              }

              if (widgetId === 'gallery') {
                return (
                  <div key="gallery" className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-1">📸 Browse Your Meal Photos</h3>
                        <p className="text-sm text-indigo-100">View your food journey in a beautiful gallery</p>
                      </div>
                      <a
                        href="/gallery"
                        className="px-6 py-3 bg-white dark:bg-gray-900 text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors font-medium flex items-center gap-2"
                      >
                        <span>View Gallery</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )
              }

              if (widgetId === 'medical') {
                return (
                  <div key="medical" className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-bold mb-1">🏥 Medical Info</h3>
                        <p className="text-sm text-green-100">Manage health information for you or your family</p>
                      </div>
                      <a
                        href="/medical"
                        className="px-6 py-3 bg-white dark:bg-gray-900 text-green-600 rounded-lg hover:bg-green-50 transition-colors font-medium flex items-center gap-2"
                      >
                        <span>View Info</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </a>
                    </div>
                  </div>
                )
              }

              return null
            })}

            {/* PATIENT-SPECIFIC HEALTH DATA REMOVED - Now on /patients/[patientId] pages */}
          </>
        )}

        {/* Quick Actions - Filtered by preferences */}
        <div className="grid grid-cols-4 gap-1.5">
          {quickActions.showMeal && (
            <button
              onClick={() => {
                setNavigatingTo('log-meal')
                router.push('/log-meal')
              }}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Log meal"
            >
              {navigatingTo === 'log-meal' ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                <span className="text-5xl" role="img" aria-label="camera">📸</span>
              )}
              <span className="text-[9px] font-medium leading-tight mt-0.5">Meal</span>
            </button>
          )}

          {quickActions.showMedications && (
            <button
              onClick={() => {
                setNavigatingTo('medications')
                router.push('/medications')
              }}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Manage medications"
            >
              {navigatingTo === 'medications' ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                <span className="text-5xl" role="img" aria-label="medications">💊</span>
              )}
              <span className="text-[9px] font-medium leading-tight mt-0.5">Meds</span>
            </button>
          )}

          {quickActions.showGallery && (
            <button
              onClick={() => {
                setNavigatingTo('gallery')
                router.push('/gallery')
              }}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Photo gallery with social sharing"
            >
              {navigatingTo === 'gallery' ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                <span className="text-5xl" role="img" aria-label="gallery">🖼️</span>
              )}
              <span className="text-[9px] font-medium leading-tight mt-0.5">Gallery</span>
            </button>
          )}

          {quickActions.showShopping && (
            <button
              onClick={() => {
                setNavigatingTo('shopping')
                router.push('/shopping')
              }}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Shopping list"
            >
              {navigatingTo === 'shopping' ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                <span className="text-5xl" role="img" aria-label="shopping">🛒</span>
              )}
              <span className="text-[9px] font-medium leading-tight mt-0.5">Shop</span>
            </button>
          )}

          {quickActions.showWeight && (
            <button
              onClick={() => setShowWeightModal(true)}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Log weight"
            >
              <span className="text-2xl" role="img" aria-label="scale">⚖️</span>
              <span className="text-[9px] font-medium leading-tight mt-0.5">Weight</span>
            </button>
          )}

          {quickActions.showInventory && (
            <button
              onClick={() => {
                setNavigatingTo('inventory')
                router.push('/inventory')
              }}
              disabled={!!navigatingTo}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="Kitchen inventory"
            >
              {navigatingTo === 'inventory' ? (
                <Spinner size="sm" className="text-primary" />
              ) : (
                <span className="text-5xl" role="img" aria-label="inventory">📦</span>
              )}
              <span className="text-[9px] font-medium leading-tight mt-0.5">Items</span>
            </button>
          )}

          {/* Settings - Always visible */}
          <button
            onClick={() => {
              setNavigatingTo('settings')
              router.push('/profile')
            }}
            disabled={!!navigatingTo}
            className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Profile settings"
          >
            {navigatingTo === 'settings' ? (
              <Spinner size="sm" className="text-primary" />
            ) : (
              <span className="text-5xl" role="img" aria-label="settings">⚙️</span>
            )}
            <span className="text-[9px] font-medium leading-tight mt-0.5">Settings</span>
          </button>

          {/* PWA Install Button - Only visible if installable */}
          {isInstallable && (
            <button
              onClick={async () => {
                const success = await promptInstall()
                if (success) {
                  toast.success('App installed successfully!')
                }
              }}
              className="aspect-square bg-white dark:bg-gray-900 rounded shadow hover:shadow-md cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-0 p-1.5"
              aria-label="Install app"
            >
              <span className="text-5xl" role="img" aria-label="install">📱</span>
              <span className="text-[9px] font-medium leading-tight mt-0.5">Install</span>
            </button>
          )}
        </div>

        {/* Notification Permission Prompt */}
        <NotificationPrompt userId={userProfile?.userId} />

        {/* Gamification: XP & Level */}
        {gamification && (
          <XPBadge gamification={gamification} />
        )}

        {/* Weekly Missions */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Weekly Missions</h2>
            <span className="text-xs text-gray-600 dark:text-gray-400">Resets Monday</span>
          </div>
          <MissionList missions={missions} loading={missionsLoading} />
        </div>

        {/* Recipe Queue */}
        <RecipeQueue />

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && (
          <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-6">
            <h2 className="mb-3">{BRAND_TERMS.WELLNESS_COACH}</h2>
            <div className="space-y-3">
              {aiRecommendations.map((recommendation, index) => (
                <div key={index} className="bg-white dark:bg-gray-900 rounded-lg p-4">
                  <p className="text-sm text-gray-900 dark:text-gray-100">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feature Discovery - Show upsells for features user didn't select */}
        {userPrefs.getAllFeatures() && userPrefs.getAllFeatures().length > 0 && (
          <>
            {/* Body & Fitness Upsell */}
            {!userPrefs.hasFeature('body_fitness') && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💪</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Track Body & Fitness Goals</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Track weight, exercise, body composition, and fitness goals - whether gaining, losing, or maintaining.
                    </p>
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                    >
                      Enable Body & Fitness
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Nutrition & Kitchen Upsell */}
            {!userPrefs.hasFeature('nutrition_kitchen') && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">🍎</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-orange-900 mb-2">Master Nutrition & Kitchen</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Plan meals with WPL Vision™, discover recipes, smart shopping lists, and pantry tracking all in one place.
                    </p>
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                    >
                      Enable Nutrition & Kitchen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Health & Medical Upsell */}
            {!userPrefs.hasFeature('health_medical') && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="text-4xl">💊</div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-green-900 mb-2">Track Health & Medical Records</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Track appointments, medications, vital signs (blood pressure, glucose, etc.), and health records all in one place.
                    </p>
                    <button
                      onClick={() => router.push('/onboarding')}
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-lg font-bold text-sm shadow-lg hover:shadow-xl transition-all"
                    >
                      Enable Health & Medical
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Trust Badge - Platform Credentials Footer */}
      <div className="mt-12 pt-8 border-t border-border/50">
        <div className="flex flex-col items-center text-center space-y-4">
          <h3 className="text-sm font-medium text-muted-foreground">
            Your Health Data is Protected
          </h3>
          <TrustBadge variant="default" />
        </div>
      </div>

      {/* Goals Editor Modal */}
      <GoalsEditor
        isOpen={showGoalsEditor}
        onClose={() => setShowGoalsEditor(false)}
        userProfile={userProfile}
        currentWeight={weightTrend.current}
        onSuccess={() => window.location.reload()}
      />

      {/* Recipe Modal */}
      {selectedRecipe && (
        <RecipeModal
          suggestion={selectedRecipe}
          isOpen={showRecipeModal}
          onClose={() => {
            setShowRecipeModal(false)
            setSelectedRecipe(null)
          }}
          userDietaryPreferences={userProfile?.preferences?.dietaryPreferences}
          userAllergies={userProfile?.profile?.foodAllergies}
        />
      )}

      {/* Weight Reminder Modal (auto-shows on mount if due) - only for single user accounts */}
      {!loading && (
        <WeightReminderModal
          lastWeightLog={lastWeightLog}
          frequency={userProfile?.preferences?.weightCheckInFrequency || 'weekly'}
          onLogWeight={() => {
            setShowReminderModal(false)
            setShowWeightModal(true)
          }}
          onDismiss={() => setShowReminderModal(false)}
        />
      )}

      {/* Quick Weight Log Modal */}
      <QuickWeightLogModal
        isOpen={showWeightModal}
        onClose={() => setShowWeightModal(false)}
        onSuccess={() => window.location.reload()}
        patientId={null}
      />

      {/* Wellness Coach Chat Widget */}
      <ChatWidget userId={userProfile?.userId} />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardRouter>
        <StepTrackingProvider>
          <DashboardErrorBoundary>
            <DashboardContent />
          </DashboardErrorBoundary>
        </StepTrackingProvider>
      </DashboardRouter>
    </AuthGuard>
  )
}