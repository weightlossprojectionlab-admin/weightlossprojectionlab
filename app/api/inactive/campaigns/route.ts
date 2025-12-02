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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/inactive/campaigns',
      operation: 'fetch'
    })
  }
}
