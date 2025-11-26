/**
 * Family Role Assignment API
 *
 * POST /api/family/roles/assign - Assign or change family member roles
 *
 * Authorization: Account Owner or Co-Admin only
 * Rate Limit: 60 requests per minute
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { medicalApiRateLimit, getRateLimitHeaders, createRateLimitResponse } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'
import {
  validateRoleAssignment,
  canAssignRole,
  canEditMember,
  getDefaultPermissionsForRole,
  getRoleLabel,
  requiresConfirmation,
  hasAdminPrivileges
} from '@/lib/family-roles'
import type { FamilyMember, FamilyRole } from '@/types/medical'

interface AssignRoleRequest {
  familyMemberId: string
  newRole: FamilyRole
  confirmed?: boolean // Required for roles that need confirmation (co_admin)
}

export async function POST(request: NextRequest) {
  try {
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
      logger.error('[API /family/roles/assign POST] Token verification failed', error as Error)
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const userId = decodedToken.uid

    // Step 2: Rate limiting
    const rateLimitResult = await medicalApiRateLimit.limit(userId)
    if (!rateLimitResult.success) {
      logger.warn('[API /family/roles/assign POST] Rate limit exceeded', { userId })
      return NextResponse.json(
        createRateLimitResponse(rateLimitResult),
        {
          status: 429,
          headers: getRateLimitHeaders(rateLimitResult)
        }
      )
    }

    // Step 3: Parse request body
    const body: AssignRoleRequest = await request.json()
    const { familyMemberId, newRole, confirmed } = body

    if (!familyMemberId || !newRole) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: familyMemberId, newRole' },
        { status: 400 }
      )
    }

    // Validate role is valid
    const validRoles: FamilyRole[] = ['account_owner', 'co_admin', 'caregiver', 'viewer']
    if (!validRoles.includes(newRole)) {
      return NextResponse.json(
        { success: false, error: `Invalid role: ${newRole}` },
        { status: 400 }
      )
    }

    logger.debug('[API /family/roles/assign POST] Processing role assignment', {
      userId,
      familyMemberId,
      newRole,
      confirmed
    })

    // Step 4: Get requester's role (check if they're Account Owner or Co-Admin)
    const requesterUserDoc = await adminDb.collection('users').doc(userId).get()
    if (!requesterUserDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'User profile not found' },
        { status: 404 }
      )
    }

    const requesterData = requesterUserDoc.data()
    const isRequesterAccountOwner = requesterData?.preferences?.isAccountOwner === true

    // If not account owner, check if they're a Co-Admin via family members
    let requesterRole: FamilyRole | null = null
    if (isRequesterAccountOwner) {
      requesterRole = 'account_owner'
    } else {
      // Check if requester is a Co-Admin in any family
      const requesterFamilyMemberSnapshot = await adminDb
        .collectionGroup('familyMembers')
        .where('userId', '==', userId)
        .where('status', '==', 'accepted')
        .where('familyRole', '==', 'co_admin')
        .limit(1)
        .get()

      if (!requesterFamilyMemberSnapshot.empty) {
        requesterRole = 'co_admin'
      }
    }

    // Check if requester has admin privileges
    if (!hasAdminPrivileges(requesterRole)) {
      logger.warn('[API /family/roles/assign POST] Insufficient permissions', {
        userId,
        requesterRole
      })
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Only Account Owners and Co-Admins can assign roles'
        },
        { status: 403 }
      )
    }

    // Step 5: Find the family member to update
    const familyMemberSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('__name__', '==', familyMemberId)
      .limit(1)
      .get()

    if (familyMemberSnapshot.empty) {
      return NextResponse.json(
        { success: false, error: 'Family member not found' },
        { status: 404 }
      )
    }

    const familyMemberDoc = familyMemberSnapshot.docs[0]
    const familyMemberData = familyMemberDoc.data() as FamilyMember
    const currentRole = familyMemberData.familyRole || 'caregiver'

    // Get the owner userId from the document path
    const ownerUserId = familyMemberDoc.ref.parent.parent?.id
    if (!ownerUserId) {
      logger.error('[API /family/roles/assign POST] Unable to extract owner from path: ' + familyMemberDoc.ref.path)
      return NextResponse.json(
        { success: false, error: 'Invalid family member document structure' },
        { status: 500 }
      )
    }

    // Step 6: Validate role assignment
    const validation = validateRoleAssignment(requesterRole!, currentRole, newRole)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 403 }
      )
    }

    // Step 7: Check if confirmation is required
    if (requiresConfirmation(newRole) && !confirmed) {
      return NextResponse.json(
        {
          success: false,
          error: 'Confirmation required',
          message: `Assigning ${getRoleLabel(newRole)} role requires confirmation. Co-Admins have elevated privileges and can manage other family members. Only assign this role to trusted individuals.`,
          requiresConfirmation: true
        },
        { status: 400 }
      )
    }

    // Step 8: Update family member role
    const updateData: Partial<FamilyMember> = {
      familyRole: newRole,
      roleAssignedAt: new Date().toISOString(),
      roleAssignedBy: userId,
      permissions: getDefaultPermissionsForRole(newRole)
    }

    // If assigning co_admin or higher, update canBeEditedBy
    if (newRole === 'co_admin') {
      updateData.canBeEditedBy = [ownerUserId] // Only Account Owner can edit Co-Admins
    } else {
      updateData.canBeEditedBy = [ownerUserId] // Account Owner can edit all members
      // Co-Admins can also edit caregivers and viewers
      if (newRole === 'caregiver' || newRole === 'viewer') {
        // Find all Co-Admins in this family and add them
        const coAdminsSnapshot = await adminDb
          .collection('users')
          .doc(ownerUserId)
          .collection('familyMembers')
          .where('familyRole', '==', 'co_admin')
          .where('status', '==', 'accepted')
          .get()

        const coAdminIds = coAdminsSnapshot.docs.map(doc => doc.data().userId).filter(Boolean)
        updateData.canBeEditedBy = [ownerUserId, ...coAdminIds]
      }
    }

    await familyMemberDoc.ref.update(updateData)

    // Step 9: Create audit log
    await adminDb.collection('auditLogs').add({
      type: 'family_role_assignment',
      userId,
      targetUserId: familyMemberData.userId,
      familyMemberId: familyMemberDoc.id,
      ownerUserId,
      previousRole: currentRole,
      newRole,
      assignedBy: userId,
      assignerRole: requesterRole,
      timestamp: new Date().toISOString(),
      metadata: {
        familyMemberName: familyMemberData.name,
        familyMemberEmail: familyMemberData.email
      }
    })

    logger.info('[API /family/roles/assign POST] Role assigned successfully', {
      userId,
      familyMemberId: familyMemberDoc.id,
      previousRole: currentRole,
      newRole,
      assignedBy: userId
    })

    // Step 10: Return updated family member
    const updatedFamilyMember = {
      id: familyMemberDoc.id,
      ...familyMemberData,
      ...updateData
    }

    return NextResponse.json({
      success: true,
      data: updatedFamilyMember,
      message: `Role successfully changed to ${getRoleLabel(newRole)}`
    })
  } catch (error: any) {
    logger.error('[API /family/roles/assign POST] Error assigning role', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to assign role' },
      { status: 500 }
    )
  }
}
