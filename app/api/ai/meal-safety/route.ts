/**
 * API Route: Check Meal Safety
 *
 * Analyzes a meal against user's AI health profile to detect potential issues
 * with sodium, potassium, sugar, etc. based on their health conditions.
 *
 * POST /api/ai/meal-safety
 * Auth: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb as db } from '@/lib/firebase-admin'
import { callGeminiMealSafety } from '@/lib/gemini'
import { logger } from '@/lib/logger'
import type { AIHealthProfile, MealSafetyCheck } from '@/types'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('Authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId
    logger.debug('[Meal Safety] Authenticated user', { uid: userId })

    // 2. Parse request body
    const body = await request.json()
    const { meal } = body

    if (!meal || !meal.foodItems || !meal.totalCalories) {
      return NextResponse.json(
        { error: 'Invalid meal data - must include foodItems and totalCalories' },
        { status: 400 }
      )
    }

    // 3. Fetch user's health profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('aiHealthProfile')
      .doc('current')
      .get()

    const healthProfile: AIHealthProfile | null = profileDoc.exists
      ? (profileDoc.data() as AIHealthProfile)
      : null

    logger.info('[Meal Safety] Checking meal', {
      uid: userId,
      hasHealthProfile: !!healthProfile,
      profileApproved: healthProfile?.reviewStatus === 'approved',
      foodItemsCount: meal.foodItems.length
    })

    // 4. Call Gemini to check meal safety
    const safetyCheck: MealSafetyCheck = await callGeminiMealSafety({
      meal,
      healthProfile
    })

    logger.info('[Meal Safety] Check completed', {
      uid: userId,
      isSafe: safetyCheck.isSafe,
      severity: safetyCheck.severity,
      warningsCount: safetyCheck.warnings.length,
      confidence: safetyCheck.confidence
    })

    // 5. If critical severity, create ai-decision for admin review
    if (safetyCheck.severity === 'critical' && safetyCheck.confidence < 80) {
      await db.collection('ai-decisions').add({
        type: 'meal-safety',
        userId,
        payload: {
          meal,
          safetyCheck,
          healthProfile: healthProfile ? {
            confidence: healthProfile.confidence,
            reviewStatus: healthProfile.reviewStatus,
            restrictions: healthProfile.restrictions
          } : null
        },
        confidence: safetyCheck.confidence,
        reviewStatus: 'unreviewed',
        createdAt: new Date()
      })

      logger.warn('[Meal Safety] Critical safety issue - created AI decision', {
        uid: userId,
        warnings: safetyCheck.warnings
      })
    }

    // 6. Return safety assessment
    return NextResponse.json({
      ok: true,
      ...safetyCheck
    })

  } catch (error) {
    return errorResponse(error, { route: '/api/ai/meal-safety', operation: 'check' })
  }
}
