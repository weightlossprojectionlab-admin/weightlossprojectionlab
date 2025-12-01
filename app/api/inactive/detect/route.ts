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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/inactive/detect',
      operation: 'create'
    })
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
    return errorResponse(error, {
      route: '/api/inactive/detect',
      operation: 'fetch'
    })
  }
}
