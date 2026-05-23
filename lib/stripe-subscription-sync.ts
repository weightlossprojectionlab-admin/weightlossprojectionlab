/**
 * Stripe subscription sync helpers — shared between the webhook
 * handler and any recovery script that needs to write a Stripe
 * subscription state into Firestore.
 *
 * Lives here (not in the route file) because Next.js App Router routes
 * may only export the recognized handler names (`GET`, `POST`, etc.).
 * Exporting helpers from a route file passes `tsc --noEmit` but the
 * Next.js build phase generates type validation files under
 * `.next/types/` that flag the extra exports as invalid — Vercel's
 * `next build` then fails. Lifting the helpers to a lib module is the
 * proper home: the webhook imports them, and so does the sync script,
 * with no parallel mapping to keep in sync.
 *
 * Behavior is unchanged from when these lived in
 * `app/api/stripe/webhook/route.ts`.
 */

import type Stripe from 'stripe'
import { adminDb as db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { SubscriptionPlan } from '@/types'
import { getPlanFromPriceId } from '@/lib/stripe-price-mapping'

/**
 * Derive the canonical plan + billing interval from the live Stripe
 * price on the subscription. Customer Portal upgrades change the
 * subscription's price but never touch its metadata, so reading
 * `metadata.plan` alone produces a stale plan name on every plan
 * change after the initial checkout. The metadata.plan fallback
 * stays only for legacy subs whose price isn't in our mapping yet.
 */
export function resolvePlanFromSubscription(subscription: Stripe.Subscription): {
  plan: SubscriptionPlan | null
  billingInterval: 'monthly' | 'yearly'
} {
  const priceId = subscription.items.data[0]?.price?.id
  if (priceId) {
    const mapped = getPlanFromPriceId(priceId)
    if (mapped) {
      return { plan: mapped.plan, billingInterval: mapped.billingInterval }
    }
  }
  // Fallback: trust metadata for legacy subs whose price isn't mapped.
  // This is the path that broke on Customer Portal upgrades — kept as
  // a safety net but no longer the primary source.
  const metaPlan = subscription.metadata?.plan as SubscriptionPlan | undefined
  const intervalRaw = subscription.items.data[0]?.plan?.interval
  return {
    plan: metaPlan ?? null,
    billingInterval: intervalRaw === 'year' ? 'yearly' : 'monthly',
  }
}

/**
 * Update user's subscription in Firestore from a Stripe subscription.
 * Caller has already resolved plan + billingInterval via
 * `resolvePlanFromSubscription` and confirmed `plan` is non-null.
 */
export async function updateUserSubscription(
  userId: string,
  subscription: Stripe.Subscription,
  plan: SubscriptionPlan,
  billingInterval: 'monthly' | 'yearly'
) {
  // Map plan to seat limits
  const seatLimits: Record<SubscriptionPlan, number> = {
    free: 1,
    single: 1,
    single_plus: 1,
    family_basic: 5,
    family_plus: 10,
    family_premium: 20,
  }

  const caregiverLimits: Record<SubscriptionPlan, number> = {
    free: 0,
    single: 0,
    single_plus: 3,
    family_basic: 5,
    family_plus: 10,
    family_premium: 50,
  }

  // Determine subscription status
  let status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  if (subscription.status === 'active') {
    status = 'active'
  } else if (subscription.status === 'trialing') {
    status = 'trialing'
  } else if (subscription.status === 'past_due') {
    status = 'past_due'
  } else if (subscription.status === 'canceled') {
    status = 'canceled'
  } else {
    status = 'expired'
  }

  // Stripe API shift: in recent versions, current_period_start /
  // current_period_end moved from the Subscription object onto the
  // subscription's items. Read items first, fall back to the legacy
  // field for older API versions. Without this, modern Stripe returns
  // undefined for the legacy field and we'd write
  // currentPeriodEnd=null — which the UserSubscription type treats as
  // "grandfathered/no expiration" (types/index.ts:276), silently
  // granting permanent access on every active subscription.
  const item: any = subscription.items.data[0]
  const periodStart =
    item?.current_period_start ?? (subscription as any).current_period_start
  const periodEnd =
    item?.current_period_end ?? (subscription as any).current_period_end

  // Update Firestore
  await db.collection('users').doc(userId).update({
    'subscription.plan': plan,
    'subscription.billingInterval': billingInterval,
    'subscription.status': status,
    'subscription.currentPeriodStart': periodStart ? new Date((periodStart as number) * 1000) : new Date(),
    'subscription.currentPeriodEnd': periodEnd ? new Date((periodEnd as number) * 1000) : null,
    'subscription.stripeCustomerId': subscription.customer as string,
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.stripePriceId': subscription.items.data[0]?.price?.id || null,
    'subscription.maxSeats': seatLimits[plan],
    'subscription.maxExternalCaregivers': caregiverLimits[plan],
    'subscription.maxPatients': seatLimits[plan],
    updatedAt: new Date(),
  })

  logger.info(`Updated subscription for user ${userId}: ${plan} (${status})`)
}
