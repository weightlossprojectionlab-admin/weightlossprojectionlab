/**
 * Readiness Analysis API Routes
 *
 * POST /api/readiness/analyze - Trigger new analysis for current user
 * GET /api/readiness/analyze - Get latest analysis for current user
 *
 * Phase 3 Backend Agent - v1.6.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { analyzeUserReadiness, getLatestAnalysis } from '@/lib/readiness-analyzer'
import { initAdmin } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

// Rate limiting: Store last analysis time per user
const analysisCache = new Map<string, number>()
const ANALYSIS_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour between analyses

/**
 * POST /api/readiness/analyze
 *
 * Trigger a new readiness analysis for the authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify token and get user ID
    let userId: string
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
    } catch (error) {
      logger.error('Token verification failed', error instanceof Error ? error : new Error(String(error)))
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check rate limiting
    const lastAnalysis = analysisCache.get(userId)
    const now = Date.now()

    if (lastAnalysis && (now - lastAnalysis) < ANALYSIS_COOLDOWN_MS) {
      const timeRemaining = Math.ceil((ANALYSIS_COOLDOWN_MS - (now - lastAnalysis)) / 60000)

      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          message: `Please wait ${timeRemaining} minutes before requesting another analysis`,
          cooldownMinutes: timeRemaining
        },
        { status: 429 }
      )
    }

    // Perform analysis
    logger.info('Starting readiness analysis', { userId })

    const analysis = await analyzeUserReadiness(userId)

    // Update cache
    analysisCache.set(userId, now)

    // Log intervention recommendation
    if (analysis.intervention.priority === 'high' || analysis.intervention.priority === 'urgent') {
      logger.warn('High priority intervention detected', {
        userId,
        level: analysis.engagementScore.level,
        score: analysis.engagementScore.overallScore,
        churnProbability: analysis.churnProbability,
        interventionType: analysis.intervention.type
      })
    }

    return NextResponse.json({
      success: true,
      analysis: {
        timestamp: analysis.timestamp.toISOString(),
        engagementScore: {
          overallScore: analysis.engagementScore.overallScore,
          level: analysis.engagementScore.level,
          trend: analysis.engagementScore.trend,
          trendPercentage: Math.round(analysis.engagementScore.trendPercentage * 10) / 10,
          riskFactors: analysis.engagementScore.riskFactors,
          strengths: analysis.engagementScore.strengths,
          metrics: {
            mealLoggingFrequency: analysis.engagementScore.metrics.mealLoggingFrequency,
            weightTrackingFrequency: analysis.engagementScore.metrics.weightTrackingFrequency,
            currentStreak: analysis.engagementScore.metrics.currentStreak,
            missionCompletionRate: analysis.engagementScore.metrics.missionCompletionRate,
            goalProgressRate: analysis.engagementScore.metrics.goalProgressRate,
            recipeEngagement: analysis.engagementScore.metrics.recipeEngagement,
            daysActive: analysis.engagementScore.metrics.daysActive,
            consecutiveInactiveDays: analysis.engagementScore.metrics.consecutiveInactiveDays
          }
        },
        intervention: {
          type: analysis.intervention.type,
          priority: analysis.intervention.priority,
          message: analysis.intervention.message,
          actions: analysis.intervention.actions
        },
        churnProbability: Math.round(analysis.churnProbability * 100) / 100,
        analyzedAt: analysis.analyzedAt.toISOString()
      }
    })
  } catch (error) {
    logger.error('Error analyzing readiness', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to analyze readiness',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/readiness/analyze
 *
 * Get latest readiness analysis for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized - Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify token and get user ID
    let userId: string
    try {
      const decodedToken = await getAuth().verifyIdToken(token)
      userId = decodedToken.uid
    } catch (error) {
      logger.error('Token verification failed', error instanceof Error ? error : new Error(String(error)))
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Get latest analysis
    const analysis = await getLatestAnalysis(userId)

    if (!analysis) {
      return NextResponse.json(
        {
          error: 'No analysis found',
          message: 'No readiness analysis has been performed yet for this user'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      analysis: {
        timestamp: analysis.timestamp.toISOString(),
        overallScore: analysis.engagementScore.overallScore,
        level: analysis.engagementScore.level,
        trend: analysis.engagementScore.trend,
        churnProbability: Math.round(analysis.churnProbability * 100) / 100,
        analyzedAt: analysis.analyzedAt.toISOString()
      }
    })
  } catch (error) {
    logger.error('Error getting latest analysis', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to get analysis',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
