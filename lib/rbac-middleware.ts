/**
 * RBAC Middleware for Family Member Permissions
 *
 * Checks if a user has permission to perform an action on a patient's data
 * Supports two roles:
 * - Owner: Full access to their own patients
 * - Family Member: Limited access based on granted permissions
 */

import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import type { FamilyMember, FamilyMemberPermissions } from '@/types/medical'

export type UserRole = 'owner' | 'family'

export interface AuthorizationResult {
  authorized: boolean
  role?: UserRole
  permissions?: FamilyMemberPermissions
  userId?: string
}

/**
 * Verify auth token and extract user ID
 */
export async function verifyAuthToken(authHeader: string | null): Promise<{ userId: string } | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('[RBAC] Missing or invalid Authorization header')
    return null
  }

  try {
    const token = authHeader.substring(7)
    const decodedToken = await adminAuth.verifyIdToken(token)
    return { userId: decodedToken.uid }
  } catch (error) {
    logger.error('[RBAC] Token verification failed', error as Error)
    return null
  }
}

/**
 * Check if user has permission to perform an action on a patient
 *
 * @param userId - The authenticated user's ID
 * @param patientId - The patient/family member being accessed
 * @param requiredPermission - The permission required (optional for read-only owner check)
 * @returns Authorization result with role and permissions
 */
export async function checkPatientAccess(
  userId: string,
  patientId: string,
  requiredPermission?: keyof FamilyMemberPermissions
): Promise<AuthorizationResult> {
  try {
    logger.debug('[RBAC] Checking patient access', { userId, patientId, requiredPermission })

    // Check if user is the patient owner (full access)
    const patientRef = adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientId)

    const patientDoc = await patientRef.get()

    if (patientDoc.exists) {
      logger.info('[RBAC] User is patient owner - full access granted', { userId, patientId })
      return {
        authorized: true,
        role: 'owner',
        userId
      }
    }

    // User is not owner - check if they're a family member with access
    const familyMembersSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('userId', '==', userId)
      .where('status', '==', 'accepted')
      .where('patientsAccess', 'array-contains', patientId)
      .limit(1)
      .get()

    if (familyMembersSnapshot.empty) {
      logger.warn('[RBAC] User has no access to patient', { userId, patientId })
      return { authorized: false }
    }

    const familyMemberDoc = familyMembersSnapshot.docs[0]
    const familyMember = {
      id: familyMemberDoc.id,
      ...familyMemberDoc.data()
    } as FamilyMember

    // If no specific permission required, grant access (for read operations)
    if (!requiredPermission) {
      logger.info('[RBAC] Family member has access (no specific permission required)', {
        userId,
        patientId,
        memberId: familyMember.id
      })
      return {
        authorized: true,
        role: 'family',
        permissions: familyMember.permissions,
        userId
      }
    }

    // Check if family member has the required permission
    const hasPermission = familyMember.permissions[requiredPermission] === true

    if (hasPermission) {
      logger.info('[RBAC] Family member has required permission', {
        userId,
        patientId,
        permission: requiredPermission,
        memberId: familyMember.id
      })
      return {
        authorized: true,
        role: 'family',
        permissions: familyMember.permissions,
        userId
      }
    }

    logger.warn('[RBAC] Family member lacks required permission', {
      userId,
      patientId,
      permission: requiredPermission,
      memberId: familyMember.id,
      currentPermissions: familyMember.permissions
    })

    return {
      authorized: false,
      role: 'family',
      permissions: familyMember.permissions,
      userId
    }
  } catch (error) {
    logger.error('[RBAC] Error checking patient access', error as Error, { userId, patientId })
    return { authorized: false }
  }
}

/**
 * Middleware wrapper for Next.js API routes
 * Returns authorization result or JSON error response
 */
export async function authorizePatientAccess(
  request: Request,
  patientId: string,
  requiredPermission?: keyof FamilyMemberPermissions
): Promise<AuthorizationResult | Response> {
  // Verify token
  const authHeader = request.headers.get('Authorization')
  const authResult = await verifyAuthToken(authHeader)

  if (!authResult) {
    return new Response(
      JSON.stringify({ success: false, error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Check permissions
  const accessResult = await checkPatientAccess(authResult.userId, patientId, requiredPermission)

  if (!accessResult.authorized) {
    const errorMessage = requiredPermission
      ? `You don't have permission to perform this action. Required: ${requiredPermission}`
      : 'You don\'t have access to this patient'

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Forbidden',
        message: errorMessage
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return accessResult
}
