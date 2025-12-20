/**
 * Stripe Webhook Handler
 * Handles Stripe events and syncs subscription status with Firestore
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminDb as db } from '@/lib/firebase-admin'
import { SubscriptionPlan } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      )
    }

    console.log(`Received Stripe event: ${event.type}`)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session)
        break

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
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
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
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
    console.error('Missing metadata in checkout session')
    return
  }

  console.log(`Checkout completed for user ${userId}, plan: ${plan}`)

  // Get subscription details
  const subscriptionId = session.subscription as string
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)

  // Update user's subscription in Firestore
  await updateUserSubscription(userId, subscription, plan, billingInterval)
}

/**
 * Handle customer.subscription.created event
 */
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUID
  const plan = subscription.metadata?.plan as SubscriptionPlan

  if (!userId || !plan) {
    console.error('Missing metadata in subscription')
    return
  }

  console.log(`Subscription created for user ${userId}`)

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
    console.error('Missing metadata in subscription')
    return
  }

  console.log(`Subscription updated for user ${userId}`)

  // Determine billing interval from subscription items
  const billingInterval = subscription.items.data[0]?.plan?.interval === 'year' ? 'yearly' : 'monthly'

  await updateUserSubscription(userId, subscription, plan, billingInterval)
}

/**
 * Handle customer.subscription.deleted event
 * Subscription was canceled
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.firebaseUID

  if (!userId) {
    console.error('Missing firebaseUID in subscription metadata')
    return
  }

  console.log(`Subscription deleted for user ${userId}`)

  // Mark subscription as canceled
  await db.collection('users').doc(userId).update({
    'subscription.status': 'canceled',
    'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
    updatedAt: new Date(),
  })
}

/**
 * Handle invoice.payment_succeeded event
 * Payment was successful - renew subscription
 */
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const userId = invoice.subscription_details?.metadata?.firebaseUID || invoice.metadata?.firebaseUID

  if (!userId) {
    console.log('No firebaseUID in invoice metadata, skipping')
    return
  }

  console.log(`Payment succeeded for user ${userId}`)

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
  const userId = invoice.subscription_details?.metadata?.firebaseUID || invoice.metadata?.firebaseUID

  if (!userId) {
    console.log('No firebaseUID in invoice metadata, skipping')
    return
  }

  console.log(`Payment failed for user ${userId}`)

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
    'subscription.currentPeriodStart': new Date(subscription.current_period_start * 1000),
    'subscription.currentPeriodEnd': new Date(subscription.current_period_end * 1000),
    'subscription.stripeCustomerId': subscription.customer as string,
    'subscription.stripeSubscriptionId': subscription.id,
    'subscription.stripePriceId': subscription.items.data[0]?.price?.id || null,
    'subscription.maxSeats': seatLimits[plan],
    'subscription.maxExternalCaregivers': caregiverLimits[plan],
    'subscription.maxPatients': seatLimits[plan],
    updatedAt: new Date(),
  })

  console.log(`Updated subscription for user ${userId}: ${plan} (${status})`)
}

// Disable body parser for webhook route
export const config = {
  api: {
    bodyParser: false,
  },
}
