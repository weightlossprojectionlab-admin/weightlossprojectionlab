/**
 * Appointment Recommendations API
 *
 * GET /api/appointments/recommendations - Get active recommendations
 * POST /api/appointments/recommendations - Generate new recommendations
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
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
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log('[API /appointments/recommendations GET] Fetching recommendations for user:', userId)
    const recommendations = await getActiveRecommendations(userId)
    console.log('[API /appointments/recommendations GET] Successfully fetched:', recommendations.length, 'recommendations')

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length
    })
  } catch (error: any) {
    console.error('[API /appointments/recommendations GET] Error:', error)
    console.error('[API /appointments/recommendations GET] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch recommendations' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/appointments/recommendations
 * Generate new recommendations for current user
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log('[API /appointments/recommendations POST] Generating recommendations for user:', userId)
    const recommendations = await generateRecommendations(userId)
    console.log('[API /appointments/recommendations POST] Successfully generated:', recommendations.length, 'recommendations')

    return NextResponse.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
      message: `Generated ${recommendations.length} recommendation${recommendations.length !== 1 ? 's' : ''}`
    })
  } catch (error: any) {
    console.error('[API /appointments/recommendations POST] Error:', error)
    console.error('[API /appointments/recommendations POST] Error stack:', error.stack)
    return NextResponse.json(
      { error: error.message || 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}
