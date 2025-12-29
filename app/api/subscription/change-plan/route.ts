/**
 * Change Subscription Plan API
 *
 * POST /api/subscription/change-plan
 * Changes subscription plan with proper timing:
 * - Upgrades: Immediate effect
 * - Downgrades: Effect at end of billing cycle
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { stripe } from '@/lib/stripe-config'
import { logger } from '@/lib/logger'
import { SubscriptionPlan, BillingInterval, SEAT_LIMITS, EXTERNAL_CAREGIVER_LIMITS, HOUSEHOLD_LIMITS } from '@/types'
import {
  PLAN_CHANGE_POLICY,
  isUpgrade,
  isDowngrade,
  getPlanChangeTiming,
  getPlanChangeMessage,
} from '@/lib/subscription-policies'
import { getStripePriceId } from '@/lib/stripe-price-mapping'

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

    const body = await request.json()
    const { newPlan, billingInterval } = body as {
      newPlan: SubscriptionPlan
      billingInterval?: BillingInterval
    }

    if (!newPlan) {
      return NextResponse.json(
        { success: false, error: 'New plan is required' },
        { status: 400 }
      )
    }

    // Get current billing interval or use provided one
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const currentSubscription = userDoc.data()?.subscription

    if (!currentSubscription) {
      return NextResponse.json(
        { success: false, error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const effectiveBillingInterval = billingInterval || currentSubscription.billingInterval || 'monthly'

    // Get Stripe Price ID for the new plan
    const newPriceId = getStripePriceId(newPlan, effectiveBillingInterval)

    if (!newPriceId) {
      return NextResponse.json(
        { success: false, error: 'Invalid plan or billing interval' },
        { status: 400 }
      )
    }

    logger.info('[Change Plan] Processing plan change', {
      userId,
      newPlan,
      newPriceId,
      billingInterval: effectiveBillingInterval
    })

    const currentPlan = currentSubscription.plan

    // Check if it's an upgrade or downgrade
    const timing = getPlanChangeTiming(currentPlan, newPlan)
    const isUpgradeChange = isUpgrade(currentPlan, newPlan)
    const isDowngradeChange = isDowngrade(currentPlan, newPlan)

    const now = new Date()

    // If user is on trial, upgrade immediately without Stripe
    if (currentSubscription.status === 'trialing') {
      await adminDb.collection('users').doc(userId).update({
        'subscription.plan': newPlan,
        'subscription.maxSeats': SEAT_LIMITS[newPlan],
        'subscription.maxExternalCaregivers': EXTERNAL_CAREGIVER_LIMITS[newPlan],
        'subscription.maxHouseholds': HOUSEHOLD_LIMITS[newPlan],
        updatedAt: now,
      })

      logger.info('[Change Plan] Trial plan changed immediately', { userId, newPlan })

      return NextResponse.json({
        success: true,
        message: `Your trial plan has been changed to ${newPlan}`,
        timing: 'immediate',
      })
    }

    // For paid subscriptions, use Stripe
    if (!currentSubscription.stripeSubscriptionId) {
      return NextResponse.json(
        { success: false, error: 'Stripe subscription not found' },
        { status: 404 }
      )
    }

    // Get the Stripe subscription
    const stripeSubscription = await stripe.subscriptions.retrieve(
      currentSubscription.stripeSubscriptionId
    )

    if (!stripeSubscription) {
      return NextResponse.json(
        { success: false, error: 'Stripe subscription not found' },
        { status: 404 }
      )
    }

    // Update the subscription in Stripe
    if (isUpgradeChange) {
      // UPGRADES: Immediate effect with proration
      await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // Charge prorated amount immediately
        automatic_tax: {
          enabled: true, // Enable automatic tax calculation
        },
        metadata: {
          ...stripeSubscription.metadata,
          plan: newPlan,
        },
      })

      // Update Firestore immediately
      await adminDb.collection('users').doc(userId).update({
        'subscription.plan': newPlan,
        'subscription.maxSeats': SEAT_LIMITS[newPlan],
        'subscription.maxExternalCaregivers': EXTERNAL_CAREGIVER_LIMITS[newPlan],
        'subscription.maxHouseholds': HOUSEHOLD_LIMITS[newPlan],
        'subscription.stripePriceId': newPriceId,
        updatedAt: now,
      })

      logger.info('[Change Plan] Upgrade processed immediately', { userId, newPlan })

      return NextResponse.json({
        success: true,
        message: getPlanChangeMessage(currentPlan, newPlan, currentSubscription.currentPeriodEnd),
        timing: 'immediate',
      })
    } else if (isDowngradeChange) {
      // DOWNGRADES: Schedule for end of billing cycle
      await stripe.subscriptions.update(currentSubscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'none', // No immediate charge
        billing_cycle_anchor: 'unchanged', // Keep current billing cycle
        automatic_tax: {
          enabled: true, // Enable automatic tax calculation
        },
        metadata: {
          ...stripeSubscription.metadata,
          plan: newPlan,
          scheduledDowngrade: 'true',
        },
      })

      // Store scheduled downgrade in Firestore
      await adminDb.collection('users').doc(userId).update({
        'subscription.scheduledPlan': newPlan,
        'subscription.scheduledPlanPriceId': newPriceId,
        'subscription.scheduledChangeDate': currentSubscription.currentPeriodEnd,
        updatedAt: now,
      })

      logger.info('[Change Plan] Downgrade scheduled for period end', {
        userId,
        newPlan,
        effectiveDate: currentSubscription.currentPeriodEnd,
      })

      return NextResponse.json({
        success: true,
        message: getPlanChangeMessage(currentPlan, newPlan, currentSubscription.currentPeriodEnd),
        timing: 'end_of_cycle',
        effectiveDate: currentSubscription.currentPeriodEnd,
      })
    }

    // Same plan (no change)
    return NextResponse.json({
      success: false,
      error: 'You are already on this plan',
    })
  } catch (error: any) {
    logger.error('[Change Plan] Error changing plan', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to change plan' },
      { status: 500 }
    )
  }
}
