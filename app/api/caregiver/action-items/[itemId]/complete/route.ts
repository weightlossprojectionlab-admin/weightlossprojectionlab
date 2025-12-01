import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { completeActionItem } from '@/lib/caregiver-action-items'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * POST /api/caregiver/action-items/[itemId]/complete
 * Mark an action item as completed
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params

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

    // Mark item as completed
    await completeActionItem(userId, itemId, userId)

    logger.info('[POST /api/caregiver/action-items/[itemId]/complete] Marked item as completed', {
      userId,
      itemId
    })

    return NextResponse.json({
      success: true,
      message: 'Action item completed'
    })

  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/caregiver/action-items/[itemId]/complete',
      operation: 'create'
    })
  }
}
