/**
 * Start Free Trial API
 *
 * POST /api/subscription/start-trial
 * Starts a 7-day free trial for a selected plan (NO credit card required)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { SubscriptionPlan, SEAT_LIMITS, EXTERNAL_CAREGIVER_LIMITS, HOUSEHOLD_LIMITS } from '@/types'
import { TRIAL_POLICY, PLAN_TRIAL_CONFIGS } from '@/lib/subscription-policies'

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
    const { plan } = body as { plan: SubscriptionPlan }

    if (!plan) {
      return NextResponse.json(
        { success: false, error: 'Plan is required' },
        { status: 400 }
      )
    }

    logger.info('[Start Trial] Starting trial for user', { userId, plan })

    // Check if user already has a subscription. An ACTIVE (paid)
    // subscription is a hard block — never silently overwrite a
    // paying customer. A TRIALING subscription is allowed to switch
    // plans (e.g. signup grants a default Single trial, onboarding's
    // memberCount answer then promotes it to Family Basic). The
    // trialEndsAt timer is preserved across the switch so the user
    // doesn't lose days they've already started.
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const existingSubscription = userDoc.data()?.subscription

    if (existingSubscription?.status === 'active') {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have an active subscription',
          code: 'EXISTING_SUBSCRIPTION'
        },
        { status: 400 }
      )
    }

    // If the user is already trialing the SAME plan, treat as a no-op
    // success rather than a state change. Avoids resetting timers.
    if (
      existingSubscription?.status === 'trialing' &&
      existingSubscription?.plan === plan
    ) {
      return NextResponse.json({
        success: true,
        subscription: existingSubscription,
        message: 'Already trialing this plan',
        code: 'TRIAL_UNCHANGED',
      })
    }

    const isSwitchingTrialPlan =
      existingSubscription?.status === 'trialing' &&
      existingSubscription?.plan !== plan

    // Get trial configuration for the selected plan
    const trialConfig = PLAN_TRIAL_CONFIGS[plan]

    // Calculate trial end date — preserve the existing timer when
    // switching mid-trial, otherwise compute a fresh DURATION_DAYS
    // window. Avoids giving a "free extension" via repeated calls.
    const now = new Date()
    let trialEndsAt: Date
    if (isSwitchingTrialPlan) {
      const existingEnd = existingSubscription.trialEndsAt
      const parsed =
        existingEnd?.toDate?.() instanceof Date
          ? existingEnd.toDate()
          : existingEnd instanceof Date
            ? existingEnd
            : existingEnd
              ? new Date(existingEnd)
              : null
      // Use the existing end if it's in the future; otherwise fall
      // back to a fresh window (shouldn't normally happen since
      // status would be 'expired' by then, but defensive).
      trialEndsAt =
        parsed && parsed.getTime() > now.getTime()
          ? parsed
          : (() => {
              const d = new Date(now)
              d.setDate(d.getDate() + TRIAL_POLICY.DURATION_DAYS)
              return d
            })()
    } else {
      trialEndsAt = new Date(now)
      trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_POLICY.DURATION_DAYS)
    }

    // Create subscription object. When switching plans mid-trial,
    // preserve currentPeriodStart so the trial timeline is honest.
    const subscription = {
      plan,
      billingInterval: 'monthly' as const,
      status: 'trialing' as const,
      currentPeriodStart: isSwitchingTrialPlan
        ? existingSubscription.currentPeriodStart || now
        : now,
      currentPeriodEnd: trialEndsAt,
      trialEndsAt,
      maxSeats: SEAT_LIMITS[plan],
      currentSeats: 1, // Start with 1 (the user themselves)
      maxExternalCaregivers: EXTERNAL_CAREGIVER_LIMITS[plan],
      currentExternalCaregivers: 0,
      maxHouseholds: HOUSEHOLD_LIMITS[plan],
      currentHouseholds: 1, // Start with 1 household
      maxDutiesPerHousehold: 999, // Unlimited duties for all plans except free (enforced separately)
    }

    // Update user document with trial subscription
    await adminDb.collection('users').doc(userId).update({
      subscription,
      'preferences.userMode': plan.startsWith('family') ? 'household' : 'single',
      updatedAt: now,
    })

    logger.info('[Start Trial] Trial started successfully', {
      userId,
      plan,
      trialEndsAt: trialEndsAt.toISOString(),
    })

    return NextResponse.json({
      success: true,
      subscription,
      message: `Your ${TRIAL_POLICY.DURATION_DAYS}-day free trial has started! No credit card required.`,
    })
  } catch (error: any) {
    logger.error('[Start Trial] Error starting trial', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to start trial' },
      { status: 500 }
    )
  }
}
