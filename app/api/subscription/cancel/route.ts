/**
 * Cancel Subscription API
 *
 * POST /api/subscription/cancel
 * Cancels subscription but retains access until end of billing period
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe-config'
import { logger } from '@/lib/logger'
import { CANCELLATION_POLICY } from '@/lib/subscription-policies'

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

    logger.info('[Cancel Subscription] Processing cancellation', { userId })

    // Get user's subscription
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const subscription = userDoc.data()?.subscription

    if (!subscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      )
    }

    // Check if subscription can be canceled
    if (subscription.status !== 'active' && subscription.status !== 'trialing') {
      return NextResponse.json(
        { success: false, error: 'Subscription cannot be canceled' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Handle trial cancellation (immediate)
    if (subscription.status === 'trialing') {
      await adminDb.collection('users').doc(userId).update({
        'subscription.status': 'canceled',
        'subscription.canceledAt': now,
        updatedAt: now,
      })

      logger.info('[Cancel Subscription] Trial canceled (immediate)', { userId })

      return NextResponse.json({
        success: true,
        message: 'Your trial has been canceled.',
        immediateEffect: true,
      })
    }

    // Handle paid subscription cancellation (retain access until period end)
    if (subscription.stripeSubscriptionId) {
      // Cancel Stripe subscription at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      // Update Firestore to reflect cancellation
      await adminDb.collection('users').doc(userId).update({
        'subscription.status': 'canceled',
        'subscription.canceledAt': now,
        'subscription.cancelAtPeriodEnd': true,
        updatedAt: now,
      })

      const periodEndDate = subscription.currentPeriodEnd
        ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })
        : 'the end of your billing period'

      logger.info('[Cancel Subscription] Subscription canceled (access retained)', {
        userId,
        periodEnd: subscription.currentPeriodEnd,
      })

      return NextResponse.json({
        success: true,
        message: `Your subscription has been canceled. You'll retain access until ${periodEndDate}.`,
        immediateEffect: false,
        accessUntil: subscription.currentPeriodEnd,
      })
    }

    // Fallback for subscriptions without Stripe ID
    await adminDb.collection('users').doc(userId).update({
      'subscription.status': 'canceled',
      'subscription.canceledAt': now,
      updatedAt: now,
    })

    return NextResponse.json({
      success: true,
      message: 'Your subscription has been canceled.',
      immediateEffect: true,
    })
  } catch (error: any) {
    logger.error('[Cancel Subscription] Error canceling subscription', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
