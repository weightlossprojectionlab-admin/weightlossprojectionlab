/**
 * Re-engagement Campaign Metrics API
 *
 * GET /api/inactive/campaigns - Get campaign performance metrics
 *
 * Phase 3 Backend Agent - v1.6.4
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuth } from 'firebase-admin/auth'
import { getCampaignMetrics } from '@/lib/inactive-detection'
import { initAdmin } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

/**
 * GET /api/inactive/campaigns
 *
 * Get campaign performance metrics
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
      'weightlossprojectionlab@gmail.com'
    ]

    if (!adminEmails.includes(decodedToken.email || '')) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get campaign metrics
    logger.info('Getting campaign performance metrics')

    const metrics = await getCampaignMetrics()

    return NextResponse.json({
      success: true,
      metrics: {
        totalCampaigns: metrics.totalCampaigns,
        sent: metrics.sent,
        opened: metrics.opened,
        clicked: metrics.clicked,
        conversions: metrics.conversions,
        openRate: Math.round(metrics.openRate * 10) / 10,
        clickRate: Math.round(metrics.clickRate * 10) / 10,
        conversionRate: Math.round(metrics.conversionRate * 10) / 10
      }
    })
  } catch (error) {
    logger.error('Error getting campaign metrics', error instanceof Error ? error : new Error(String(error)))

    return NextResponse.json(
      {
        error: 'Failed to get campaign metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
