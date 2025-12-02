import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'

/**
 * Emergency fix endpoint to restore onboardingCompleted flag
 * Use this if the flag was accidentally lost during profile updates
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    );
  }

  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    // Use dot notation to only update the onboardingCompleted flag
    await adminDb.collection('users').doc(userId).update({
      'profile.onboardingCompleted': true,
      'profile.onboardingCompletedAt': new Date()
    })

    logger.info('[Fix] Restored onboardingCompleted flag', { userId })

    return NextResponse.json({
      success: true,
      message: 'Onboarding completion flag restored'
    })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/fix-onboarding',
      operation: 'create'
    })
  }
}
