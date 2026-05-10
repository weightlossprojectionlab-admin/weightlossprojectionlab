/**
 * Subscription plan catalog — single source of truth for the
 * marketing-facing feature lists, prices, and descriptions.
 *
 * Why a shared lib: previously this data lived inline in
 * app/pricing/page.tsx, which meant the /profile plan-detail modal
 * (and any future surface that wants to show what a plan includes)
 * would have to either re-author the same content or import from a
 * 'use client' component (awkward + circular). Centralizing here
 * means: edit once, every surface stays in sync.
 *
 * Editing policy: feature lists are aligned with actual code gates
 * in lib/feature-gates.ts (PLAN_FEATURES + BASIC_FEATURES) and the
 * limit numbers in lib/subscription-utils.ts (getPlanLimits). Don't
 * add a feature line that doesn't have a wired UI consumer — see
 * memory:project_pricing_deferred_features.md for the verification
 * protocol.
 *
 * Terminology: the platform is built on Machine Learning (cadence
 * prediction, recipe + eater recommendation, allergen classification,
 * trend analysis) with AI used narrowly for vision/LLM tasks
 * (Gemini-based meal photo recognition, receipt + medication OCR).
 * Visible feature names use plain product language; the AI/ML
 * technology keywords live in the JSON-LD metadata in
 * app/pricing/page.tsx (Quad-sync: AIO/AEO/NLP/SEO without polluting
 * the human-facing UI).
 */

import type { SubscriptionPlan } from '@/types'

export interface PlanFeature {
  name: string
  included: boolean
}

export interface Plan {
  id: SubscriptionPlan
  name: string
  description: string
  monthlyPrice: number
  yearlyPrice: number
  popular?: boolean
  features: PlanFeature[]
}

export const PLANS: Plan[] = [
  {
    id: 'single',
    name: 'Single User',
    description:
      'Personal wellness tracking with a 456,000-product catalog, in-store shopping mode, native health-app sync, smart recipes, and a coach that learns from your daily logs.',
    monthlyPrice: 9.99,
    yearlyPrice: 99,
    features: [
      // 1. Audience anchor
      { name: '1 user account', included: true },
      // 2. Headline differentiator
      { name: 'Coaching that learns from your daily logs', included: true },
      // 3. Shopping stack — moat against generic food-loggers
      { name: 'Barcode scan against 456,000+ products', included: true },
      { name: 'In-store shopping mode (live cart + lists)', included: true },
      { name: 'Receipt scanning at checkout', included: true },
      { name: 'Offline shopping — full catalog cached for dead zones', included: true },
      // 4. Recipe + cooking stack
      { name: 'Curated recipe library with meal gallery', included: true },
      { name: 'Recipe scaling, ingredient substitutions, cooking timers', included: true },
      { name: 'Meal photo recognition', included: true },
      // 5. Tracking
      { name: 'Weight & step tracking', included: true },
      { name: 'Progress dashboard', included: true },
      // 6. Excluded — point at next-tier upgrade reasons
      { name: 'Medical records & vitals', included: false },
      { name: 'External caregivers', included: false },
      { name: 'Family members', included: false },
    ],
  },
  {
    id: 'single_plus',
    name: 'Single User Plus',
    description:
      'For people managing chronic conditions, medications, or working with a caregiver. Adds medical records, prescription scanning, lab-report parsing, vital reminders, and caregiver access.',
    monthlyPrice: 14.99,
    yearlyPrice: 149,
    features: [
      // 1. Audience anchor + tier carryover
      { name: '1 user account', included: true },
      { name: 'Everything in Single User', included: true },
      // 2. Headline upgrade reasons (clinical features)
      { name: 'Medical records & history', included: true },
      { name: 'Medications & appointments', included: true },
      { name: 'Vitals monitoring with smart reminders', included: true },
      // 3. Document scanning suite — major value-add for chronic-care users
      { name: 'Prescription label scanning', included: true },
      { name: 'Lab report & medical document parsing', included: true },
      { name: 'Lab plausibility checks (catches transcription errors)', included: true },
      // 4. Supporting clinical
      { name: 'Healthcare provider management', included: true },
      { name: 'Shareable health reports for doctors', included: true },
      // 5. Offline access
      { name: 'Offline medical cache (meds, vitals, docs)', included: true },
      // 6. Caregiver access (the second upgrade reason)
      { name: 'Up to 3 external caregivers', included: true },
      // 7. Excluded — points at next-tier reason
      { name: 'Family members', included: false },
      { name: 'Advanced ML insights', included: false },
    ],
  },
  {
    id: 'family_basic',
    name: 'Family Basic',
    description:
      'Care for the whole family — including members with allergies, dietary restrictions, or special needs. Up to 5 members with real-time shared shopping, ML illness detection, household duty tracking, allergen-aware recipes, and pet health tracking.',
    monthlyPrice: 19.99,
    yearlyPrice: 199,
    features: [
      // 1. Audience anchor — unit count IS the headline here
      { name: 'Up to 5 family members', included: true },
      { name: 'Everything in Single User Plus', included: true },
      // 2. The collaborative upgrade reasons
      { name: 'Real-time shared shopping lists', included: true },
      { name: 'Family meal planning', included: true },
      { name: 'Family health dashboard', included: true },
      // 3. Special-needs / allergen-aware care
      { name: 'Per-member allergies & dietary restrictions', included: true },
      { name: 'Special-needs care flags & alerts', included: true },
      { name: 'Allergen-aware recipes & meal planning', included: true },
      // 4. ML illness detection — major family-care differentiator
      { name: 'ML illness detection (vitals + mood patterns)', included: true },
      // 5. Household coordination
      { name: 'Household duty assignment & tracking', included: true },
      { name: 'Pet tracking & health reports', included: true },
      // 6. Caregiver access — bigger pool, role-based
      { name: 'Role-based caregiver access', included: true },
      { name: 'Up to 5 external caregivers', included: true },
      // 7. Excluded — points at Family Plus's ML differentiation
      { name: 'Advanced ML insights', included: false },
    ],
  },
  {
    id: 'family_plus',
    name: 'Family Plus',
    description:
      'For families who want coaching that gets smarter over time. Up to 10 members with per-person insights, statistical health trends, and ROI tracking on your wellness investment.',
    monthlyPrice: 29.99,
    yearlyPrice: 299,
    popular: true,
    features: [
      // 1. Audience anchor + tier carryover
      { name: 'Up to 10 family members', included: true },
      { name: 'Everything in Family Basic', included: true },
      // 2. THE upgrade reason — per-member personalization
      { name: 'Coaching personalized for each family member', included: true },
      { name: 'Meal recommendations that learn your family', included: true },
      // 3. Statistical / quantified ML insights
      { name: 'Health trends with statistical confidence intervals', included: true },
      { name: 'ROI tracking — health improvement vs. effort', included: true },
      { name: 'Advanced analytics & insights', included: true },
      { name: 'Restock prediction & smart shopping', included: true },
      // 4. Caregiver pool + support upgrade
      { name: 'Up to 10 external caregivers', included: true },
      { name: 'Priority support', included: true },
    ],
  },
  {
    id: 'family_premium',
    name: 'Family Premium',
    description:
      'For sandwich-generation households juggling multiple homes — your home, your parents, your in-laws, your grown kids. Up to 20 members per household across up to 10 households, with concierge support and full data access.',
    monthlyPrice: 39.99,
    yearlyPrice: 399,
    features: [
      // 1. Audience anchor — bounded numbers are more honest than
      // "unlimited" and prevent abuse/scraping vectors. The
      // doubling pattern (5/3 → 10/5 → 20/10) tells the customer
      // exactly what they're buying.
      { name: 'Up to 20 family members per household', included: true },
      { name: 'Up to 10 households', included: true },
      { name: 'Up to 50 external caregivers', included: true },
      { name: 'Everything in Family Plus', included: true },
      // 2. Concierge-tier differentiators (service)
      { name: 'White-glove onboarding', included: true },
      { name: 'Dedicated account manager', included: true },
      // 3. Power-user differentiators (data)
      { name: 'Custom health reports', included: true },
      { name: 'Data export & API access', included: true },
      // 4. The flex
      { name: 'Early access to new features', included: true },
    ],
  },
]

/**
 * Lookup helper. Returns the plan record for a given SubscriptionPlan
 * id, or null when the id is 'free' (no marketing plan exists for it).
 *
 * Use this anywhere a feature surface needs the plan's display data
 * (e.g., the /profile plan-detail modal). Don't grep PLANS by hand —
 * surfaces should depend on this helper so future schema changes are
 * one-edit.
 */
export function getPlanById(id: SubscriptionPlan): Plan | null {
  return PLANS.find((p) => p.id === id) ?? null
}
