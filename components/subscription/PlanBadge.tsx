/**
 * PlanBadge Component
 *
 * Displays the user's current subscription plan with visual styling
 */

'use client'

import { UserSubscription, SubscriptionPlan } from '@/types'

interface PlanBadgeProps {
  plan: SubscriptionPlan
  addons?: UserSubscription['addons']
  status?: UserSubscription['status']
  size?: 'sm' | 'md' | 'lg'
}

export function PlanBadge({ plan, addons, status, size = 'md' }: PlanBadgeProps) {
  const getPlanColor = () => {
    switch (plan) {
      case 'free':
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
      case 'single':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600'
      case 'single_plus':
        return 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-600'
      case 'family_basic':
      case 'family_plus':
      case 'family_premium':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600'
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-2 py-0.5 text-xs'
      case 'md':
        return 'px-3 py-1 text-sm'
      case 'lg':
        return 'px-4 py-2 text-base'
      default:
        return 'px-3 py-1 text-sm'
    }
  }

  const getPlanIcon = () => {
    switch (plan) {
      case 'free':
        return '🆓'
      case 'single':
        return '👤'
      case 'single_plus':
        return '👤⚕️'
      case 'family_basic':
      case 'family_plus':
      case 'family_premium':
        return '👨‍👩‍👧‍👦'
      default:
        return ''
    }
  }

  const getPlanLabel = () => {
    switch (plan) {
      case 'free':
        return status === 'trialing' ? 'Free Trial' : 'Free'
      case 'single':
        return 'Single User'
      case 'single_plus':
        return 'Single User Plus'
      case 'family_basic':
        return 'Family Basic'
      case 'family_plus':
        return 'Family Plus'
      case 'family_premium':
        return 'Family Premium'
      default:
        return 'Unknown'
    }
  }

  const hasFamilyFeatures = addons?.familyFeatures === true

  return (
    <div className="inline-flex items-center gap-2 flex-wrap">
      <span className={`inline-flex items-center gap-1.5 border rounded-full font-medium ${getPlanColor()} ${getSizeClasses()}`}>
        <span>{getPlanIcon()}</span>
        <span>{getPlanLabel()}</span>
      </span>

      {hasFamilyFeatures && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-300 dark:border-green-600 rounded-full text-xs font-medium">
          <span>✨</span>
          <span>Family Features</span>
        </span>
      )}

      {status === 'trialing' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-600 rounded-full text-xs font-medium">
          <span>⏰</span>
          <span>Trial</span>
        </span>
      )}
    </div>
  )
}
