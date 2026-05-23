/**
 * Feature Gating System with Admin Override & Dev Simulation
 *
 * Manages subscription-based access control for features and patient limits.
 * Supports admin bypass and development mode simulation for testing.
 */

import { User, UserSubscription, SubscriptionPlan, HOUSEHOLD_LIMITS, HOUSEHOLD_DUTY_LIMITS } from '@/types'
import { isSuperAdmin } from '@/lib/admin/permissions'

// Admin users with full access to all features (deprecated - use isSuperAdmin from permissions.ts)
export const ADMIN_EMAILS = ['weightlossprojectionlab@gmail.com', 'admin:weightlossprojectionlab@gmail.com']

// Full access subscription for admins
export const FULL_ACCESS_SUBSCRIPTION: UserSubscription = {
  plan: 'family_premium',
  billingInterval: 'yearly',
  addons: { familyFeatures: true },
  status: 'active',
  maxSeats: 999,
  currentSeats: 0,
  maxExternalCaregivers: 999,
  currentExternalCaregivers: 0,
  maxPatients: 999,
  maxHouseholds: 999,
  currentHouseholds: 0,
  maxDutiesPerHousehold: 999,
  currentPeriodStart: new Date(),
  currentPeriodEnd: null  // No expiration
}

// Features gated by base plan (require specific plan tier)
export const PLAN_FEATURES: Record<string, SubscriptionPlan[]> = {
  // Family & Patient Management
  'multiple-patients': ['family_basic', 'family_plus', 'family_premium'],
  'patient-management': ['family_basic', 'family_plus', 'family_premium'],
  'family-directory': ['family_basic', 'family_plus', 'family_premium'],
  'household-management': ['family_basic', 'family_plus', 'family_premium'],
  'pet-tracking': ['family_basic', 'family_plus', 'family_premium'],

  // Medical Features - Single Plus and all Family plans
  'appointments': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'medications': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'vitals-tracking': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'providers': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'medical-records': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'health-reports': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'pet-health-reports': ['family_basic', 'family_plus', 'family_premium'],

  // Advanced Analytics (Family Plus & Premium only)
  'advanced-analytics': ['family_plus', 'family_premium'],
  'health-insights': ['family_plus', 'family_premium'],
  'trend-analysis': ['family_plus', 'family_premium'],
  'predictive-ai': ['family_plus', 'family_premium'],

  // Premium Features
  'priority-support': ['family_plus', 'family_premium'],
  'white-glove-service': ['family_premium'],
  'early-access': ['family_premium'],
  'custom-reports': ['family_premium'],
  'data-export': ['family_premium'],
  'api-access': ['family_premium'],
  'dedicated-account-manager': ['family_premium'],
  'enhanced-meal-suggestions': ['family_plus', 'family_premium'],

  // Caregiver Features
  'external-caregivers': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'caregiver-invites': ['single_plus', 'family_basic', 'family_plus', 'family_premium'],
  'role-management': ['family_basic', 'family_plus', 'family_premium'],

  // Shopping & Meal Planning
  'shared-shopping': ['family_basic', 'family_plus', 'family_premium'],
  'family-meal-planning': ['family_basic', 'family_plus', 'family_premium'],

  // Family Dashboard & Enhanced AI (NEW)
  'family-health-dashboard': ['family_basic', 'family_plus', 'family_premium'],
  'enhanced-ai-coaching': ['family_plus', 'family_premium'],
}

// Features gated by add-on (legacy - now mostly included in tiers)
export const ADDON_FEATURES: Record<string, keyof NonNullable<UserSubscription['addons']>> = {
  'legacy-family-features': 'familyFeatures',
}

// Basic features available to all paid/trial plans (including free tier)
export const BASIC_FEATURES = [
  // Core Tracking
  'meal-logging',
  'weight-tracking',
  'step-tracking',
  'photo-logging',

  // Basic Content
  'basic-recipes',
  'recipe-search',
  'meal-gallery',

  // Basic AI
  'basic-ai-coaching',
  'meal-recognition',

  // Inventory
  'inventory-management',
  'barcode-scanning',
  'pantry-tracking',

  // Progress
  'weight-history',
  'progress-charts',
  'basic-dashboard',

  // Profile
  'profile-settings',
  'preferences',
  'notifications',
]

/**
 * Get simulated subscription from localStorage (dev mode only)
 */
function getSimulatedSubscription(): UserSubscription | null {
  if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
    return null
  }

  try {
    const stored = localStorage.getItem('dev_subscription')
    if (!stored) return null

    const parsed = JSON.parse(stored)
    // Convert date strings back to Date objects
    return {
      ...parsed,
      currentPeriodStart: new Date(parsed.currentPeriodStart),
      currentPeriodEnd: parsed.currentPeriodEnd ? new Date(parsed.currentPeriodEnd) : null,
      trialEndsAt: parsed.trialEndsAt ? new Date(parsed.trialEndsAt) : undefined
    }
  } catch (error) {
    console.error('[FeatureGates] Error parsing simulated subscription', error)
    return null
  }
}

/**
 * Set simulated subscription in localStorage (dev mode only)
 */
export function setSimulatedSubscription(subscription: UserSubscription | null): void {
  if (typeof window === 'undefined') {
    console.warn('[FeatureGates] Cannot set simulated subscription: window is undefined')
    return
  }

  if (process.env.NODE_ENV !== 'development') {
    console.warn('[FeatureGates] Cannot set simulated subscription: not in development mode')
    return
  }

  if (subscription === null) {
    console.log('[FeatureGates] Removing simulated subscription')
    localStorage.removeItem('dev_subscription')
  } else {
    console.log('[FeatureGates] Setting simulated subscription:', subscription)
    localStorage.setItem('dev_subscription', JSON.stringify(subscription))
  }

  // Trigger storage event for other tabs/components
  console.log('[FeatureGates] Dispatching subscription-simulation-changed event')
  window.dispatchEvent(new Event('subscription-simulation-changed'))
}

/**
 * Get user's effective subscription (with admin override and dev simulation).
 *
 * Admin bypass semantics:
 *   - Default (no options): admin gets FULL_ACCESS_SUBSCRIPTION. Right for
 *     feature-gate queries (`canAccessFeature`, `hasAddon`, etc.) — admins
 *     should reach every gated feature regardless of what plan their account
 *     is actually paying for.
 *   - `skipAdminBypass: true`: returns the admin's REAL subscription (or
 *     dev simulation / cache / user object). Right for display surfaces that
 *     answer "what plan am I on?" / "what's my cap?" — those need to match
 *     what the user actually pays for, not the synthetic family_premium-
 *     equivalent admin slot. Without this option, the cap display reads 200
 *     for every admin regardless of their real plan, which contradicts the
 *     plan badge (which reads from the real subscription elsewhere).
 *
 * Dev simulation is honored either way — it's the dev-mode mechanism for
 * inspecting other plans without changing your account.
 */
export function getUserSubscription(
  user: User | null,
  options?: { skipAdminBypass?: boolean }
): UserSubscription | null {
  if (!user) return null

  // 1. Admin bypass — full access for feature-gate callers. Display
  //    surfaces opt out via `skipAdminBypass: true` so the displayed
  //    plan/cap matches the user's real subscription.
  if (!options?.skipAdminBypass && isSuperAdmin(user.email)) {
    return FULL_ACCESS_SUBSCRIPTION
  }

  // 2. Dev mode - check for simulated subscription
  if (process.env.NODE_ENV === 'development') {
    const simulated = getSimulatedSubscription()
    if (simulated) return simulated
  }

  // 3. Check cached subscription (populated by useSubscription hook)
  if (_cachedSubscription) return _cachedSubscription

  // 4. Fallback - check if subscription was attached to user object
  return (user as any).subscription || null
}

// Subscription cache for client-side use (populated by useSubscription hook)
let _cachedSubscription: UserSubscription | null = null
// True when the cached subscription belongs to the household OWNER
// (mirrored down for a caregiver / family member), false when it's
// the caller's own subscription. Lets the write-lock UX branch:
// owners get a Reactivate redirect; family members get an
// informational toast and stay where they are because only the
// owner can take the reactivation action.
let _cachedSubscriptionIsMirrored: boolean = false

export function setCachedSubscription(
  sub: UserSubscription | null,
  options?: { isMirrored?: boolean },
) {
  _cachedSubscription = sub
  _cachedSubscriptionIsMirrored = options?.isMirrored === true
}

export function getCachedSubscription(): UserSubscription | null {
  return _cachedSubscription
}

export function isCachedSubscriptionMirrored(): boolean {
  return _cachedSubscriptionIsMirrored
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(user: User | null, feature: string): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  // Grandfathered users get full access to their plan's features forever
  if (subscription.isGrandfathered) {
    // Check basic features (available to all plans)
    if (BASIC_FEATURES.includes(feature)) {
      return true
    }

    // Check plan-gated features based on their grandfathered plan
    if (PLAN_FEATURES[feature]) {
      return PLAN_FEATURES[feature].includes(subscription.plan)
    }

    // Check addon-gated features
    if (ADDON_FEATURES[feature]) {
      const requiredAddon = ADDON_FEATURES[feature]
      return subscription.addons?.[requiredAddon] === true
    }

    // Feature not recognized but grandfathered - allow basic access
    return BASIC_FEATURES.includes(feature)
  }

  // Non-grandfathered users: Check subscription status
  // Trust server-side status updates from webhooks/cron - no client-side date checking
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return false
  }

  // Check basic features (available to all active/trialing plans)
  if (BASIC_FEATURES.includes(feature)) {
    return subscription.status === 'active' || subscription.status === 'trialing'
  }

  // Check plan-gated features (must have active/trialing subscription)
  if (PLAN_FEATURES[feature]) {
    const hasRequiredPlan = PLAN_FEATURES[feature].includes(subscription.plan)
    const hasActiveSubscription = subscription.status === 'active' || subscription.status === 'trialing'
    return hasRequiredPlan && hasActiveSubscription
  }

  // Check addon-gated features (must have active/trialing subscription)
  if (ADDON_FEATURES[feature]) {
    const requiredAddon = ADDON_FEATURES[feature]
    const hasAddon = subscription.addons?.[requiredAddon] === true
    const hasActiveSubscription = subscription.status === 'active' || subscription.status === 'trialing'
    return hasAddon && hasActiveSubscription
  }

  // Feature not recognized - default to denied
  return false
}

/**
 * ============================================================
 * PLAN_CAPS — canonical plan-cap lookup (single source of truth)
 * ============================================================
 *
 * Each plan declares the per-household and per-account structural
 * limits. Total patient count is the product where applicable:
 *
 *   total patients ≤ maxMembersPerHousehold × maxHouseholds
 *
 * The structure mirrors the data model we shipped in the
 * 2026-05-11 household restructure: households are the residential
 * primitive; patients live in households. A flat "max seats"
 * collapses that structure dishonestly.
 *
 * Marketing copy in `lib/plan-details.ts` IS this table.
 * `subscription.maxPatients`/`maxSeats` fields stored on user docs
 * are informational (records what the user signed up with); the
 * runtime check reads from THIS map so cap tightening (e.g.,
 * Premium 999 → 200) takes effect immediately for all users,
 * including stale subscriptions written before the change.
 */
export interface PlanCaps {
  /** Max patients living in one household. */
  maxMembersPerHousehold: number
  /** Max households the caregiver can manage on the account. */
  maxHouseholds: number
  /** Max external caregivers (people invited to help, not patients). */
  maxCaregivers: number
}

export const PLAN_CAPS: Record<string, PlanCaps> = {
  free: { maxMembersPerHousehold: 1, maxHouseholds: 1, maxCaregivers: 0 },
  single: { maxMembersPerHousehold: 1, maxHouseholds: 1, maxCaregivers: 0 },
  single_plus: { maxMembersPerHousehold: 1, maxHouseholds: 1, maxCaregivers: 3 },
  family_basic: { maxMembersPerHousehold: 5, maxHouseholds: 1, maxCaregivers: 5 },
  family_plus: { maxMembersPerHousehold: 10, maxHouseholds: 1, maxCaregivers: 10 },
  family_premium: { maxMembersPerHousehold: 20, maxHouseholds: 10, maxCaregivers: 50 },
}

/** Total patient cap for a plan = members/household × households. */
export function getMaxPatients(plan: string): number {
  const caps = PLAN_CAPS[plan]
  if (!caps) return 1
  return caps.maxMembersPerHousehold * caps.maxHouseholds
}

/** Max patients allowed in one household for a plan. */
export function getMaxMembersPerHousehold(plan: string): number {
  return PLAN_CAPS[plan]?.maxMembersPerHousehold ?? 1
}

/** Max households allowed on the account for a plan. */
export function getMaxHouseholds(plan: string): number {
  return PLAN_CAPS[plan]?.maxHouseholds ?? 1
}

/** Max external caregivers for a plan. */
export function getMaxCaregivers(plan: string): number {
  return PLAN_CAPS[plan]?.maxCaregivers ?? 0
}

/**
 * Resolve the *total* patient cap for a subscription. Prefers the
 * canonical PLAN_CAPS lookup; falls back to stored
 * maxPatients/maxSeats for forward-compat with plans not yet in the
 * map (e.g., a future Practitioner / White-label tier).
 */
function resolveMaxPatients(subscription: UserSubscription): number {
  const planName = subscription.plan
  if (planName && PLAN_CAPS[planName] !== undefined) {
    return getMaxPatients(planName)
  }
  return subscription.maxPatients ?? subscription.maxSeats ?? 1
}

/**
 * Check if user can add another patient
 */
export function canAddPatient(user: User | null, currentPatientCount: number): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  // Grandfathered users bypass expiration checks
  if (subscription.isGrandfathered) {
    return currentPatientCount < resolveMaxPatients(subscription)
  }

  // Can't add patients if subscription expired/canceled
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return false
  }

  return currentPatientCount < resolveMaxPatients(subscription)
}

/**
 * Get what type of upgrade is required for a feature
 */
export function getRequiredUpgrade(feature: string): {
  type: 'plan' | 'addon' | 'none'
  plan?: 'single' | 'family'
  addon?: string
} {
  // Check if it's a plan-gated feature
  if (PLAN_FEATURES[feature]) {
    const plans = PLAN_FEATURES[feature]
    // Return the minimum plan required
    if (plans.includes('single')) {
      return { type: 'plan', plan: 'single' }
    }
    return { type: 'plan', plan: 'family' }
  }

  // Check if it's an addon-gated feature
  if (ADDON_FEATURES[feature]) {
    return { type: 'addon', addon: ADDON_FEATURES[feature] }
  }

  return { type: 'none' }
}

/**
 * Check if user has a specific addon
 */
export function hasAddon(user: User | null, addonName: keyof NonNullable<UserSubscription['addons']>): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  return subscription.addons?.[addonName] === true
}

/**
 * Get patient limit info. Uses the canonical PLAN_PATIENT_LIMITS
 * map (above) so changes to a plan's cap apply immediately to
 * every user on that plan — no Firestore backfill needed.
 *
 * Skips the admin bypass: this is a DISPLAY surface ("you're at X of
 * Y") so it must reflect the user's REAL paid plan, not the admin
 * full-access slot. Otherwise admins see "0 of 200" regardless of
 * actual plan, contradicting the plan badge elsewhere on the page.
 * Admin still has feature-level access via `canAccessFeature` and
 * can still exceed the cap via `canAddPatient` — only the display
 * is honest about the underlying plan.
 */
export function getPatientLimitInfo(user: User | null, currentPatientCount: number) {
  const subscription = getUserSubscription(user, { skipAdminBypass: true })

  if (!subscription) {
    return {
      current: 0,
      max: 0,
      canAdd: false,
      percentage: 0
    }
  }

  const maxPatients = resolveMaxPatients(subscription)
  return {
    current: currentPatientCount,
    max: maxPatients,
    canAdd: currentPatientCount < maxPatients,
    percentage: Math.round((currentPatientCount / maxPatients) * 100)
  }
}

/**
 * Check if user is an admin
 */
export function isAdmin(user: User | null): boolean {
  if (!user) return false
  return isSuperAdmin(user.email)
}

/**
 * Get available simulation presets for dev mode
 */
export function getSimulationPresets(): Record<string, UserSubscription> {
  return {
    'Free Trial': {
      plan: 'free',
      billingInterval: 'monthly',
      addons: { familyFeatures: false },
      status: 'trialing',
      maxSeats: 1,
      currentSeats: 0,
      maxExternalCaregivers: 0,
      currentExternalCaregivers: 0,
      maxPatients: 1,
      maxHouseholds: HOUSEHOLD_LIMITS.free,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.free,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    },
    'Single User': {
      plan: 'single',
      billingInterval: 'monthly',
      addons: { familyFeatures: false },
      status: 'active',
      maxSeats: 1,
      currentSeats: 0,
      maxExternalCaregivers: 0,
      currentExternalCaregivers: 0,
      maxPatients: 1,
      maxHouseholds: HOUSEHOLD_LIMITS.single,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.single,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    'Single User Plus': {
      plan: 'single_plus',
      billingInterval: 'monthly',
      addons: { familyFeatures: false },
      status: 'active',
      maxSeats: 1,
      currentSeats: 0,
      maxExternalCaregivers: 3,
      currentExternalCaregivers: 0,
      maxPatients: 1,
      maxHouseholds: HOUSEHOLD_LIMITS.single_plus,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.single_plus,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    'Family Basic': {
      plan: 'family_basic',
      billingInterval: 'monthly',
      addons: { familyFeatures: false },
      status: 'active',
      maxSeats: 5,
      currentSeats: 0,
      maxExternalCaregivers: 5,
      currentExternalCaregivers: 0,
      maxPatients: 5,
      maxHouseholds: HOUSEHOLD_LIMITS.family_basic,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.family_basic,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    'Family Plus': {
      plan: 'family_plus',
      billingInterval: 'monthly',
      addons: { familyFeatures: true },
      status: 'active',
      maxSeats: 10,
      currentSeats: 0,
      maxExternalCaregivers: 10,
      currentExternalCaregivers: 0,
      maxPatients: 10,
      maxHouseholds: HOUSEHOLD_LIMITS.family_plus,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.family_plus,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    'Family Premium': {
      plan: 'family_premium',
      billingInterval: 'yearly',
      addons: { familyFeatures: true },
      status: 'active',
      // Bounded numbers (was 999 / unlimited): 20 members per
      // household × 10 households = 200 max, 50 external caregivers.
      // Doubling pattern from Family Plus (10 / 5 / 10), gives a
      // sandwich-generation power-user budget without inviting
      // bulk-scraping abuse. Beyond this is Practitioner / White-
      // label territory.
      maxSeats: 20,
      currentSeats: 0,
      maxExternalCaregivers: 50,
      currentExternalCaregivers: 0,
      maxPatients: 20,
      maxHouseholds: HOUSEHOLD_LIMITS.family_premium,
      currentHouseholds: 0,
      maxDutiesPerHousehold: HOUSEHOLD_DUTY_LIMITS.family_premium,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    },
    'Admin (Full Access)': FULL_ACCESS_SUBSCRIPTION
  }
}

/**
 * Check if user can add an external caregiver
 * External caregivers are non-billable professional caregivers (not family members)
 *
 * @param user - Current user
 * @param currentCaregiverCount - Number of external caregivers already added
 * @returns true if user can add another external caregiver
 *
 * @example
 * canAddExternalCaregiver(user, 1)  // true if limit allows
 */
export function canAddExternalCaregiver(user: User | null, currentCaregiverCount: number): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  // Can't add caregivers if subscription expired/canceled
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return false
  }

  const maxCaregivers = subscription.maxExternalCaregivers
  return currentCaregiverCount < maxCaregivers
}

/**
 * Get caregiver limit information for display and validation
 *
 * @param user - Current user
 * @param currentCaregiverCount - Number of external caregivers already added
 * @returns Object with current, max, availability, and percentage usage
 *
 * @example
 * getCaregiverLimitInfo(user, 3)
 * // { current: 3, max: 5, canAdd: true, percentage: 60, remaining: 2 }
 */
export function getCaregiverLimitInfo(user: User | null, currentCaregiverCount: number) {
  const subscription = getUserSubscription(user)

  if (!subscription) {
    return {
      current: 0,
      max: 0,
      canAdd: false,
      percentage: 0,
      remaining: 0,
      isUnlimited: false
    }
  }

  const maxCaregivers = subscription.maxExternalCaregivers
  const isUnlimited = maxCaregivers >= 999
  const remaining = Math.max(0, maxCaregivers - currentCaregiverCount)

  // For unlimited plans, show utilization based on 50 as a reasonable cap for display
  const displayMax = isUnlimited ? 50 : maxCaregivers
  const percentage = displayMax > 0 ? Math.round((currentCaregiverCount / displayMax) * 100) : 0

  return {
    current: currentCaregiverCount,
    max: maxCaregivers,
    canAdd: currentCaregiverCount < maxCaregivers &&
            (subscription.status === 'active' || subscription.status === 'trialing'),
    percentage: Math.min(100, percentage),
    remaining: isUnlimited ? 999 : remaining,
    isUnlimited
  }
}

/**
 * Check if user can add another household
 *
 * @param user - Current user
 * @param currentHouseholdCount - Number of households already created
 * @returns Object with allowed flag, message, and upgrade info
 */
export function canAddHousehold(user: User | null, currentHouseholdCount: number): {
  allowed: boolean
  message: string
  upgradeUrl?: string
  currentUsage?: number
  limit?: number
} {
  if (!user) {
    return {
      allowed: false,
      message: 'You must be logged in to create households'
    }
  }

  const subscription = getUserSubscription(user)
  if (!subscription) {
    return {
      allowed: false,
      message: 'No active subscription found'
    }
  }

  const limit = HOUSEHOLD_LIMITS[subscription.plan]

  if (currentHouseholdCount >= limit) {
    // Find recommended upgrade plan
    let recommendedPlan: SubscriptionPlan = 'single_plus'
    if (subscription.plan === 'free') {
      recommendedPlan = 'single'
    } else if (subscription.plan === 'single') {
      recommendedPlan = 'single_plus'
    } else if (subscription.plan === 'single_plus') {
      recommendedPlan = 'family_basic'
    } else if (subscription.plan === 'family_basic') {
      recommendedPlan = 'family_plus'
    } else if (subscription.plan === 'family_plus') {
      recommendedPlan = 'family_premium'
    }

    return {
      allowed: false,
      message: `You've reached your household limit (${limit}). Upgrade to manage more households.`,
      upgradeUrl: `/pricing?upgrade=households&from=${subscription.plan}&to=${recommendedPlan}`,
      currentUsage: currentHouseholdCount,
      limit
    }
  }

  return {
    allowed: true,
    message: 'You can add this household',
    currentUsage: currentHouseholdCount,
    limit
  }
}

/**
 * Check if user can add another duty to a household
 *
 * @param user - Current user
 * @param currentDuties - Number of duties in the household
 * @param householdId - ID of the household
 * @returns Object with allowed flag and message
 */
export function canAddDutyToHousehold(
  user: User | null,
  currentDuties: number,
  householdId: string
): {
  allowed: boolean
  message: string
  upgradeUrl?: string
  currentUsage?: number
  limit?: number
} {
  if (!user) {
    return {
      allowed: false,
      message: 'You must be logged in to create duties'
    }
  }

  const subscription = getUserSubscription(user)
  if (!subscription) {
    return {
      allowed: false,
      message: 'No active subscription found'
    }
  }

  const limit = HOUSEHOLD_DUTY_LIMITS[subscription.plan]

  if (currentDuties >= limit) {
    return {
      allowed: false,
      message: `You've reached the duty limit for your ${subscription.plan} plan (${limit} duties per household). Upgrade for unlimited duties.`,
      upgradeUrl: `/pricing?upgrade=duties&from=${subscription.plan}`,
      currentUsage: currentDuties,
      limit
    }
  }

  return {
    allowed: true,
    message: 'You can add this duty',
    currentUsage: currentDuties,
    limit
  }
}

/**
 * Get household limit information for display and validation
 *
 * @param user - Current user
 * @param currentHouseholdCount - Number of households already created
 * @returns Object with current, max, availability, and percentage usage
 */
export function getHouseholdLimitInfo(user: User | null, currentHouseholdCount: number) {
  const subscription = getUserSubscription(user)

  if (!subscription) {
    return {
      current: 0,
      max: 0,
      canAdd: false,
      percentage: 0,
      remaining: 0,
      isUnlimited: false
    }
  }

  const maxHouseholds = HOUSEHOLD_LIMITS[subscription.plan]
  const isUnlimited = maxHouseholds >= 999
  const remaining = Math.max(0, maxHouseholds - currentHouseholdCount)

  // For unlimited plans, show utilization based on 20 as a reasonable cap for display
  const displayMax = isUnlimited ? 20 : maxHouseholds
  const percentage = displayMax > 0 ? Math.round((currentHouseholdCount / displayMax) * 100) : 0

  return {
    current: currentHouseholdCount,
    max: maxHouseholds,
    canAdd: currentHouseholdCount < maxHouseholds &&
            (subscription.status === 'active' || subscription.status === 'trialing'),
    percentage: Math.min(100, percentage),
    remaining: isUnlimited ? 999 : remaining,
    isUnlimited
  }
}

/**
 * Check if usage is nearing limit (>80%)
 */
export function isNearingLimit(current: number, limit: number): boolean {
  if (limit === 999) return false // Unlimited
  return (current / limit) >= 0.8
}
