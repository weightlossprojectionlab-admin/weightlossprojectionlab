/**
 * Subscription Utility Functions
 *
 * Display helpers and utility functions for subscription plan management.
 * Provides human-readable formatting for limits and plan information.
 */

import { SubscriptionPlan, UserSubscription, User } from '@/types'
import { getUserSubscription } from './feature-gates'

/**
 * Format seat limit for display
 * Returns "Unlimited" for limits >= 999, otherwise returns the number as a string
 *
 * @param limit - The seat limit number
 * @returns Formatted string for display
 *
 * @example
 * formatSeatLimit(5)    // "5"
 * formatSeatLimit(999)  // "Unlimited"
 * formatSeatLimit(1000) // "Unlimited"
 */
export function formatSeatLimit(limit: number | undefined): string {
  if (limit === undefined || limit === null) {
    return '0'
  }
  if (limit >= 999) {
    return 'Unlimited'
  }
  return limit.toString()
}

/**
 * Format caregiver limit for display
 * Returns "Unlimited" for limits >= 999, otherwise returns the number as a string
 *
 * @param limit - The caregiver limit number
 * @returns Formatted string for display
 *
 * @example
 * formatCaregiverLimit(2)    // "2"
 * formatCaregiverLimit(999)  // "Unlimited"
 * formatCaregiverLimit(1000) // "Unlimited"
 */
export function formatCaregiverLimit(limit: number | undefined): string {
  if (limit === undefined || limit === null) {
    return '0'
  }
  if (limit >= 999) {
    return 'Unlimited'
  }
  return limit.toString()
}

/**
 * Get user-friendly display name for a subscription plan
 *
 * @param plan - The subscription plan
 * @returns Human-readable plan name
 *
 * @example
 * getPlanDisplayName('free')           // "Free Trial"
 * getPlanDisplayName('family_plus')    // "Family Plus"
 */
export function getPlanDisplayName(plan: SubscriptionPlan): string {
  const displayNames: Record<SubscriptionPlan, string> = {
    free: 'Free Trial',
    single: 'Single User',
    single_plus: 'Single User Plus',
    family_basic: 'Family Basic',
    family_plus: 'Family Plus',
    family_premium: 'Family Premium',
  }
  return displayNames[plan]
}

/**
 * Get formatted limits information for a subscription plan
 * Includes seat and caregiver limits with proper "Unlimited" formatting
 *
 * @param plan - The subscription plan
 * @returns Object containing formatted seat and caregiver limits
 *
 * @example
 * getPlanLimits('single')
 * // { seats: "1", caregivers: "2" }
 *
 * getPlanLimits('family_premium')
 * // { seats: "Unlimited", caregivers: "Unlimited" }
 */
export function getPlanLimits(plan: SubscriptionPlan): {
  seats: string
  caregivers: string
} {
  const seatLimits: Record<SubscriptionPlan, number> = {
    free: 1,
    single: 1,
    single_plus: 1,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }

  const caregiverLimits: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 0,
    single_plus: 3,
    family_basic: 5,
    family_plus: 10,
    family_premium: 999,
  }

  return {
    seats: formatSeatLimit(seatLimits[plan]),
    caregivers: formatCaregiverLimit(caregiverLimits[plan]),
  }
}

/**
 * Check if a plan is a family plan
 * Family plans include: family_basic, family_plus, family_premium
 *
 * @param plan - The subscription plan
 * @returns true if the plan is a family plan
 *
 * @example
 * isFamilyPlan('single')        // false
 * isFamilyPlan('family_basic')  // true
 */
export function isFamilyPlan(plan: SubscriptionPlan): boolean {
  return ['family_basic', 'family_plus', 'family_premium'].includes(plan)
}

/**
 * Check if a plan has unlimited seats
 * Returns true for plans with 999+ seats (family_premium)
 *
 * @param plan - The subscription plan
 * @returns true if the plan has unlimited seats
 *
 * @example
 * hasUnlimitedSeats('family_plus')     // false
 * hasUnlimitedSeats('family_premium')  // true
 */
export function hasUnlimitedSeats(plan: SubscriptionPlan): boolean {
  return plan === 'family_premium'
}

/**
 * Check if a plan has unlimited caregivers
 * Returns true for plans with 999+ caregivers (family_premium)
 *
 * @param plan - The subscription plan
 * @returns true if the plan has unlimited caregivers
 *
 * @example
 * hasUnlimitedCaregivers('family_plus')     // false
 * hasUnlimitedCaregivers('family_premium')  // true
 */
export function hasUnlimitedCaregivers(plan: SubscriptionPlan): boolean {
  return plan === 'family_premium'
}

/**
 * Get comprehensive subscription display information
 * Combines all display utilities into a single object
 *
 * @param subscription - The user's subscription object
 * @returns Comprehensive display information
 *
 * @example
 * const info = getSubscriptionDisplayInfo(user.subscription)
 * console.log(info.planName)        // "Family Plus"
 * console.log(info.limits.seats)    // "10"
 * console.log(info.isFamily)        // true
 */
export function getSubscriptionDisplayInfo(
  subscription: UserSubscription | null
): {
  planName: string
  limits: { seats: string; caregivers: string }
  isFamily: boolean
  hasUnlimitedSeats: boolean
  hasUnlimitedCaregivers: boolean
  status: string
  billingInterval: string
} | null {
  if (!subscription) return null

  const statusDisplay: Record<UserSubscription['status'], string> = {
    active: 'Active',
    trialing: 'Trial',
    past_due: 'Past Due',
    canceled: 'Canceled',
    expired: 'Expired',
  }

  const billingDisplay: Record<UserSubscription['billingInterval'], string> = {
    monthly: 'Monthly',
    yearly: 'Yearly',
  }

  return {
    planName: getPlanDisplayName(subscription.plan),
    limits: getPlanLimits(subscription.plan),
    isFamily: isFamilyPlan(subscription.plan),
    hasUnlimitedSeats: hasUnlimitedSeats(subscription.plan),
    hasUnlimitedCaregivers: hasUnlimitedCaregivers(subscription.plan),
    status: statusDisplay[subscription.status],
    billingInterval: billingDisplay[subscription.billingInterval],
  }
}

/**
 * Get seat utilization percentage
 * Returns 0-100 representing percentage of seats used
 *
 * @param subscription - The user's subscription object
 * @returns Percentage of seats used (0-100)
 *
 * @example
 * getSeatUtilization({ currentSeats: 3, maxSeats: 10 })  // 30
 * getSeatUtilization({ currentSeats: 5, maxSeats: 999 }) // 1 (rounded)
 */
export function getSeatUtilization(subscription: UserSubscription | null): number {
  if (!subscription) return 0

  const max = subscription.maxSeats
  const current = subscription.currentSeats

  if (max === 0) return 0
  if (max >= 999) return Math.min(100, Math.round((current / 50) * 100)) // Cap display at 50 for unlimited

  return Math.round((current / max) * 100)
}

/**
 * Get caregiver utilization percentage
 * Returns 0-100 representing percentage of caregiver slots used
 *
 * @param subscription - The user's subscription object
 * @returns Percentage of caregiver slots used (0-100)
 *
 * @example
 * getCaregiverUtilization({ currentExternalCaregivers: 2, maxExternalCaregivers: 5 })  // 40
 */
export function getCaregiverUtilization(subscription: UserSubscription | null): number {
  if (!subscription) return 0

  const max = subscription.maxExternalCaregivers
  const current = subscription.currentExternalCaregivers

  if (max === 0) return 0
  if (max >= 999) return Math.min(100, Math.round((current / 50) * 100)) // Cap display at 50 for unlimited

  return Math.round((current / max) * 100)
}

/**
 * Check if user is approaching seat limit
 * Returns true if usage is >= 80%
 *
 * @param subscription - The user's subscription object
 * @returns true if approaching limit
 */
export function isApproachingSeatLimit(subscription: UserSubscription | null): boolean {
  return getSeatUtilization(subscription) >= 80
}

/**
 * Check if user is approaching caregiver limit
 * Returns true if usage is >= 80%
 *
 * @param subscription - The user's subscription object
 * @returns true if approaching limit
 */
export function isApproachingCaregiverLimit(subscription: UserSubscription | null): boolean {
  return getCaregiverUtilization(subscription) >= 80
}

/**
 * Get recommended upgrade plan based on current usage
 * Returns the next tier up if user is at/near limits
 *
 * @param subscription - The user's subscription object
 * @returns Recommended plan or null if no upgrade needed
 *
 * @example
 * getRecommendedUpgrade({ plan: 'family_basic', currentSeats: 5, maxSeats: 5 })
 * // 'family_plus'
 */
export function getRecommendedUpgrade(
  subscription: UserSubscription | null
): SubscriptionPlan | null {
  if (!subscription) return 'single'

  const plan = subscription.plan
  const seatUtilization = getSeatUtilization(subscription)
  const caregiverUtilization = getCaregiverUtilization(subscription)

  // If already on premium, no upgrade available
  if (plan === 'family_premium') return null

  // If usage >= 80%, recommend upgrade
  if (seatUtilization >= 80 || caregiverUtilization >= 80) {
    const upgradeMap: Record<SubscriptionPlan, SubscriptionPlan | null> = {
      free: 'single',
      single: 'single_plus',
      single_plus: 'family_basic',
      family_basic: 'family_plus',
      family_plus: 'family_premium',
      family_premium: null,
    }
    return upgradeMap[plan]
  }

  return null
}

/**
 * Get pricing for a plan in dollars
 * Converts cents to dollars for display
 *
 * @param plan - The subscription plan
 * @param billingInterval - monthly or yearly
 * @returns Price in dollars as string
 *
 * @example
 * getPlanPrice('single', 'monthly')        // "$9.99"
 * getPlanPrice('family_plus', 'yearly')    // "$299.00"
 */
export function getPlanPrice(
  plan: SubscriptionPlan,
  billingInterval: 'monthly' | 'yearly'
): string {
  const pricing: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
    free: { monthly: 0, yearly: 0 },
    single: { monthly: 999, yearly: 9900 },
    single_plus: { monthly: 1499, yearly: 14900 },
    family_basic: { monthly: 1999, yearly: 19900 },
    family_plus: { monthly: 2999, yearly: 29900 },
    family_premium: { monthly: 3999, yearly: 39900 },
  }

  const cents = pricing[plan][billingInterval]
  const dollars = (cents / 100).toFixed(2)

  return `$${dollars}`
}

/**
 * Calculate savings percentage for yearly billing
 *
 * @param plan - The subscription plan
 * @returns Savings percentage as number (e.g., 17 for 17% off)
 *
 * @example
 * getYearlySavings('family_plus')  // 17
 */
export function getYearlySavings(plan: SubscriptionPlan): number {
  if (plan === 'free') return 0

  const pricing: Record<SubscriptionPlan, { monthly: number; yearly: number }> = {
    free: { monthly: 0, yearly: 0 },
    single: { monthly: 999, yearly: 9900 },
    single_plus: { monthly: 1499, yearly: 14900 },
    family_basic: { monthly: 1999, yearly: 19900 },
    family_plus: { monthly: 2999, yearly: 29900 },
    family_premium: { monthly: 3999, yearly: 39900 },
  }

  const monthlyTotal = pricing[plan].monthly * 12
  const yearlyPrice = pricing[plan].yearly
  const savings = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100

  return Math.round(savings)
}
