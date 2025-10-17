'use client'

import Link from 'next/link'
import { useState } from 'react'
import AuthGuard from '@/components/auth/AuthGuard'
import { signOut } from '@/lib/auth'

function DashboardContent() {
  // Mock data - replace with real data from Firebase
  const [dashboardData] = useState({
    weightTrend: {
      current: 165,
      change: -2.3,
      trend: 'down' as const,
      goalProgress: 67
    },
    nutritionSummary: {
      todayCalories: 1420,
      goalCalories: 1800,
      macros: {
        protein: 95,
        carbs: 140,
        fat: 58,
        fiber: 22
      },
      mealsLogged: 3
    },
    activitySummary: {
      todaySteps: 8420,
      goalSteps: 10000,
      weeklyAverage: 7650
    }
  })

  const calorieProgress = (dashboardData.nutritionSummary.todayCalories / dashboardData.nutritionSummary.goalCalories) * 100
  const stepProgress = (dashboardData.activitySummary.todaySteps / dashboardData.activitySummary.goalSteps) * 100

  return (
    <main className="min-h-screen bg-health-bg">
      {/* Header */}
      <header className="bg-card shadow-sm">
        <div className="mx-auto max-w-md px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-foreground">Dashboard</h1>
            <button
              onClick={() => signOut()}
              className="text-sm text-accent hover:text-accent-hover"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-md px-4 py-6 space-y-6">
        {/* Weight Progress Card */}
        <div className="health-card">
          <h2 className="text-lg font-medium text-foreground mb-4">Weight Progress</h2>
          <div className="space-y-3">
            <div className="flex items-end space-x-2">
              <span className="text-3xl font-bold text-foreground">
                {dashboardData.weightTrend.current}
              </span>
              <span className="text-sm text-muted-foreground mb-1">lbs</span>
              <span className={`text-sm font-medium mb-1 ${
                dashboardData.weightTrend.change < 0 ? 'text-success' : 'text-error'
              }`}>
                {dashboardData.weightTrend.change > 0 ? '+' : ''}{dashboardData.weightTrend.change} lbs
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill progress-bar-primary"
                style={{ width: `${dashboardData.weightTrend.goalProgress}%` }}
                role="progressbar"
                aria-valuenow={dashboardData.weightTrend.goalProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Goal progress: ${dashboardData.weightTrend.goalProgress}%`}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {dashboardData.weightTrend.goalProgress}% to goal
            </p>
          </div>
        </div>

        {/* Today's Nutrition */}
        <div className="health-card">
          <h2 className="text-lg font-medium text-foreground mb-4">Today's Nutrition</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Calories</span>
              <span className="font-medium">
                {dashboardData.nutritionSummary.todayCalories} / {dashboardData.nutritionSummary.goalCalories}
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
                <p className="font-medium">{dashboardData.nutritionSummary.macros.protein}g</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Carbs</span>
                <p className="font-medium">{dashboardData.nutritionSummary.macros.carbs}g</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Fat</span>
                <p className="font-medium">{dashboardData.nutritionSummary.macros.fat}g</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Fiber</span>
                <p className="font-medium">{dashboardData.nutritionSummary.macros.fiber}g</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="health-card">
          <h2 className="text-lg font-medium text-foreground mb-4">Activity</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Steps Today</span>
              <span className="font-medium">
                {dashboardData.activitySummary.todaySteps.toLocaleString()} / {dashboardData.activitySummary.goalSteps.toLocaleString()}
              </span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-bar-fill progress-bar-accent"
                style={{ width: `${Math.min(stepProgress, 100)}%` }}
                role="progressbar"
                aria-valuenow={stepProgress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Step progress: ${Math.round(stepProgress)}%`}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Weekly avg: {dashboardData.activitySummary.weeklyAverage.toLocaleString()} steps
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            href="/log-weight"
            className="health-card flex flex-col items-center space-y-2 hover:bg-muted transition-colors"
            aria-label="Log weight"
          >
            <span className="text-2xl" role="img" aria-label="scale">⚖️</span>
            <span className="text-sm font-medium text-foreground">Log Weight</span>
          </Link>

          <Link
            href="/log-meal"
            className="health-card flex flex-col items-center space-y-2 hover:bg-muted transition-colors"
            aria-label="Log meal"
          >
            <span className="text-2xl" role="img" aria-label="camera">📸</span>
            <span className="text-sm font-medium text-foreground">Log Meal</span>
          </Link>

          <Link
            href="/log-steps"
            className="health-card flex flex-col items-center space-y-2 hover:bg-muted transition-colors"
            aria-label="Log steps"
          >
            <span className="text-2xl" role="img" aria-label="footprints">👣</span>
            <span className="text-sm font-medium text-foreground">Log Steps</span>
          </Link>

          <Link
            href="/profile"
            className="health-card flex flex-col items-center space-y-2 hover:bg-muted transition-colors"
            aria-label="Profile settings"
          >
            <span className="text-2xl" role="img" aria-label="settings">⚙️</span>
            <span className="text-sm font-medium text-foreground">Settings</span>
          </Link>
        </div>

        {/* AI Recommendations */}
        <div className="bg-gradient-to-r from-accent-light to-primary-light rounded-lg p-6">
          <h2 className="text-lg font-medium text-foreground mb-3">AI Coach</h2>
          <div className="space-y-3">
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-card-foreground">
                Great progress! You're 240 calories under your goal.
                Consider adding a healthy snack with protein.
              </p>
            </div>
            <div className="bg-card rounded-lg p-4">
              <p className="text-sm text-card-foreground">
                You're close to your step goal! A 10-minute walk will get you there.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}