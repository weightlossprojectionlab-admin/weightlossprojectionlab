/**
 * Patient Family Members API
 *
 * GET /api/patients/[patientId]/family - List family members with access to patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import type { FamilyMember } from '@/types/medical'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

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

    // Verify patient exists and user has access
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found or access denied' },
        { status: 404 }
      )
    }

    // Get all family members who have access to this patient
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(userId)
      .collection('familyMembers')
      .where('patientsAccess', 'array-contains', patientId)
      .where('status', '==', 'accepted')
      .get()

    const familyMembers = familyMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FamilyMember[]

    return NextResponse.json({
      success: true,
      data: familyMembers
    })
  } catch (error: any) {
    console.error('Error fetching family members:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch family members' },
      { status: 500 }
    )
  }
}
