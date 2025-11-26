/**
 * Urgent Recommendations Widget
 *
 * Compact widget for dashboard showing only urgent/high severity recommendations
 */

'use client'

import { useRecommendations } from '@/hooks/useRecommendations'
import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon, SparklesIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export function UrgentRecommendationsWidget() {
  const router = useRouter()
  const { recommendations, loading } = useRecommendations()

  // Filter for urgent and high severity
  const urgentRecs = recommendations.filter(
    r => r.urgency === 'urgent' || r.severity === 'high'
  )

  if (loading) {
    return (
      <div className="bg-card rounded-lg shadow-sm p-5">
        <div className="animate-pulse">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
        </div>
      </div>
    )
  }

  if (urgentRecs.length === 0) {
    return null // Don't show widget if no urgent recommendations
  }

  return (
    <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/10 dark:to-red-900/10 border-2 border-orange-200 dark:border-orange-800 rounded-lg shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
          <ExclamationTriangleIcon className="w-5 h-5 text-warning dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-foreground mb-1">
            {urgentRecs.length} Urgent Health Recommendation{urgentRecs.length !== 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-muted-foreground">
            AI has detected important health patterns
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2 mb-4">
        {urgentRecs.slice(0, 2).map(rec => (
          <div
            key={rec.id}
            className="bg-background rounded-lg p-3 border border-border"
          >
            <div className="flex items-start gap-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                rec.urgency === 'urgent'
                  ? 'bg-red-100 dark:bg-red-900/30 text-error-dark dark:text-red-300'
                  : 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
              }`}>
                {rec.urgency === 'urgent' ? 'URGENT' : 'HIGH'}
              </span>
              <p className="text-sm text-foreground flex-1 leading-relaxed">
                {rec.reason}
              </p>
            </div>
          </div>
        ))}
        {urgentRecs.length > 2 && (
          <p className="text-xs text-muted-foreground dark:text-muted-foreground pl-3">
            +{urgentRecs.length - 2} more recommendation{urgentRecs.length - 2 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => router.push('/progress#recommendations')}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium text-sm"
      >
        <SparklesIcon className="w-4 h-4" />
        View & Schedule Appointments
        <ChevronRightIcon className="w-4 h-4" />
      </button>
    </div>
  )
}
