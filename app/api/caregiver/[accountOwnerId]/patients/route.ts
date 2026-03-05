/**
 * Caregiver Patients API
 *
 * GET /api/caregiver/[accountOwnerId]/patients
 * Fetches patients that the authenticated caregiver has access to
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountOwnerId: string }> }
) {
  try {
    // Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    const { accountOwnerId } = await params

    // Verify user is a caregiver for this account owner
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const userData = userDoc.data()

    if (!userData) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has caregiver access to this account
    const caregiverContexts = userData.caregiverOf || []
    const caregiverContext = caregiverContexts.find(
      (ctx: any) => ctx.accountOwnerId === accountOwnerId
    )

    if (!caregiverContext) {
      return NextResponse.json(
        { success: false, error: 'You do not have caregiver access to this account' },
        { status: 403 }
      )
    }

    const patientsAccess = caregiverContext.patientsAccess || []

    // Fetch the patients this caregiver has access to
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(accountOwnerId)
      .collection('patients')
      .get()

    const patients: any[] = []
    patientsSnapshot.forEach((doc) => {
      // Only include patients this caregiver has access to
      if (patientsAccess.includes(doc.id)) {
        patients.push({
          id: doc.id,
          ...doc.data()
        })
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        patients,
        caregiverContext
      }
    })
  } catch (error: any) {
    console.error('Error fetching caregiver patients:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch patients' },
      { status: 500 }
    )
  }
}
