'use client'

/**
 * Subscription Manager Component
 *
 * Displays subscription information and management options aligned with FAQ policies:
 * - 7-day trial info (no credit card required)
 * - Cancel anytime (retain access until period end)
 * - Plan changes (upgrades immediate, downgrades at cycle end)
 * - Payment prompt after trial
 */

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import {
  isInTrialPeriod,
  isTrialExpiringSoon,
  getDaysRemainingInTrial,
  getTrialStatusMessage,
  getCancellationMessage,
  getPlanChangeMessage,
  isUpgrade,
  isDowngrade,
  retainsAccessAfterCancellation,
} from '@/lib/subscription-policies'
import { getPlanDisplayName, getPlanPrice } from '@/lib/subscription-utils'
import { SubscriptionPlan, BillingInterval } from '@/types'
import toast from 'react-hot-toast'
import { getAuth, getIdToken } from 'firebase/auth'
import { getStripePriceId } from '@/lib/stripe-price-mapping'

interface SubscriptionManagerProps {
  className?: string
}

export function SubscriptionManager({ className = '' }: SubscriptionManagerProps) {
  const { user } = useAuth()
  const { subscription, loading } = useSubscription()
  const [canceling, setCanceling] = useState(false)
  const [changingPlan, setChangingPlan] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)
  const [showPlanChangeModal, setShowPlanChangeModal] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)

  if (loading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
        <h3 className="text-lg font-semibold mb-4">Subscription</h3>
        <p className="text-gray-600">No active subscription</p>
        <button
          className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => window.location.href = '/pricing'}
        >
          Start 7-Day Free Trial
        </button>
      </div>
    )
  }

  const isTrialing = isInTrialPeriod(subscription.status, subscription.trialEndsAt)
  const trialExpiringSoon = isTrialExpiringSoon(subscription.trialEndsAt)
  const daysRemaining = getDaysRemainingInTrial(subscription.trialEndsAt)
  const isCanceled = subscription.status === 'canceled'
  const hasAccessRemaining = isCanceled &&
    retainsAccessAfterCancellation(
      (subscription as any).canceledAt || new Date(),
      subscription.currentPeriodEnd || undefined
    )

  const handleCancelSubscription = async () => {
    setCanceling(true)
    try {
      const auth = getAuth()
      const token = await getIdToken(auth.currentUser!)

      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setShowCancelConfirm(false)
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to cancel subscription')
      }
    } catch (error) {
      toast.error('Failed to cancel subscription')
      console.error(error)
    } finally {
      setCanceling(false)
    }
  }

  const handleChangePlan = async (newPlan: SubscriptionPlan, billingInterval?: BillingInterval) => {
    if (!newPlan) return

    setChangingPlan(true)
    try {
      const auth = getAuth()
      const token = await getIdToken(auth.currentUser!)

      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newPlan,
          billingInterval: billingInterval || subscription?.billingInterval
        }),
      })

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        setShowPlanChangeModal(false)
        window.location.reload()
      } else {
        toast.error(data.error || 'Failed to change plan')
      }
    } catch (error) {
      toast.error('Failed to change plan')
      console.error(error)
    } finally {
      setChangingPlan(false)
    }
  }

  const handleManageBilling = async () => {
    try {
      const auth = getAuth()
      const token = await getIdToken(auth.currentUser!)

      const response = await fetch('/api/stripe/create-portal-session', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })

      const data = await response.json()

      if (data.success && data.url) {
        window.location.href = data.url
      } else {
        toast.error('Failed to open billing portal')
      }
    } catch (error) {
      toast.error('Failed to open billing portal')
      console.error(error)
    }
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Subscription</h3>

      {/* Current Plan */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Current Plan</span>
          <span className="text-lg font-semibold">
            {getPlanDisplayName(subscription.plan)}
          </span>
        </div>

        {/* Trial Status */}
        {isTrialing && (
          <div className={`p-3 rounded ${trialExpiringSoon ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50 border border-blue-200'}`}>
            <p className={`text-sm ${trialExpiringSoon ? 'text-yellow-800' : 'text-blue-800'}`}>
              {getTrialStatusMessage(subscription.status, subscription.trialEndsAt)}
            </p>
            {daysRemaining <= 3 && (
              <button
                className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                onClick={() => window.location.href = '/pricing'}
              >
                Add Payment Method →
              </button>
            )}
          </div>
        )}

        {/* Canceled Status */}
        {isCanceled && (
          <div className="p-3 rounded bg-red-50 border border-red-200">
            <p className="text-sm text-red-800">
              {hasAccessRemaining
                ? `Subscription canceled. Access until ${new Date(subscription.currentPeriodEnd!).toLocaleDateString()}`
                : 'Subscription has ended'}
            </p>
          </div>
        )}

        {/* Active Status */}
        {subscription.status === 'active' && (
          <div className="p-3 rounded bg-green-50 border border-green-200">
            <p className="text-sm text-green-800">
              Active • Renews {new Date(subscription.currentPeriodEnd!).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>

      {/* Plan Details */}
      <div className="space-y-2 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Billing</span>
          <span className="font-medium capitalize">{subscription.billingInterval}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Seats</span>
          <span className="font-medium">{subscription.currentSeats} / {subscription.maxSeats}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Caregivers</span>
          <span className="font-medium">
            {subscription.currentExternalCaregivers} / {subscription.maxExternalCaregivers}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {!isCanceled && subscription.status !== 'trialing' && (
          <>
            <button
              className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              onClick={handleManageBilling}
            >
              Manage Billing
            </button>
            <button
              className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
              onClick={() => setShowPlanChangeModal(true)}
            >
              Change Plan
            </button>
            <button
              className="w-full text-red-600 px-4 py-2 rounded hover:bg-red-50"
              onClick={() => setShowCancelConfirm(true)}
            >
              Cancel Subscription
            </button>
          </>
        )}

        {subscription.status === 'trialing' && (
          <button
            className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={() => window.location.href = '/pricing'}
          >
            Add Payment to Continue
          </button>
        )}
      </div>

      {/* FAQ Info */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-semibold mb-3">Frequently Asked Questions</h4>
        <div className="space-y-3 text-sm text-gray-600">
          <details className="cursor-pointer">
            <summary className="font-medium text-gray-900">How does the 7-day trial work?</summary>
            <p className="mt-1 pl-4">
              You get full access to all features of your selected plan for 7 days. No credit card required.
              After your trial ends, you'll be prompted to add payment to continue.
            </p>
          </details>
          <details className="cursor-pointer">
            <summary className="font-medium text-gray-900">Can I cancel anytime?</summary>
            <p className="mt-1 pl-4">
              Yes! {getCancellationMessage(subscription.currentPeriodEnd ?? undefined)}
            </p>
          </details>
          <details className="cursor-pointer">
            <summary className="font-medium text-gray-900">Can I upgrade or downgrade my plan?</summary>
            <p className="mt-1 pl-4">
              Yes! You can change your plan anytime. Upgrades take effect immediately, while downgrades
              take effect at the end of your billing cycle.
            </p>
          </details>
        </div>
      </div>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Cancel Subscription?</h3>
            <p className="text-gray-600 mb-6">
              {getCancellationMessage(subscription.currentPeriodEnd ?? undefined)}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
              >
                Keep Subscription
              </button>
              <button
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                onClick={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
