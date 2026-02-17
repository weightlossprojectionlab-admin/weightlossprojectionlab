'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useUserProfile } from '@/hooks/useUserProfile'

interface SubscriptionPaywallProps {
  children: React.ReactNode
}

/**
 * SubscriptionPaywall - Blocks access to content if subscription is expired/canceled
 *
 * Displays upgrade prompt instead of protected content
 */
export function SubscriptionPaywall({ children }: SubscriptionPaywallProps) {
  const { profile, loading } = useUserProfile()
  const router = useRouter()
  const [portalLoading, setPortalLoading] = useState(false)

  const subscription = profile?.subscription
  const isExpired = subscription?.status === 'expired'
  const isCanceled = subscription?.status === 'canceled'
  const isBlocked = isExpired || isCanceled

  const handleManageSubscription = async () => {
    setPortalLoading(true)
    try {
      const { createPortalSession } = await import('@/lib/stripe-client')
      await createPortalSession(window.location.href)
    } catch (error: any) {
      alert(error?.message || 'Failed to open subscription management. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  // Debug logging
  useEffect(() => {
    if (subscription) {
      console.log('[SubscriptionPaywall] Subscription status:', subscription.status)
      console.log('[SubscriptionPaywall] Is blocked:', isBlocked)
      console.log('[SubscriptionPaywall] Full subscription:', subscription)
    }
  }, [subscription, isBlocked])

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // If subscription is expired or canceled, show paywall
  if (isBlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-6">
              <svg
                className="w-10 h-10 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {isExpired ? 'Your Free Trial Has Ended' : 'Subscription Required'}
            </h1>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-2">
              {isExpired
                ? 'Your trial ended and you no longer have access to your health data and features.'
                : 'Your subscription has been canceled. Upgrade to restore access.'}
            </p>

            <p className="text-sm text-gray-500 mb-8">
              Upgrade now to continue tracking your wellness journey
            </p>

            {/* Trial End Date */}
            {subscription?.trialEndsAt && (
              <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <p className="text-sm text-gray-600">
                  Trial ended:{' '}
                  <strong className="text-gray-900">
                    {(() => {
                      try {
                        const date =
                          typeof subscription.trialEndsAt === 'object' && 'toDate' in subscription.trialEndsAt
                            ? (subscription.trialEndsAt as any).toDate()
                            : new Date(subscription.trialEndsAt as any)
                        return date.toLocaleDateString()
                      } catch {
                        return 'Recently'
                      }
                    })()}
                  </strong>
                </p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Previously-paid users can reactivate via Stripe Customer Portal */}
              {subscription?.stripeCustomerId ? (
                <button
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {portalLoading ? 'Loading...' : 'Manage Subscription'}
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  View Plans & Pricing
                </Link>
              )}

              <button
                onClick={() => router.push('/auth')}
                className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:border-gray-400 transition-all"
              >
                Sign Out
              </button>
            </div>

            {/* Features List */}
            <div className="mt-12 text-left">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                What you're missing:
              </h2>
              <ul className="space-y-3">
                {[
                  'Track weight, meals, and fitness progress',
                  'AI-powered meal analysis and recommendations',
                  'Medical records and appointment tracking',
                  'Family health management',
                  'Shopping lists and meal planning',
                  'Progress charts and insights',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg
                      className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Subscription is active - show protected content
  return <>{children}</>
}
