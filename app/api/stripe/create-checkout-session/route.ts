/**
 * Stripe Create Checkout Session API
 *
 * POST /api/stripe/create-checkout-session
 * Creates a Stripe Checkout session for subscription signup or upgrade
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-config'
import { adminAuth } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid
    const userEmail = decodedToken.email

    if (!userEmail) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { priceId, successUrl, cancelUrl } = body

    if (!priceId) {
      return NextResponse.json(
        { success: false, error: 'Price ID is required' },
        { status: 400 }
      )
    }

    logger.info('[Stripe Checkout] Creating checkout session', {
      userId,
      userEmail,
      priceId
    })

    // Create or retrieve Stripe customer
    const customers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    })

    let customerId: string
    if (customers.data.length > 0) {
      customerId = customers.data[0].id
      logger.info('[Stripe Checkout] Existing customer found', { customerId })
    } else {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: {
          firebaseUid: userId
        }
      })
      customerId = customer.id
      logger.info('[Stripe Checkout] New customer created', { customerId })
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1
        }
      ],
      success_url: successUrl || `${process.env.NEXT_PUBLIC_APP_URL}/profile?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/profile`,
      metadata: {
        firebaseUid: userId
      },
      subscription_data: {
        metadata: {
          firebaseUid: userId
        }
      }
    })

    logger.info('[Stripe Checkout] Session created successfully', {
      userId,
      customerId,
      sessionId: session.id
    })

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url
    })
  } catch (error: any) {
    logger.error('[Stripe Checkout] Error creating checkout session', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
