/**
 * API Route: Admin - Get User's AI Health Profile
 *
 * Retrieves AI health profile and related AI decisions for a specific user.
 * Admin-only endpoint.
 *
 * GET /api/admin/users/[uid]/ai-health-profile
 * Auth: Required (Admin Bearer token)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb as db } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { AIHealthProfile, AIDecision } from '@/types'
import { errorResponse } from '@/lib/api-response'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ uid: string }> }
) {
  try {
    // 1. Verify admin authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing authentication token' },
        { status: 401 }
      )
    }

    const token = authHeader.split('Bearer ')[1]

    // Verify the Firebase ID token and check admin role
    let adminUser
    try {
      const decodedToken = await adminAuth.verifyIdToken(token)
      const adminUserRecord = await adminAuth.getUser(decodedToken.uid)
      const customClaims = adminUserRecord.customClaims || {}

      if (customClaims.role !== 'admin') {
        logger.warn('[AI Health Profile Admin] Non-admin access attempt', {
          uid: decodedToken.uid
        })
        return NextResponse.json(
          { error: 'Forbidden: Admin access required' },
          { status: 403 }
        )
      }

      adminUser = decodedToken.uid
    } catch (authError) {
    return errorResponse(authError, {
      route: '/api/admin/users/[uid]/ai-health-profile',
      operation: 'fetch'
    })
  }
}
