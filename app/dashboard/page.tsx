'use client'

import { useState, useMemo } from 'react'
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
import { useStepTracking } from '@/components/StepTrackingProvider'
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
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null)
  // Fetch all dashboard data with optimized hooks
  const {
    userProfile,
    todayMeals,
    allMeals,
    weightData,
    stepsData,
    loading,
    loadingMeals
  } = useDashboardData()

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

  // Get contextual meal recommendations with personalized suggestions (with images)
  // MEMOIZED: Prevents expensive recalculation on every render (237 lines of logic + 692-line meal array)
  const mealContext = useMemo(() => {
    return getNextMealContext(
      todayMeals
        .filter(m => m && m.mealType && typeof m.totalCalories === 'number')
        .map(m => ({ mealType: m.mealType, totalCalories: m.totalCalories })),
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

  // Generate AI Coach recommendations based on live data (memoized to prevent recalculation on every render)
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

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Offline Indicator */}
      <OfflineIndicator />

      <PageHeader
        title="Dashboard"
      />

      <div className="container-narrow py-6 space-y-6">
        {loading || loadingMeals ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Weight Progress Card */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6">
              <h2 className="mb-4">Starting Weight</h2>
              {weightTrend.current > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-end space-x-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      {weightTrend.current.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400 mb-1">lbs</span>
                    {weightTrend.change !== 0 && (
                      <span className={`text-sm font-medium mb-1 ${
                        weightTrend.change < 0 ? 'text-success' : 'text-error'
                      }`}>
                        {weightTrend.change > 0 ? '+' : ''}{weightTrend.change.toFixed(1)} lbs
                      </span>
                    )}
                  </div>

                  {/* Projected Weight */}
                  {weightProjection.hasEnoughData && weightProjection.projectedWeight > 0 && (
                    <div className="bg-purple-100 dark:bg-purple-900/20 border border-primary rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary-dark">Projected Weight</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">Based on recent data</span>
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-primary">
                          {weightProjection.projectedWeight.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">lbs</span>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          ({weightProjection.projectedWeightLoss > 0 ? '-' : '+'}{Math.abs(weightProjection.projectedWeightLoss).toFixed(1)} lbs)
                        </span>
                      </div>
                      <p className="text-xs text-primary-dark mt-1">
                        {weightProjection.isOnTrack ? '✓ On track' : '⚠️ Adjust pace'}
                      </p>
                    </div>
                  )}

                  <div className="progress-bar">
                    <div
                      className="progress-bar-fill progress-bar-primary"
                      style={{ width: `${weightTrend.goalProgress}%` }}
                      role="progressbar"
                      aria-valuenow={weightTrend.goalProgress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`Goal progress: ${weightTrend.goalProgress.toFixed(0)}%`}
                    />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {weightTrend.goalProgress.toFixed(0)}% to goal
                  </p>
                  <div className="bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-3 mt-3">
                    <p className="text-xs text-accent-dark">
                      💡 Your starting weight is locked from onboarding to ensure accountability. Track progress through meal logging and activity.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 dark:text-gray-400 mb-4">Weight data will be set during onboarding</p>
                </div>
              )}
            </div>

            {/* Weight Loss Projection (Trend-Based) */}
            {trendProjection && trendProjection.status !== 'insufficient-data' && projectionDisplay && (
              <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2>Goal Projection</h2>
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    projectionDisplay.statusColor === 'green' ? 'bg-success-light text-success' :
                    projectionDisplay.statusColor === 'yellow' ? 'bg-amber-100 text-amber-700' :
                    projectionDisplay.statusColor === 'red' ? 'bg-error-light text-error' :
                    'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}>
                    {trendProjection.status === 'on-track' && '✓ On Track'}
                    {trendProjection.status === 'ahead' && '⚡ Ahead'}
                    {trendProjection.status === 'behind' && '⚠️ Behind'}
                  </span>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Completion</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{projectionDisplay.headline}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{projectionDisplay.subtitle}</p>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Progress to Goal</span>
                      <span className="text-xs font-medium text-gray-900 dark:text-gray-100">
                        {trendProjection.progressPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill ${
                          projectionDisplay.statusColor === 'green' ? 'progress-bar-success' :
                          projectionDisplay.statusColor === 'yellow' ? 'bg-amber-500' :
                          'progress-bar-error'
                        }`}
                        style={{ width: `${Math.min(projectionDisplay.progressBar, 100)}%` }}
                        role="progressbar"
                        aria-valuenow={projectionDisplay.progressBar}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`Goal progress: ${projectionDisplay.progressBar.toFixed(0)}%`}
                      />
                    </div>
                  </div>

                  {/* Status Message */}
                  <div className={`rounded-lg p-3 ${
                    projectionDisplay.statusColor === 'green' ? 'bg-success-light border border-success' :
                    projectionDisplay.statusColor === 'yellow' ? 'bg-amber-50 border border-amber-300' :
                    'bg-error-light border border-error'
                  }`}>
                    <p className={`text-sm ${
                      projectionDisplay.statusColor === 'green' ? 'text-success-dark' :
                      projectionDisplay.statusColor === 'yellow' ? 'text-amber-800' :
                      'text-error-dark'
                    }`}>
                      {trendProjection.statusMessage}
                    </p>

                    {/* Recommended Adjustment */}
                    {trendProjection.recommendedAdjustment && (
                      <div className="mt-2 pt-2 border-t border-current/20">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100">💡 Suggestion:</p>
                        <p className="text-xs mt-1 opacity-90">{trendProjection.recommendedAdjustment}</p>
                      </div>
                    )}
                  </div>

                  {/* Current Pace */}
                  {trendProjection.actualWeeklyRate !== null && (
                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Actual Pace</p>
                        <p className="font-medium">{trendProjection.actualWeeklyRate.toFixed(1)} lbs/week</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Target Pace</p>
                        <p className="font-medium">{trendProjection.weeklyGoalRate.toFixed(1)} lbs/week</p>
                      </div>
                    </div>
                  )}

                  {/* Goal Realism Check */}
                  {!trendProjection.isGoalRealistic && (
                    <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                      <p className="text-xs text-amber-800">
                        ⚠️ Your goal rate ({trendProjection.weeklyGoalRate.toFixed(1)} lbs/week) may not be sustainable.
                        Healthy weight loss is 0.5-2 lbs/week.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Progress Charts Link */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
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

            {/* Photo Gallery Link */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-lg shadow hover:shadow-lg transition-all p-6 text-white">
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

            {/* Today's Nutrition */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6">
              <h2 className="mb-4">Today's Nutrition</h2>
              <div className="space-y-4">
                {/* Profile Completeness Warning */}
                {!profileCompleteness.isSafe && (
                  <div className="bg-error-light border-2 border-error rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">⚠️</span>
                      <div className="flex-1">
                        <h3 className="font-bold text-error-dark mb-1">
                          Complete Your Profile for Safe Meal Suggestions
                        </h3>
                        <p className="text-sm text-error-dark mb-2">
                          <strong>We need to know if you have any dietary restrictions, allergies, or health conditions.</strong>
                          Without this info, meal suggestions can't be personalized for your safety.
                        </p>
                        <p className="text-xs text-error-dark mb-3">
                          Even if you have no restrictions, please confirm by selecting "None" for each category.
                        </p>
                        <Link
                          href="/profile"
                          className="inline-block bg-error hover:bg-error-dark text-error-foreground text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                        >
                          Update Dietary Info Now →
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Calories</span>
                  <span className="font-medium">
                    {nutritionSummary.todayCalories} / {nutritionSummary.goalCalories}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill progress-bar-success"
                    style={{ width: `${Math.min(calorieProgress, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={calorieProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Calorie progress: ${Math.round(calorieProgress)}%`}
                  />
                </div>

                {/* Macros */}
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Protein</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.protein)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Carbs</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.carbs)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Fat</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.fat)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">Fiber</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.fiber)}g</p>
                  </div>
                </div>

                {/* Meal Suggestions with Images */}
                {mealContext.suggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        Try these {mealContext.nextMealLabel.toLowerCase()} ideas:
                      </h3>
                      {!profileCompleteness.isSafe && (
                        <span className="text-xs text-error font-medium">
                          ⚠️ Check allergens
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mealContext.suggestions.map(suggestion => (
                        <div
                          key={suggestion.id}
                          className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setSelectedRecipe(suggestion)
                            setShowRecipeModal(true)
                          }}
                        >
                          {/* Recipe Image */}
                          <div className="relative h-32 bg-gray-100 dark:bg-gray-800">
                            {suggestion.imageUrls?.[0] ? (
                              <Image
                                src={suggestion.imageUrls[0]}
                                alt={generateRecipeAltText(
                                  suggestion.name || 'Recipe',
                                  suggestion.mealType || 'snack',
                                  'hero'
                                )}
                                fill
                                className="object-cover"
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                                placeholder="blur"
                                blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyNDAsMjQwLDI0MCkiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0eWxlPSJzdG9wLWNvbG9yOnJnYigyMjAsMjIwLDIyMCkiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgZmlsbD0idXJsKCNhKSIvPjwvc3ZnPg=="
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
                                <span className="text-4xl">{getMealEmoji(suggestion.mealType)}</span>
                              </div>
                            )}

                            {/* Inventory Status Badge */}
                            {suggestion.inventoryStatus && (
                              <>
                                {suggestion.inventoryStatus.matchPercentage === 100 && (
                                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                    <span>🎉</span>
                                    <span>Ready to Cook!</span>
                                  </div>
                                )}
                                {suggestion.inventoryStatus.matchPercentage >= 60 && suggestion.inventoryStatus.matchPercentage < 100 && (
                                  <div className="absolute top-2 right-2 bg-yellow-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow">
                                    <span>⚠️ {suggestion.inventoryStatus.availableCount} of {suggestion.inventoryStatus.totalCount}</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Recipe Details */}
                          <div className="p-3">
                            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                              {suggestion.name}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                              {suggestion.calories} cal • {suggestion.macros.protein}g protein • {suggestion.prepTime} min
                            </p>

                            {/* Allergens */}
                            {suggestion.allergens && suggestion.allergens.length > 0 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-1">
                                  {suggestion.allergens.slice(0, 3).map(allergen => (
                                    <span
                                      key={allergen}
                                      className="text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded"
                                    >
                                      {allergen}
                                    </span>
                                  ))}
                                  {suggestion.allergens.length > 3 && (
                                    <span className="text-xs text-orange-700 dark:text-orange-400">
                                      +{suggestion.allergens.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dietary Tags */}
                            {suggestion.dietaryTags && suggestion.dietaryTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {suggestion.dietaryTags.slice(0, 2).map(tag => (
                                  <span
                                    key={tag}
                                    className="text-xs bg-purple-100 dark:bg-purple-900/20 text-primary px-2 py-0.5 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* View Recipe Button */}
                            <button
                              className="w-full mt-2 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedRecipe(suggestion)
                                setShowRecipeModal(true)
                              }}
                            >
                              View Recipe →
                            </button>

                            {/* Safety Warnings */}
                            {suggestion.safetyWarnings && suggestion.safetyWarnings.length > 0 && (
                              <div className="mt-2 text-xs text-error">
                                {suggestion.safetyWarnings.map((warning, idx) => (
                                  <p key={idx}>⚠️ {warning}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Disclaimer if profile incomplete */}
                    {!profileCompleteness.isSafe && (
                      <p className="text-xs text-error mt-3">
                        ⚠️ These are general suggestions. Please confirm your dietary info (even if "None") to personalize them.
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {nutritionSummary.mealsLogged} meal{nutritionSummary.mealsLogged !== 1 ? 's' : ''} logged today
                  </p>
                  <Link href="/log-meal" className="text-sm text-primary hover:text-primary-hover font-medium">
                    {getMealCTA(mealContext)} →
                  </Link>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-md transition-shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2>Activity</h2>
                {isEnabled && isTracking && (
                  <span className="flex items-center space-x-2 text-xs text-success">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                    </span>
                    <span>Tracking</span>
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Steps Today {isEnabled ? '(Live)' : ''}</span>
                  <span className="font-medium">
                    {displaySteps.toLocaleString()} / {activitySummary.goalSteps.toLocaleString()}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill progress-bar-accent"
                    style={{ width: `${Math.min(displayProgress, 100)}%` }}
                    role="progressbar"
                    aria-valuenow={displayProgress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Step progress: ${Math.round(displayProgress)}%`}
                  />
                </div>
                {!isEnabled && (
                  <div className="mt-3 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-3">
                    <p className="text-xs text-accent-dark mb-2">
                      💡 Enable automatic step tracking to count your steps throughout the day
                    </p>
                    <Link href="/log-steps" className="text-xs text-accent hover:text-accent-hover font-medium">
                      Enable tracking →
                    </Link>
                  </div>
                )}
                {isEnabled && (
                  <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Link href="/log-steps" className="text-sm text-primary hover:text-primary-hover font-medium">
                      View step details →
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Lifestyle Impact Card */}
            {userProfile?.lifestyle && (
              userProfile.lifestyle.smoking !== 'never' ||
              (userProfile.lifestyle.weeklyDrinks && userProfile.lifestyle.weeklyDrinks > 0) ||
              userProfile.lifestyle.recreationalDrugs !== 'no'
            ) && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-5">
                <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-3">⚠️ Lifestyle Impact on Your Goals</h3>
                <div className="space-y-2 text-sm text-amber-800 dark:text-amber-200">
                  {userProfile.lifestyle.smoking?.includes('current') && (
                    <div className="flex items-start space-x-2">
                      <span>🚬</span>
                      <p>Smoking: +{userProfile.lifestyle.smoking === 'current-heavy' ? '300' : '200'} cal/day metabolism boost (will lose if you quit)</p>
                    </div>
                  )}
                  {userProfile.lifestyle.smoking === 'quit-recent' && (
                    <div className="flex items-start space-x-2">
                      <span>🚭</span>
                      <p>Recent quit: -200 cal/day slower metabolism (accounted for in your targets)</p>
                    </div>
                  )}
                  {userProfile.lifestyle.weeklyDrinks && userProfile.lifestyle.weeklyDrinks > 0 && (
                    <div className="flex items-start space-x-2">
                      <span>🍺</span>
                      <p>Alcohol: ~{Math.round((userProfile.lifestyle.weeklyDrinks * 150) / 7)} hidden cal/day from drinks ({userProfile.lifestyle.weeklyDrinks} drinks/week)</p>
                    </div>
                  )}
                  {userProfile.lifestyle.recreationalDrugs !== 'no' && (
                    <div className="flex items-start space-x-2">
                      <span>💊</span>
                      <p>Drug use may affect appetite regulation and tracking accuracy</p>
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    💡 These factors are included in your calorie calculations. Track honestly for best results.
                  </p>
                </div>
              </div>
            )}

            {/* Weekly Insights Card - Only show when 7+ completed days of data */}
            {weightProjection.hasEnoughData && (
              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-lg p-6 shadow-sm">
                <h2 className="mb-3 text-gray-900 dark:text-gray-100">📊 Weekly Insights</h2>
                <div className="space-y-4">
                  {/* Daily Average Deficit */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Daily Avg Deficit</span>
                      <span className={`text-lg font-bold ${weightProjection.dailyAvgDeficit > 0 ? 'text-success' : 'text-error'}`}>
                        {weightProjection.dailyAvgDeficit.toFixed(0)} cal
                      </span>
                    </div>
                    <p className="text-xs text-gray-900 dark:text-gray-100">
                      {weightProjection.dailyAvgDeficit > 0
                        ? `You're burning ${weightProjection.dailyAvgDeficit.toFixed(0)} more calories than you consume daily`
                        : `You're consuming ${Math.abs(weightProjection.dailyAvgDeficit).toFixed(0)} more calories than you burn daily`
                      }
                    </p>
                  </div>

                  {/* Projected Weekly Loss */}
                  <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Projected Weekly Loss</span>
                      <span className={`text-lg font-bold ${weightProjection.weeklyPace > 0 ? 'text-success' : 'text-error'}`}>
                        {weightProjection.weeklyPace.toFixed(1)} lbs/week
                      </span>
                    </div>
                    <p className="text-xs text-gray-900 dark:text-gray-100">
                      {weightProjection.isOnTrack
                        ? '✓ On pace with your goal'
                        : `Target: ${userProfile?.goals?.weeklyWeightLossGoal || 1} lbs/week`
                      }
                    </p>
                  </div>

                  {/* Time to Goal */}
                  {weightProjection.daysToGoal > 0 && weightProjection.estimatedGoalDate && weightProjection.goalWeight > 0 && (
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Est. Goal Date</span>
                        <span className="text-lg font-bold text-primary">
                          {weightProjection.estimatedGoalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-900 dark:text-gray-100 mb-1">
                        Reach <span className="font-bold text-primary">{weightProjection.goalWeight.toFixed(1)} lbs</span> in {weightProjection.daysToGoal} days ({Math.ceil(weightProjection.daysToGoal / 7)} weeks)
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        At current pace of {weightProjection.weeklyPace.toFixed(1)} lbs/week
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Plan Adjustment Needed Card */}
            {weightProjection.needsAdjustment && weightProjection.canDetectPlateau && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-6 shadow-sm">
                <div className="flex items-start space-x-3 mb-4">
                  <span className="text-3xl">⚠️</span>
                  <div>
                    <h2 className="text-lg font-bold text-amber-900 mb-1">
                      {weightProjection.isPlateaued ? 'Plateau Detected' : 'Pace Adjustment Needed'}
                    </h2>
                    <p className="text-sm text-amber-800">
                      {weightProjection.isPlateaued
                        ? `Your actual weight (${weightProjection.currentWeight.toFixed(1)} lbs) is ${weightProjection.weightDivergence.toFixed(1)} lbs higher than projected (${weightProjection.projectedWeight.toFixed(1)} lbs). Your metabolism may have adapted.`
                        : `Your current pace (${weightProjection.weeklyPace.toFixed(1)} lbs/week) doesn't match your goal (${userProfile?.goals?.weeklyWeightLossGoal || 1} lbs/week).`
                      }
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-4">
                  <h3 className="font-medium text-amber-900 mb-2">💡 What This Means</h3>
                  <ul className="text-sm text-amber-800 space-y-1 list-disc list-inside">
                    <li>Your body may have adapted to your current calorie intake</li>
                    <li>Your TDEE (Total Daily Energy Expenditure) may have decreased as you've lost weight</li>
                    <li>You may need to adjust your calorie goal or increase activity</li>
                  </ul>
                </div>

                <button
                  onClick={() => setShowGoalsEditor(true)}
                  className="btn btn-primary w-full"
                >
                  🎯 Adjust My Plan
                </button>
              </div>
            )}
          </>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => {
              setNavigatingTo('log-meal')
              router.push('/log-meal')
            }}
            disabled={!!navigatingTo}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Log meal"
          >
            {navigatingTo === 'log-meal' ? (
              <Spinner size="md" className="text-primary" />
            ) : (
              <span className="text-2xl" role="img" aria-label="camera">📸</span>
            )}
            <span className="text-sm font-medium">Log Meal</span>
          </button>

          <button
            onClick={() => {
              setNavigatingTo('gallery')
              router.push('/meal-gallery')
            }}
            disabled={!!navigatingTo}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Meal gallery"
          >
            {navigatingTo === 'gallery' ? (
              <Spinner size="md" className="text-primary" />
            ) : (
              <span className="text-2xl" role="img" aria-label="gallery">🖼️</span>
            )}
            <span className="text-sm font-medium">Gallery</span>
          </button>

          <button
            onClick={() => {
              setNavigatingTo('shopping')
              router.push('/shopping')
            }}
            disabled={!!navigatingTo}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Shopping list"
          >
            {navigatingTo === 'shopping' ? (
              <Spinner size="md" className="text-primary" />
            ) : (
              <span className="text-2xl" role="img" aria-label="shopping">🛒</span>
            )}
            <span className="text-sm font-medium">Shopping</span>
          </button>

          <button
            onClick={() => {
              setNavigatingTo('inventory')
              router.push('/inventory')
            }}
            disabled={!!navigatingTo}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Kitchen inventory"
          >
            {navigatingTo === 'inventory' ? (
              <Spinner size="md" className="text-primary" />
            ) : (
              <span className="text-2xl" role="img" aria-label="inventory">📦</span>
            )}
            <span className="text-sm font-medium">Inventory</span>
          </button>

          <button
            onClick={() => {
              setNavigatingTo('settings')
              router.push('/profile')
            }}
            disabled={!!navigatingTo}
            className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6 disabled:opacity-60 disabled:cursor-not-allowed"
            aria-label="Profile settings"
          >
            {navigatingTo === 'settings' ? (
              <Spinner size="md" className="text-primary" />
            ) : (
              <span className="text-2xl" role="img" aria-label="settings">⚙️</span>
            )}
            <span className="text-sm font-medium">Settings</span>
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
              className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg cursor-pointer active:scale-[0.98] transition-all flex flex-col items-center space-y-2 p-6"
              aria-label="Install app"
            >
              <span className="text-2xl" role="img" aria-label="install">📱</span>
              <span className="text-sm font-medium">Install App</span>
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
            <h2 className="mb-3">AI Coach</h2>
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

      {/* AI Coach Chat Widget */}
      <ChatWidget userId={userProfile?.userId} />
    </main>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardRouter>
        <DashboardErrorBoundary>
          <DashboardContent />
        </DashboardErrorBoundary>
      </DashboardRouter>
    </AuthGuard>
  )
}