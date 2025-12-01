/**
 * Individual Recommendation API
 *
 * PATCH /api/appointments/recommendations/[id] - Dismiss or mark as scheduled
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyIdToken } from '@/lib/firebase-admin'
import {
  dismissRecommendation,
  markRecommendationScheduled
} from '@/lib/appointment-recommendations'

/**
 * PATCH /api/appointments/recommendations/[recommendationId]
 * Update recommendation status (dismiss or mark scheduled)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ recommendationId: string }> }
) {
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

    const { recommendationId } = await params
    const body = await request.json()
    const { action, appointmentId } = body

    if (action === 'dismiss') {
      await dismissRecommendation(recommendationId)
      return NextResponse.json({
        success: true,
        message: 'Recommendation dismissed'
      })
    }

    if (action === 'schedule' && appointmentId) {
      await markRecommendationScheduled(recommendationId, appointmentId)
      return NextResponse.json({
        success: true,
        message: 'Recommendation marked as scheduled'
      })
    }

    return NextResponse.json(
      { error: 'Invalid action or missing appointmentId' },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('[API /appointments/recommendations/[id] PATCH] Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update recommendation' },
      { status: 500 }
    )
  }
}
