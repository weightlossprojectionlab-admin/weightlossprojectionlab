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
          badge: 'bg-red-100 dark:bg-red-900/30 text-error-dark dark:text-red-300',
          button: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg shadow-red-500/30'
        }
      case 'high':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50 dark:bg-orange-900/10',
          text: 'text-orange-700 dark:text-orange-300',
          badge: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
          button: 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-md shadow-orange-500/20'
        }
      case 'medium':
        return {
          border: 'border-yellow-500',
          bg: 'bg-warning-light dark:bg-yellow-900/10',
          text: 'text-yellow-700 dark:text-yellow-300',
          badge: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
          button: 'bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
        }
      default:
        return {
          border: 'border-blue-500',
          bg: 'bg-secondary-light dark:bg-blue-900/10',
          text: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
          button: 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
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

  const getProviderTypeLabel = (type: string) => {
    switch (type) {
      case 'nutritionist':
        return 'Nutritionist'
      case 'doctor':
      case 'doctor-checkup':
        return 'Doctor'
      case 'specialist':
        return 'Specialist'
      case 'mental-health':
        return 'Mental Health Professional'
      case 'dietitian':
        return 'Dietitian'
      default:
        return 'Provider'
    }
  }

  const getCtaText = (severity: string, providerType: string) => {
    const provider = getProviderTypeLabel(providerType)

    switch (severity) {
      case 'urgent':
        return `Schedule with ${provider} Now`
      case 'high':
        return `Schedule with ${provider} Soon`
      default:
        return `Schedule with ${provider}`
    }
  }

  const formatLastVisit = (daysSinceLastVisit?: number | null) => {
    if (!daysSinceLastVisit) return null

    const weeks = Math.floor(daysSinceLastVisit / 7)
    if (weeks === 0) return `${daysSinceLastVisit} days ago`
    if (weeks === 1) return '1 week ago'
    if (weeks < 4) return `${weeks} weeks ago`

    const months = Math.floor(weeks / 4)
    return months === 1 ? '1 month ago' : `${months} months ago`
  }

  const colors = getSeverityColor(recommendation.severity)
  const lastVisitText = formatLastVisit(recommendation.triggerMetrics.daysSinceLastVisit)
  const isOverdue = recommendation.triggerMetrics.overdueAppointment

  return (
    <div className={`border-l-4 ${colors.border} ${colors.bg} rounded-r-lg p-5 relative`}>
      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(recommendation.id)}
        className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-foreground dark:hover:text-gray-300 transition-colors"
        title="Dismiss this recommendation"
      >
        <XMarkIcon className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colors.badge}`}>
          {recommendation.severity === 'urgent' ? (
            <ExclamationTriangleIcon className="w-5 h-5" />
          ) : (
            <ClockIcon className="w-5 h-5" />
          )}
        </div>
        <div className="flex-1 pr-6">
          <h3 className={`font-semibold ${colors.text} mb-1`}>
            {getTypeLabel(recommendation.type)}
          </h3>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors.badge}`}>
              {recommendation.severity.toUpperCase()}
            </span>
            {isOverdue && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 flex items-center gap-1">
                <ExclamationTriangleIcon className="w-3 h-3" />
                OVERDUE
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {getUrgencyLabel(recommendation.urgency)}
            </span>
          </div>
        </div>
      </div>

      {/* Last Visit Info */}
      {lastVisitText && (
        <div className="mb-3 text-xs text-muted-foreground flex items-center gap-1.5">
          <ClockIcon className="w-4 h-4" />
          <span>Last visit: {lastVisitText}</span>
        </div>
      )}

      {/* Reason - More Prominent */}
      <div className="mb-4">
        <p className="text-sm font-medium text-foreground mb-1">Why this appointment is recommended:</p>
        <p className="text-sm text-foreground/80 leading-relaxed">
          {recommendation.reason}
        </p>
      </div>

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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-5">
        {/* Primary CTA - Schedule Appointment */}
        <button
          onClick={() => onSchedule(recommendation)}
          className={`flex-1 px-4 py-3 sm:py-3.5 ${colors.button} text-white rounded-lg transition-all font-semibold text-sm sm:text-base flex items-center justify-center gap-2 min-h-[44px]`}
        >
          {getCtaText(recommendation.severity, recommendation.suggestedProviderType)}
          <span className="text-lg" aria-hidden="true">→</span>
        </button>

        {/* Secondary - Dismiss (less prominent) */}
        <button
          onClick={() => onDismiss(recommendation.id)}
          className="sm:w-auto px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 rounded-lg transition-colors min-h-[44px]"
          title="Dismiss this recommendation"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
