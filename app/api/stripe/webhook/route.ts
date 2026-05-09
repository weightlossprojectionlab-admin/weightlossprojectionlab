/**
 * Stripe Webhook Handler
 * Handles Stripe events and syncs subscription status with Firestore
 */

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import stripe from '@/lib/stripe-config'
import { adminDb as db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
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
function resolvePlanFromSubscription(subscription: Stripe.Subscription): {
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

// Read at request time, not module load — Vercel build env doesn't have it.
function getWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  return secret
}

export async function POST(request: NextRequest) {
  logger.info('[Stripe Webhook] Request received')
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      logger.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, getWebhookSecret())
    } catch (err: any) {
      logger.error('[Stripe Webhook] Signature verification failed', err as Error)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    logger.info(`Received Stripe event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(sub)

        // Also check if subscription is set to cancel at period end
        if (sub.cancel_at_period_end) {
          await handleSubscriptionCanceledAtPeriodEnd(sub)
        }
        break
      }

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        break

      default:
        logger.info(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    return errorResponse(error, { route: '/api/stripe/webhook', operation: 'handle' })
  }
}

/**
 * Handle checkout.session.completed event
 * User completed payment - activate their subscription
 */
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.firebaseUid

  if (!userId) {
    logger.error('Missing firebaseUid in checkout session metadata')
    return
  }

  // Get subscription details
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Derive plan from the live price (consistent with handleSubscriptionUpdated)
  // rather than metadata, so portal changes never desync.
  const { plan, billingInterval } = resolvePlanFromSubscription(subscription)
  if (!plan) {
    logger.error('[Stripe Webhook] Could not resolve plan from checkout subscription', undefined, {
      userId,
      subscriptionId,
      priceId: subscription.items.data[0]?.price?.id,
    })
    return
  }

  logger.info(`Checkout completed for user ${userId}, plan: ${plan}`)

  // Update user's subscription in Firestore
  await updateUserSubscription(userId, subscription, plan, billingInterval)

  // Confirm referral conversion if this user was referred
  const referralCode = session.metadata?.referralCode
  const referrerUserId = session.metadata?.referrerUserId
  if (referralCode && referrerUserId) {
    try {
      const { confirmConversion } = await import('@/lib/referral-service')
      const priceCents = session.amount_total || 0
      await confirmConversion(userId, plan, priceCents)
      logger.info('[Webhook] Referral conversion confirmed', { userId, referralCode, referrerUserId, priceCents })
    } catch (refError) {
      logger.error('[Webhook] Failed to confirm referral conversion', refError as Error)
    }
  }
}

/**
 * Handle customer.subscription.created event
 * Mostly logged — the actual Firestore write happens via
 * checkout.session.completed (which has the price details we need).
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUid

  if (!userId) {
    logger.error('Missing firebaseUid in subscription metadata')
    return
  }

  logger.info(`Subscription created for user ${userId}`)
}

/**
 * Handle customer.subscription.updated event
 * Subscription was modified (plan change, renewal, etc.)
 *
 * IMPORTANT: derive `plan` from the live Stripe price ID, not from
 * subscription.metadata.plan. Customer Portal plan changes update the
 * price but leave metadata frozen at the original plan name — reading
 * metadata.plan would write a stale plan to Firestore on every upgrade.
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUid

  if (!userId) {
    logger.error('Missing firebaseUid in subscription metadata')
    return
  }

  const { plan, billingInterval } = resolvePlanFromSubscription(subscription)

  if (!plan) {
    logger.error('[Stripe Webhook] Could not resolve plan for subscription', undefined, {
      userId,
      subscriptionId: subscription.id,
      priceId: subscription.items.data[0]?.price?.id,
    })
    return
  }

  logger.info(`Subscription updated for user ${userId} → plan=${plan} interval=${billingInterval}`)

  await updateUserSubscription(userId, subscription, plan, billingInterval)
}

/**
 * Handle when subscription is set to cancel at period end
 * User retains access until currentPeriodEnd
 */
async function handleSubscriptionCanceledAtPeriodEnd(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUid

  if (!userId) {
    logger.error('Missing firebaseUid in subscription metadata')
    return
  }

  logger.info(`Subscription set to cancel at period end for user ${userId}`)

  const currentPeriodEnd = (subscription as any).current_period_end

  // Update status to 'canceled' but retain access until period end
  await db.collection('users').doc(userId).update({
    'subscription.status': 'canceled',
    'subscription.canceledAt': new Date(),
    'subscription.cancelAtPeriodEnd': true,
    'subscription.currentPeriodEnd': currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    updatedAt: new Date(),
  })

  logger.info(`User ${userId} will retain access until ${new Date(currentPeriodEnd * 1000).toISOString()}`)
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was canceled
 * NOTE: This fires when subscription actually ends (after period end if cancel_at_period_end=true)
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUid

  if (!userId) {
    logger.error('Missing firebaseUid in subscription metadata')
    return
  }

  logger.info(`Subscription deleted for user ${userId}`)

  // Mark subscription as expired (not just canceled, since access should now be blocked)
  const currentPeriodEnd = (subscription as any).current_period_end
  await db.collection('users').doc(userId).update({
    'subscription.status': 'expired',
    'subscription.currentPeriodEnd': currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
    'subscription.canceledAt': new Date(),
    updatedAt: new Date(),
  })

  logger.info(`Subscription access ended for user ${userId}`)
}

/**
 * Handle invoice.payment_succeeded event
 * Payment was successful - renew subscription
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = (invoice as any).subscription_details?.metadata?.firebaseUid || invoice.metadata?.firebaseUid

  if (!userId) {
    logger.info('No firebaseUid in invoice metadata, skipping')
    return
  }

  logger.info(`Payment succeeded for user ${userId}`)

  // Update subscription status to active
  await db.collection('users').doc(userId).update({
    'subscription.status': 'active',
    updatedAt: new Date(),
  })
}

/**
 * Handle invoice.payment_failed event
 * Payment failed - mark subscription as past_due
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const userId = (invoice as any).subscription_details?.metadata?.firebaseUid || invoice.metadata?.firebaseUid

  if (!userId) {
    logger.info('No firebaseUid in invoice metadata, skipping')
    return
  }

  logger.info(`Payment failed for user ${userId}`)

  // Mark subscription as past_due
  await db.collection('users').doc(userId).update({
    'subscription.status': 'past_due',
    updatedAt: new Date(),
  })

  // TODO: Send email notification to user
}

/**
 * Update user's subscription in Firestore
 */
async function updateUserSubscription(
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

  // Update Firestore
  await db.collection('users').doc(userId).update({
    'subscription.plan': plan,
    'subscription.billingInterval': billingInterval,
    'subscription.status': status,
    'subscription.currentPeriodStart': (subscription as any).current_period_start ? new Date(((subscription as any).current_period_start as number) * 1000) : new Date(),
    'subscription.currentPeriodEnd': (subscription as any).current_period_end ? new Date(((subscription as any).current_period_end as number) * 1000) : null,
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

// Disable body parser for webhook route
export const config = {
  api: {
    bodyParser: false,
  },
}
