/**
 * Stripe Price ID Mapping
 *
 * Maps subscription plans and billing intervals to Stripe Price IDs
 * This centralizes all Stripe Price ID references for easy management
 */

import { SubscriptionPlan, BillingInterval } from '@/types'

/**
 * Get Stripe Price ID for a given plan and billing interval
 *
 * @param plan - The subscription plan
 * @param billingInterval - Monthly or yearly billing
 * @returns Stripe Price ID (price_xxx)
 */
export function getStripePriceId(
  plan: SubscriptionPlan,
  billingInterval: BillingInterval
): string {
  const priceIds: Record<SubscriptionPlan, Record<BillingInterval, string>> = {
    free: {
      monthly: '', // Free plan has no Stripe price
      yearly: '',
    },
    single: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY ||
               process.env.STRIPE_PRICE_SINGLE_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY ||
              process.env.STRIPE_PRICE_SINGLE_YEARLY || '',
    },
    single_plus: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY ||
               process.env.STRIPE_PRICE_SINGLE_PLUS_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_YEARLY ||
              process.env.STRIPE_PRICE_SINGLE_PLUS_YEARLY || '',
    },
    family_basic: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY ||
               process.env.STRIPE_PRICE_FAMILY_BASIC_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY ||
              process.env.STRIPE_PRICE_FAMILY_BASIC_YEARLY || '',
    },
    family_plus: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY ||
               process.env.STRIPE_PRICE_FAMILY_PLUS_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY ||
              process.env.STRIPE_PRICE_FAMILY_PLUS_YEARLY || '',
    },
    family_premium: {
      monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY ||
               process.env.STRIPE_PRICE_FAMILY_PREMIUM_MONTHLY || '',
      yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY ||
              process.env.STRIPE_PRICE_FAMILY_PREMIUM_YEARLY || '',
    },
  }

  return priceIds[plan][billingInterval]
}

/**
 * Get plan and billing interval from Stripe Price ID
 *
 * @param priceId - Stripe Price ID
 * @returns Object with plan and billingInterval, or null if not found
 */
export function getPlanFromPriceId(priceId: string): {
  plan: SubscriptionPlan
  billingInterval: BillingInterval
} | null {
  const allPlans: SubscriptionPlan[] = [
    'free',
    'single',
    'single_plus',
    'family_basic',
    'family_plus',
    'family_premium',
  ]

  const allIntervals: BillingInterval[] = ['monthly', 'yearly']

  for (const plan of allPlans) {
    for (const interval of allIntervals) {
      if (getStripePriceId(plan, interval) === priceId) {
        return { plan, billingInterval: interval }
      }
    }
  }

  return null
}

/**
 * Validate that all required Stripe Price IDs are configured
 *
 * @returns Array of missing price ID descriptions (empty if all configured)
 */
export function validateStripePriceIds(): string[] {
  const missing: string[] = []

  const plans: Array<{ plan: SubscriptionPlan; name: string }> = [
    { plan: 'single', name: 'Single User' },
    { plan: 'single_plus', name: 'Single User Plus' },
    { plan: 'family_basic', name: 'Family Basic' },
    { plan: 'family_plus', name: 'Family Plus' },
    { plan: 'family_premium', name: 'Family Premium' },
  ]

  const intervals: BillingInterval[] = ['monthly', 'yearly']

  for (const { plan, name } of plans) {
    for (const interval of intervals) {
      const priceId = getStripePriceId(plan, interval)
      if (!priceId) {
        missing.push(`${name} (${interval})`)
      }
    }
  }

  return missing
}
