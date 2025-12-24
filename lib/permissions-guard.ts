/**
 * Permission Guard for Bulk Operations
 *
 * Provides server-side permission verification and active session detection
 * for destructive bulk operations (clear shopping list, batch discard inventory)
 */

import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { HouseholdRole } from '@/types/household-permissions'
import type { ShoppingSession } from '@/types/shopping-session'
import { logger } from '@/lib/logger'

export interface BulkOperationPermissionCheck {
  allowed: boolean
  reason?: string
  userRole?: HouseholdRole | null
  blockedBy?: {
    type: 'permission' | 'active_session'
    details: string
    sessionOwner?: string
    sessionId?: string
  }
  requiredRole?: HouseholdRole
}

/**
 * Verify if user has permission to perform bulk operation
 * and check for active shopping sessions that would be disrupted
 */
export async function verifyBulkOperationPermission(
  authenticatedUid: string,
  householdId: string,
  operation: 'clear_list' | 'batch_discard'
): Promise<BulkOperationPermissionCheck> {
  try {
    // 1. Fetch household to get user's role
    const householdDoc = await getDoc(doc(db, 'households', householdId))
    if (!householdDoc.exists()) {
      logger.warn('[PermissionGuard] Household not found', { householdId })
      return {
        allowed: false,
        reason: 'Household not found',
        userRole: null
      }
    }

    const household = householdDoc.data()
    const userRole = getUserRoleInHousehold(authenticatedUid, household)

    // 2. Check role permission
    const hasPermission = checkRolePermission(userRole, operation)

    if (!hasPermission) {
      logger.info('[PermissionGuard] Permission denied', {
        userId: authenticatedUid,
        householdId,
        operation,
        userRole
      })

      return {
        allowed: false,
        reason: 'Insufficient permissions',
        userRole,
        requiredRole: 'primary_caregiver',
        blockedBy: {
          type: 'permission',
          details: 'Only household owner and primary caregiver can perform bulk operations'
        }
      }
    }

    // 3. Check for active shopping sessions (excluding current user's sessions)
    const activeSessions = await getActiveShoppingSessions(householdId, authenticatedUid)

    if (activeSessions.length > 0) {
      const blockingSession = activeSessions[0]
      logger.info('[PermissionGuard] Blocked by active session', {
        userId: authenticatedUid,
        householdId,
        operation,
        blockingSessionId: blockingSession.id,
        blockingUserId: blockingSession.userId
      })

      return {
        allowed: false,
        reason: 'Active shopping session in progress',
        userRole,
        blockedBy: {
          type: 'active_session',
          details: `${blockingSession.userName} is currently shopping`,
          sessionOwner: blockingSession.userName,
          sessionId: blockingSession.id
        }
      }
    }

    // All checks passed
    logger.info('[PermissionGuard] Permission granted', {
      userId: authenticatedUid,
      householdId,
      operation,
      userRole
    })

    return {
      allowed: true,
      userRole
    }

  } catch (error) {
    logger.error('[PermissionGuard] Error verifying permission', error as Error, {
      userId: authenticatedUid,
      householdId,
      operation
    })

    return {
      allowed: false,
      reason: 'Permission verification failed',
      userRole: null
    }
  }
}

/**
 * Get user's role in household
 */
function getUserRoleInHousehold(uid: string, household: any): HouseholdRole | null {
  if (!household) return null

  // Owner: Created the household
  if (household.createdBy === uid) {
    return 'owner'
  }

  // Primary Caregiver
  if (household.primaryCaregiverId === uid) {
    return 'primary_caregiver'
  }

  // Additional Caregiver
  if (household.additionalCaregiverIds && Array.isArray(household.additionalCaregiverIds)) {
    if (household.additionalCaregiverIds.includes(uid)) {
      return 'caregiver'
    }
  }

  // Default: viewer (has access but limited permissions)
  return 'viewer'
}

/**
 * Check if role has permission for operation
 */
function checkRolePermission(role: HouseholdRole | null, operation: 'clear_list' | 'batch_discard'): boolean {
  if (!role) return false

  // Only owner and primary_caregiver can perform bulk operations
  if (role === 'owner' || role === 'primary_caregiver') {
    return true
  }

  // Regular caregivers and viewers cannot perform bulk operations
  return false
}

/**
 * Get active shopping sessions for household (excluding specified user)
 */
async function getActiveShoppingSessions(
  householdId: string,
  excludeUserId?: string
): Promise<ShoppingSession[]> {
  try {
    // Query sessions that are:
    // 1. In this household
    // 2. Have 'active' status
    // 3. Had activity in last 3 minutes (heartbeat tolerance)
    const threeMinutesAgo = Timestamp.fromMillis(Date.now() - 3 * 60 * 1000)

    const q = query(
      collection(db, 'shopping_sessions'),
      where('householdId', '==', householdId),
      where('status', '==', 'active'),
      where('lastActivityAt', '>', threeMinutesAgo)
    )

    const snapshot = await getDocs(q)
    const sessions = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ShoppingSession))
      .filter(session => {
        // Exclude current user's sessions (they can override their own)
        if (excludeUserId && session.userId === excludeUserId) {
          return false
        }
        return true
      })

    logger.info('[PermissionGuard] Active sessions found', {
      householdId,
      count: sessions.length,
      sessionIds: sessions.map(s => s.id)
    })

    return sessions

  } catch (error) {
    logger.error('[PermissionGuard] Error fetching active sessions', error as Error, {
      householdId
    })
    return []
  }
}

/**
 * Custom error class for bulk operation blocking
 */
export class BulkOperationBlockedError extends Error {
  constructor(public permissionCheck: BulkOperationPermissionCheck) {
    super(permissionCheck.reason || 'Bulk operation blocked')
    this.name = 'BulkOperationBlockedError'
    Object.setPrototypeOf(this, BulkOperationBlockedError.prototype)
  }

  /**
   * Check if blocked by active session
   */
  isSessionBlock(): boolean {
    return this.permissionCheck.blockedBy?.type === 'active_session'
  }

  /**
   * Check if blocked by insufficient permissions
   */
  isPermissionBlock(): boolean {
    return this.permissionCheck.blockedBy?.type === 'permission'
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(): string {
    if (this.isSessionBlock()) {
      return `${this.permissionCheck.blockedBy?.sessionOwner} is currently shopping. Please wait for them to finish or override with caution.`
    }

    if (this.isPermissionBlock()) {
      return `You need ${this.permissionCheck.requiredRole} permission to perform this operation.`
    }

    return this.message
  }
}
