'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useSubscription } from '@/hooks/useSubscription'
import { useRouter, useSearchParams } from 'next/navigation'
import { SubscriptionPlan } from '@/types'
import { CheckIcon } from '@heroicons/react/24/solid'
import { auth } from '@/lib/firebase'
import { getCSRFToken } from '@/lib/csrf'
import { userProfileOperations } from '@/lib/firebase-operations'
import {
  getPlanRelationship,
  type PlanRelationship,
} from '@/lib/subscription-utils'
import { PLANS } from '@/lib/plan-details'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

// PLANS data + Plan/PlanFeature types now live in lib/plan-details.ts
// so the /profile plan-detail modal (and any future surface) can
// import the same source. See the comments there for the editing
// policy + ML/AI terminology guidelines.

/**
 * Rich descriptions for JSON-LD structured data — invisible to humans
 * but consumed by search engines and answer engines (Google AI
 * Overviews, ChatGPT, Perplexity, etc.). These versions explicitly
 * name the underlying AI/ML technology (Gemini Vision, machine
 * learning models) so the platform shows up for queries like
 * "AI meal recognition app" or "machine learning health platform"
 * even though those keywords don't clutter the human-facing card.
 *
 * Updating policy: when you ship a new ML model or AI integration,
 * add a sentence here for the relevant tier. The visible UI doesn't
 * need to change — Quad-sync separation keeps marketing copy clean
 * while metadata stays rich.
 */
function schemaDescriptionFor(planId: SubscriptionPlan, baseDescription: string): string {
  const aiMlContext: Record<SubscriptionPlan, string> = {
    free: '',
    single:
      'Includes AI-powered meal photo recognition built on Gemini Vision, in-store shopping mode with live cart and shared lists, barcode scanning against a 456,000-product national-retailer catalog (offline-cached for dead zones), AI receipt scanning at checkout, curated recipe library with smart scaling and 650+ ingredient substitutions, cooking timers with audio chimes, and machine-learning coaching that personalizes guidance from each user\'s logging history.',
    single_plus:
      'Adds clinical-grade health management for individuals managing chronic conditions, medications, or working with caregivers. Includes AI-powered prescription label scanning, AI document OCR for lab reports, insurance cards, and medical records (Gemini Vision), lab-result plausibility checks that catch transcription errors, smart vital reminders with custom schedules, offline medical-data cache for doctor visits, healthcare provider management, shareable health reports, and role-based access for up to three external caregivers.',
    family_basic:
      'Whole-family health tracking for up to five members, designed for families managing allergies, dietary restrictions, autism, ADHD, or other special needs. Includes per-member allergen and dietary tracking, special-needs care flags, allergen-aware recipe and meal planning with 650+ smart ingredient substitutions, ML illness-detection engine that monitors vitals and mood patterns to flag when family members may be getting sick, household duty assignment and tracking for meal prep and shopping, real-time shared shopping lists, unified family health dashboard, pet tracking with pet-specific illness detection, and role-based access for up to five external caregivers.',
    family_plus:
      'Advanced machine-learning analytics including predictive coaching trained per family member, restock and shopping prediction models, ML-personalized meal recommendations from collaborative filtering on the household\'s logged meal history (allergen and special-needs aware), health trend analysis with statistical confidence intervals, ROI tracking that quantifies health improvement against dietary and lifestyle effort, and access for up to ten family members and ten external caregivers.',
    family_premium:
      'Up to 20 family members per household across up to 10 households (built for sandwich-generation caregivers managing your home, your parents, your in-laws, and your adult kids) plus up to 50 external caregivers, white-glove onboarding, machine-learning insights at scale, custom health reports, full data export, API access for integrations, early access to new ML and AI features, and a dedicated account manager.',
  }
  return `${baseDescription} ${aiMlContext[planId] ?? ''}`.trim()
}

export default function PricingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const { subscription, plan: currentPlan, status: subscriptionStatus } = useSubscription()
  const isTrialing = subscriptionStatus === 'trialing'
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [loading, setLoading] = useState<string | null>(null)

  // Get feature intent from URL params
  const featureIntent = searchParams?.get('feature')
  const returnTo = searchParams?.get('returnTo') || '/profile'

  // Check for pending feature intent on mount and after upgrades
  useEffect(() => {
    const checkPendingIntent = async () => {
      if (!user?.uid || !subscription) return

      const { getPendingFeatureIntent, clearFeatureIntent, enableFeature, getFeatureMessages, canEnableFeature } = await import('@/lib/feature-enablement')
      const { useUserPreferences } = await import('@/hooks/useUserPreferences')

      const intent = await getPendingFeatureIntent(user.uid)
      if (!intent) return

      // Check if user can now enable the feature (after upgrade)
      const result = canEnableFeature(user as any, intent.feature)

      if (result.canEnable) {
        // Auto-enable the feature they wanted
        logger.info('[Pricing] Auto-enabling feature after upgrade:', { feature: intent.feature })

        try {
          // Get current user preferences
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('@/lib/firebase')

          const userDoc = await getDoc(doc(db, 'users', user.uid))
          const userData = userDoc.data()
          const currentFeatures = userData?.preferences?.onboardingAnswers?.featurePreferences || []
          const onboardingAnswers = userData?.preferences?.onboardingAnswers

          // Enable the feature
          const enableResult = await enableFeature(currentFeatures, intent.feature, onboardingAnswers)

          if (enableResult.success) {
            const messages = getFeatureMessages(intent.feature)
            toast.success(`${messages.title} has been enabled! Redirecting...`)

            // Clear intent after successful enablement
            await clearFeatureIntent(user.uid)

            setTimeout(() => {
              router.push(intent.returnUrl || '/profile')
            }, 1500)
          } else {
            toast.error('Feature upgrade succeeded, but auto-enable failed. Please enable manually.')
            await clearFeatureIntent(user.uid)
          }
        } catch (error) {
          logger.error('[Pricing] Failed to auto-enable feature', error as Error)
          toast.error('Please manually enable the feature from your profile.')
          await clearFeatureIntent(user.uid)
        }
      }
    }

    checkPendingIntent()
  }, [user, subscription, router])

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (!user) {
      router.push('/login?redirect=/pricing')
      return
    }

    // Only block when the user is actively subscribed to this plan.
    // Trial conversions and reactivations should fall through to
    // checkout — both are valid "select this plan" intents that
    // shouldn't be confused with "you're already on it."
    const relationship = getPlanRelationship(subscription, plan)
    if (relationship === 'currently_subscribed') {
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
      const csrfToken = getCSRFToken()
      const response = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({
          plan,
          billingInterval,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error responses
        throw new Error(data.error || 'Failed to process subscription change')
      }

      // Check if this was an immediate operation (upgrade/downgrade/switch)
      if (data.success && data.operationType) {
        // Show success message based on operation type
        alert(data.message || 'Subscription updated successfully!')

        // Refresh the page to show updated subscription
        router.refresh()
        router.push('/profile?tab=subscription&updated=true')
        return
      }

      // Otherwise, redirect to Stripe checkout for new subscriptions
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error('No checkout URL or operation result returned')
      }
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

  // Helper: Determine button text based on current plan and target plan
  const getButtonText = (
    targetPlan: SubscriptionPlan,
    relationship: PlanRelationship,
    isLoading: boolean,
  ) => {
    if (isLoading) return 'Loading...'

    // Branch on the user-to-plan relationship first — these are the
    // states where the answer doesn't depend on tier comparison.
    switch (relationship) {
      case 'currently_subscribed':
        return 'Current Plan'
      case 'previously_subscribed':
        // Picking up the exact plan they had before.
        return 'Reactivate'
      case 'currently_trialing':
        // Trial → paid conversion on the same plan.
        return 'Subscribe Now'
      case 'not_on_plan':
        // Fall through to the tier-comparison logic below.
        break
      default: {
        // Exhaustiveness check — if PlanRelationship grows, the
        // compiler points at this default.
        const _exhaustive: never = relationship
        return _exhaustive
      }
    }

    if (!user) return 'Get Started'

    // Trialing users haven't paid yet — every other plan is a new subscription
    if (isTrialing) return 'Subscribe Now'

    // Note: terminated users (expired/canceled) fall through to the
    // tier-comparison logic below. Their `currentPlan` is the plan
    // they USED to have, so "Upgrade to X" / "Downgrade to X" reads
    // correctly relative to that — and is more accurate than a flat
    // "Resubscribe", which doesn't tell them whether they're moving
    // up, down, or sideways from where they were.

    // Plan tier hierarchy: free < single < single_plus < family_basic < family_plus < family_premium
    const planTiers: Record<SubscriptionPlan, number> = {
      free: 0,
      single: 1,
      single_plus: 2,
      family_basic: 3,
      family_plus: 4,
      family_premium: 5,
    }

    const currentTier = planTiers[currentPlan as SubscriptionPlan] ?? 0
    const targetTier = planTiers[targetPlan]

    // Users without a subscription (free state) can start a trial
    if (!currentPlan || currentPlan === 'free') {
      return 'Start Free Trial'
    }

    // Use the full plan name from the data so buttons disambiguate
    // between "Single User Plus" and "Family Plus" (both used to read
    // as "Upgrade to Plus" — friction). PLANS is module-level so the
    // lookup is cheap.
    const targetPlanName = PLANS.find((p) => p.id === targetPlan)?.name ?? targetPlan

    if (targetTier > currentTier) {
      // Upgrading to a higher tier
      return `Upgrade to ${targetPlanName}`
    } else if (targetTier < currentTier) {
      // Picking a lower tier than the current/previous plan. For
      // active users this is a real downgrade; for terminated users
      // it's just a different choice. "Switch to" works for both
      // without falsely framing a fresh signup as a downgrade.
      return `Switch to ${targetPlanName}`
    }

    return `Select ${targetPlanName}`
  }

  // Helper: Get dynamic headline based on user state
  const getHeadline = () => {
    if (!user) {
      return {
        title: 'Choose Your Plan',
        subtitle: 'Start your wellness journey with a 7-day free trial. No credit card required.'
      }
    }

    // Users without a subscription see trial messaging
    if (!currentPlan || currentPlan === 'free') {
      return {
        title: 'Choose Your Plan',
        subtitle: 'Start your wellness journey with a 7-day free trial of any paid plan. No credit card required.'
      }
    }

    const planNames: Record<string, string> = {
      single: 'Single User',
      single_plus: 'Single User Plus',
      family_basic: 'Family Basic',
      family_plus: 'Family Plus',
      family_premium: 'Family Premium',
    }

    // Trial users: different headline so they know they need to subscribe to keep access
    if (isTrialing) {
      const trialEnd = subscription?.trialEndsAt
        ? new Date(subscription.trialEndsAt).toLocaleDateString()
        : 'soon'
      return {
        title: 'Activate Your Subscription',
        subtitle: `Your free trial of the ${planNames[currentPlan as string] || currentPlan} plan ends ${trialEnd}. Subscribe now to keep access to all your features.`
      }
    }

    return {
      title: 'Manage Your Subscription',
      subtitle: `You're on the ${planNames[currentPlan as string] || currentPlan} plan. Upgrade for more features or switch plans anytime.`
    }
  }

  const headline = getHeadline()

  // JSON-LD structured data for Quad-sync (AIO/AEO/NLP/SEO).
  // Each plan is a Product with an Offer at the chosen billing
  // interval. The descriptions in metadata are richer than the
  // visible card descriptions — they include the AI/ML technology
  // keywords (Gemini Vision, machine learning) for search-engine
  // and LLM consumption. Visible UI stays clean for humans.
  const productSchema = {
    '@context': 'https://schema.org',
    '@graph': PLANS.map((plan) => {
      const price = billingInterval === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
      const includedFeatures = plan.features.filter((f) => f.included).map((f) => f.name)
      return {
        '@type': 'Product',
        name: `Wellness Projection Lab — ${plan.name}`,
        description: schemaDescriptionFor(plan.id, plan.description),
        category: 'Health & Wellness Software',
        brand: { '@type': 'Brand', name: 'Wellness Projection Lab' },
        offers: {
          '@type': 'Offer',
          price: price.toString(),
          priceCurrency: 'USD',
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: price.toString(),
            priceCurrency: 'USD',
            unitCode: billingInterval === 'monthly' ? 'MON' : 'ANN',
            referenceQuantity: {
              '@type': 'QuantitativeValue',
              value: 1,
              unitCode: billingInterval === 'monthly' ? 'MON' : 'ANN',
            },
          },
          availability: 'https://schema.org/InStock',
        },
        additionalProperty: includedFeatures.map((featureName) => ({
          '@type': 'PropertyValue',
          name: 'Feature',
          value: featureName,
        })),
      }
    }),
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      {/* Quad-sync structured data — invisible to humans, parsed by
          search engines + answer engines (AEO/AIO) for citations and
          rich-result eligibility. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">
            {headline.title}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {headline.subtitle}
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

            // The user's relationship to THIS specific plan. One typed
            // answer that drives the badge, the gate, the button text,
            // and the click handler — see getPlanRelationship in
            // lib/subscription-utils.ts.
            const relationship = getPlanRelationship(subscription, planData.id)
            const isCurrentPlan = relationship === 'currently_subscribed'
            const isTrialPlan = relationship === 'currently_trialing'

            return (
              <div
                key={planData.id}
                className={`relative rounded-lg border-2 flex flex-col p-4 sm:p-6 ${
                  planData.popular
                    ? 'border-primary shadow-lg'
                    : 'border-border hover:border-primary/50'
                } ${isCurrentPlan ? 'bg-primary/5' : isTrialPlan ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-card'}`}
              >
                {/* Card badge — one chip floated on the top edge of
                    the card (half-inside, half-outside), same visual
                    treatment for every state. Priority resolves to a
                    single label per card:
                      Current Plan (paid) > Free Trial (trialing) >
                      Most Popular (marketing-only)
                    so a user trialing the popular plan sees "Free
                    Trial" instead of "Most Popular", and a user
                    paying for the popular plan sees "Current Plan".
                    The user-specific badge always wins. */}
                {(() => {
                  const badge = isCurrentPlan
                    ? { label: 'Current Plan', className: 'bg-green-100 text-green-800' }
                    : isTrialPlan
                      ? { label: 'Free Trial', className: 'bg-yellow-100 text-yellow-800' }
                      : planData.popular
                        ? { label: 'Most Popular', className: 'bg-primary text-white' }
                        : null
                  if (!badge) return null
                  return (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  )
                })()}

                {/* Plan Header — description has min-height so every
                    card's price block starts at the same vertical
                    position regardless of how long the description
                    text is. Without this, Family Basic's 6-line copy
                    would push its features further down than Single
                    User's 3-line copy, breaking row alignment. */}
                <div className="mb-4">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    {planData.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-6 min-h-[8rem]">
                    {planData.description}
                  </p>
                </div>

                {/* Pricing — min-h reserves the savings line's space
                    so the features list below starts at the same y-
                    coordinate whether the user is on monthly (no
                    savings line) or yearly (savings line shown). */}
                <div className="mb-6 min-h-[4rem]">
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

                {/* CTA Button — fixed height (h-12) + whitespace-nowrap
                    + overflow-ellipsis so every card's button is
                    visually identical regardless of label length
                    ("Current Plan" vs "Switch to Single User Plus").
                    Long labels truncate with an ellipsis instead of
                    wrapping to two lines and breaking row alignment. */}
                <button
                  onClick={() => handleSelectPlan(planData.id)}
                  disabled={loading === planData.id || isCurrentPlan}
                  className={`w-full h-12 px-4 rounded-lg font-medium transition-colors whitespace-nowrap overflow-hidden text-ellipsis ${
                    isCurrentPlan
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : planData.popular
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  } disabled:opacity-50`}
                >
                  {getButtonText(planData.id, relationship, loading === planData.id)}
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
                How does the 7-day trial work?
              </summary>
              <p className="mt-2 text-muted-foreground text-sm">
                When you upgrade from the free plan to any paid plan, you get full access to all features for 7 days with no payment required. After your trial ends, you'll be prompted to add payment to continue. The free plan itself has no trial period - it's free forever with basic features.
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
                After your 7-day trial of a paid plan ends, you'll need to add payment to continue with that plan's features. If you don't add payment, you'll automatically return to the free plan. We'll send you reminders before your trial ends so you're never surprised.
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
