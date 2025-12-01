/**
 * Individual Family Member API
 *
 * PUT /api/patients/[patientId]/family/[memberId] - Update member permissions
 * DELETE /api/patients/[patientId]/family/[memberId] - Remove member access to patient
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { assertPatientAccess, type AssertPatientAccessResult } from '@/lib/rbac-middleware'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { familyMemberPermissionsSchema } from '@/lib/validations/medical'
import type { FamilyMember } from '@/types/medical'
import { errorResponse } from '@/lib/api-response'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; memberId: string }> }
) {
  try {
    const { patientId, memberId } = await params

    // Check authorization and get owner userId (only owner can manage family permissions)
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/family/[memberId] PUT] Rate limit exceeded', { userId, patientId, memberId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Only the patient owner can modify family member permissions
    if (role === 'family') {
      logger.warn('[API /patients/[id]/family/[memberId] PUT] Family member attempted to modify permissions', {
        userId,
        patientId,
        memberId
      })
      return NextResponse.json(
        { success: false, error: 'Only the patient owner can modify family member permissions' },
        { status: 403 }
      )
    }

    logger.debug('[API /patients/[id]/family/[memberId] PUT] Updating permissions', { userId, patientId, memberId })

    // Parse and validate permissions
    const body = await request.json()
    const validatedPermissions = familyMemberPermissionsSchema.parse(body.permissions)

    // Get family member
    const memberRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('familyMembers')
      .doc(memberId)

    const memberDoc = await memberRef.get()

    if (!memberDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const member = { id: memberDoc.id, ...memberDoc.data() } as FamilyMember

    // Verify member has access to this patient
    if (!member.patientsAccess.includes(patientId)) {
      return NextResponse.json(
        { success: false, error: 'Family member does not have access to this patient' },
        { status: 403 }
      )
    }

    // Update permissions
    await memberRef.update({
      permissions: validatedPermissions
    })

    const updatedMember: FamilyMember = {
      ...member,
      permissions: validatedPermissions
    }

    logger.info('[API /patients/[id]/family/[memberId] PUT] Permissions updated', {
      userId,
      patientId,
      memberId
    })

    return NextResponse.json({
      success: true,
      data: updatedMember,
      message: 'Permissions updated successfully'
    })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/family/[memberId]',
      operation: 'update'
    })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string; memberId: string }> }
) {
  try {
    const { patientId, memberId } = await params

    // Check authorization and get owner userId (only owner can remove family access)
    const authResult = await assertPatientAccess(request, patientId, 'viewMedicalRecords')
    if (authResult instanceof Response) {
      return authResult // Return error response
    }

    const { userId, ownerUserId, role } = authResult as AssertPatientAccessResult

    // Check rate limit (per-user)
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /patients/[id]/family/[memberId] DELETE] Rate limit exceeded', { userId, patientId, memberId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Only the patient owner can remove family member access
    if (role === 'family') {
      logger.warn('[API /patients/[id]/family/[memberId] DELETE] Family member attempted to remove access', {
        userId,
        patientId,
        memberId
      })
      return NextResponse.json(
        { success: false, error: 'Only the patient owner can remove family member access' },
        { status: 403 }
      )
    }

    logger.debug('[API /patients/[id]/family/[memberId] DELETE] Removing family access', {
      userId,
      patientId,
      memberId
    })

    // Get family member
    const memberRef = adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('familyMembers')
      .doc(memberId)

    const memberDoc = await memberRef.get()

    if (!memberDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const member = { id: memberDoc.id, ...memberDoc.data() } as FamilyMember

    // Remove patient from member's access list
    const updatedPatientsAccess = member.patientsAccess.filter(id => id !== patientId)

    if (updatedPatientsAccess.length === 0) {
      // No more patients - remove family member entirely
      await memberRef.delete()
      logger.info('[API /patients/[id]/family/[memberId] DELETE] Removed family member (no remaining access)', {
        userId,
        patientId,
        memberId
      })
    } else {
      // Update with remaining patients
      await memberRef.update({
        patientsAccess: updatedPatientsAccess
      })
      logger.info('[API /patients/[id]/family/[memberId] DELETE] Removed patient from family member access', {
        userId,
        patientId,
        memberId,
        remainingPatients: updatedPatientsAccess.length
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Family member access removed'
    })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/patients/[patientId]/family/[memberId]',
      operation: 'delete'
    })
  }
}
