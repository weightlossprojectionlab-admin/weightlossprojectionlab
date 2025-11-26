/**
 * Recommendations Section Component
 *
 * Displays AI-generated appointment recommendations with actions
 * Designed to be embedded in the Progress page
 */

'use client'

import { useState } from 'react'
import { useRecommendations } from '@/hooks/useRecommendations'
import { RecommendationCard } from './RecommendationCard'
import { RecommendationModal } from './RecommendationModal'
import { AppointmentRecommendation } from '@/types/medical'
import { SparklesIcon, ArrowPathIcon } from '@heroicons/react/24/outline'

interface RecommendationsSectionProps {
  className?: string
}

export function RecommendationsSection({ className = '' }: RecommendationsSectionProps) {
  const {
    recommendations,
    loading,
    error,
    refetch,
    generate,
    dismiss,
    markScheduled
  } = useRecommendations()

  const [selectedRecommendation, setSelectedRecommendation] = useState<AppointmentRecommendation | null>(null)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      await generate()
    } finally {
      setGenerating(false)
    }
  }

  const handleSchedule = (recommendation: AppointmentRecommendation) => {
    setSelectedRecommendation(recommendation)
  }

  const handleScheduled = async (appointmentId: string) => {
    if (selectedRecommendation) {
      await markScheduled(selectedRecommendation.id, appointmentId)
      setSelectedRecommendation(null)
    }
  }

  const handleDismiss = async (recommendationId: string) => {
    await dismiss(recommendationId)
  }

  // Group recommendations by severity
  const urgentRecs = recommendations.filter(r => r.urgency === 'urgent')
  const highRecs = recommendations.filter(r => r.severity === 'high' && r.urgency !== 'urgent')
  const normalRecs = recommendations.filter(r => r.severity !== 'high' && r.urgency !== 'urgent')

  if (loading && recommendations.length === 0) {
    return (
      <div className={`bg-card rounded-lg shadow-sm p-6 ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <SparklesIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">
            AI Appointment Recommendations
          </h2>
        </div>
        <div className="animate-pulse space-y-3">
          <div className="h-24 bg-muted rounded-lg"></div>
          <div className="h-24 bg-muted rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`bg-card rounded-lg shadow-sm p-6 ${className}`}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-light dark:bg-purple-900/20 rounded-lg">
              <SparklesIcon className="w-6 h-6 text-primary dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">
                AI Appointment Recommendations
              </h2>
              <p className="text-sm text-muted-foreground">
                Based on your progress, vitals, and appointment history
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowPathIcon className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            {generating ? 'Analyzing...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-4 p-4 bg-error-light dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-error-dark dark:text-red-300">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && recommendations.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-block p-4 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <SparklesIcon className="w-8 h-8 text-success dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              All Caught Up!
            </h3>
            <p className="text-muted-foreground mb-4">
              You have no pending appointment recommendations at this time.
            </p>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
              Our AI monitors your progress continuously and will alert you if any appointments are recommended.
            </p>
          </div>
        )}

        {/* Recommendations List */}
        {recommendations.length > 0 && (
          <div className="space-y-6">
            {/* Urgent Section */}
            {urgentRecs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-error-dark dark:text-red-300 text-xs font-bold rounded uppercase">
                    Urgent
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Schedule this week
                  </span>
                </div>
                <div className="space-y-3">
                  {urgentRecs.map(rec => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSchedule={handleSchedule}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* High Priority Section */}
            {highRecs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-bold rounded uppercase">
                    High Priority
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Schedule soon
                  </span>
                </div>
                <div className="space-y-3">
                  {highRecs.map(rec => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSchedule={handleSchedule}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Normal Priority Section */}
            {normalRecs.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-bold rounded uppercase">
                    Routine
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Schedule when convenient
                  </span>
                </div>
                <div className="space-y-3">
                  {normalRecs.map(rec => (
                    <RecommendationCard
                      key={rec.id}
                      recommendation={rec}
                      onSchedule={handleSchedule}
                      onDismiss={handleDismiss}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Modal */}
      {selectedRecommendation && (
        <RecommendationModal
          recommendation={selectedRecommendation}
          onClose={() => setSelectedRecommendation(null)}
          onScheduled={handleScheduled}
        />
      )}
    </>
  )
}
