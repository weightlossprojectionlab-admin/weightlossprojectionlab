/**
 * UpgradeModal Component
 *
 * Shows subscription upgrade options with plan comparison
 * Now with 5-tier pricing and monthly/yearly toggle
 */

'use client'

import { useState } from 'react'
import { SubscriptionPlan, BillingInterval, SUBSCRIPTION_PRICING, SEAT_LIMITS, EXTERNAL_CAREGIVER_LIMITS } from '@/types'
import { createCheckoutSession } from '@/lib/stripe-client'
import toast from 'react-hot-toast'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan?: SubscriptionPlan
  currentBillingInterval?: BillingInterval
  suggestedPlan?: SubscriptionPlan
}

export function UpgradeModal({
  isOpen,
  onClose,
  currentPlan = 'free',
  currentBillingInterval = 'monthly',
  suggestedPlan
}: UpgradeModalProps) {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>(currentBillingInterval)
  const [loading, setLoading] = useState<string | null>(null) // Track which plan is loading

  const handleUpgrade = async (planId: SubscriptionPlan) => {
    if (currentPlan === planId) {
      toast.info('You are already on this plan')
      return
    }

    setLoading(planId)

    try {
      // Map plan ID and billing interval to Stripe price IDs
      // You'll need to create these products in Stripe Dashboard and add the price IDs to .env.local
      let priceId = ''

      // Map based on plan and billing interval
      if (billingInterval === 'monthly') {
        switch (planId) {
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
        // Yearly pricing
        switch (planId) {
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
        toast.error('Stripe is not fully configured yet. Please add product price IDs to .env.local')
        setLoading(null)
        return
      }

      await createCheckoutSession(
        priceId,
        `${window.location.origin}/profile?upgrade=success`,
        `${window.location.origin}/profile?upgrade=cancel`
      )
      // Redirect happens in createCheckoutSession
    } catch (error: any) {
      console.error('Error creating checkout session:', error)
      toast.error(error.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  if (!isOpen) return null

  const formatPrice = (cents: number): string => {
    return `$${(cents / 100).toFixed(2)}`
  }

  const calculateYearlySavings = (monthly: number, yearly: number): number => {
    const monthlyCost = monthly * 12
    const savings = monthlyCost - yearly
    return Math.round((savings / monthlyCost) * 100)
  }

  const plans = [
    {
      id: 'single' as SubscriptionPlan,
      name: 'Single User',
      icon: '👤',
      monthlyPrice: SUBSCRIPTION_PRICING.single.monthly,
      yearlyPrice: SUBSCRIPTION_PRICING.single.yearly,
      seats: SEAT_LIMITS.single,
      externalCaregivers: EXTERNAL_CAREGIVER_LIMITS.single,
      features: [
        '1 family member seat',
        '0 caregivers',
        'Weight & step tracking',
        'Meal logging & recipes',
        'Photo gallery & AI analysis'
      ],
      highlighted: suggestedPlan === 'single'
    },
    {
      id: 'single_plus' as SubscriptionPlan,
      name: 'Single User Plus',
      icon: '👤⚕️',
      monthlyPrice: SUBSCRIPTION_PRICING.single_plus.monthly,
      yearlyPrice: SUBSCRIPTION_PRICING.single_plus.yearly,
      seats: SEAT_LIMITS.single_plus,
      externalCaregivers: EXTERNAL_CAREGIVER_LIMITS.single_plus,
      features: [
        '1 family member seat',
        '3 external caregivers',
        'Everything in Single User',
        'Medical tracking (appointments, meds, vitals)',
        'Invite nurses, doctors, or family to help'
      ],
      highlighted: suggestedPlan === 'single_plus',
      badge: 'Popular for Medical Users'
    },
    {
      id: 'family_basic' as SubscriptionPlan,
      name: 'Family Basic',
      icon: '👨‍👩‍👧',
      monthlyPrice: SUBSCRIPTION_PRICING.family_basic.monthly,
      yearlyPrice: SUBSCRIPTION_PRICING.family_basic.yearly,
      seats: SEAT_LIMITS.family_basic,
      externalCaregivers: EXTERNAL_CAREGIVER_LIMITS.family_basic,
      features: [
        '5 family member seats',
        '5 external caregivers',
        'Track humans & pets',
        'Family health dashboard',
        'Shared meal planning'
      ],
      highlighted: suggestedPlan === 'family_basic'
    },
    {
      id: 'family_plus' as SubscriptionPlan,
      name: 'Family Plus',
      icon: '👨‍👩‍👧‍👦',
      monthlyPrice: SUBSCRIPTION_PRICING.family_plus.monthly,
      yearlyPrice: SUBSCRIPTION_PRICING.family_plus.yearly,
      seats: SEAT_LIMITS.family_plus,
      externalCaregivers: EXTERNAL_CAREGIVER_LIMITS.family_plus,
      features: [
        '10 family member seats',
        '10 external caregivers',
        'Advanced analytics & insights',
        'Enhanced AI coaching',
        'Priority support'
      ],
      highlighted: suggestedPlan === 'family_plus',
      badge: 'Most Popular'
    },
    {
      id: 'family_premium' as SubscriptionPlan,
      name: 'Family Premium',
      icon: '🌟',
      monthlyPrice: SUBSCRIPTION_PRICING.family_premium.monthly,
      yearlyPrice: SUBSCRIPTION_PRICING.family_premium.yearly,
      seats: SEAT_LIMITS.family_premium,
      externalCaregivers: EXTERNAL_CAREGIVER_LIMITS.family_premium,
      features: [
        'Unlimited family members',
        'Unlimited external caregivers',
        'All premium features',
        'White-glove support',
        'Early access to features'
      ],
      highlighted: suggestedPlan === 'family_premium',
      badge: 'Best Value'
    }
  ]

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground">Upgrade Your Plan</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Choose the plan that's right for you
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4">
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
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-lg border-2 p-6 relative ${
                  plan.highlighted
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary text-white px-3 py-1 rounded-full text-xs font-bold">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="text-center mb-4">
                  <div className="text-4xl mb-2">{plan.icon}</div>
                  <h3 className="font-bold text-lg text-foreground">{plan.name}</h3>
                  <div className="mt-2">
                    <div className="text-3xl font-bold text-foreground">
                      {billingInterval === 'monthly'
                        ? formatPrice(plan.monthlyPrice)
                        : formatPrice(Math.round(plan.yearlyPrice / 12))}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {billingInterval === 'monthly' ? '/month' : '/month, billed yearly'}
                    </div>
                    {billingInterval === 'yearly' && (
                      <div className="text-xs text-success mt-1">
                        {formatPrice(plan.yearlyPrice)}/year total
                      </div>
                    )}
                  </div>
                  <div className="mt-3 text-xs text-muted-foreground">
                    {plan.seats === 999 ? 'Unlimited' : plan.seats} {plan.seats === 1 ? 'seat' : 'seats'} • {' '}
                    {plan.externalCaregivers === 999 ? 'Unlimited' : plan.externalCaregivers} caregivers
                  </div>
                </div>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <svg className="w-5 h-5 text-success flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`w-full py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    plan.highlighted
                      ? 'bg-primary text-white hover:bg-primary-hover'
                      : 'bg-muted text-foreground hover:bg-gray-300 dark:hover:bg-gray-700'
                  }`}
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={loading === plan.id || currentPlan === plan.id}
                >
                  {loading === plan.id ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : currentPlan === plan.id ? (
                    'Current Plan'
                  ) : (
                    'Select Plan'
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Note */}
          <div className="mt-6 space-y-3">
            <div className="bg-muted rounded-lg p-4">
              <h4 className="text-sm font-medium text-foreground mb-2">What's included:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <strong>Family Member Seats:</strong> Patient profiles that count toward billing</li>
                <li>• <strong>External Caregivers:</strong> Professional access (free, not billable)</li>
                <li>• 14-day free trial on all plans</li>
                <li>• Cancel anytime, no long-term commitment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
