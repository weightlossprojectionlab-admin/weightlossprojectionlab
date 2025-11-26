/**
 * Recommendation Card Component
 *
 * Displays a single appointment recommendation with severity indicator,
 * reason, and action buttons
 */

import { AppointmentRecommendation } from '@/types/medical'
import { ExclamationTriangleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface RecommendationCardProps {
  recommendation: AppointmentRecommendation
  onSchedule: (recommendation: AppointmentRecommendation) => void
  onDismiss: (recommendationId: string) => void
}

export function RecommendationCard({
  recommendation,
  onSchedule,
  onDismiss
}: RecommendationCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'urgent':
        return {
          border: 'border-red-500',
          bg: 'bg-error-light dark:bg-red-900/10',
          text: 'text-error-dark dark:text-red-300',
          badge: 'bg-red-100 dark:bg-red-900/30 text-error-dark dark:text-red-300'
        }
      case 'high':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          text: 'text-orange-700 dark:text-orange-300',
          badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
        }
      case 'medium':
        return {
          border: 'border-yellow-500',
          bg: 'bg-warning-light dark:bg-yellow-900/10',
          text: 'text-yellow-700 dark:text-yellow-300',
          badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
        }
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-secondary-light dark:bg-blue-900/10',
          text: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
        }
    }
  }

  const getUrgencyLabel = (urgency: string) => {
    switch (urgency) {
      case 'urgent':
        return 'Schedule This Week'
      case 'soon':
        return 'Schedule Soon'
      case 'normal':
        return 'Schedule When Convenient'
      default:
        return 'Routine Checkup'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'nutritionist':
        return 'Nutritionist Visit'
      case 'doctor-checkup':
        return 'Doctor Checkup'
      case 'specialist':
        return 'Specialist Consultation'
      case 'mental-health':
        return 'Mental Health Visit'
      default:
        return 'Medical Appointment'
    }
  }

  const colors = getSeverityColor(recommendation.severity)

  return (
    <div className={`border-l-4 ${colors.border} ${colors.bg} rounded-r-lg p-5 relative`}>
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(recommendation.id)}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300 transition-colors"
        title="Dismiss this recommendation"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors.badge}`}>
          {recommendation.urgency === 'urgent' ? (
            <ExclamationTriangleIcon className="w-5 h-5" />
          ) : (
            <ClockIcon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 pr-6">
          <h3 className={`font-semibold ${colors.text} mb-1`}>
            {getTypeLabel(recommendation.type)}
          </h3>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {recommendation.severity.toUpperCase()}
            </span>
            <span className="text-xs text-muted-foreground">
              {getUrgencyLabel(recommendation.urgency)}
            </span>
          </div>
        </div>
      </div>

      {/* Reason */}
      <p className="text-sm text-foreground mb-4 leading-relaxed">
        {recommendation.reason}
      </p>

      {/* Trigger Metrics */}
      {recommendation.triggerMetrics && (
        <div className="mb-4 text-xs text-muted-foreground space-y-1">
          {recommendation.triggerMetrics.weightLossStalled && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              <span>Weight loss stalled for 3+ weeks</span>
            </div>
          )}
          {recommendation.triggerMetrics.paceTooSlow && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              <span>Weight loss pace below target ({recommendation.triggerMetrics.weeklyChangeRate?.toFixed(1)} lbs/week)</span>
            </div>
          )}
          {recommendation.triggerMetrics.paceTooFast && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              <span>Rapid weight loss detected ({recommendation.triggerMetrics.weeklyChangeRate?.toFixed(1)} lbs/week)</span>
            </div>
          )}
          {recommendation.triggerMetrics.vitalAlert && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-error-light0 rounded-full animate-pulse"></span>
              <span>{recommendation.triggerMetrics.vitalAlert}</span>
            </div>
          )}
          {recommendation.triggerMetrics.overdueAppointment && recommendation.triggerMetrics.daysSinceLastVisit && (
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              <span>{recommendation.triggerMetrics.daysSinceLastVisit} days since last visit</span>
            </div>
          )}
        </div>
      )}

      {/* Action */}
      <button
        onClick={() => onSchedule(recommendation)}
        className={`w-full px-4 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all font-medium text-sm shadow-sm`}
      >
        Schedule Appointment Now
      </button>
    </div>
  )
}
