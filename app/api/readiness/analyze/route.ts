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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/readiness/analyze',
      operation: 'create'
    })
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
    return errorResponse(error, {
      route: '/api/readiness/analyze',
      operation: 'fetch'
    })
  }
}
