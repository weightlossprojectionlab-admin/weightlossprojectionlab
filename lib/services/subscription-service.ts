/**
 * Universal Subscription Management Service
 *
 * Handles all subscription state transitions:
 * - Upgrades (immediate, with proration)
 * - Downgrades (scheduled for end of period)
 * - Billing interval switches (scheduled)
 * - Trial conversions
 * - New subscriptions
 * - Reactivations
 */

import Stripe from 'stripe'
import { SubscriptionPlan } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover'
})

// Plan tier hierarchy for upgrade/downgrade detection
export const PLAN_TIERS: Record<SubscriptionPlan, number> = {
  free: 0,
  single: 1,
  single_plus: 2,
  family_basic: 3,
  family_plus: 4,
  family_premium: 5
}

export type BillingInterval = 'monthly' | 'yearly'

export type OperationType =
  | 'UPGRADE'
  | 'DOWNGRADE'
  | 'INTERVAL_SWITCH'
  | 'TRIAL_CONVERSION'
  | 'NEW_SUBSCRIPTION'
  | 'REACTIVATION'
  | 'INVALID'

export interface TransitionParams {
  currentPlan: SubscriptionPlan | null
  currentInterval: BillingInterval | null
  currentStatus: 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | null
  newPlan: SubscriptionPlan
  newInterval: BillingInterval
}

/**
 * Determine what type of subscription operation is being requested
 */
export function determineOperationType(params: TransitionParams): OperationType {
  const { currentPlan, currentInterval, currentStatus, newPlan, newInterval } = params

  // No existing subscription or canceled/incomplete - treat as new
  if (!currentStatus || currentStatus === 'canceled' || currentStatus === 'incomplete') {
    return currentStatus === 'canceled' ? 'REACTIVATION' : 'NEW_SUBSCRIPTION'
  }

  // Trial conversion (trialing → active paid, same plan & interval)
  if (currentStatus === 'trialing' && currentPlan === newPlan && currentInterval === newInterval) {
    return 'TRIAL_CONVERSION'
  }

  // No current plan info - treat as new
  if (!currentPlan || !currentInterval) {
    return 'NEW_SUBSCRIPTION'
  }

  const currentTier = PLAN_TIERS[currentPlan]
  const newTier = PLAN_TIERS[newPlan]

  // Tier change (upgrade or downgrade)
  if (currentTier !== newTier) {
    return newTier > currentTier ? 'UPGRADE' : 'DOWNGRADE'
  }

  // Same tier, different billing interval
  if (currentInterval !== newInterval) {
    return 'INTERVAL_SWITCH'
  }

  // Same plan, same interval - should not happen
  return 'INVALID'
}

/**
 * Validate if a subscription transition is allowed
 */
export function validateTransition(
  operationType: OperationType,
  params: TransitionParams
): { valid: boolean; error?: string } {
  const { currentPlan, newPlan } = params

  // Invalid operation (user already on this exact plan)
  if (operationType === 'INVALID') {
    return {
      valid: false,
      error: 'You are already on this plan and billing interval.'
    }
  }

  // Block family → single downgrades (household size incompatibility)
  if (
    operationType === 'DOWNGRADE' &&
    currentPlan &&
    PLAN_TIERS[currentPlan] >= PLAN_TIERS.family_basic &&
    PLAN_TIERS[newPlan] <= PLAN_TIERS.single_plus
  ) {
    return {
      valid: false,
      error: 'Cannot downgrade from Family plans to Single plans. Your household has multiple members. Please contact support if you need assistance.'
    }
  }

  // All other transitions are valid
  return { valid: true }
}

/**
 * Handle immediate upgrade with proration
 */
export async function handleUpgrade(
  stripeSubscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    // Update subscription immediately with proration
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId
        }
      ],
      proration_behavior: 'always_invoice', // Charge prorated amount immediately
      payment_behavior: 'error_if_incomplete' // Fail if payment cannot be collected
    })

    return updated
  } catch (error: any) {
    console.error('[Subscription Service] Upgrade error:', error)
    throw new Error(error.message || 'Failed to process upgrade')
  }
}

/**
 * Handle scheduled downgrade (takes effect at end of billing period)
 */
export async function handleDowngrade(
  stripeSubscriptionId: string,
  newPriceId: string
): Promise<Stripe.SubscriptionSchedule> {
  try {
    // Get current subscription
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId) as any
    const currentPeriodEnd = subscription.current_period_end

    // Create subscription schedule to change plan at period end
    const schedule = await stripe.subscriptionSchedules.create({
      from_subscription: stripeSubscriptionId
    })

    // Update schedule with two phases: current (until period end) and new (after period end)
    const updatedSchedule = await stripe.subscriptionSchedules.update(schedule.id, {
      phases: [
        {
          // Current phase - keep existing plan until period ends
          items: subscription.items.data.map((item: any) => ({
            price: item.price.id,
            quantity: item.quantity || 1
          })),
          start_date: subscription.current_period_start,
          end_date: currentPeriodEnd
        },
        {
          // New phase - downgraded plan starting at period end
          items: [{ price: newPriceId, quantity: 1 }],
          start_date: currentPeriodEnd
        }
      ]
    })

    return updatedSchedule
  } catch (error: any) {
    console.error('[Subscription Service] Downgrade error:', error)
    throw new Error(error.message || 'Failed to schedule downgrade')
  }
}

/**
 * Handle billing interval switch (scheduled for end of period)
 */
export async function handleIntervalSwitch(
  stripeSubscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

    // Schedule interval change for end of current billing period
    const updated = await stripe.subscriptions.update(stripeSubscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: newPriceId
        }
      ],
      proration_behavior: 'none', // No proration for interval switches
      billing_cycle_anchor: 'unchanged' // Keep current billing date
    })

    return updated
  } catch (error: any) {
    console.error('[Subscription Service] Interval switch error:', error)
    throw new Error(error.message || 'Failed to switch billing interval')
  }
}

/**
 * Handle trial conversion (end trial immediately and start billing)
 */
export async function handleTrialConversion(
  stripeSubscriptionId: string
): Promise<Stripe.Subscription> {
  try {
    // End trial immediately and start paid subscription
    const subscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      trial_end: 'now'
    })

    return subscription
  } catch (error: any) {
    console.error('[Subscription Service] Trial conversion error:', error)
    throw new Error(error.message || 'Failed to convert trial to paid subscription')
  }
}

/**
 * Get user-friendly message for operation type
 */
export function getOperationMessage(operationType: OperationType): string {
  const messages: Record<OperationType, string> = {
    UPGRADE: 'Subscription upgraded successfully! Your new features are now available.',
    DOWNGRADE: 'Downgrade scheduled. Your plan will change at the end of your current billing period.',
    INTERVAL_SWITCH: 'Billing interval change scheduled for the end of your current period.',
    TRIAL_CONVERSION: 'Trial converted to paid subscription successfully!',
    NEW_SUBSCRIPTION: 'Subscription created successfully!',
    REACTIVATION: 'Subscription reactivated successfully!',
    INVALID: 'No changes made - you are already on this plan.'
  }

  return messages[operationType]
}
