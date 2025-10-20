'use client'

import { useState } from 'react'
import Link from 'next/link'
import AuthGuard from '@/components/auth/AuthGuard'
import DashboardRouter from '@/components/auth/DashboardRouter'
import { PageHeader } from '@/components/ui/PageHeader'
import { GoalsEditor } from '@/components/ui/GoalsEditor'
import { PlateauDetectionEmpty } from '@/components/ui/EmptyState'
import { signOut, auth } from '@/lib/auth'
import { useDashboardData } from '@/hooks/useDashboardData'
import { useDashboardStats } from '@/hooks/useDashboardStats'
import { useStepTracking } from '@/components/StepTrackingProvider'
import { useWeightProjection } from '@/hooks/useWeightProjection'
import { getNextMealContext, getMealCTA } from '@/lib/meal-context'
import { checkProfileCompleteness } from '@/lib/profile-completeness'

function DashboardContent() {
  const [showGoalsEditor, setShowGoalsEditor] = useState(false)
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

  // Get contextual meal recommendations with personalized suggestions
  const mealContext = getNextMealContext(
    todayMeals.map(m => ({ mealType: m.mealType, totalCalories: m.totalCalories })),
    nutritionSummary.goalCalories,
    {
      dietaryPreferences: userProfile?.preferences?.dietaryPreferences,
      foodAllergies: userProfile?.profile?.foodAllergies
    },
    auth.currentUser?.uid
  )

  // Check profile completeness for safety warnings
  const profileCompleteness = checkProfileCompleteness(userProfile)

  // Use sensor steps if tracking is enabled, otherwise use logged steps
  const displaySteps = isEnabled ? todaysSteps : activitySummary.todaySteps
  const displayProgress = (displaySteps / activitySummary.goalSteps) * 100

  // Generate AI Coach recommendations based on live data
  const generateAIRecommendations = (): string[] => {
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
  }

  const aiRecommendations = generateAIRecommendations()

  // Onboarding check is now handled by DashboardRouter

  return (
    <main className="min-h-screen bg-health-bg">
      <PageHeader
        title="Dashboard"
        actions={
          <button
            onClick={() => signOut()}
            className="text-sm text-accent hover:text-accent-hover"
            aria-label="Sign out"
          >
            Sign Out
          </button>
        }
      />

      <div className="container-narrow py-6 space-y-6">
        {loading || loadingMeals ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading your dashboard...</p>
          </div>
        ) : (
          <>
            {/* Weight Progress Card */}
            <div className="health-card">
              <h2 className="mb-4">Starting Weight</h2>
              {weightTrend.current > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-end space-x-2">
                    <span className="text-3xl font-bold text-foreground">
                      {weightTrend.current.toFixed(1)}
                    </span>
                    <span className="text-sm text-muted-foreground mb-1">lbs</span>
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
                    <div className="bg-primary-light border border-primary rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-primary-dark">Projected Weight</span>
                        <span className="text-xs text-muted-foreground">Based on recent data</span>
                      </div>
                      <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-primary">
                          {weightProjection.projectedWeight.toFixed(1)}
                        </span>
                        <span className="text-xs text-muted-foreground">lbs</span>
                        <span className="text-xs text-muted-foreground">
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
                  <p className="text-sm text-muted-foreground">
                    {weightTrend.goalProgress.toFixed(0)}% to goal
                  </p>
                  <div className="bg-accent-light border border-accent rounded-lg p-3 mt-3">
                    <p className="text-xs text-accent-dark">
                      💡 Your starting weight is locked from onboarding to ensure accountability. Track progress through meal logging and activity.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">Weight data will be set during onboarding</p>
                </div>
              )}
            </div>

            {/* Today's Nutrition */}
            <div className="health-card">
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
                  <span className="text-sm text-muted-foreground">Calories</span>
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
                    <span className="text-xs text-muted-foreground">Protein</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.protein)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Carbs</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.carbs)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Fat</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.fat)}g</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">Fiber</span>
                    <p className="font-medium">{Math.round(nutritionSummary.macros.fiber)}g</p>
                  </div>
                </div>

                {/* Meal Suggestions with Allergen Warnings */}
                {mealContext.suggestions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">
                        Try these {mealContext.nextMealLabel.toLowerCase()} ideas:
                      </h3>
                      {!profileCompleteness.isSafe && (
                        <span className="text-xs text-error font-medium">
                          ⚠️ Check allergens
                        </span>
                      )}
                    </div>
                    <div className="space-y-3">
                      {mealContext.suggestions.map(suggestion => (
                        <div key={suggestion.id} className="bg-muted rounded-lg p-3 border border-border">
                          <div className="flex items-start space-x-2">
                            <span className="text-primary mt-0.5">•</span>
                            <div className="flex-1">
                              <p className="font-medium text-foreground">{suggestion.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {suggestion.calories} cal • {suggestion.macros.protein}g protein • {suggestion.prepTime} min
                              </p>

                              {/* ALWAYS show allergens (for self-filtering) */}
                              {suggestion.allergens && suggestion.allergens.length > 0 && (
                                <div className="mt-2 flex items-start space-x-1">
                                  <span className="text-xs font-medium text-orange-700 mt-0.5">Contains:</span>
                                  <div className="flex flex-wrap gap-1">
                                    {suggestion.allergens.map(allergen => (
                                      <span
                                        key={allergen}
                                        className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded"
                                      >
                                        {allergen}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Show dietary tags */}
                              {suggestion.dietaryTags && suggestion.dietaryTags.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {suggestion.dietaryTags.slice(0, 3).map(tag => (
                                    <span
                                      key={tag}
                                      className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {/* Show safety warnings if present */}
                              {suggestion.safetyWarnings && suggestion.safetyWarnings.length > 0 && (
                                <div className="mt-2 text-xs text-error">
                                  {suggestion.safetyWarnings.map((warning, idx) => (
                                    <p key={idx}>⚠️ {warning}</p>
                                  ))}
                                </div>
                              )}
                            </div>
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

                <div className="mt-4 pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    {nutritionSummary.mealsLogged} meal{nutritionSummary.mealsLogged !== 1 ? 's' : ''} logged today
                  </p>
                  <Link href="/log-meal" className="text-sm text-primary hover:text-primary-hover font-medium">
                    {getMealCTA(mealContext)} →
                  </Link>
                </div>
              </div>
            </div>

            {/* Activity Summary */}
            <div className="health-card">
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
                  <span className="text-sm text-muted-foreground">Steps Today {isEnabled ? '(Live)' : ''}</span>
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
                  <div className="mt-3 bg-accent-light border border-accent rounded-lg p-3">
                    <p className="text-xs text-accent-dark mb-2">
                      💡 Enable automatic step tracking to count your steps throughout the day
                    </p>
                    <Link href="/log-steps" className="text-xs text-accent hover:text-accent-hover font-medium">
                      Enable tracking →
                    </Link>
                  </div>
                )}
                {isEnabled && (
                  <div className="mt-4 pt-4 border-t border-border">
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
              <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-5">
                <h3 className="font-medium text-amber-900 mb-3">⚠️ Lifestyle Impact on Your Goals</h3>
                <div className="space-y-2 text-sm text-amber-800">
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
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs text-amber-700">
                    💡 These factors are included in your calorie calculations. Track honestly for best results.
                  </p>
                </div>
              </div>
            )}

            {/* Weekly Insights Card - Only show when 7+ completed days of data */}
            {weightProjection.hasEnoughData && (
              <div className="bg-gradient-to-r from-accent-light to-primary-light rounded-lg p-6 shadow-sm">
                <h2 className="mb-3 text-foreground">📊 Weekly Insights</h2>
                <div className="space-y-4">
                  {/* Daily Average Deficit */}
                  <div className="bg-card rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Daily Avg Deficit</span>
                      <span className={`text-lg font-bold ${weightProjection.dailyAvgDeficit > 0 ? 'text-success' : 'text-error'}`}>
                        {weightProjection.dailyAvgDeficit.toFixed(0)} cal
                      </span>
                    </div>
                    <p className="text-xs text-card-foreground">
                      {weightProjection.dailyAvgDeficit > 0
                        ? `You're burning ${weightProjection.dailyAvgDeficit.toFixed(0)} more calories than you consume daily`
                        : `You're consuming ${Math.abs(weightProjection.dailyAvgDeficit).toFixed(0)} more calories than you burn daily`
                      }
                    </p>
                  </div>

                  {/* Projected Weekly Loss */}
                  <div className="bg-card rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Projected Weekly Loss</span>
                      <span className={`text-lg font-bold ${weightProjection.weeklyPace > 0 ? 'text-success' : 'text-error'}`}>
                        {weightProjection.weeklyPace.toFixed(1)} lbs/week
                      </span>
                    </div>
                    <p className="text-xs text-card-foreground">
                      {weightProjection.isOnTrack
                        ? '✓ On pace with your goal'
                        : `Target: ${userProfile?.goals?.weeklyWeightLossGoal || 1} lbs/week`
                      }
                    </p>
                  </div>

                  {/* Time to Goal */}
                  {weightProjection.daysToGoal > 0 && weightProjection.estimatedGoalDate && weightProjection.goalWeight > 0 && (
                    <div className="bg-card rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Est. Goal Date</span>
                        <span className="text-lg font-bold text-primary">
                          {weightProjection.estimatedGoalDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-xs text-card-foreground mb-1">
                        Reach <span className="font-bold text-primary">{weightProjection.goalWeight.toFixed(1)} lbs</span> in {weightProjection.daysToGoal} days ({Math.ceil(weightProjection.daysToGoal / 7)} weeks)
                      </p>
                      <p className="text-xs text-muted-foreground">
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

                <div className="bg-card rounded-lg p-4 mb-4">
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
          <Link
            href="/log-meal"
            className="card-interactive flex flex-col items-center space-y-2 p-6"
            aria-label="Log meal"
          >
            <span className="text-2xl" role="img" aria-label="camera">📸</span>
            <span className="text-sm font-medium">Log Meal</span>
          </Link>

          <Link
            href="/meal-gallery"
            className="card-interactive flex flex-col items-center space-y-2 p-6"
            aria-label="Meal gallery"
          >
            <span className="text-2xl" role="img" aria-label="gallery">🖼️</span>
            <span className="text-sm font-medium">Gallery</span>
          </Link>

          <Link
            href="/profile"
            className="card-interactive flex flex-col items-center space-y-2 p-6"
            aria-label="Profile settings"
          >
            <span className="text-2xl" role="img" aria-label="settings">⚙️</span>
            <span className="text-sm font-medium">Settings</span>
          </Link>
        </div>

        {/* AI Recommendations */}
        {aiRecommendations.length > 0 && (
          <div className="bg-gradient-to-r from-accent-light to-primary-light rounded-lg p-6">
            <h2 className="mb-3">AI Coach</h2>
            <div className="space-y-3">
              {aiRecommendations.map((recommendation, index) => (
                <div key={index} className="bg-card rounded-lg p-4">
                  <p className="text-sm text-card-foreground">
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
    </main>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardRouter>
        <DashboardContent />
      </DashboardRouter>
    </AuthGuard>
  )
}