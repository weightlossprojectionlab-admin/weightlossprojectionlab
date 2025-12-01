/**
 * API Route: Generate AI Health Profile
 *
 * Takes user's health conditions and generates personalized dietary restrictions
 * using Gemini AI. Low confidence results are flagged for admin review.
 *
 * POST /api/ai/health-profile/generate
 * Auth: Required (Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb as db } from '@/lib/firebase-admin'
import { callGeminiHealthProfile, validateGeminiConfig } from '@/lib/gemini'
import { logger } from '@/lib/logger'
import type { AIHealthProfile } from '@/types'
import { GenerateHealthProfileRequestSchema } from '@/lib/validations/health-vitals'
import { z } from 'zod'
import { rateLimit } from '@/lib/rate-limit'
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
      logger.debug('[Health Profile] Authenticated user', { uid: userId })
    } catch (authError) {
    return errorResponse(authError, {
      route: '/api/ai/health-profile/generate',
      operation: 'create'
    })
  }
}

/**
 * GET endpoint - retrieve current health profile
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // Fetch health profile
    const profileDoc = await db
      .collection('users')
      .doc(userId)
      .collection('aiHealthProfile')
      .doc('current')
      .get()

    if (!profileDoc.exists) {
      return NextResponse.json(
        { error: 'No health profile found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      ok: true,
      profile: profileDoc.data()
    })

  } catch (error) {
    return errorResponse(error, {
      route: '/api/ai/health-profile/generate',
      operation: 'fetch'
    })
  }
}
