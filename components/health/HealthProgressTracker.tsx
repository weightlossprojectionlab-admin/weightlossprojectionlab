/**
 * Health Progress Tracker Component
 *
 * Visual timeline showing:
 * - Vitals + food purchases correlation
 * - Progress badges and achievements
 * - Actionable insights
 * - Suggestion effectiveness rating
 */

'use client'

import React, { useEffect, useState } from 'react'
import { logger } from '@/lib/logger'
import type { HealthProgressReport } from '@/types/health-outcomes'

interface HealthProgressTrackerProps {
  patientId: string
  userId: string
  period?: 'weekly' | 'monthly' | 'quarterly'
  onReportGenerated?: (report: HealthProgressReport) => void
}

export function HealthProgressTracker({
  patientId,
  userId,
  period = 'weekly',
  onReportGenerated,
}: HealthProgressTrackerProps) {
  const [report, setReport] = useState<HealthProgressReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReport()
  }, [patientId, userId, period])

  async function loadReport() {
    try {
      setLoading(true)
      setError(null)

      // Import the function dynamically
      const { generateProgressReport } = await import('@/lib/health-outcomes')
      const reportData = await generateProgressReport(patientId, userId, period)

      setReport(reportData)
      onReportGenerated?.(reportData)

      logger.info('[HealthProgressTracker] Report loaded', {
        patientId,
        period,
      })
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load health report'
      setError(errorMsg)
      logger.error('[HealthProgressTracker] Error loading report', err, {
        patientId,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error Loading Report</p>
          <p className="text-sm mt-2">{error}</p>
          <button
            onClick={loadReport}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="p-6">
        <p className="text-gray-500 text-center">No health data available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Health Progress - {report.period.label}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          {new Date(report.period.start).toLocaleDateString()} -{' '}
          {new Date(report.period.end).toLocaleDateString()}
        </p>
      </div>

      {/* Vital Progress */}
      {report.vitalProgress.length > 0 && (
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Vital Signs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.vitalProgress.map((vital, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">{vital.icon}</span>
                    <span className="font-semibold text-gray-900">
                      {vital.vitalName}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      vital.color === 'green'
                        ? 'bg-green-100 text-green-800'
                        : vital.color === 'red'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {vital.improved ? 'Improved' : vital.trend === 'worsened' ? 'Worsened' : 'Stable'}
                  </span>
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Baseline:</span>
                    <span className="font-medium">
                      {vital.baseline} {vital.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current:</span>
                    <span className="font-medium">
                      {vital.current} {vital.unit}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Change:</span>
                    <span
                      className={`font-semibold ${
                        vital.improved ? 'text-green-600' : vital.change > 0 ? 'text-red-600' : 'text-gray-600'
                      }`}
                    >
                      {vital.change > 0 ? '+' : ''}
                      {vital.change} ({vital.changePercent > 0 ? '+' : ''}
                      {vital.changePercent}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Insights</h3>
          <div className="space-y-3">
            {report.insights.map((insight, index) => (
              <div
                key={index}
                className={`border-l-4 pl-4 py-2 ${
                  insight.impact === 'high'
                    ? 'border-green-500 bg-green-50'
                    : insight.impact === 'medium'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-400 bg-gray-50'
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{insight.text}</p>
                {insight.recommendation && (
                  <p className="text-xs text-gray-600 mt-1">
                    Recommendation: {insight.recommendation}
                  </p>
                )}
                <div className="flex items-center space-x-2 mt-1">
                  <span className="text-xs text-gray-500">
                    Confidence: {insight.confidence}
                  </span>
                  {insight.actionable && (
                    <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                      Actionable
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      {report.nutritionAchievements.length > 0 && (
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Achievements</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {report.nutritionAchievements.map((achievement, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{achievement.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{achievement.title}</p>
                    <p className="text-sm text-gray-600">{achievement.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(achievement.achievedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges & Streaks */}
      {(report.badges.length > 0 || report.streaks) && (
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Badges & Streaks</h3>

          {/* Badges */}
          {report.badges.length > 0 && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Badges</h4>
              <div className="flex flex-wrap gap-3">
                {report.badges.map((badge, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-center space-y-1 p-3 bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg"
                  >
                    <span className="text-3xl">{badge.icon}</span>
                    <span className="text-xs font-semibold text-gray-900">
                      {badge.name}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        badge.tier === 'platinum'
                          ? 'bg-purple-100 text-purple-800'
                          : badge.tier === 'gold'
                          ? 'bg-yellow-100 text-yellow-800'
                          : badge.tier === 'silver'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}
                    >
                      {badge.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Streaks */}
          {report.streaks && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Active Streaks</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(report.streaks).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center"
                  >
                    <p className="text-2xl font-bold text-blue-600">{value}</p>
                    <p className="text-xs text-gray-600">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-sm text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Medical Disclaimer */}
      {report.warnings.length > 0 && (
        <div className="p-6 bg-yellow-50 border-yellow-200">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">
            Important Information
          </h3>
          <ul className="space-y-1">
            {report.warnings.map((warning, index) => (
              <li key={index} className="text-xs text-yellow-800">
                • {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={loadReport}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Refresh Report
        </button>
      </div>
    </div>
  )
}
