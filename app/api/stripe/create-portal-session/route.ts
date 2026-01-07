/**
 * Stripe Customer Portal Session API
 *
 * POST /api/stripe/create-portal-session
 * Creates a Stripe Customer Portal session for subscription management
 * (cancel, update payment method, view invoices, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe-config'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
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

    logger.info('[Stripe Portal] Creating portal session', { userId })

    // Get user's Stripe customer ID from Firebase
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    const stripeCustomerId = userData?.subscription?.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { returnUrl } = body

    // Create portal session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/profile`
    })

    logger.info('[Stripe Portal] Session created successfully', {
      userId,
      customerId: stripeCustomerId,
      sessionId: session.id
    })

    return NextResponse.json({
      success: true,
      url: session.url
    })
  } catch (error: any) {
    logger.error('[Stripe Portal] Error creating portal session', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create portal session' },
      { status: 500 }
    )
  }
}
