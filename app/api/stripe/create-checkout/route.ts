/**
 * Stripe Checkout Session Creation
 * Creates a Stripe checkout session for plan upgrades
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminAuth as auth, adminDb as db } from '@/lib/firebase-admin'
import { SubscriptionPlan } from '@/types'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-11-17.clover',
})

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

    // 5a. Enforce one subscription per account
    // Check if user already has an active subscription
    if (existingSubscription?.stripeSubscriptionId) {
      const existingStatus = existingSubscription.status

      // Prevent creating new subscription if user has active/trialing subscription
      if (existingStatus === 'active' || existingStatus === 'trialing') {
        return NextResponse.json(
          {
            error: 'You already have an active subscription. Please use the Customer Portal to manage or upgrade your plan.',
            code: 'EXISTING_SUBSCRIPTION'
          },
          { status: 400 }
        )
      }

      // If subscription is canceled/expired/past_due, we can allow creating a new one
      // This handles cases where users canceled and want to re-subscribe
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
