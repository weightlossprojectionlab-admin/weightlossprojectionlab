import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { getOutstandingActionItems } from '@/lib/caregiver-action-items'
import { logger } from '@/lib/logger'

/**
 * GET /api/caregiver/action-items
 * Get outstanding action items for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get optional patientId filter from query params
    const searchParams = request.nextUrl.searchParams
    const patientId = searchParams.get('patientId') || undefined

    // Fetch outstanding action items
    const items = await getOutstandingActionItems(userId, patientId)

    logger.info('[GET /api/caregiver/action-items] Fetched action items', {
      userId,
      patientId,
      count: items.length
    })

    return NextResponse.json({
      success: true,
      items,
      count: items.length
    })

  } catch (error: any) {
    logger.error('[GET /api/caregiver/action-items] Error fetching action items', error as Error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch action items',
        details: error.message
      },
      { status: 500 }
    )
  }
}
