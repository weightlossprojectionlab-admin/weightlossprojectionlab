import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const idToken = authHeader.split('Bearer ')[1]
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    const userDoc = await adminDb.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const data = userDoc.data()

    return NextResponse.json({
      raw: data,
      analysis: {
        hasProfileObject: !!data?.profile,
        onboardingCompleted: data?.profile?.onboardingCompleted,
        currentOnboardingStep: data?.profile?.currentOnboardingStep,
        hasMedications: !!data?.profile?.medications,
        medicationCount: data?.profile?.medications?.length || 0,
        allProfileKeys: data?.profile ? Object.keys(data.profile) : []
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch profile',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
