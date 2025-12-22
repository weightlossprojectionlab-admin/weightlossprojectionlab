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
        return 'bg-gray-100 text-gray-900 border-gray-400 font-bold'
      case 'single':
        return 'bg-blue-100 text-blue-900 border-blue-400 font-bold'
      case 'single_plus':
        return 'bg-teal-100 text-teal-900 border-teal-400 font-bold'
      case 'family_basic':
      case 'family_plus':
      case 'family_premium':
        return 'bg-purple-100 text-purple-900 border-purple-400 font-bold'
      default:
        return 'bg-gray-100 text-gray-900 border-gray-400 font-bold'
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
      <span className={`inline-flex items-center gap-1.5 border rounded-full font-bold ${getPlanColor()} ${getSizeClasses()}`}>
        <span>{getPlanIcon()}</span>
        <span>{getPlanLabel()}</span>
      </span>

      {hasFamilyFeatures && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-900 border border-green-400 rounded-full text-xs font-bold">
          <span>✨</span>
          <span>Family Features</span>
        </span>
      )}

      {status === 'trialing' && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-900 border border-yellow-400 rounded-full text-xs font-bold">
          <span>⏰</span>
          <span>Trial</span>
        </span>
      )}
    </div>
  )
}
