/**
 * PlanRecommendation Component
 *
 * Displays upgrade prompts during onboarding when users select features
 * not available in their current subscription tier.
 */

'use client'

import { useState } from 'react'
import { SubscriptionPlan, UserSubscription } from '@/types'
import { getPlanDisplayName, getPlanPrice } from '@/lib/subscription-utils'
import { createCheckoutSession } from '@/lib/stripe-client'
import toast from 'react-hot-toast'

interface PlanRecommendationProps {
  currentPlan: SubscriptionPlan
  recommendedPlan: SubscriptionPlan
  selectedFeatures: string[]
  onContinueWithoutUpgrade: () => void
  onUpgradeSuccess?: () => void
}

export function PlanRecommendation({
  currentPlan,
  recommendedPlan,
  selectedFeatures,
  onContinueWithoutUpgrade,
  onUpgradeSuccess
}: PlanRecommendationProps) {
  const [loading, setLoading] = useState(false)
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')

  const handleUpgrade = async () => {
    setLoading(true)

    try {
      // Map plan and billing interval to Stripe price IDs
      let priceId = ''

      if (billingInterval === 'monthly') {
        switch (recommendedPlan) {
          case 'single':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY || ''
            break
          case 'single_plus':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY || ''
            break
          case 'family_basic':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY || ''
            break
          case 'family_plus':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY || ''
            break
          case 'family_premium':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY || ''
            break
        }
      } else {
        switch (recommendedPlan) {
          case 'single':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY || ''
            break
          case 'single_plus':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_YEARLY || ''
            break
          case 'family_basic':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY || ''
            break
          case 'family_plus':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY || ''
            break
          case 'family_premium':
            priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY || ''
            break
        }
      }

      if (!priceId || priceId === 'price_xxx') {
        toast.error('Stripe is not fully configured yet')
        setLoading(false)
        return
      }

      await createCheckoutSession(
        priceId,
        `${window.location.origin}/onboarding?upgrade=success`,
        `${window.location.origin}/onboarding?upgrade=cancel`
      )
      // Redirect happens in createCheckoutSession
      onUpgradeSuccess?.()
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      toast.error(error.message || 'Failed to start checkout')
      setLoading(false)
    }
  }

  const getFeatureLabel = (feature: string): string => {
    const labels: Record<string, string> = {
      medical_tracking: 'Medical Tracking',
      vitals: 'Vitals Monitoring',
      medications: 'Medication Management',
      caregiving: 'Family Caregiving',
    }
    return labels[feature] || feature
  }

  const getPlanIcon = (plan: SubscriptionPlan): string => {
    const icons: Record<SubscriptionPlan, string> = {
      free: '🆓',
      single: '👤',
      single_plus: '👤⚕️',
      family_basic: '👨‍👩‍👧',
      family_plus: '👨‍👩‍👧‍👦',
      family_premium: '🌟',
    }
    return icons[plan]
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Card */}
        <div className="bg-card rounded-2xl shadow-2xl p-8 border border-border">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{getPlanIcon(recommendedPlan)}</div>
            <h2 className="text-3xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Unlock Premium Features
            </h2>
            <p className="text-muted-foreground">
              The features you selected require {getPlanDisplayName(recommendedPlan)}
            </p>
          </div>

          {/* Selected Features */}
          <div className="bg-accent rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-foreground mb-3">You selected:</h3>
            <ul className="space-y-2">
              {selectedFeatures.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-foreground">
                  <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{getFeatureLabel(feature)}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Plan Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Current Plan */}
            <div className="bg-muted rounded-lg p-4 opacity-60">
              <div className="text-2xl mb-2">{getPlanIcon(currentPlan)}</div>
              <h4 className="font-semibold text-foreground mb-2">{getPlanDisplayName(currentPlan)}</h4>
              <p className="text-sm text-muted-foreground">Current Plan</p>
            </div>

            {/* Recommended Plan */}
            <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 relative">
              <div className="absolute -top-3 right-4">
                <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
                  Recommended
                </span>
              </div>
              <div className="text-2xl mb-2">{getPlanIcon(recommendedPlan)}</div>
              <h4 className="font-semibold text-foreground mb-2">{getPlanDisplayName(recommendedPlan)}</h4>
              <div className="text-2xl font-bold text-primary">
                {getPlanPrice(recommendedPlan, billingInterval)}
                <span className="text-sm font-normal text-muted-foreground">/month</span>
              </div>
            </div>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <button
              onClick={() => setBillingInterval('monthly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                billingInterval === 'monthly'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors relative ${
                billingInterval === 'yearly'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              Yearly
              <span className="absolute -top-2 -right-2 bg-success text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-xl font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Upgrade to {getPlanDisplayName(recommendedPlan)}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            <button
              onClick={onContinueWithoutUpgrade}
              disabled={loading}
              className="w-full py-3 text-muted-foreground hover:text-foreground transition-colors font-medium disabled:opacity-50"
            >
              Continue without these features
            </button>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                14-day free trial
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Cancel anytime
              </div>
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Secure payment
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
