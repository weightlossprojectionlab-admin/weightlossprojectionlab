'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useRouter } from 'next/navigation'
import { SubscriptionPlan } from '@/types'
import { CheckIcon } from '@heroicons/react/24/solid'
import { auth } from '@/lib/firebase'

interface PlanFeature {
  name: string
  included: boolean
}

interface Plan {
  id: SubscriptionPlan
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  popular?: boolean
  features: PlanFeature[]
}

const PLANS: Plan[] = [
  {
    id: 'single',
    name: 'Single User',
    description: 'Perfect for individual weight loss journeys',
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    features: [
      { name: '1 user account', included: true },
      { name: 'Meal logging with AI', included: true },
      { name: 'Weight & step tracking', included: true },
      { name: 'Basic recipes', included: true },
      { name: 'Progress dashboard', included: true },
      { name: 'Medical tracking', included: false },
      { name: 'External caregivers', included: false },
      { name: 'Advanced analytics', included: false },
    ],
  },
  {
    id: 'single_plus',
    name: 'Single User Plus',
    description: 'Medical tracking for comprehensive health management',
    monthlyPrice: 14.99,
    yearlyPrice: 149,
    features: [
      { name: '1 user account', included: true },
      { name: 'All Single User features', included: true },
      { name: 'Medical records tracking', included: true },
      { name: 'Medications & appointments', included: true },
      { name: 'Vitals monitoring', included: true },
      { name: '3 external caregivers', included: true },
      { name: 'Provider management', included: true },
      { name: 'Advanced analytics', included: false },
    ],
  },
  {
    id: 'family_basic',
    name: 'Family Basic',
    description: 'Track health for your whole family',
    monthlyPrice: 19.99,
    yearlyPrice: 199,
    features: [
      { name: 'Up to 5 family members', included: true },
      { name: 'All Single Plus features', included: true },
      { name: 'Family meal planning', included: true },
      { name: 'Shared shopping lists', included: true },
      { name: '5 external caregivers', included: true },
      { name: 'Family health dashboard', included: true },
      { name: 'Pet tracking', included: true },
      { name: 'Advanced analytics', included: false },
    ],
  },
  {
    id: 'family_plus',
    name: 'Family Plus',
    description: 'Our most popular plan with advanced features',
    monthlyPrice: 29.99,
    yearlyPrice: 299,
    popular: true,
    features: [
      { name: 'Up to 10 family members', included: true },
      { name: 'All Family Basic features', included: true },
      { name: 'Advanced analytics & insights', included: true },
      { name: 'Health trend analysis', included: true },
      { name: 'Predictive AI coaching', included: true },
      { name: '10 external caregivers', included: true },
      { name: 'Enhanced meal suggestions', included: true },
      { name: 'Priority support', included: false },
    ],
  },
  {
    id: 'family_premium',
    name: 'Family Premium',
    description: 'Unlimited everything for large families',
    monthlyPrice: 39.99,
    yearlyPrice: 399,
    features: [
      { name: 'Unlimited family members', included: true },
      { name: 'All Family Plus features', included: true },
      { name: 'Priority 24hr support', included: true },
      { name: 'White-glove onboarding', included: true },
      { name: 'Custom health reports', included: true },
      { name: 'Data export & API access', included: true },
      { name: 'Early access to new features', included: true },
      { name: 'Dedicated account manager', included: true },
    ],
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { subscription, plan: currentPlan } = useSubscription()
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    if (plan === currentPlan) {
      alert('You are already on this plan')
      return
    }

    setLoading(plan)

    try {
      const token = await auth.currentUser?.getIdToken()

      if (!token) {
        throw new Error('Not authenticated')
      }

      // Call checkout API
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          plan,
          billingInterval,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create checkout session')
      }

      const { url } = await response.json()

      // Redirect to Stripe checkout
      window.location.href = url
    } catch (error: any) {
      console.error('Checkout error:', error)
      alert(error.message || 'Failed to start checkout')
      setLoading(null)
    }
  }

  const calculateSavings = (monthlyPrice: number, yearlyPrice: number) => {
    const monthlyTotal = monthlyPrice * 12
    const savings = monthlyTotal - yearlyPrice
    const percentage = Math.round((savings / monthlyTotal) * 100)
    return { amount: savings.toFixed(2), percentage }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            Choose Your Plan
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Start your weight loss journey with a 30-day free trial. No credit card required for the first 14 days.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={billingInterval === 'monthly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              Monthly
            </span>
            <button
              onClick={() => setBillingInterval(billingInterval === 'monthly' ? 'yearly' : 'monthly')}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                billingInterval === 'yearly' ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingInterval === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={billingInterval === 'yearly' ? 'font-semibold text-foreground' : 'text-muted-foreground'}>
              Yearly
              <span className="ml-2 text-sm text-green-600 font-medium">Save 17%</span>
            </span>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {PLANS.map((planData) => {
            const price = billingInterval === 'monthly' ? planData.monthlyPrice : planData.yearlyPrice
            const savings = calculateSavings(planData.monthlyPrice, planData.yearlyPrice)
            const isCurrentPlan = currentPlan === planData.id

            return (
              <div
                key={planData.id}
                className={`relative rounded-lg border-2 p-6 flex flex-col ${
                  planData.popular
                    ? 'border-primary shadow-lg scale-105'
                    : 'border-border hover:border-primary/50'
                } ${isCurrentPlan ? 'bg-primary/5' : 'bg-card'}`}
              >
                {/* Popular Badge */}
                {planData.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrentPlan && (
                  <div className="absolute top-4 right-4">
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {planData.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {planData.description}
                  </p>
                </div>

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-foreground">
                      ${price}
                    </span>
                    <span className="text-muted-foreground">
                      /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {billingInterval === 'yearly' && (
                    <p className="text-sm text-green-600 mt-1">
                      Save ${savings.amount}/year ({savings.percentage}% off)
                    </p>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6 flex-grow">
                  {planData.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckIcon
                        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${
                          feature.included ? 'text-green-600' : 'text-gray-300'
                        }`}
                      />
                      <span
                        className={`text-sm ${
                          feature.included ? 'text-foreground' : 'text-muted-foreground line-through'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => handleSelectPlan(planData.id)}
                  disabled={loading === planData.id || isCurrentPlan}
                  className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                    isCurrentPlan
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : planData.popular
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  } disabled:opacity-50`}
                >
                  {loading === planData.id
                    ? 'Loading...'
                    : isCurrentPlan
                    ? 'Current Plan'
                    : 'Start Free Trial'}
                </button>
              </div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            <details className="bg-card rounded-lg p-4 border border-border">
              <summary className="font-medium text-foreground cursor-pointer">
                How does the 30-day trial work?
              </summary>
              <p className="mt-2 text-muted-foreground text-sm">
                You get full access to all features of your selected plan for 30 days. No credit card required for the first 14 days. After your trial ends, you'll be charged for your subscription.
              </p>
            </details>
            <details className="bg-card rounded-lg p-4 border border-border">
              <summary className="font-medium text-foreground cursor-pointer">
                Can I cancel anytime?
              </summary>
              <p className="mt-2 text-muted-foreground text-sm">
                Yes! You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.
              </p>
            </details>
            <details className="bg-card rounded-lg p-4 border border-border">
              <summary className="font-medium text-foreground cursor-pointer">
                What happens after my trial ends?
              </summary>
              <p className="mt-2 text-muted-foreground text-sm">
                After 30 days, your trial converts to a paid subscription automatically. We'll send you reminders before charging your card.
              </p>
            </details>
            <details className="bg-card rounded-lg p-4 border border-border">
              <summary className="font-medium text-foreground cursor-pointer">
                Can I upgrade or downgrade my plan?
              </summary>
              <p className="mt-2 text-muted-foreground text-sm">
                Yes! You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your billing cycle.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  )
}
