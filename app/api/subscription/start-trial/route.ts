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

    // Check if user already has a subscription
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const existingSubscription = userDoc.data()?.subscription

    if (existingSubscription?.status === 'active' || existingSubscription?.status === 'trialing') {
      return NextResponse.json(
        {
          success: false,
          error: 'You already have an active subscription or trial',
          code: 'EXISTING_SUBSCRIPTION'
        },
        { status: 400 }
      )
    }

    // Get trial configuration for the selected plan
    const trialConfig = PLAN_TRIAL_CONFIGS[plan]

    // Calculate trial end date
    const now = new Date()
    const trialEndsAt = new Date(now)
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_POLICY.DURATION_DAYS)

    // Create subscription object
    const subscription = {
      plan,
      billingInterval: 'monthly' as const,
      status: 'trialing' as const,
      currentPeriodStart: now,
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
