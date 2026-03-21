/**
 * Appointment Recommendations API
 *
 * GET /api/appointments/recommendations - Get active recommendations
 * POST /api/appointments/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthToken } from '@/lib/rbac-middleware'
import { errorResponse, unauthorizedResponse } from '@/lib/api-response'
import {
  generateRecommendations,
  getActiveRecommendations
} from '@/lib/appointment-recommendations'

/**
 * GET /api/appointments/recommendations
 * Fetch active recommendations for current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

    // Get patientId from query params (optional - for family member view)
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    // Use patientId if provided, otherwise use current userId
    const targetUserId = patientId || userId

    console.log('[API /appointments/recommendations GET] Fetching recommendations for user:', targetUserId, patientId ? '(family member)' : '(self)')
    const recommendations = await getActiveRecommendations(targetUserId)
    console.log('[API /appointments/recommendations GET] Successfully fetched:', recommendations.length, 'recommendations')

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/appointments/recommendations', operation: 'list' })
  }
}

/**
 * POST /api/appointments/recommendations
 * Generate new recommendations for current user
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    const authResult = await verifyAuthToken(authHeader)
    if (!authResult) {
      return unauthorizedResponse()
    }
    const userId = authResult.userId

    // Get patientId from query params (optional - for family member view)
    const { searchParams } = new URL(request.url)
    const patientId = searchParams.get('patientId')

    // Use patientId if provided, otherwise use current userId
    const targetUserId = patientId || userId

    console.log('[API /appointments/recommendations POST] Generating recommendations for user:', targetUserId, patientId ? '(family member)' : '(self)')
    const recommendations = await generateRecommendations(targetUserId)
    console.log('[API /appointments/recommendations POST] Successfully generated:', recommendations.length, 'recommendations')

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      message: `Generated ${recommendations.length} recommendation${recommendations.length !== 1 ? 's' : ''}`
    })
  } catch (error) {
    return errorResponse(error, { route: '/api/appointments/recommendations', operation: 'generate' })
  }
}
