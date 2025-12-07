/**
 * API Route: /api/family/onboarding
 *
 * Handles caregiver onboarding operations
 * GET - Check onboarding status
 * PATCH - Update onboarding step
 * POST - Mark onboarding as complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse, successResponse, unauthorizedResponse, validationError } from '@/lib/api-response'
import { apiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { OnboardingStep } from '@/types/caregiver-profile'

interface OnboardingStatus {
  complete: boolean
  currentStep: OnboardingStep
  completedSteps: OnboardingStep[]
  lastUpdated?: string
}

// GET /api/family/onboarding - Check onboarding status
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/onboarding GET] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/onboarding GET] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /family/onboarding GET] Fetching onboarding status', { userId })

    // Get caregiver profile
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    const profileDoc = await profileRef.get()

    if (!profileDoc.exists) {
      logger.info('[API /family/onboarding GET] Profile not found, returning default status', { userId })
      return successResponse({
        complete: false,
        currentStep: OnboardingStep.WELCOME,
        completedSteps: []
      } as OnboardingStatus)
    }

    const profile = profileDoc.data()

    const status: OnboardingStatus = {
      complete: profile?.onboardingComplete || false,
      currentStep: profile?.onboardingStep || OnboardingStep.WELCOME,
      completedSteps: profile?.completedSteps || [],
      lastUpdated: profile?.updatedAt
    }

    logger.info('[API /family/onboarding GET] Onboarding status fetched', {
      userId,
      complete: status.complete,
      currentStep: status.currentStep
    })

    return successResponse(status)

  } catch (error: any) {
    logger.error('[API /family/onboarding GET] Error fetching onboarding status', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/onboarding', method: 'GET' })
  }
}

// PATCH /api/family/onboarding - Update onboarding step
export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/onboarding PATCH] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/onboarding PATCH] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Parse request body
    const body = await request.json()
    const { step, data } = body

    if (step === undefined || step === null) {
      logger.warn('[API /family/onboarding PATCH] Missing step in request', { userId })
      return validationError('Onboarding step is required')
    }

    // Validate step is a valid enum value
    const validSteps = Object.values(OnboardingStep)
    if (!validSteps.includes(step)) {
      logger.warn('[API /family/onboarding PATCH] Invalid step value', { userId, step })
      return validationError(`Invalid step. Must be one of: ${validSteps.join(', ')}`)
    }

    logger.debug('[API /family/onboarding PATCH] Updating onboarding step', {
      userId,
      step,
      hasData: !!data
    })

    // Get caregiver profile
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    const profileDoc = await profileRef.get()

    // Track completed steps
    let completedSteps: OnboardingStep[] = []

    if (profileDoc.exists) {
      const profile = profileDoc.data()
      completedSteps = profile?.completedSteps || []
    }

    // Add current step to completed steps if not already there
    if (!completedSteps.includes(step)) {
      completedSteps.push(step)
    }

    // Build update object
    const updates: any = {
      onboardingStep: step,
      completedSteps,
      updatedAt: new Date().toISOString(),
      lastActive: new Date().toISOString()
    }

    // Merge any additional data provided
    if (data && typeof data === 'object') {
      Object.assign(updates, data)
    }

    // Update profile
    await profileRef.set(updates, { merge: true })

    logger.info('[API /family/onboarding PATCH] Onboarding step updated', {
      userId,
      step,
      completedStepsCount: completedSteps.length
    })

    const status: OnboardingStatus = {
      complete: step === OnboardingStep.COMPLETE,
      currentStep: step,
      completedSteps,
      lastUpdated: updates.updatedAt
    }

    return successResponse(status)

  } catch (error: any) {
    logger.error('[API /family/onboarding PATCH] Error updating onboarding step', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/onboarding', method: 'PATCH' })
  }
}

// POST /api/family/onboarding - Mark onboarding as complete
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[API /family/onboarding POST] Missing or invalid Authorization header')
      return unauthorizedResponse('Missing or invalid authorization token')
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Check rate limit
    const rateLimitResult = await apiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/onboarding POST] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /family/onboarding POST] Marking onboarding as complete', { userId })

    // Get caregiver profile
    const profileRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('caregiverProfile')
      .doc('profile')

    const now = new Date().toISOString()

    // Mark all steps as completed
    const allSteps: OnboardingStep[] = Object.values(OnboardingStep).filter(
      (value): value is OnboardingStep => typeof value !== 'number'
    )

    const updates = {
      onboardingComplete: true,
      onboardingStep: OnboardingStep.COMPLETE,
      completedSteps: allSteps,
      updatedAt: now,
      lastActive: now
    }

    await profileRef.set(updates, { merge: true })

    logger.info('[API /family/onboarding POST] Onboarding marked as complete', { userId })

    const status: OnboardingStatus = {
      complete: true,
      currentStep: OnboardingStep.COMPLETE,
      completedSteps: allSteps,
      lastUpdated: now
    }

    return successResponse(status)

  } catch (error: any) {
    logger.error('[API /family/onboarding POST] Error completing onboarding', error, {
      errorMessage: error.message,
      errorStack: error.stack
    })
    return errorResponse(error, { route: '/api/family/onboarding', method: 'POST' })
  }
}
