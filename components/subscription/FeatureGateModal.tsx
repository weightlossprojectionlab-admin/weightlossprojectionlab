/**
 * Feature Gate Modal
 *
 * Shared component for consistent upgrade prompts when users encounter locked features.
 * DRY principle - single source of truth for feature gate messaging.
 */

'use client'

import { XMarkIcon, LockClosedIcon } from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import type { SubscriptionPlan } from '@/types'

interface FeatureGateModalProps {
  isOpen: boolean
  onClose: () => void
  featureName: string
  featureDescription: string
  requiredPlan: SubscriptionPlan
  currentPlan: SubscriptionPlan | null
  icon?: string
  benefits?: string[]
}

const PLAN_NAMES: Record<SubscriptionPlan, string> = {
  free: 'Free Trial',
  single: 'Single User',
  single_plus: 'Single User Plus',
  family_basic: 'Family Basic',
  family_plus: 'Family Plus',
  family_premium: 'Family Premium'
}

const PLAN_PRICING: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
  free: { monthly: 0, yearly: 0 },
  single: { monthly: 9.99, yearly: 99 },
  single_plus: { monthly: 14.99, yearly: 149 },
  family_basic: { monthly: 19.99, yearly: 199 },
  family_plus: { monthly: 29.99, yearly: 299 },
  family_premium: { monthly: 49.99, yearly: 499 }
}

export function FeatureGateModal({
  isOpen,
  onClose,
  featureName,
  featureDescription,
  requiredPlan,
  currentPlan,
  icon = '🔒',
  benefits = []
}: FeatureGateModalProps) {
  const router = useRouter()

  if (!isOpen) return null

  const requiredPlanName = PLAN_NAMES[requiredPlan]
  const requiredPlanPrice = PLAN_PRICING[requiredPlan].monthly
  const currentPlanName = currentPlan ? PLAN_NAMES[currentPlan] : 'Free'

  const handleUpgrade = () => {
    router.push(`/pricing?upgrade=${requiredPlan}&from=${currentPlan || 'free'}`)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-4xl">{icon}</div>
            <div>
              <h2 className="text-xl font-bold">Upgrade Required</h2>
              <p className="text-purple-100 text-sm mt-1">
                {featureName} requires {requiredPlanName}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Feature Description */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-900">
              {featureDescription}
            </p>
          </div>

          {/* Benefits */}
          {benefits.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold text-foreground">What you'll get:</h3>
              <ul className="space-y-2">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-green-600 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Current Plan Info */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="font-semibold text-foreground">{currentPlanName}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Upgrade to</p>
                <p className="font-semibold text-purple-600">{requiredPlanName}</p>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">
              ${requiredPlanPrice.toFixed(2)}
              <span className="text-lg text-muted-foreground font-normal">/month</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              7-day free trial • No credit card required
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border-2 border-border rounded-lg font-medium text-foreground hover:bg-muted transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={handleUpgrade}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-colors"
            >
              Start Free Trial
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
