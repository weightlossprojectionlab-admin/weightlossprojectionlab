/**
 * Stripe Webhook Handler
 *
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle
 *
 * Events handled:
 * - customer.subscription.created
 * - customer.subscription.updated
 * - customer.subscription.deleted
 * - invoice.payment_succeeded
 * - invoice.payment_failed
 */

import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe, verifyWebhookSignature } from '@/lib/stripe-config'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      logger.error('[Stripe Webhook] Missing signature')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = verifyWebhookSignature(body, signature)
    } catch (err: any) {
      logger.error('[Stripe Webhook] Signature verification failed', err)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    logger.info('[Stripe Webhook] Event received', {
      type: event.type,
      id: event.id
    })

    // Handle the event
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription)
        break

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
        logger.info('[Stripe Webhook] Unhandled event type', { type: event.type })
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    logger.error('[Stripe Webhook] Error processing webhook', error)
    return NextResponse.json(
      { error: error.message || 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

/**
 * Handle subscription created or updated
 */
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const firebaseUid = subscription.metadata?.firebaseUid

  if (!firebaseUid) {
    logger.warn('[Stripe Webhook] Subscription missing firebaseUid', {
      subscriptionId: subscription.id
    })
    return
  }

  logger.info('[Stripe Webhook] Updating subscription', {
    userId: firebaseUid,
    subscriptionId: subscription.id,
    status: subscription.status
    })

  // Map Stripe subscription to Firebase subscription data
  const priceId = subscription.items.data[0]?.price.id
  let plan: string = 'free'
  let billingInterval: 'monthly' | 'yearly' = 'monthly'

  // Determine plan and billing interval based on price ID
  // Monthly plans
  if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY) {
    plan = 'single'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY) {
    plan = 'family_basic'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY) {
    plan = 'family_plus'
    billingInterval = 'monthly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY) {
    plan = 'family_premium'
    billingInterval = 'monthly'
  }
  // Yearly plans
  else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY) {
    plan = 'single'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY) {
    plan = 'family_basic'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY) {
    plan = 'family_plus'
    billingInterval = 'yearly'
  } else if (priceId === process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY) {
    plan = 'family_premium'
    billingInterval = 'yearly'
  }

  const subscriptionData = {
    plan,
    billingInterval,
    status: subscription.status,
    stripeCustomerId: subscription.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    updatedAt: new Date().toISOString()
  }

  await adminDb
    .collection('users')
    .doc(firebaseUid)
    .set(
      {
        subscription: subscriptionData
      },
      { merge: true }
    )

  logger.info('[Stripe Webhook] Subscription updated in Firebase', {
    userId: firebaseUid,
    plan,
    status: subscription.status
  })
}

/**
 * Handle subscription deleted/cancelled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const firebaseUid = subscription.metadata?.firebaseUid

  if (!firebaseUid) {
    logger.warn('[Stripe Webhook] Subscription missing firebaseUid', {
      subscriptionId: subscription.id
    })
    return
  }

  logger.info('[Stripe Webhook] Deleting subscription', {
    userId: firebaseUid,
    subscriptionId: subscription.id
  })

  await adminDb
    .collection('users')
    .doc(firebaseUid)
    .set(
      {
        subscription: {
          plan: null,
          status: 'canceled',
          stripeSubscriptionId: null,
          canceledAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      },
      { merge: true }
    )

  logger.info('[Stripe Webhook] Subscription deleted in Firebase', {
    userId: firebaseUid
  })
}

/**
 * Handle successful payment
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  logger.info('[Stripe Webhook] Payment succeeded', {
    invoiceId: invoice.id,
    subscriptionId
  })

  // Could add payment history logging here if needed
}

/**
 * Handle failed payment
 */
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  logger.error('[Stripe Webhook] Payment failed', {
    invoiceId: invoice.id,
    subscriptionId
  })

  // Could send notification to user about failed payment
  // Could update subscription status to 'past_due'
}
