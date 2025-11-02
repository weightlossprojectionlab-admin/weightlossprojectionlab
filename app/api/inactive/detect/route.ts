/**
 * Inactive User Detection API Routes
 *
 * POST /api/inactive/detect - Run inactive user detection and generate campaigns
 * GET /api/inactive/analytics - Get inactivity analytics
 * GET /api/inactive/campaigns - Get campaign performance metrics
 *
 * Phase 3 Backend Agent - v1.6.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import {
  detectInactiveUsers,
  generateCampaigns,
  analyzeInactivity,
  getCampaignMetrics,
  runDailyDetection
} from '@/lib/inactive-detection'
import { initAdmin } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

/**
 * POST /api/inactive/detect
 *
 * Run inactive user detection and generate re-engagement campaigns
 * Admin only
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

    // Verify token and check admin status
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      logger.error('Token verification failed', error instanceof Error ? error : new Error(String(error)))
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminEmails = [
      'perriceconsulting@gmail.com',
      'weigthlossprojectionlab@gmail.com'
    ]

    if (!adminEmails.includes(decodedToken.email || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Run detection
    logger.info('Running inactive user detection')

    const result = await runDailyDetection()

    return NextResponse.json({
      success: true,
      detected: result.detected,
      campaigns: result.campaigns,
      errors: result.errors,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('Error running inactive detection', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to run inactive detection',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/inactive/analytics
 *
 * Get inactivity analytics across the platform
 * Admin only
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

    // Verify token and check admin status
    let decodedToken
    try {
      decodedToken = await getAuth().verifyIdToken(token)
    } catch (error) {
      logger.error('Token verification failed', error instanceof Error ? error : new Error(String(error)))
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const adminEmails = [
      'perriceconsulting@gmail.com',
      'weigthlossprojectionlab@gmail.com'
    ]

    if (!adminEmails.includes(decodedToken.email || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get analytics
    logger.info('Generating inactivity analytics')

    const analytics = await analyzeInactivity()

    return NextResponse.json({
      success: true,
      analytics: {
        totalUsers: analytics.totalUsers,
        activeUsers: analytics.activeUsers,
        inactiveUsers: analytics.inactiveUsers,
        inactivityRate: analytics.totalUsers > 0
          ? ((analytics.inactiveUsers / analytics.totalUsers) * 100).toFixed(1)
          : 0,
        breakdown: analytics.breakdown,
        averageInactiveDays: analytics.averageInactiveDays,
        churnRisk: analytics.churnRisk,
        campaignsNeeded: analytics.campaignsNeeded,
        analyzedAt: analytics.analyzedAt.toISOString()
      }
    })
  } catch (error) {
    logger.error('Error getting inactivity analytics', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to get analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
