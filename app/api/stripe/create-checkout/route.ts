/**
 * Stripe Checkout Session Creation
 * Creates a Stripe checkout session for plan upgrades
 */

import { NextRequest, NextResponse } from 'next/server'
import stripe from '@/lib/stripe-config'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { SubscriptionPlan } from '@/types'
import {
  determineOperationType,
  validateTransition,
  handleUpgrade,
  handleDowngrade,
  handleIntervalSwitch,
  handleTrialConversion,
  getOperationMessage,
  type BillingInterval,
  type TransitionParams
} from '@/lib/services/subscription-service'

// Stripe Price IDs - Using your existing configuration from .env.local
const STRIPE_PRICE_IDS: Record<SubscriptionPlan, { monthly: string; yearly: string }> = {
  free: { monthly: '', yearly: '' }, // Free tier has no price
  single: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_YEARLY || '',
  },
  single_plus: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_SINGLE_PLUS_YEARLY || '',
  },
  family_basic: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_BASIC_YEARLY || '',
  },
  family_plus: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PLUS_YEARLY || '',
  },
  family_premium: {
    monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_MONTHLY || '',
    yearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_FAMILY_PREMIUM_YEARLY || '',
  },
}

export async function POST(request: NextRequest) {
  try {
    // 1. Get auth token from header
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // 2. Verify Firebase auth token
    const decodedToken = await auth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    // 3. Parse request body
    const body = await request.json()
    const { plan, billingInterval } = body as {
      plan: SubscriptionPlan
      billingInterval: 'monthly' | 'yearly'
    }

    // Validate plan
    if (!plan || plan === 'free') {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      )
    }

    // Validate billing interval
    if (!billingInterval || !['monthly', 'yearly'].includes(billingInterval)) {
      return NextResponse.json(
        { error: 'Invalid billing interval' },
        { status: 400 }
      )
    }

    // 4. Get Stripe price ID
    const priceId = STRIPE_PRICE_IDS[plan][billingInterval]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID not configured for this plan' },
        { status: 500 }
      )
    }

    // 5. Check if user already has a Stripe customer ID
    const userDoc = await db.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const existingSubscription = userData?.subscription
    let customerId = existingSubscription?.stripeCustomerId

    // 5a. Rate limiting - max 3 subscription changes per 24 hours
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentChanges = await db
      .collection('subscriptionChangeLogs')
      .where('userId', '==', userId)
      .where('timestamp', '>', twentyFourHoursAgo)
      .get()

    if (recentChanges.size >= 3) {
      return NextResponse.json(
        {
          error: 'Too many subscription changes. Please wait 24 hours before making another change.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      )
    }

    // 5b. Universal subscription management - handle all transition types
    if (existingSubscription?.stripeSubscriptionId) {
      const existingStatus = existingSubscription.status as 'active' | 'trialing' | 'canceled' | 'incomplete' | 'past_due' | null

      // Determine what type of operation this is
      const transitionParams: TransitionParams = {
        currentPlan: existingSubscription.plan as SubscriptionPlan,
        currentInterval: existingSubscription.billingInterval as BillingInterval,
        currentStatus: existingStatus,
        newPlan: plan,
        newInterval: billingInterval
      }

      const operationType = determineOperationType(transitionParams)

      // Validate the transition
      const validation = validateTransition(operationType, transitionParams)
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: validation.error,
            code: 'INVALID_TRANSITION'
          },
          { status: 400 }
        )
      }

      // Route to appropriate handler based on operation type
      try {
        switch (operationType) {
          case 'UPGRADE':
            console.log('[Subscription] Processing upgrade:', transitionParams.currentPlan, '→', transitionParams.newPlan)
            const upgradedSubscription = await handleUpgrade(existingSubscription.stripeSubscriptionId, priceId)

            // Update Firestore immediately (webhook will sync as backup)
            await db.collection('users').doc(userId).update({
              'subscription.plan': plan,
              'subscription.billingInterval': billingInterval,
              'subscription.stripePriceId': priceId,
              'subscription.updatedAt': new Date()
            })

            // Audit log
            await db.collection('subscriptionChangeLogs').add({
              userId,
              operationType: 'UPGRADE',
              fromPlan: transitionParams.currentPlan,
              toPlan: plan,
              fromInterval: transitionParams.currentInterval,
              toInterval: billingInterval,
              timestamp: new Date(),
              success: true,
              stripeSubscriptionId: existingSubscription.stripeSubscriptionId
            })

            return NextResponse.json({
              success: true,
              operationType: 'UPGRADE',
              message: getOperationMessage('UPGRADE'),
              subscription: upgradedSubscription
            })

          case 'DOWNGRADE':
            console.log('[Subscription] Scheduling downgrade:', transitionParams.currentPlan, '→', transitionParams.newPlan)
            const schedule = await handleDowngrade(existingSubscription.stripeSubscriptionId, priceId)

            // Audit log
            await db.collection('subscriptionChangeLogs').add({
              userId,
              operationType: 'DOWNGRADE',
              fromPlan: transitionParams.currentPlan,
              toPlan: plan,
              fromInterval: transitionParams.currentInterval,
              toInterval: billingInterval,
              timestamp: new Date(),
              success: true,
              scheduled: true,
              stripeSubscriptionId: existingSubscription.stripeSubscriptionId
            })

            return NextResponse.json({
              success: true,
              operationType: 'DOWNGRADE',
              message: getOperationMessage('DOWNGRADE'),
              schedule
            })

          case 'INTERVAL_SWITCH':
            console.log('[Subscription] Switching interval:', transitionParams.currentInterval, '→', transitionParams.newInterval)
            const switchedSubscription = await handleIntervalSwitch(existingSubscription.stripeSubscriptionId, priceId)

            // Audit log
            await db.collection('subscriptionChangeLogs').add({
              userId,
              operationType: 'INTERVAL_SWITCH',
              fromPlan: transitionParams.currentPlan,
              toPlan: plan,
              fromInterval: transitionParams.currentInterval,
              toInterval: billingInterval,
              timestamp: new Date(),
              success: true,
              stripeSubscriptionId: existingSubscription.stripeSubscriptionId
            })

            return NextResponse.json({
              success: true,
              operationType: 'INTERVAL_SWITCH',
              message: getOperationMessage('INTERVAL_SWITCH'),
              subscription: switchedSubscription
            })

          case 'TRIAL_CONVERSION':
            console.log('[Subscription] Converting trial to paid')
            const convertedSubscription = await handleTrialConversion(existingSubscription.stripeSubscriptionId)

            // Audit log
            await db.collection('subscriptionChangeLogs').add({
              userId,
              operationType: 'TRIAL_CONVERSION',
              fromPlan: transitionParams.currentPlan,
              toPlan: plan,
              fromInterval: transitionParams.currentInterval,
              toInterval: billingInterval,
              timestamp: new Date(),
              success: true,
              stripeSubscriptionId: existingSubscription.stripeSubscriptionId
            })

            return NextResponse.json({
              success: true,
              operationType: 'TRIAL_CONVERSION',
              message: getOperationMessage('TRIAL_CONVERSION'),
              subscription: convertedSubscription
            })

          case 'REACTIVATION':
            console.log('[Subscription] Reactivating canceled subscription')
            // Fall through to create new checkout session below
            break

          case 'NEW_SUBSCRIPTION':
            // Fall through to create new checkout session below
            break

          default:
            return NextResponse.json(
              {
                error: 'Invalid subscription operation',
                code: 'INVALID_OPERATION'
              },
              { status: 400 }
            )
        }
      } catch (error: any) {
        console.error('[Subscription] Operation error:', error)
        return NextResponse.json(
          {
            error: error.message || 'Failed to process subscription change',
            code: 'STRIPE_ERROR'
          },
          { status: 500 }
        )
      }
    }

    // 6. Create or retrieve Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUID: userId,
        },
      })
      customerId = customer.id

      // Save customer ID to Firestore
      await db.collection('users').doc(userId).update({
        'subscription.stripeCustomerId': customerId,
      })
    }

    // 7. Create checkout session
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=subscription&session_id={CHECKOUT_SESSION_ID}`
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        firebaseUid: userId,
        plan: plan,
        billingInterval: billingInterval,
      },
      subscription_data: {
        metadata: {
          firebaseUid: userId,
          plan: plan,
        },
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      // Billing address collection
      billing_address_collection: 'auto',
    })

    // 8. Return checkout session
    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })

  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
