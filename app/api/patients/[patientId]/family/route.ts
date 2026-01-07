/**
 * Patient Family Members API
 *
 * GET /api/patients/[patientId]/family - List family members with access to patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import type { FamilyMember } from '@/types/medical'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    // Check authorization and get owner userId
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/family GET] Rate limit exceeded', { userId, patientId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    logger.debug('[API /patients/[id]/family GET] Fetching family members', { userId, ownerUserId, patientId })

    // Verify patient exists
    const patientRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (!patientDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Patient not found' },
        { status: 404 }
      )
    }

    // Get all family members who have access to this patient
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('familyMembers')
      .where('patientsAccess', 'array-contains', patientId)
      .where('status', '==', 'accepted')
      .get()

    const familyMembers = familyMembersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as FamilyMember[]

    logger.info('[API /patients/[id]/family GET] Family members fetched', {
      userId,
      ownerUserId,
      patientId,
      count: familyMembers.length
    })

    return NextResponse.json({
      success: true,
      data: familyMembers
    })
  } catch (error: any) {
    logger.error('[API /patients/[id]/family GET] Error fetching family members', error as Error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch family members' },
      { status: 500 }
    )
  }
}
