/**
 * Upgrade Required Modal
 *
 * Shows when user tries to enable a feature that requires a higher subscription tier.
 * Provides clear explanation, pricing info, and call-to-action.
 */

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import type { FeaturePreference, SubscriptionPlan } from '@/types'

interface UpgradeRequiredModalProps {
  isOpen: boolean
  onClose: () => void
  feature: FeaturePreference
  currentPlan: SubscriptionPlan
  requiredPlan: SubscriptionPlan
  onConfirm: () => void
}

const FEATURE_INFO: Record<FeaturePreference, {
  title: string
  icon: string
  benefits: string[]
  description: string
}> = {
  'health_medical': {
    title: 'Health & Medical Tracking',
    icon: '💊',
    description: 'Comprehensive health and medical record management for you and your family',
    benefits: [
      'Track medications, dosages, and refill schedules',
      'Monitor vital signs (blood pressure, glucose, heart rate)',
      'Manage appointments and provider contacts',
      'Store medical documents and insurance cards',
      'Generate health reports for your doctor',
      'Set medication and vital reminders'
    ]
  },
  'body_fitness': {
    title: 'Body & Fitness Goals',
    icon: '💪',
    description: 'Complete fitness and body composition tracking',
    benefits: [
      'Track weight and body measurements',
      'Log exercise and physical activity',
      'Monitor body composition changes',
      'Set and track fitness goals',
      'View progress charts and trends',
      'Get AI-powered fitness insights'
    ]
  },
  'nutrition_kitchen': {
    title: 'Nutrition & Kitchen Management',
    icon: '🍎',
    description: 'Smart meal planning and kitchen management tools',
    benefits: [
      'AI-powered meal analysis with WPL Vision™',
      'Discover and save healthy recipes',
      'Smart shopping lists with price tracking',
      'Pantry inventory management',
      'Nutrition tracking and insights',
      'Meal planning and prep reminders'
    ]
  }
}

const PLAN_PRICING: Record<SubscriptionPlan, { monthly: number; yearly: number; name: string }> = {
  free: { monthly: 0, yearly: 0, name: 'Free' },
  single: { monthly: 9.99, yearly: 99, name: 'Single' },
  single_plus: { monthly: 14.99, yearly: 149, name: 'Single Plus' },
  family_basic: { monthly: 19.99, yearly: 199, name: 'Family Basic' },
  family_plus: { monthly: 29.99, yearly: 299, name: 'Family Plus' },
  family_premium: { monthly: 49.99, yearly: 499, name: 'Family Premium' }
}

export function UpgradeRequiredModal({
  isOpen,
  onClose,
  feature,
  currentPlan,
  requiredPlan,
  onConfirm
}: UpgradeRequiredModalProps) {
  const router = useRouter()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  if (!isOpen) return null

  // Validate plans exist in pricing table
  const normalizedCurrentPlan = PLAN_PRICING[currentPlan] ? currentPlan : 'free'
  const normalizedRequiredPlan = PLAN_PRICING[requiredPlan] ? requiredPlan : 'single_plus'

  const featureInfo = FEATURE_INFO[feature]
  const currentPlanInfo = PLAN_PRICING[normalizedCurrentPlan]
  const requiredPlanInfo = PLAN_PRICING[normalizedRequiredPlan]
  const upgradeCost = requiredPlanInfo[billingInterval] - currentPlanInfo[billingInterval]
  const yearlyDiscount = Math.round(((requiredPlanInfo.monthly * 12 - requiredPlanInfo.yearly) / (requiredPlanInfo.monthly * 12)) * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="text-5xl">{featureInfo.icon}</div>
            <div>
              <h2 className="text-2xl font-bold">Upgrade Required</h2>
              <p className="text-purple-100 text-sm mt-1">
                {featureInfo.title} requires {requiredPlanInfo.name}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Feature Description */}
          <div className="mb-6">
            <p className="text-gray-700 text-lg mb-4">{featureInfo.description}</p>
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <h3 className="font-bold text-purple-900 mb-3">What you'll unlock:</h3>
              <ul className="space-y-2">
                {featureInfo.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Current vs Required Plan */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="text-sm text-gray-500 mb-1">Your Current Plan</div>
              <div className="text-xl font-bold text-gray-900">{currentPlanInfo.name}</div>
              <div className="text-sm text-gray-600">
                ${currentPlanInfo.monthly}/month
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-4 border-2 border-purple-300">
              <div className="text-sm text-purple-700 font-semibold mb-1">Upgrade To</div>
              <div className="text-xl font-bold text-purple-900">{requiredPlanInfo.name}</div>
              <div className="text-sm text-purple-700">
                ${requiredPlanInfo.monthly}/month
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-4 bg-gray-100 rounded-lg p-2">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  billingInterval === 'monthly'
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-6 py-2 rounded-md font-medium transition-all ${
                  billingInterval === 'yearly'
                    ? 'bg-white text-purple-600 shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                {yearlyDiscount > 0 && (
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded">
                    Save {yearlyDiscount}%
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Pricing Breakdown */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4 mb-6 border border-purple-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">Current plan:</span>
              <span className="font-semibold">
                ${currentPlanInfo[billingInterval]}{billingInterval === 'monthly' ? '/mo' : '/yr'}
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700">New plan:</span>
              <span className="font-semibold">
                ${requiredPlanInfo[billingInterval]}{billingInterval === 'monthly' ? '/mo' : '/yr'}
              </span>
            </div>
            <div className="border-t border-purple-300 pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-purple-900">Upgrade cost:</span>
                <span className="text-2xl font-bold text-purple-600">
                  +${upgradeCost.toFixed(2)}{billingInterval === 'monthly' ? '/mo' : '/yr'}
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 text-right">
                {billingInterval === 'monthly'
                  ? 'Prorated charge for remaining days this month'
                  : `Just $${(requiredPlanInfo.yearly / 12).toFixed(2)}/month billed annually`
                }
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                onConfirm()
                onClose()
              }}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-bold shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
              Upgrade to {requiredPlanInfo.name} →
            </button>
          </div>

          {/* Trust Signals */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">✓</div>
                <div className="text-xs text-gray-600">Cancel anytime</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🔒</div>
                <div className="text-xs text-gray-600">Secure payment</div>
              </div>
              <div>
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-xs text-gray-600">Instant access</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
