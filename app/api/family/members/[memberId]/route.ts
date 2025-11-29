/**
 * Family Member Management API
 *
 * PATCH /api/family/members/:memberId - Update member role and patient access
 * DELETE /api/family/members/:memberId - Remove member from family account
 *
 * Authorization: Account Owner or Co-Admin only
 * Rate Limit: 30 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import { canAssignRole, validateRoleAssignment } from '@/lib/family-roles'
import type { FamilyRole, FamilyMember, FamilyMemberPermissions } from '@/types/medical'

interface UpdateMemberRequest {
  role?: FamilyRole
  patientsAccess?: string[]
  patientPermissions?: {
    [patientId: string]: FamilyMemberPermissions
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

    // Step 1: Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      logger.error('[API /family/members/[id] PATCH] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Step 2: Rate limiting
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/members/[id] PATCH] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Step 3: Parse request body
    const updates: UpdateMemberRequest = await request.json()

    // Step 4: Find the current user and verify they're account owner
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const isAccountOwner = userData?.preferences?.isAccountOwner === true

    let ownerUserId: string

    if (isAccountOwner) {
      ownerUserId = userId
    } else {
      // Check if user is a Co-Admin
      const familyMemberSnapshot = await adminDb
        .collectionGroup('familyMembers')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (familyMemberSnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'You are not part of a family account' },
          { status: 403 }
        )
      }

      const currentMember = familyMemberSnapshot.docs[0].data() as FamilyMember
      if (currentMember.familyRole !== 'co_admin' && currentMember.familyRole !== 'account_owner') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Only Account Owners and Co-Admins can edit members' },
          { status: 403 }
        )
      }

      ownerUserId = familyMemberSnapshot.docs[0].ref.parent.parent?.id || ''
    }

    // Step 5: Get the member being edited
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

    // Step 6: Validate role change if provided
    if (updates.role) {
      const currentUserRole = isAccountOwner ? 'account_owner' : 'co_admin'
      const validation = validateRoleAssignment(
        currentUserRole as FamilyRole,
        member.familyRole || 'caregiver',
        updates.role
      )

      if (!validation.valid) {
        return NextResponse.json(
          { success: false, error: validation.error },
          { status: 403 }
        )
      }
    }

    // Step 7: Build update object
    const updateData: Partial<FamilyMember> = {}

    if (updates.role) {
      updateData.familyRole = updates.role
      updateData.roleAssignedAt = new Date().toISOString()
      updateData.roleAssignedBy = userId
    }

    if (updates.patientsAccess) {
      updateData.patientsAccess = updates.patientsAccess
    }

    if (updates.patientPermissions && updates.patientsAccess) {
      // Update permissions for each patient the member has access to
      for (const patientId of updates.patientsAccess) {
        if (updates.patientPermissions[patientId]) {
          // Update the patient's family member subcollection
          const patientFamilyRef = adminDb
            .collection('users')
            .doc(ownerUserId)
            .collection('patients')
            .doc(patientId)
            .collection('familyMembers')
            .doc(memberId)

          const patientFamilyDoc = await patientFamilyRef.get()
          if (patientFamilyDoc.exists) {
            await patientFamilyRef.update({
              permissions: updates.patientPermissions[patientId],
              lastModified: new Date().toISOString()
            })
          } else {
            // Create if doesn't exist
            await patientFamilyRef.set({
              userId: member.userId,
              name: member.name,
              email: member.email,
              relationship: member.relationship,
              permissions: updates.patientPermissions[patientId],
              status: 'accepted',
              addedAt: new Date().toISOString(),
              lastModified: new Date().toISOString()
            })
          }
        }
      }

      // Also update the main permissions on the member record
      // (use the first patient's permissions as the base, or create a merged set)
      const firstPatientPerms = updates.patientPermissions[updates.patientsAccess[0]]
      if (firstPatientPerms) {
        updateData.permissions = firstPatientPerms
      }
    }

    // Step 8: Update the member document
    await memberRef.update({
      ...updateData,
      lastModified: new Date().toISOString()
    })

    // Step 9: Fetch updated member
    const updatedDoc = await memberRef.get()
    const updatedMember = { id: updatedDoc.id, ...updatedDoc.data() } as FamilyMember

    logger.info('[API /family/members/[id] PATCH] Member updated successfully', {
      userId,
      ownerUserId,
      memberId,
      updates: Object.keys(updates)
    })

    return NextResponse.json({
      success: true,
      data: updatedMember
    })
  } catch (error: any) {
    logger.error('[API /family/members/[id] PATCH] Error updating member', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update family member' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ memberId: string }> }
) {
  try {
    const { memberId } = await params

    // Step 1: Authenticate user
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    let decodedToken
    try {
      decodedToken = await adminAuth.verifyIdToken(token)
    } catch (error) {
      logger.error('[API /family/members/[id] DELETE] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Step 2: Rate limiting
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/members/[id] DELETE] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Step 3: Find the current user and verify they're account owner or co-admin
    const userDoc = await adminDb.collection('users').doc(userId).get()
    if (!userDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const userData = userDoc.data()
    const isAccountOwner = userData?.preferences?.isAccountOwner === true

    let ownerUserId: string

    if (isAccountOwner) {
      ownerUserId = userId
    } else {
      // Check if user is a Co-Admin
      const familyMemberSnapshot = await adminDb
        .collectionGroup('familyMembers')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .limit(1)
        .get()

      if (familyMemberSnapshot.empty) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'You are not part of a family account' },
          { status: 403 }
        )
      }

      const currentMember = familyMemberSnapshot.docs[0].data() as FamilyMember
      if (currentMember.familyRole !== 'co_admin' && currentMember.familyRole !== 'account_owner') {
        return NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Only Account Owners and Co-Admins can remove members' },
          { status: 403 }
        )
      }

      ownerUserId = familyMemberSnapshot.docs[0].ref.parent.parent?.id || ''
    }

    // Step 4: Get the member being removed
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

    const member = memberDoc.data() as FamilyMember

    // Can't remove account owner
    if (member.familyRole === 'account_owner') {
      return NextResponse.json(
        { success: false, error: 'Cannot remove account owner' },
        { status: 403 }
      )
    }

    // Step 5: Remove member from all patient subcollections
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(ownerUserId)
      .collection('patients')
      .get()

    const batch = adminDb.batch()

    for (const patientDoc of patientsSnapshot.docs) {
      const patientFamilyRef = patientDoc.ref
        .collection('familyMembers')
        .doc(memberId)

      batch.delete(patientFamilyRef)
    }

    // Step 6: Remove member from main familyMembers collection
    batch.delete(memberRef)

    await batch.commit()

    logger.info('[API /family/members/[id] DELETE] Member removed successfully', {
      userId,
      ownerUserId,
      memberId,
      memberEmail: member.email
    })

    return NextResponse.json({
      success: true,
      message: 'Family member removed successfully'
    })
  } catch (error: any) {
    logger.error('[API /family/members/[id] DELETE] Error removing member', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to remove family member' },
      { status: 500 }
    )
  }
}
