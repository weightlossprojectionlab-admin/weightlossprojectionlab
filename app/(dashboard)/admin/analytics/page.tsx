'use client'

import { useState, useEffect } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { logger } from '@/lib/logger'
import {
  UsersIcon,
  CameraIcon,
  ScaleIcon,
  FireIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

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

export default function AnalyticsPage() {
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
    try {
      const response = await fetch(`/api/admin/analytics?range=${dateRange}`)
      if (!response.ok) throw new Error('Failed to load analytics')
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      logger.error('Error loading analytics:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
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
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-2">Error Loading Analytics</h3>
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
