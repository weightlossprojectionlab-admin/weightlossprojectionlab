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
import { adminAuth, adminDb as db } from '@/lib/firebase-admin'
import { callGeminiMealSafety } from '@/lib/gemini'
import { logger } from '@/lib/logger'
import type { AIHealthProfile, MealSafetyCheck } from '@/types'
import { errorResponse } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the Firebase ID token
    let userId: string
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      userId = decodedToken.uid
      logger.debug('[Meal Safety] Authenticated user', { uid: userId })
    } catch (authError) {
    return errorResponse(authError, {
      route: '/api/ai/meal-safety',
      operation: 'create'
    })
  }
}
