/**
 * Admin Audit Logging System
 *
 * Logs all admin actions for compliance and security.
 * Retention: 7 years (legal requirement)
 */

import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import { logger } from '@/lib/logger'

export type AdminAction =
  // User actions
  | 'user_view'
  | 'user_suspend'
  | 'user_unsuspend'
  | 'user_delete'
  | 'user_export'
  | 'user_edit'
  // Caregiver actions
  | 'add_caregiver_manual'
  | 'remove_caregiver'
  | 'update_caregiver_permissions'
  // Recipe actions
  | 'recipe_approve'
  | 'recipe_reject'
  | 'recipe_feature'
  | 'recipe_delete'
  | 'recipe_edit'
  // T&S actions
  | 'case_create'
  | 'case_triage'
  | 'case_resolve'
  | 'case_escalate'
  | 'case_close'
  // AI actions
  | 'ai_decision_review'
  | 'ai_decision_reverse'
  // Coaching actions
  | 'coach_approve'
  | 'coach_reject'
  | 'coach_strike_add'
  | 'coach_strike_remove'
  | 'payout_trigger'
  // Perk actions
  | 'perk_create'
  | 'perk_edit'
  | 'perk_delete'
  // System actions
  | 'admin_role_grant'
  | 'admin_role_revoke'
  | 'settings_update'

export interface AdminAuditLog {
  logId: string
  adminUid: string
  adminEmail: string
  action: AdminAction
  targetType: 'user' | 'recipe' | 'case' | 'decision' | 'coach' | 'perk' | 'system'
  targetId: string
  changes?: Record<string, any> // Before/after for edits
  reason?: string
  metadata?: Record<string, any>
  timestamp: Timestamp
  ipAddress?: string
  userAgent?: string
}

/**
 * Log an admin action
 */
export async function logAdminAction(params: {
  adminUid: string
  adminEmail: string
  action: AdminAction
  targetType: AdminAuditLog['targetType']
  targetId: string
  changes?: Record<string, any>
  reason?: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
}): Promise<void> {
  try {
    const logData = {
      adminUid: params.adminUid,
      adminEmail: params.adminEmail,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      changes: params.changes,
      reason: params.reason,
      metadata: params.metadata,
      timestamp: Timestamp.now(),
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    }

    // Add to admin_audit_logs collection
    await adminDb.collection('admin_audit_logs').add(logData)

    logger.info('Admin action logged:', {
      admin: params.adminEmail,
      action: params.action,
      target: `${params.targetType}:${params.targetId}`,
    })
  } catch (error) {
    logger.error('Failed to log admin action', error as Error)
    // Don't throw - logging failures shouldn't break admin operations
  }
}

/**
 * Get audit logs for a specific target
 */
export async function getAuditLogs(params: {
  targetType?: AdminAuditLog['targetType']
  targetId?: string
  adminUid?: string
  action?: AdminAction
  limit?: number
  startAfter?: string
}): Promise<AdminAuditLog[]> {
  try {
    let query = adminDb.collection('admin_audit_logs').orderBy('timestamp', 'desc')

    if (params.targetType) {
      query = query.where('targetType', '==', params.targetType) as any
    }

    if (params.targetId) {
      query = query.where('targetId', '==', params.targetId) as any
    }

    if (params.adminUid) {
      query = query.where('adminUid', '==', params.adminUid) as any
    }

    if (params.action) {
      query = query.where('action', '==', params.action) as any
    }

    if (params.limit) {
      query = query.limit(params.limit) as any
    }

    if (params.startAfter) {
      const doc = await adminDb.collection('admin_audit_logs').doc(params.startAfter).get()
      if (doc.exists) {
        query = query.startAfter(doc) as any
      }
    }

    const snapshot = await query.get()

    return snapshot.docs.map((doc) => ({
      logId: doc.id,
      ...doc.data(),
    })) as AdminAuditLog[]
  } catch (error) {
    logger.error('Error fetching audit logs', error as Error)
    return []
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditStats(days: number = 30): Promise<{
  totalActions: number
  actionsByType: Record<AdminAction, number>
  actionsByAdmin: Record<string, number>
  recentActions: AdminAuditLog[]
}> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)

    const snapshot = await adminDb
      .collection('admin_audit_logs')
      .where('timestamp', '>=', Timestamp.fromDate(cutoffDate))
      .get()

    const logs = snapshot.docs.map((doc) => ({
      logId: doc.id,
      ...doc.data(),
    })) as AdminAuditLog[]

    // Count by action type
    const actionsByType: Record<string, number> = {}
    logs.forEach((log) => {
      actionsByType[log.action] = (actionsByType[log.action] || 0) + 1
    })

    // Count by admin
    const actionsByAdmin: Record<string, number> = {}
    logs.forEach((log) => {
      actionsByAdmin[log.adminEmail] = (actionsByAdmin[log.adminEmail] || 0) + 1
    })

    // Get 10 most recent
    const recentActions = logs.slice(0, 10)

    return {
      totalActions: logs.length,
      actionsByType: actionsByType as Record<AdminAction, number>,
      actionsByAdmin,
      recentActions,
    }
  } catch (error) {
    logger.error('Error fetching audit stats', error as Error)
    return {
      totalActions: 0,
      actionsByType: {} as Record<AdminAction, number>,
      actionsByAdmin: {},
      recentActions: [],
    }
  }
}
