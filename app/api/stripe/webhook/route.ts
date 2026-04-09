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
  const userId = session.metadata?.firebaseUID
  const plan = session.metadata?.plan as SubscriptionPlan
  const billingInterval = session.metadata?.billingInterval as 'monthly' | 'yearly'

  if (!userId || !plan) {
    logger.error('Missing metadata in checkout session')
    return
  }

  logger.info(`Checkout completed for user ${userId}, plan: ${plan}`)

  // Get subscription details
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

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
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUID
  const plan = subscription.metadata?.plan as SubscriptionPlan

  if (!userId || !plan) {
    logger.error('Missing metadata in subscription')
    return
  }

  logger.info(`Subscription created for user ${userId}`)

  // Subscription will be updated by checkout.session.completed
  // This event is mainly for logging
}

/**
 * Handle customer.subscription.updated event
 * Subscription was modified (plan change, renewal, etc.)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUID
  const plan = subscription.metadata?.plan as SubscriptionPlan

  if (!userId || !plan) {
    logger.error('Missing metadata in subscription')
    return
  }

  logger.info(`Subscription updated for user ${userId}`)

  // Determine billing interval from subscription items
  const billingInterval = subscription.items.data[0]?.plan?.interval === 'year' ? 'yearly' : 'monthly'

  await updateUserSubscription(userId, subscription, plan, billingInterval)
}

/**
 * Handle when subscription is set to cancel at period end
 * User retains access until currentPeriodEnd
 */
async function handleSubscriptionCanceledAtPeriodEnd(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUID

  if (!userId) {
    logger.error('Missing firebaseUID in subscription metadata')
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
  const userId = subscription.metadata?.firebaseUID

  if (!userId) {
    logger.error('Missing firebaseUID in subscription metadata')
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
  const userId = (invoice as any).subscription_details?.metadata?.firebaseUID || invoice.metadata?.firebaseUID

  if (!userId) {
    logger.info('No firebaseUID in invoice metadata, skipping')
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
  const userId = (invoice as any).subscription_details?.metadata?.firebaseUID || invoice.metadata?.firebaseUID

  if (!userId) {
    logger.info('No firebaseUID in invoice metadata, skipping')
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
