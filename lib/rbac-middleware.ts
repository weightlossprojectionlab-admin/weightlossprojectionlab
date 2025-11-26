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
import type { FamilyMember, FamilyMemberPermissions, FamilyRole } from '@/types/medical'
import { isAccountOwner, hasAdminPrivileges, ROLE_CAPABILITIES } from '@/lib/family-roles'

export type UserRole = 'owner' | 'family'

export interface AuthorizationResult {
  authorized: boolean
  role?: UserRole
  permissions?: FamilyMemberPermissions
  userId?: string
  ownerUserId?: string  // Patient owner's ID (for DB queries) - IMPORTANT: Always set this for authorized=true
  familyRole?: FamilyRole  // Account Owner, Co-Admin, Caregiver, Viewer
}

export interface AssertPatientAccessResult {
  userId: string        // Authenticated user's ID
  ownerUserId: string   // Patient owner's ID (for DB queries)
  role: UserRole        // 'owner' | 'family'
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
        userId,
        ownerUserId: userId // When user is owner, ownerUserId is same as userId
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

    // Extract owner userId from familyMember document path
    // Path format: users/{ownerUserId}/patients/{patientId}/familyMembers/{memberId}
    const ownerUserId = familyMemberDoc.ref.parent.parent?.parent.parent?.id

    // Guard: Ensure ownerUserId was extracted successfully
    if (!ownerUserId) {
      logger.error('[RBAC] Unable to extract owner userId from family member path', {
        userId,
        patientId,
        path: familyMemberDoc.ref.path
      })
      return { authorized: false }
    }

    // Get family role (default to 'caregiver' for backward compatibility)
    const familyRole: FamilyRole = familyMember.familyRole || 'caregiver'

    // Account Owner and Co-Admin bypass permission checks (they have full access)
    if (hasAdminPrivileges(familyRole)) {
      logger.info('[RBAC] Family member has admin privileges - full access granted', {
        userId,
        patientId,
        familyRole,
        memberId: familyMember.id
      })
      return {
        authorized: true,
        role: 'family',
        permissions: familyMember.permissions,
        userId,
        ownerUserId,
        familyRole
      }
    }

    // If no specific permission required, grant access (for read operations)
    if (!requiredPermission) {
      logger.info('[RBAC] Family member has access (no specific permission required)', {
        userId,
        patientId,
        familyRole,
        memberId: familyMember.id
      })
      return {
        authorized: true,
        role: 'family',
        permissions: familyMember.permissions,
        userId,
        ownerUserId,
        familyRole
      }
    }

    // Check if family member has the required permission
    const hasPermission = familyMember.permissions[requiredPermission] === true

    if (hasPermission) {
      logger.info('[RBAC] Family member has required permission', {
        userId,
        patientId,
        permission: requiredPermission,
        familyRole,
        memberId: familyMember.id
      })
      return {
        authorized: true,
        role: 'family',
        permissions: familyMember.permissions,
        userId,
        ownerUserId,
        familyRole
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

/**
 * Get the owner userId for a patient
 * Handles both owner and family member scenarios
 *
 * @param userId - Authenticated user's ID
 * @param patientId - Patient document ID
 * @param role - User's role (owner or family)
 * @returns Owner's userId or null if patient not found
 */
export async function getPatientOwner(
  userId: string,
  patientId: string,
  role: UserRole
): Promise<string | null> {
  // Guard: Validate inputs
  if (!userId || !patientId || !role) {
    logger.error('[RBAC] Invalid parameters for getPatientOwner', { userId, patientId, role })
    return null
  }

  // If user is owner, return their ID
  if (role === 'owner') {
    return userId
  }

  // Family member - find the patient's owner via collectionGroup query
  try {
    logger.debug('[RBAC] Searching for patient in collectionGroup', { patientId, userId })

    // Note: collectionGroup with where('__name__', '==', patientId) requires a full document path,
    // not just a document ID. Instead, we need to fetch all patients and filter by ID.
    // For better performance with large datasets, consider indexing patientId as a field.
    const patientSnapshot = await adminDb
      .collectionGroup('patients')
      .get()

    // Filter by document ID
    const matchingDocs = patientSnapshot.docs.filter(doc => doc.id === patientId)

    logger.debug('[RBAC] CollectionGroup query result', {
      patientId,
      userId,
      found: matchingDocs.length > 0,
      count: matchingDocs.length
    })

    // Guard: Patient not found
    if (matchingDocs.length === 0) {
      logger.warn('[RBAC] Patient not found in collectionGroup query', {
        patientId,
        userId,
        message: 'The patient document does not exist in any user\'s patients collection. This could mean the patient was deleted or the invitation references a non-existent patient.'
      })
      return null
    }

    // Extract owner userId from document path
    const patientDocRef = matchingDocs[0].ref
    const ownerUserId = patientDocRef.parent.parent?.id

    logger.debug('[RBAC] Extracted owner from path', {
      patientId,
      path: patientDocRef.path,
      ownerUserId
    })

    // Guard: Invalid path structure
    if (!ownerUserId) {
      logger.error('[RBAC] Unable to extract owner from patient path', {
        patientId,
        path: patientDocRef.path
      })
      return null
    }

    logger.debug('[RBAC] Found patient owner', { patientId, ownerUserId, familyMemberId: userId })
    return ownerUserId

  } catch (error) {
    logger.error('[RBAC] Error finding patient owner', error as Error, { userId, patientId })
    return null
  }
}

/**
 * Assert patient access and return owner userId for database operations
 *
 * This is the PRIMARY function for all patient-related API routes.
 * It combines authentication, authorization, and owner resolution.
 *
 * @param request - Next.js request object
 * @param patientId - Patient document ID
 * @param requiredPermission - Optional specific permission required for family members
 * @returns AssertPatientAccessResult or Response (error)
 *
 * @example
 * const authResult = await assertPatientAccess(request, patientId, 'viewVitals')
 * if (authResult instanceof Response) return authResult
 *
 * const { userId, ownerUserId, role } = authResult
 * // Now query: users/{ownerUserId}/patients/{patientId}
 */
export async function assertPatientAccess(
  request: Request,
  patientId: string,
  requiredPermission?: keyof FamilyMemberPermissions
): Promise<AssertPatientAccessResult | Response> {
  // Guard: Validate patientId
  if (!patientId || typeof patientId !== 'string' || patientId.trim() === '') {
    logger.warn('[RBAC] Invalid patientId provided to assertPatientAccess', { patientId })
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid patient ID' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Step 1: Authorize access (checks token + family permissions)
  const authResult = await authorizePatientAccess(request, patientId, requiredPermission)

  if (authResult instanceof Response) {
    return authResult // Return 401/403 error response
  }

  const { userId, role } = authResult as AuthorizationResult

  // Guard: userId must exist (TypeScript + runtime check)
  if (!userId) {
    logger.error('[RBAC] No userId in authorization result', { patientId })
    return new Response(
      JSON.stringify({ success: false, error: 'User ID not found in authorization result' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Guard: role must exist (TypeScript + runtime check)
  if (!role) {
    logger.error('[RBAC] No role in authorization result', { userId, patientId })
    return new Response(
      JSON.stringify({ success: false, error: 'User role not found in authorization result' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Step 2: Get patient owner's userId
  const ownerUserId = await getPatientOwner(userId, patientId, role)

  // Guard: ownerUserId must exist
  if (!ownerUserId) {
    logger.error('[RBAC] Unable to determine patient owner', { userId, patientId, role })
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Patient not found or unable to determine owner'
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
  }

  logger.info('[RBAC] Patient access assertion successful', {
    userId,
    ownerUserId,
    patientId,
    role,
    permission: requiredPermission
  })

  return { userId, ownerUserId, role }
}
