'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useUserProfile } from '@/hooks/useUserProfile'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { WeightTrendChart } from '@/components/charts/WeightTrendChart'
import { CalorieIntakeChart } from '@/components/charts/CalorieIntakeChart'
import { MacroDistributionChart } from '@/components/charts/MacroDistributionChart'
import { ShareButton } from '@/components/social/ShareButton'
import { ShareModal } from '@/components/social/ShareModal'
import {
  getWeightTrendLastNDays,
  getCalorieIntakeLastNDays,
  getMacroDistributionLastNDays,
  getSummaryStatistics,
  WeightDataPoint,
  CalorieDataPoint,
  MacroDataPoint
} from '@/lib/chart-data-aggregator'

export default function ProgressPage() {
  return (
    <AuthGuard>
      <ProgressContent />
    </AuthGuard>
  )
}

function ProgressContent() {
  const { user } = useAuth()
  const { userProfile } = useUserProfile()

  const [timeRange, setTimeRange] = useState(30) // Days
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)

  // Chart data
  const [weightData, setWeightData] = useState<WeightDataPoint[]>([])
  const [calorieData, setCalorieData] = useState<CalorieDataPoint[]>([])
  const [macroData, setMacroData] = useState<MacroDataPoint[]>([])

  // Summary stats
  const [summaryStats, setSummaryStats] = useState<{
    weightChange: number
    avgCalories: number
    mealsLogged: number
    macroPercentages: { protein: number; carbs: number; fat: number }
  } | null>(null)

  useEffect(() => {
    if (!user) return

    loadChartData()
  }, [user, timeRange, userProfile])

  const loadChartData = async () => {
    if (!user) return

    setLoading(true)

    try {
      const calorieGoal = userProfile?.goals?.dailyCalorieGoal || 2000

      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - timeRange)

      // Load all data in parallel
      const [weight, calories, macros, stats] = await Promise.all([
        getWeightTrendLastNDays(user.uid, timeRange),
        getCalorieIntakeLastNDays(user.uid, timeRange, calorieGoal),
        getMacroDistributionLastNDays(user.uid, timeRange),
        getSummaryStatistics(user.uid, startDate, endDate)
      ])

      setWeightData(weight)
      setCalorieData(calories)
      setMacroData(macros)
      setSummaryStats(stats)
    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  const targetWeight = userProfile?.goals?.targetWeight

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
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  {days === 7 ? '1 Week' : days === 30 ? '1 Month' : days === 60 ? '2 Months' : days === 90 ? '3 Months' : `${days} Days`}
                </button>
              ))}
            </div>
          </div>
        </div>

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
                </div>
                <div className="text-3xl">🔥</div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Meals Logged</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{summaryStats.mealsLogged}</p>
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
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

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
          </div>
        )}

        {/* Empty State */}
        {!loading && weightData.length === 0 && calorieData.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">No Data Available Yet</h3>
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
                className="px-6 py-3 bg-gray-100 text-gray-900 dark:text-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Go to Dashboard
              </a>
            </div>
          </div>
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
    </div>
  )
}
