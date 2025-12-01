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
import { errorResponse } from '@/lib/api-response'

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
    return errorResponse(error, {
      route: '/api/family/roles/assign',
      operation: 'create'
    })
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
      ...familyMemberData,
      ...updateData,
      id: familyMemberDoc.id
    }

    return NextResponse.json({
      success: true,
      data: updatedFamilyMember,
      message: `Role successfully changed to ${getRoleLabel(newRole)}`
    })
  } catch (error: any) {
    return errorResponse(error, {
      route: '/api/family/roles/assign',
      operation: 'create'
    })
  }
}
