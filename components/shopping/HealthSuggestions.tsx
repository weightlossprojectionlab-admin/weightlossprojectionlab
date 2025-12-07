'use client'

/**
 * Health-Based Shopping Suggestions Component
 *
 * Displays AI-powered shopping suggestions based on patient health data:
 * - Vitals (blood pressure, glucose, weight)
 * - Medical conditions (diabetes, hypertension, celiac)
 * - Dietary preferences and allergies
 * - Health goals and age-appropriate nutrition
 */

import { useState, useEffect } from 'react'
import { PlusIcon, SparklesIcon, HeartIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import type {
  HealthBasedSuggestion,
  HealthSuggestionsGroup,
  HealthSuggestionsResponse
} from '@/types/shopping'
import { generateHealthSuggestions } from '@/lib/ai-shopping-suggestions'
import { logger } from '@/lib/logger'
import { Spinner } from '@/components/ui/Spinner'
import toast from 'react-hot-toast'

interface HealthSuggestionsProps {
  patientId: string
  userId: string
  onAddItem: (productName: string) => Promise<void>
  className?: string
}

export function HealthSuggestions({
  patientId,
  userId,
  onAddItem,
  className = ''
}: HealthSuggestionsProps) {
  const [loading, setLoading] = useState(true)
  const [suggestions, setSuggestions] = useState<HealthSuggestionsResponse | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [adding, setAdding] = useState<string | null>(null)
  const [showWarnings, setShowWarnings] = useState(true)

  useEffect(() => {
    loadSuggestions()
  }, [patientId, userId])

  const loadSuggestions = async () => {
    try {
      setLoading(true)
      logger.info('[HealthSuggestions] Loading suggestions for patient', { patientId, userId })

      const data = await generateHealthSuggestions({
        patientId,
        userId,
        includeVitals: true,
        includeConditions: true,
        includeDietaryPreferences: true,
        includeGoals: true,
        limit: 20
      })

      logger.info('[HealthSuggestions] Received data', {
        suggestionCount: data.suggestions.length,
        groupCount: data.groupedSuggestions.length,
        healthSummary: data.healthSummary
      })

      setSuggestions(data)

      // Auto-select first group
      if (data.groupedSuggestions.length > 0) {
        setSelectedGroup(data.groupedSuggestions[0].category)
      }
    } catch (error) {
      logger.error('[HealthSuggestions] Error loading suggestions', error as Error, { patientId, userId })
      toast.error('Failed to load health suggestions')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = async (productName: string) => {
    try {
      setAdding(productName)
      await onAddItem(productName)
      toast.success(`Added ${productName} to shopping list`)
    } catch (error) {
      toast.error(`Failed to add ${productName}`)
    } finally {
      setAdding(null)
    }
  }

  if (loading) {
    return (
      <div className={`bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <Spinner />
          <span className="ml-3 text-muted-foreground">Analyzing health data...</span>
        </div>
      </div>
    )
  }

  if (!suggestions || suggestions.suggestions.length === 0) {
    logger.warn('[HealthSuggestions] No suggestions to display', {
      hasSuggestions: !!suggestions,
      suggestionCount: suggestions?.suggestions?.length || 0,
      patientId,
      userId
    })
    return null
  }

  const selectedGroupData = suggestions.groupedSuggestions.find(g => g.category === selectedGroup)

  return (
    <div className={`bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
          <h3 className="font-semibold text-foreground dark:text-white">
            Recommended for Your Health
          </h3>
        </div>
        {suggestions.healthSummary.latestVitals && (
          <HeartIcon className="h-4 w-4 text-red-500 ml-auto" />
        )}
      </div>
      <p className="text-xs text-green-700 dark:text-green-300 mb-3 flex items-center gap-1">
        <span>✅</span>
        <span>These items are selected based on your health data</span>
      </p>

      {/* Health Summary */}
      {suggestions.healthSummary.latestVitals && (
        <div className="mb-3 p-3 bg-white dark:bg-gray-700 rounded-lg text-sm">
          <div className="font-medium text-foreground dark:text-white mb-1">Latest Vitals:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground dark:text-gray-300">
            {suggestions.healthSummary.latestVitals.bloodPressure && (
              <div>
                <span className="font-medium">BP:</span>{' '}
                {suggestions.healthSummary.latestVitals.bloodPressure.systolic}/
                {suggestions.healthSummary.latestVitals.bloodPressure.diastolic}
                {suggestions.healthSummary.latestVitals.bloodPressure.isAbnormal && (
                  <span className="text-warning ml-1">⚠️</span>
                )}
              </div>
            )}
            {suggestions.healthSummary.latestVitals.bloodGlucose && (
              <div>
                <span className="font-medium">Glucose:</span>{' '}
                {suggestions.healthSummary.latestVitals.bloodGlucose.value} mg/dL
                {suggestions.healthSummary.latestVitals.bloodGlucose.isAbnormal && (
                  <span className="text-warning ml-1">⚠️</span>
                )}
              </div>
            )}
            {suggestions.healthSummary.latestVitals.weight && (
              <div>
                <span className="font-medium">Weight:</span>{' '}
                {suggestions.healthSummary.latestVitals.weight.value}{' '}
                {suggestions.healthSummary.latestVitals.weight.unit}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Warnings */}
      {showWarnings && suggestions.itemsToAvoid.length > 0 && (
        <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm font-semibold text-red-900 dark:text-red-100">
                Items to Avoid
              </span>
            </div>
            <button
              onClick={() => setShowWarnings(false)}
              className="text-xs text-red-600 dark:text-red-400 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-1">
            {suggestions.itemsToAvoid.slice(0, 3).map((warning, idx) => (
              <div key={idx} className="text-xs text-red-800 dark:text-red-200">
                <span className="font-medium">{warning.productName}:</span>{' '}
                {warning.reason}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
        {suggestions.groupedSuggestions.map((group) => (
          <button
            key={group.category}
            onClick={() => setSelectedGroup(group.category)}
            className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedGroup === group.category
                ? 'bg-green-600 dark:bg-green-700 text-white'
                : 'bg-white dark:bg-gray-700 text-foreground dark:text-white hover:bg-green-50 dark:hover:bg-gray-600'
            }`}
          >
            <span className="mr-1">{group.icon}</span>
            {group.category}
            {group.suggestions.length > 0 && (
              <span className="ml-1 text-xs opacity-75">({group.suggestions.length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Suggestions List */}
      {selectedGroupData && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground mb-2">
            Based on your health data
          </p>
          {selectedGroupData.suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-start justify-between p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 mr-3">
                <div className="flex items-center gap-2">
                  {/* Health Score Indicator */}
                  <span className="text-xl flex-shrink-0" title="Recommended for your health">
                    ✅
                  </span>
                  <div className="font-medium text-foreground dark:text-white">
                    {suggestion.productName}
                  </div>
                  {suggestion.priority === 'high' && (
                    <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-xs rounded font-medium">
                      High Priority
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {suggestion.reasonText}
                </div>
                {suggestion.benefits.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {suggestion.benefits.slice(0, 2).map((benefit, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs rounded"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                )}
                {suggestion.confidence && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Confidence: {suggestion.confidence}%
                  </div>
                )}
              </div>
              <button
                onClick={() => handleAddItem(suggestion.productName)}
                disabled={adding === suggestion.productName}
                className="flex-shrink-0 p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                aria-label={`Add ${suggestion.productName} to shopping list`}
              >
                {adding === suggestion.productName ? (
                  <Spinner size="sm" />
                ) : (
                  <PlusIcon className="h-5 w-5" />
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {suggestions.suggestions.length} suggestions based on your health
          </span>
          <button
            onClick={loadSuggestions}
            className="text-green-600 dark:text-green-400 hover:underline"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  )
}
