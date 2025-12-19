/**
 * Feature Gating System with Admin Override & Dev Simulation
 *
 * Manages subscription-based access control for features and patient limits.
 * Supports admin bypass and development mode simulation for testing.
 */

import { User, UserSubscription, SubscriptionPlan } from '@/types'

// Admin users with full access to all features
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

  // Advanced Analytics (Family Plus & Premium only)
  'advanced-analytics': ['family_plus', 'family_premium'],
  'health-insights': ['family_plus', 'family_premium'],
  'trend-analysis': ['family_plus', 'family_premium'],
  'predictive-ai': ['family_plus', 'family_premium'],

  // Premium Features (Premium only)
  'priority-support': ['family_premium'],
  'white-glove-service': ['family_premium'],
  'early-access': ['family_premium'],
  'custom-reports': ['family_premium'],
  'data-export': ['family_premium'],
  'api-access': ['family_premium'],

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
 * Get user's effective subscription (with admin override and dev simulation)
 */
export function getUserSubscription(user: User | null): UserSubscription | null {
  if (!user) return null

  // 1. Admin bypass - full access always
  if (ADMIN_EMAILS.includes(user.email)) {
    return FULL_ACCESS_SUBSCRIPTION
  }

  // 2. Dev mode - check for simulated subscription
  if (process.env.NODE_ENV === 'development') {
    const simulated = getSimulatedSubscription()
    if (simulated) return simulated
  }

  // 3. Production - use real subscription
  return user.subscription || null
}

/**
 * Check if user can access a specific feature
 */
export function canAccessFeature(user: User | null, feature: string): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  // Expired or canceled subscriptions can't access features
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return false
  }

  // Check basic features (available to all active/trialing plans)
  if (BASIC_FEATURES.includes(feature)) {
    return subscription.status === 'active' || subscription.status === 'trialing'
  }

  // Check plan-gated features
  if (PLAN_FEATURES[feature]) {
    return PLAN_FEATURES[feature].includes(subscription.plan)
  }

  // Check addon-gated features
  if (ADDON_FEATURES[feature]) {
    const requiredAddon = ADDON_FEATURES[feature]
    return subscription.addons?.[requiredAddon] === true
  }

  // Feature not recognized - default to denied
  return false
}

/**
 * Check if user can add another patient
 */
export function canAddPatient(user: User | null, currentPatientCount: number): boolean {
  if (!user) return false

  const subscription = getUserSubscription(user)
  if (!subscription) return false

  // Can't add patients if subscription expired/canceled
  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return false
  }

  const maxPatients = subscription.maxPatients ?? subscription.maxSeats ?? 1
  return currentPatientCount < maxPatients
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
 * Get patient limit info
 */
export function getPatientLimitInfo(user: User | null, currentPatientCount: number) {
  const subscription = getUserSubscription(user)

  if (!subscription) {
    return {
      current: 0,
      max: 0,
      canAdd: false,
      percentage: 0
    }
  }

  const maxPatients = subscription.maxPatients ?? subscription.maxSeats ?? 1
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
  return ADMIN_EMAILS.includes(user.email)
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
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
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
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    },
    'Family Premium': {
      plan: 'family_premium',
      billingInterval: 'yearly',
      addons: { familyFeatures: true },
      status: 'active',
      maxSeats: 999,
      currentSeats: 0,
      maxExternalCaregivers: 999,
      currentExternalCaregivers: 0,
      maxPatients: 999,
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
