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
      logger.error('[Health Profile] Auth failed', authError as Error)
      return NextResponse.json(
        { error: 'Unauthorized: Invalid authentication token' },
        { status: 401 }
      )
    }

    // 2. Validate Gemini configuration
    const configCheck = validateGeminiConfig()
    if (!configCheck.valid) {
      logger.error('[Health Profile] Gemini not configured', { error: configCheck.error })
      return NextResponse.json(
        { error: 'AI service unavailable' },
        { status: 503 }
      )
    }

    // 3. Fetch user profile from Firestore
    const userDoc = await db.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      logger.warn('[Health Profile] User not found', { uid: userId })
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const profile = userData?.profile || {}

    // 4. Call Gemini to generate health profile
    logger.info('[Health Profile] Generating profile', {
      uid: userId,
      conditions: profile.healthConditions
    })

    const aiResult = await callGeminiHealthProfile({
      healthConditions: profile.healthConditions,
      age: profile.age,
      gender: profile.gender,
      currentWeight: profile.currentWeight,
      height: profile.height,
      activityLevel: profile.activityLevel,
      units: userData?.preferences?.units || 'imperial'
    })

    // 5. Determine review status based on confidence
    const reviewStatus = aiResult.confidence >= 80 ? 'approved' : 'unreviewed'

    const healthProfile: AIHealthProfile = {
      ...aiResult,
      reviewStatus,
      generatedAt: new Date().toISOString()
    }

    // 6. Save to Firestore (aiHealthProfile subcollection)
    await db
      .collection('users')
      .doc(userId)
      .collection('aiHealthProfile')
      .doc('current')
      .set(healthProfile, { merge: true })

    logger.info('[Health Profile] Saved to Firestore', {
      uid: userId,
      confidence: healthProfile.confidence,
      reviewStatus
    })

    // 7. If low confidence, create ai-decision for admin review
    if (reviewStatus === 'unreviewed') {
      await db.collection('ai-decisions').add({
        type: 'health-profile',
        userId,
        payload: healthProfile,
        confidence: healthProfile.confidence,
        reviewStatus: 'unreviewed',
        createdAt: new Date()
      })

      logger.info('[Health Profile] Created AI decision for review', {
        uid: userId,
        confidence: healthProfile.confidence
      })
    }

    // 8. Return success response
    return NextResponse.json({
      ok: true,
      status: reviewStatus,
      confidence: healthProfile.confidence,
      restrictionsCount: Object.keys(healthProfile.restrictions).filter(
        key => healthProfile.restrictions[key]?.limit
      ).length,
      message: reviewStatus === 'approved'
        ? 'Health profile generated and auto-approved'
        : 'Health profile generated - pending admin review'
    })

  } catch (error) {
    logger.error('[Health Profile] Generation failed', error as Error)

    return NextResponse.json(
      {
        error: 'Failed to generate health profile',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
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
    logger.error('[Health Profile] GET failed', error as Error)
    return NextResponse.json(
      { error: 'Failed to fetch health profile' },
      { status: 500 }
    )
  }
}
