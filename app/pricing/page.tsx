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
import Link from 'next/link'
import { PLANS, getFlattenedFeatureNames, getPlanById } from '@/lib/plan-details'
import { PlanCard } from '@/components/subscription/PlanCard'
import { PLAN_CAPS, PLAN_FEATURES } from '@/lib/feature-gates'
import { faqPageSchema } from '@/lib/json-ld'
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
      'Includes AI-powered meal photo recognition built on Gemini Vision, in-store shopping mode with live cart and shared lists, barcode scanning against a 456,000+ product national-retailer catalog (offline-cached for dead zones), AI receipt scanning at checkout, curated recipe library with smart scaling and 650+ ingredient substitutions, cooking timers with audio chimes, and machine-learning coaching that personalizes guidance from each user\'s logging history.',
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

// Everything quantitative in the FAQ is DERIVED from the platform's source
// of truth — prices from PLANS, caps from PLAN_CAPS, the medication gate from
// PLAN_FEATURES — so the answers (and the AI snippets that cite them) can
// never drift from what the code actually enforces.
const PRICE_LOW = Math.min(...PLANS.map((p) => p.monthlyPrice)).toFixed(2)
const PRICE_HIGH = Math.max(...PLANS.map((p) => p.monthlyPrice)).toFixed(2)
const SINGLE_PLUS_PRICE = (getPlanById('single_plus')?.monthlyPrice ?? 14.99).toFixed(2)

// Family Premium capacity — straight from the enforced caps.
const PREMIUM_CAPS = PLAN_CAPS['family_premium']

// Which plans gate medication/appointment tracking (ordered low → high).
const MED_PLANS = PLAN_FEATURES['medications'] ?? []
const MED_START_NAME = getPlanById(MED_PLANS[0])?.name ?? 'Single User Plus'
const MED_ABOVE_NAMES = MED_PLANS.slice(1)
  .map((id) => getPlanById(id)?.name)
  .filter((n): n is string => !!n)
const andList = (items: string[]) =>
  items.length <= 1
    ? items[0] ?? ''
    : `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`

// FAQ as data — drives BOTH the visible accordion and the FAQPage schema
// (they can't drift). Leads with informational/quantitative intents that AI
// Overviews answer with direct snippets, then the transactional questions.
const PRICING_FAQ = [
  {
    question: 'How much does Wellness Projection Lab cost?',
    answer: `Paid plans range from $${PRICE_LOW} to $${PRICE_HIGH} per month (Single User up to Family Premium), billed monthly or annually. A free plan with basic features is also available.`,
  },
  {
    question: 'Is there a free version of Wellness Projection Lab?',
    answer:
      'Yes. The free plan is free forever with basic features — no trial period and no credit card required. Paid plans include a 7-day free trial.',
  },
  {
    question: 'How many users are included in the Family Premium plan?',
    answer: `Up to ${PREMIUM_CAPS.maxMembersPerHousehold} family members per household, across up to ${PREMIUM_CAPS.maxHouseholds} households, plus up to ${PREMIUM_CAPS.maxCaregivers} external caregivers.`,
  },
  {
    question: 'Which plan includes medication tracking?',
    answer: `Medication and appointment tracking starts on the ${MED_START_NAME} plan ($${SINGLE_PLUS_PRICE}/month) and is included in every plan above it — ${andList(MED_ABOVE_NAMES)}.`,
  },
  {
    question: 'How does the 7-day trial work?',
    answer:
      "When you upgrade from the free plan to any paid plan, you get full access to all features for 7 days with no payment required. After your trial ends, you'll be prompted to add payment to continue. The free plan itself has no trial period — it's free forever with basic features.",
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      "Yes. You can cancel your subscription at any time from your account settings. You'll retain access until the end of your billing period.",
  },
  {
    question: 'What happens after my trial ends?',
    answer:
      "After your 7-day trial of a paid plan ends, you'll need to add payment to continue with that plan's features. If you don't add payment, you'll automatically return to the free plan. We'll send you reminders before your trial ends so you're never surprised.",
  },
  {
    question: 'Can I upgrade or downgrade my plan?',
    answer:
      'Yes. You can change your plan at any time. Upgrades take effect immediately, while downgrades take effect at the end of your billing cycle.',
  },
]

// High-value feature → dedicated feature page. Establishes an internal
// semantic link from each pricing bullet back to its authoritative entity
// page (helps NLP map the feature to a definition). Only maps features that
// have a real page; everything else renders as plain text.
const FEATURE_LINKS: Record<string, string> = {
  'Meal photo recognition': '/blog/meal-tracking',
  'Weight & step tracking': '/blog/weight-tracking',
  'Progress dashboard': '/blog/dashboard',
  'Medical records & history': '/blog/medical-documents',
  'Medications & appointments': '/blog/medications',
  'Vitals monitoring with smart reminders': '/blog/vitals-tracking',
  'Healthcare provider management': '/blog/providers',
  'Family health dashboard': '/blog/dashboard',
  'Real-time shared shopping lists': '/blog/smart-shopping',
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
      return 'Start Trial'
    }

    // Short, uniform labels — the plan NAME is already in the card's
    // h3 above, so the button doesn't need to repeat it. Previous
    // labels ("Upgrade to Family Premium", "Switch to Single User
    // Plus") were too long for the narrow xl-breakpoint cards and
    // truncated to ugly ellipses ("Switch to Singl…"). Action-only
    // labels stay short and fit in every layout.
    if (targetTier > currentTier) return 'Upgrade'
    if (targetTier < currentTier) return 'Switch'
    return 'Select'
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
  // Toggle-independent so crawlers see BOTH billing cycles regardless of
  // UI state. Each plan emits a monthly AND a yearly Offer, and the feature
  // list is FLATTENED (inheritance resolved) so an AI extraction model sees
  // every concrete feature each tier includes — not "Everything in X".
  const billingOffer = (price: number, unit: 'MON' | 'ANN') => ({
    '@type': 'Offer',
    price: price.toString(),
    priceCurrency: 'USD',
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: price.toString(),
      priceCurrency: 'USD',
      unitCode: unit,
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: unit },
    },
    availability: 'https://schema.org/InStock',
    url: 'https://www.wellnessprojectionlab.com/pricing',
  })

  const productSchema = {
    '@context': 'https://schema.org',
    '@graph': PLANS.map((plan) => ({
      '@type': 'Product',
      name: `Wellness Projection Lab — ${plan.name}`,
      description: schemaDescriptionFor(plan.id, plan.description),
      category: 'Health & Wellness Software',
      brand: { '@type': 'Brand', name: 'Wellness Projection Lab' },
      offers: [
        billingOffer(plan.monthlyPrice, 'MON'),
        billingOffer(plan.yearlyPrice, 'ANN'),
      ],
      // Flattened — resolves "Everything in {parentPlan}" so each tier lists
      // its full concrete feature set for NLP/AEO extraction.
      additionalProperty: getFlattenedFeatureNames(plan.id).map((featureName) => ({
        '@type': 'PropertyValue',
        name: 'Feature',
        value: featureName,
      })),
    })),
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
      {/* FAQPage schema — lets Google + AI Overviews pull trial, pricing,
          and capacity answers as direct snippets. Mirrors the visible FAQ. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageSchema(PRICING_FAQ)) }}
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
              <PlanCard
                key={planData.id}
                highlighted={planData.popular}
                tintClassName={isCurrentPlan ? 'bg-primary/5' : isTrialPlan ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'bg-card'}
                className={!planData.popular ? 'hover:border-primary/50' : ''}
                badge={
                  // Priority per card: Current Plan (paid) > Free Trial
                  // (trialing) > Most Popular (marketing). The user-specific
                  // badge always wins over the marketing one.
                  isCurrentPlan
                    ? { label: 'Current Plan', className: 'bg-green-100 text-green-800' }
                    : isTrialPlan
                      ? { label: 'Free Trial', className: 'bg-yellow-100 text-yellow-800' }
                      : planData.popular
                        ? { label: 'Most Popular', className: 'bg-primary text-white' }
                        : null
                }
                header={
                  <>
                    {/* Description has min-height so every card's price block
                        starts at the same vertical position regardless of how
                        long the copy is — preserves row alignment. */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-foreground mb-2">
                        {planData.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-6 min-h-[8rem]">
                        {planData.description}
                      </p>
                    </div>

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
                  </>
                }
                features={
                  <ul className="space-y-3 mb-6">
                    {planData.features
                      .filter((feature) => feature.included)
                      .map((feature, index) => {
                        const href = FEATURE_LINKS[feature.name]
                        return (
                          <li key={index} className="flex items-start gap-2">
                            <CheckIcon className="h-5 w-5 flex-shrink-0 mt-0.5 text-green-600" />
                            <span className="text-sm text-foreground">
                              {href ? (
                                <Link
                                  href={href}
                                  className="underline decoration-dotted underline-offset-2 hover:text-primary"
                                >
                                  {feature.name}
                                </Link>
                              ) : (
                                feature.name
                              )}
                            </span>
                          </li>
                        )
                      })}
                  </ul>
                }
                cta={
                  // Fixed height + nowrap + ellipsis so every card's button is
                  // visually identical regardless of label length.
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
                }
              />
            )
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {PRICING_FAQ.map((item) => (
              <details key={item.question} className="bg-card rounded-lg p-4 border border-border">
                <summary className="font-medium text-foreground cursor-pointer">
                  {item.question}
                </summary>
                <p className="mt-2 text-muted-foreground text-sm">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
