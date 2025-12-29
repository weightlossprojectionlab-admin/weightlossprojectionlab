/**
 * Subscription Policies & Configuration
 *
 * Platform-wide subscription policies that align with the FAQ shown to users.
 * These policies are enforced consistently across all subscription tiers.
 */

import { SubscriptionPlan, BillingInterval } from '@/types'

/**
 * TRIAL POLICY
 * - 7-day free trial for all plans
 * - NO credit card required during trial
 * - Full access to selected plan features
 * - Payment required after trial to continue
 * - Reminders sent before trial ends
 */
export const TRIAL_POLICY = {
  DURATION_DAYS: 7,
  REQUIRES_PAYMENT_METHOD: false, // NO credit card required
  FULL_FEATURE_ACCESS: true,
  REMINDER_DAYS_BEFORE_EXPIRY: [3, 1], // Send reminders 3 days and 1 day before expiry
} as const

/**
 * CANCELLATION POLICY
 * - Can cancel anytime from account settings
 * - Retain access until end of current billing period
 * - No prorated refunds (access continues until period end)
 * - Can reactivate before period ends
 */
export const CANCELLATION_POLICY = {
  ALLOWED_ANYTIME: true,
  RETAIN_ACCESS_UNTIL_PERIOD_END: true,
  PRORATED_REFUND: false,
  CAN_REACTIVATE_BEFORE_PERIOD_END: true,
} as const

/**
 * PLAN CHANGE POLICY
 * - Can change plan anytime from account settings
 * - UPGRADES: Take effect immediately
 * - DOWNGRADES: Take effect at end of current billing cycle
 * - Billing adjustments handled by Stripe proration
 */
export const PLAN_CHANGE_POLICY = {
  ALLOWED_ANYTIME: true,
  UPGRADE_TIMING: 'immediate' as const, // Upgrades apply immediately
  DOWNGRADE_TIMING: 'end_of_cycle' as const, // Downgrades at cycle end
  PRORATION_ENABLED: true,
  AUTOMATIC_TAX_ENABLED: true, // Stripe automatic tax calculation
} as const

/**
 * POST-TRIAL POLICY
 * - After 7 days, trial expires
 * - User MUST add payment to continue
 * - Reminders sent before trial ends
 * - Access blocked until payment added
 */
export const POST_TRIAL_POLICY = {
  REQUIRE_PAYMENT_TO_CONTINUE: true,
  SEND_REMINDERS: true,
  BLOCK_ACCESS_AFTER_EXPIRY: true,
  GRACE_PERIOD_HOURS: 24, // 24-hour grace period to add payment
} as const

/**
 * Plan-specific trial configurations
 * Each plan gets a 7-day free trial with full features
 */
export interface PlanTrialConfig {
  plan: SubscriptionPlan
  trialDays: number
  requiresPaymentMethod: boolean
  features: {
    fullAccess: boolean
    maxSeats: number
    maxCaregivers: number
    maxHouseholds: number
  }
}

export const PLAN_TRIAL_CONFIGS: Record<SubscriptionPlan, PlanTrialConfig> = {
  free: {
    plan: 'free',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 1,
      maxCaregivers: 0,
      maxHouseholds: 1,
    },
  },
  single: {
    plan: 'single',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 1,
      maxCaregivers: 0,
      maxHouseholds: 1,
    },
  },
  single_plus: {
    plan: 'single_plus',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 1,
      maxCaregivers: 3,
      maxHouseholds: 2,
    },
  },
  family_basic: {
    plan: 'family_basic',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 5,
      maxCaregivers: 5,
      maxHouseholds: 3,
    },
  },
  family_plus: {
    plan: 'family_plus',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 10,
      maxCaregivers: 10,
      maxHouseholds: 5,
    },
  },
  family_premium: {
    plan: 'family_premium',
    trialDays: 7,
    requiresPaymentMethod: false,
    features: {
      fullAccess: true,
      maxSeats: 999,
      maxCaregivers: 999,
      maxHouseholds: 999,
    },
  },
} as const

/**
 * Check if user is in trial period
 */
export function isInTrialPeriod(
  status: string,
  trialEndsAt?: Date
): boolean {
  if (status !== 'trialing') return false
  if (!trialEndsAt) return false
  return new Date(trialEndsAt) > new Date()
}

/**
 * Check if trial is expiring soon (within reminder window)
 */
export function isTrialExpiringSoon(trialEndsAt?: Date): boolean {
  if (!trialEndsAt) return false

  const now = new Date()
  const expiryDate = new Date(trialEndsAt)
  const daysUntilExpiry = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysUntilExpiry <= Math.max(...TRIAL_POLICY.REMINDER_DAYS_BEFORE_EXPIRY)
}

/**
 * Get days remaining in trial
 */
export function getDaysRemainingInTrial(trialEndsAt?: Date): number {
  if (!trialEndsAt) return 0

  const now = new Date()
  const expiryDate = new Date(trialEndsAt)
  const daysRemaining = Math.ceil(
    (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  )

  return Math.max(0, daysRemaining)
}

/**
 * Check if a plan change is an upgrade
 */
export function isUpgrade(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
): boolean {
  const planRanking: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 1,
    single_plus: 2,
    family_basic: 3,
    family_plus: 4,
    family_premium: 5,
  }

  return planRanking[newPlan] > planRanking[currentPlan]
}

/**
 * Check if a plan change is a downgrade
 */
export function isDowngrade(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
): boolean {
  const planRanking: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 1,
    single_plus: 2,
    family_basic: 3,
    family_plus: 4,
    family_premium: 5,
  }

  return planRanking[newPlan] < planRanking[currentPlan]
}

/**
 * Get plan change timing based on whether it's an upgrade or downgrade
 */
export function getPlanChangeTiming(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan
): 'immediate' | 'end_of_cycle' {
  if (isUpgrade(currentPlan, newPlan)) {
    return PLAN_CHANGE_POLICY.UPGRADE_TIMING
  }
  if (isDowngrade(currentPlan, newPlan)) {
    return PLAN_CHANGE_POLICY.DOWNGRADE_TIMING
  }
  return 'immediate' // Same plan or lateral move
}

/**
 * Check if user can cancel subscription
 */
export function canCancelSubscription(status: string): boolean {
  return CANCELLATION_POLICY.ALLOWED_ANYTIME &&
    (status === 'active' || status === 'trialing')
}

/**
 * Check if user retains access after cancellation
 */
export function retainsAccessAfterCancellation(
  canceledAt: Date,
  currentPeriodEnd?: Date
): boolean {
  if (!CANCELLATION_POLICY.RETAIN_ACCESS_UNTIL_PERIOD_END) return false
  if (!currentPeriodEnd) return false

  return new Date() < new Date(currentPeriodEnd)
}

/**
 * Get user-friendly message about trial status
 */
export function getTrialStatusMessage(
  status: string,
  trialEndsAt?: Date
): string {
  if (status !== 'trialing' || !trialEndsAt) {
    return ''
  }

  const daysRemaining = getDaysRemainingInTrial(trialEndsAt)

  if (daysRemaining === 0) {
    return 'Your trial ends today. Add payment to continue using the platform.'
  }

  if (daysRemaining === 1) {
    return 'Your trial ends tomorrow. Add payment to continue after your trial.'
  }

  return `Your trial ends in ${daysRemaining} days. You'll be prompted to add payment to continue.`
}

/**
 * Get user-friendly message about cancellation
 */
export function getCancellationMessage(
  currentPeriodEnd?: Date
): string {
  if (!currentPeriodEnd) {
    return 'You can cancel your subscription anytime from account settings.'
  }

  const endDate = new Date(currentPeriodEnd).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return `You can cancel anytime. You'll retain access until ${endDate}.`
}

/**
 * Get user-friendly message about plan changes
 */
export function getPlanChangeMessage(
  currentPlan: SubscriptionPlan,
  newPlan: SubscriptionPlan,
  currentPeriodEnd?: Date
): string {
  if (isUpgrade(currentPlan, newPlan)) {
    return 'Your upgrade will take effect immediately, and you\'ll be charged a prorated amount.'
  }

  if (isDowngrade(currentPlan, newPlan) && currentPeriodEnd) {
    const endDate = new Date(currentPeriodEnd).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    return `Your downgrade will take effect at the end of your billing cycle (${endDate}).`
  }

  return 'Your plan change will be processed.'
}
