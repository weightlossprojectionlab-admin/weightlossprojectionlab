/**
 * Nutrition Impact Insights Component
 *
 * Displays correlation insights between dietary choices and health outcomes.
 * Shows which foods helped, nutrition adherence, and predictive analytics.
 */

'use client'

import React, { useEffect, useState } from 'react'
import { Card } from '@/components/ui/Card'
import { logger } from '@/lib/logger'
import type { NutritionVitalsCorrelation } from '@/types/health-outcomes'
import type { VitalType } from '@/types/medical'

interface NutritionImpactInsightsProps {
  patientId: string
  userId: string
  vitalType?: VitalType
  timeRangeDays?: number
  showPrediction?: boolean
}

export function NutritionImpactInsights({
  patientId,
  userId,
  vitalType,
  timeRangeDays = 30,
  showPrediction = true,
}: NutritionImpactInsightsProps) {
  const [correlation, setCorrelation] = useState<NutritionVitalsCorrelation | null>(null)
  const [prediction, setPrediction] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadInsights()
  }, [patientId, userId, vitalType, timeRangeDays])

  async function loadInsights() {
    try {
      setLoading(true)
      setError(null)

      // Load correlation
      if (vitalType) {
        const { correlateNutritionWithVitals } = await import('@/lib/nutrition-vitals-correlation')
        const correlationData = await correlateNutritionWithVitals(
          patientId,
          userId,
          vitalType,
          timeRangeDays
        )
        setCorrelation(correlationData)

        // Load prediction if requested
        if (showPrediction) {
          const { predictFutureVitals } = await import('@/lib/health-analytics')
          const predictionData = await predictFutureVitals(patientId, userId, vitalType, 30)
          setPrediction(predictionData)
        }
      }

      logger.info('[NutritionImpactInsights] Insights loaded', {
        patientId,
        vitalType,
        hasCorrelation: !!correlation,
      })
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to load insights'
      setError(errorMsg)
      logger.error('[NutritionImpactInsights] Error loading insights', err, {
        patientId,
        vitalType,
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-24 bg-gray-200 rounded"></div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          <p className="font-semibold">Error Loading Insights</p>
          <p className="text-sm mt-2">{error}</p>
        </div>
      </Card>
    )
  }

  if (!correlation) {
    return (
      <Card className="p-6">
        <div className="text-center text-gray-500">
          <p className="font-semibold">No Correlation Data Available</p>
          <p className="text-sm mt-2">
            Keep logging your meals and vitals to see how your food choices impact your health!
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Correlation Summary */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Nutrition Impact Analysis
          </h3>
          <span
            className={`px-3 py-1 rounded-full text-sm font-semibold ${
              correlation.correlation.strength === 'strong'
                ? 'bg-green-100 text-green-800'
                : correlation.correlation.strength === 'moderate'
                ? 'bg-blue-100 text-blue-800'
                : correlation.correlation.strength === 'weak'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}
          >
            {correlation.correlation.strength} correlation
          </span>
        </div>

        {/* Vital Change */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm text-gray-600 mb-2">Your Progress</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {correlation.vitalChange.baselineValue} → {correlation.vitalChange.currentValue}
              </p>
              <p className="text-sm text-gray-600">{correlation.vitalChange.unit}</p>
            </div>
            <div
              className={`text-right ${
                correlation.vitalChange.improved ? 'text-green-600' : 'text-red-600'
              }`}
            >
              <p className="text-2xl font-bold">
                {correlation.vitalChange.changePercent > 0 ? '+' : ''}
                {correlation.vitalChange.changePercent}%
              </p>
              <p className="text-sm">
                {correlation.vitalChange.improved ? 'Improved' : 'Worsened'}
              </p>
            </div>
          </div>
        </div>

        {/* Statistical Confidence */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Confidence</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {correlation.correlation.confidence}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Sample Size</p>
            <p className="text-lg font-semibold text-gray-900">
              {correlation.correlation.sampleSize} data points
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Adherence</p>
            <p className="text-lg font-semibold text-gray-900">
              {correlation.nutritionChanges.adherenceRate}%
            </p>
          </div>
        </div>
      </Card>

      {/* Foods That Helped */}
      {correlation.nutritionChanges.increasedFoods.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Foods You Ate More
          </h3>
          <div className="space-y-3">
            {correlation.nutritionChanges.increasedFoods.map((food, index) => (
              <div
                key={index}
                className="flex items-center justify-between border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🥗</span>
                  <div>
                    <p className="font-medium text-gray-900">{food.productName}</p>
                    <p className="text-xs text-gray-600">
                      {food.timesConsumed} meals • Category: {food.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    +{food.timesConsumed} times
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Insights */}
      {correlation.insights.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Insights</h3>
          <div className="space-y-3">
            {correlation.insights.map((insight, index) => (
              <div
                key={index}
                className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50"
              >
                <p className="text-sm text-gray-900">{insight}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Recommendations */}
      {correlation.recommendations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
          <ul className="space-y-2">
            {correlation.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start space-x-2">
                <span className="text-green-600 mt-1">✓</span>
                <span className="text-sm text-gray-700">{rec}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Prediction (if available) */}
      {showPrediction && prediction && (
        <Card className="p-6 bg-gradient-to-br from-purple-50 to-blue-50">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            30-Day Prediction
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Current Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  {prediction.currentValue} {prediction.currentVital?.unit}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Predicted Value (30 days)</p>
                <p className="text-2xl font-bold text-purple-600">
                  {prediction.predictedValue} {prediction.currentVital?.unit}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">Scenarios</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Best case:</span>
                  <span className="font-medium text-green-600">
                    {prediction.scenarios.best.value}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Likely:</span>
                  <span className="font-medium text-blue-600">
                    {prediction.scenarios.likely.value}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Worst case:</span>
                  <span className="font-medium text-red-600">
                    {prediction.scenarios.worst.value}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Confidence: {prediction.confidence} ({prediction.confidenceScore}%)
            </div>
          </div>
        </Card>
      )}

      {/* Medical Disclaimer */}
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          Medical Disclaimer
        </h3>
        <div className="space-y-1">
          {correlation.warnings.map((warning, index) => (
            <p key={index} className="text-xs text-yellow-800">
              • {warning}
            </p>
          ))}
        </div>
      </Card>
    </div>
  )
}
