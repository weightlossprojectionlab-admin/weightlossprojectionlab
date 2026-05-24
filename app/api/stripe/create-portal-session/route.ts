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
    const userEmail = decodedToken.email

    logger.info('[Stripe Portal] Creating portal session', { userId })

    // Get user's Stripe customer ID from Firebase
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()
    let stripeCustomerId: string | undefined = userData?.subscription?.stripeCustomerId

    // Recovery path: Firestore record might lack stripeCustomerId
    // (e.g., the auto-granted Firestore-only trial we write at
    // onboarding doesn't go through Stripe, OR the user's record
    // lost the linkage from an earlier write that didn't preserve
    // it). If we have an email, fall back to looking up the customer
    // by email and writing the linkage back so subsequent calls hit
    // the fast path.
    if (!stripeCustomerId && userEmail) {
      try {
        const customers = await stripe.customers.list({ email: userEmail, limit: 1 })
        if (customers.data.length > 0) {
          stripeCustomerId = customers.data[0].id
          logger.info('[Stripe Portal] Recovered stripeCustomerId via email lookup', {
            userId,
            stripeCustomerId,
          })
          // Best-effort writeback so the next call hits the cached
          // value instead of paying for another Stripe roundtrip.
          await adminDb
            .collection('users')
            .doc(userId)
            .update({
              'subscription.stripeCustomerId': stripeCustomerId,
            })
            .catch((err: unknown) => {
              logger.warn('[Stripe Portal] Linkage writeback failed (non-fatal)', {
                userId,
                error: (err as Error)?.message,
              })
            })
        }
      } catch (lookupErr: any) {
        logger.warn('[Stripe Portal] Customer lookup failed', {
          userId,
          email: userEmail,
          error: lookupErr?.message,
        })
      }
    }

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
