/**
 * Subscription Enforcement & Validation
 *
 * Enforces subscription limits and validates plan changes (upgrades/downgrades).
 * Ensures users cannot downgrade to plans that don't support their current usage.
 */

import { User, SubscriptionPlan, UserSubscription, SEAT_LIMITS, EXTERNAL_CAREGIVER_LIMITS } from '@/types'
import { getUserSubscription } from './feature-gates'
import { formatSeatLimit, formatCaregiverLimit } from './subscription-utils'

/**
 * Result of downgrade validation
 */
export interface DowngradeValidationResult {
  /** Whether the downgrade is allowed */
  allowed: boolean

  /** Specific blockers preventing the downgrade */
  blockers?: {
    /** Seat limit blocker (if current seats exceed target plan limit) */
    seats?: {
      current: number
      limit: number
      excess: number
    }
    /** Caregiver limit blocker (if current caregivers exceed target plan limit) */
    caregivers?: {
      current: number
      limit: number
      excess: number
    }
    /** Feature blockers (features used that aren't in target plan) */
    features?: string[]
  }

  /** Human-readable message explaining the result */
  message?: string

  /** Suggested actions to resolve blockers */
  suggestions?: string[]
}

/**
 * Validate if a user can downgrade to a target plan
 * Checks seat limits, caregiver limits, and feature dependencies
 *
 * @param user - Current user
 * @param targetPlan - Plan user wants to downgrade to
 * @param currentSeats - Current number of seats in use
 * @param currentCaregivers - Current number of external caregivers
 * @returns Validation result with blockers and suggestions
 *
 * @example
 * validateDowngrade(user, 'family_basic', 8, 3)
 * // {
 * //   allowed: false,
 * //   blockers: { seats: { current: 8, limit: 5, excess: 3 } },
 * //   message: "Cannot downgrade: you have 8 seats but Family Basic allows only 5.",
 * //   suggestions: ["Remove 3 family members to continue"]
 * // }
 */
export function validateDowngrade(
  user: User | null,
  targetPlan: SubscriptionPlan,
  currentSeats: number,
  currentCaregivers: number
): DowngradeValidationResult {
  if (!user) {
    return {
      allowed: false,
      message: 'User not authenticated',
    }
  }

  const currentSubscription = getUserSubscription(user)
  if (!currentSubscription) {
    return {
      allowed: false,
      message: 'No current subscription found',
    }
  }

  // Check if this is actually a downgrade
  const planHierarchy: SubscriptionPlan[] = [
    'free',
    'single',
    'family_basic',
    'family_plus',
    'family_premium',
  ]

  const currentPlanIndex = planHierarchy.indexOf(currentSubscription.plan)
  const targetPlanIndex = planHierarchy.indexOf(targetPlan)

  if (targetPlanIndex > currentPlanIndex) {
    // This is an upgrade, not a downgrade - always allowed
    return {
      allowed: true,
      message: 'This is an upgrade - no restrictions apply',
    }
  }

  if (targetPlanIndex === currentPlanIndex) {
    return {
      allowed: true,
      message: 'No plan change',
    }
  }

  // Validate seat limits
  const targetSeatLimit = SEAT_LIMITS[targetPlan]
  const seatBlocker = currentSeats > targetSeatLimit

  // Validate caregiver limits
  const targetCaregiverLimit = EXTERNAL_CAREGIVER_LIMITS[targetPlan]
  const caregiverBlocker = currentCaregivers > targetCaregiverLimit

  // Build blockers object
  const blockers: DowngradeValidationResult['blockers'] = {}
  const suggestions: string[] = []

  if (seatBlocker) {
    const excess = currentSeats - targetSeatLimit
    blockers.seats = {
      current: currentSeats,
      limit: targetSeatLimit,
      excess,
    }
    suggestions.push(
      `Remove ${excess} ${excess === 1 ? 'family member' : 'family members'} to continue`
    )
  }

  if (caregiverBlocker) {
    const excess = currentCaregivers - targetCaregiverLimit
    blockers.caregivers = {
      current: currentCaregivers,
      limit: targetCaregiverLimit,
      excess,
    }
    suggestions.push(
      `Remove ${excess} external ${excess === 1 ? 'caregiver' : 'caregivers'} to continue`
    )
  }

  // Build result
  const hasBlockers = seatBlocker || caregiverBlocker

  if (!hasBlockers) {
    return {
      allowed: true,
      message: 'Downgrade allowed - no blockers detected',
    }
  }

  // Build detailed message
  const messages: string[] = []
  if (seatBlocker) {
    messages.push(
      `You have ${currentSeats} ${currentSeats === 1 ? 'seat' : 'seats'} but ${getPlanDisplayName(targetPlan)} allows only ${formatSeatLimit(targetSeatLimit)}`
    )
  }
  if (caregiverBlocker) {
    messages.push(
      `You have ${currentCaregivers} external ${currentCaregivers === 1 ? 'caregiver' : 'caregivers'} but ${getPlanDisplayName(targetPlan)} allows only ${formatCaregiverLimit(targetCaregiverLimit)}`
    )
  }

  return {
    allowed: false,
    blockers,
    message: `Cannot downgrade: ${messages.join('; ')}`,
    suggestions,
  }
}

/**
 * Check if user can perform a specific action based on current limits
 *
 * @param user - Current user
 * @param action - Action type ('add-seat' or 'add-caregiver')
 * @param currentCount - Current count of the resource
 * @returns Validation result
 *
 * @example
 * canPerformAction(user, 'add-seat', 5)
 * // { allowed: true, message: "You have 5 of 10 seats available" }
 */
export function canPerformAction(
  user: User | null,
  action: 'add-seat' | 'add-caregiver',
  currentCount: number
): {
  allowed: boolean
  message: string
  remaining?: number
} {
  if (!user) {
    return {
      allowed: false,
      message: 'User not authenticated',
    }
  }

  const subscription = getUserSubscription(user)
  if (!subscription) {
    return {
      allowed: false,
      message: 'No active subscription',
    }
  }

  if (subscription.status === 'expired' || subscription.status === 'canceled') {
    return {
      allowed: false,
      message: 'Your subscription has expired or been canceled',
    }
  }

  if (action === 'add-seat') {
    const max = subscription.maxSeats
    const remaining = max - currentCount

    if (currentCount >= max) {
      return {
        allowed: false,
        message: `You've reached your seat limit (${formatSeatLimit(max)}). Upgrade to add more family members.`,
      }
    }

    return {
      allowed: true,
      message: `You have ${remaining} of ${formatSeatLimit(max)} ${remaining === 1 ? 'seat' : 'seats'} available`,
      remaining,
    }
  }

  if (action === 'add-caregiver') {
    const max = subscription.maxExternalCaregivers
    const remaining = max - currentCount

    if (currentCount >= max) {
      return {
        allowed: false,
        message: `You've reached your caregiver limit (${formatCaregiverLimit(max)}). Upgrade to add more external caregivers.`,
      }
    }

    return {
      allowed: true,
      message: `You have ${remaining} of ${formatCaregiverLimit(max)} caregiver ${remaining === 1 ? 'slot' : 'slots'} available`,
      remaining,
    }
  }

  return {
    allowed: false,
    message: 'Unknown action type',
  }
}

/**
 * Get upgrade path to accommodate current usage
 * Returns the minimum plan needed to support current seats/caregivers
 *
 * @param currentSeats - Current number of seats in use
 * @param currentCaregivers - Current number of external caregivers
 * @returns Minimum required plan
 *
 * @example
 * getRequiredPlanForUsage(8, 3)  // 'family_plus' (supports 10 seats, 10 caregivers)
 */
export function getRequiredPlanForUsage(
  currentSeats: number,
  currentCaregivers: number
): SubscriptionPlan {
  const plans: SubscriptionPlan[] = [
    'free',
    'single',
    'family_basic',
    'family_plus',
    'family_premium',
  ]

  for (const plan of plans) {
    const seatLimit = SEAT_LIMITS[plan]
    const caregiverLimit = EXTERNAL_CAREGIVER_LIMITS[plan]

    if (currentSeats <= seatLimit && currentCaregivers <= caregiverLimit) {
      return plan
    }
  }

  // If usage exceeds all plans, return premium
  return 'family_premium'
}

/**
 * Get upgrade recommendations based on current usage trends
 *
 * @param subscription - Current subscription
 * @param projectedSeats - Projected seats (optional)
 * @param projectedCaregivers - Projected caregivers (optional)
 * @returns Upgrade recommendation or null
 *
 * @example
 * getUpgradeRecommendation(subscription, 9, 8)
 * // {
 * //   recommended: 'family_plus',
 * //   reason: 'approaching-limit',
 * //   message: "You're using 9 of 10 seats. Upgrade to Family Premium for unlimited seats."
 * // }
 */
export function getUpgradeRecommendation(
  subscription: UserSubscription | null,
  projectedSeats?: number,
  projectedCaregivers?: number
): {
  recommended: SubscriptionPlan
  reason: 'at-limit' | 'approaching-limit' | 'projected-growth'
  message: string
} | null {
  if (!subscription) return null

  const currentPlan = subscription.plan
  const currentSeats = projectedSeats ?? subscription.currentSeats
  const currentCaregivers = projectedCaregivers ?? subscription.currentExternalCaregivers

  const seatUtilization = (currentSeats / subscription.maxSeats) * 100
  const caregiverUtilization = (currentCaregivers / subscription.maxExternalCaregivers) * 100

  // At limit (100%)
  if (seatUtilization >= 100 || caregiverUtilization >= 100) {
    const nextPlan = getNextPlan(currentPlan)
    if (!nextPlan) return null

    return {
      recommended: nextPlan,
      reason: 'at-limit',
      message: `You've reached your plan limits. Upgrade to ${getPlanDisplayName(nextPlan)} for more capacity.`,
    }
  }

  // Approaching limit (80%+)
  if (seatUtilization >= 80 || caregiverUtilization >= 80) {
    const nextPlan = getNextPlan(currentPlan)
    if (!nextPlan) return null

    return {
      recommended: nextPlan,
      reason: 'approaching-limit',
      message: `You're approaching your plan limits. Consider upgrading to ${getPlanDisplayName(nextPlan)}.`,
    }
  }

  // Projected growth (if provided)
  if (projectedSeats || projectedCaregivers) {
    const requiredPlan = getRequiredPlanForUsage(
      projectedSeats ?? currentSeats,
      projectedCaregivers ?? currentCaregivers
    )

    const planHierarchy: SubscriptionPlan[] = [
      'free',
      'single',
      'family_basic',
      'family_plus',
      'family_premium',
    ]

    const currentIndex = planHierarchy.indexOf(currentPlan)
    const requiredIndex = planHierarchy.indexOf(requiredPlan)

    if (requiredIndex > currentIndex) {
      return {
        recommended: requiredPlan,
        reason: 'projected-growth',
        message: `Based on your projected usage, consider upgrading to ${getPlanDisplayName(requiredPlan)}.`,
      }
    }
  }

  return null
}

/**
 * Get the next plan in the hierarchy
 *
 * @param currentPlan - Current plan
 * @returns Next plan or null if already at highest tier
 */
function getNextPlan(currentPlan: SubscriptionPlan): SubscriptionPlan | null {
  const upgradeMap: Record<SubscriptionPlan, SubscriptionPlan | null> = {
    free: 'single',
    single: 'family_basic',
    family_basic: 'family_plus',
    family_plus: 'family_premium',
    family_premium: null,
  }

  return upgradeMap[currentPlan]
}

/**
 * Get display name for a plan
 *
 * @param plan - Subscription plan
 * @returns Human-readable name
 */
function getPlanDisplayName(plan: SubscriptionPlan): string {
  const names: Record<SubscriptionPlan, string> = {
    free: 'Free Trial',
    single: 'Single User',
    family_basic: 'Family Basic',
    family_plus: 'Family Plus',
    family_premium: 'Family Premium',
  }
  return names[plan]
}

/**
 * Check if plan change requires payment update
 *
 * @param fromPlan - Current plan
 * @param toPlan - Target plan
 * @returns true if payment update required
 */
export function requiresPaymentUpdate(
  fromPlan: SubscriptionPlan,
  toPlan: SubscriptionPlan
): boolean {
  // Upgrading from free always requires payment
  if (fromPlan === 'free' && toPlan !== 'free') {
    return true
  }

  // Downgrading to free doesn't require payment
  if (toPlan === 'free') {
    return false
  }

  // Any other plan change requires payment update
  return fromPlan !== toPlan
}

/**
 * Calculate prorated amount for plan change
 * (Placeholder - actual implementation would integrate with Stripe)
 *
 * @param subscription - Current subscription
 * @param targetPlan - Target plan
 * @returns Prorated amount in cents
 */
export function calculateProratedAmount(
  subscription: UserSubscription | null,
  targetPlan: SubscriptionPlan
): number {
  if (!subscription) return 0

  // This is a placeholder - actual implementation would use Stripe's
  // proration calculation based on current period remaining
  console.warn('[Enforcement] calculateProratedAmount is a placeholder')

  return 0
}
