/**
 * Unified Audit Trail Operations
 *
 * Centralized utility for creating, querying, and managing audit logs
 * across all entity types in the application.
 *
 * Features:
 * - Server-side only operations (uses Admin SDK)
 * - Automatic metadata enrichment
 * - Transaction support for atomic operations
 * - Batch operations for performance
 * - Query optimization with proper indexing
 *
 * Usage:
 * ```ts
 * import { createAuditLog, queryAuditLogs } from '@/lib/audit-operations'
 *
 * // Create an audit log
 * await createAuditLog({
 *   entityType: 'medication',
 *   entityId: medicationId,
 *   entityName: 'Metformin 500mg',
 *   patientId,
 *   userId,
 *   action: 'updated',
 *   performedBy: userId,
 *   performedByName: 'John Doe',
 *   changes: [...]
 * })
 *
 * // Query audit logs
 * const { logs, hasMore } = await queryAuditLogs({
 *   patientId,
 *   entityType: 'medication',
 *   startDate: new Date('2024-01-01'),
 *   limit: 50
 * })
 * ```
 */

import { adminDb, FieldValue } from './firebase-admin'
import { logger } from './logger'
import type {
  AuditLog,
  CreateAuditLogInput,
  AuditLogFilters,
  AuditLogResponse,
  AuditFieldChange,
  AuditEntityType,
  AuditAction
} from '@/types/audit'

// ==================== CREATE OPERATIONS ====================

/**
 * Create a single audit log entry
 *
 * @param input - Audit log data (without id and performedAt)
 * @param transaction - Optional Firestore transaction for atomic operations
 * @returns The created audit log ID
 *
 * @example
 * ```ts
 * const logId = await createAuditLog({
 *   entityType: 'medication',
 *   entityId: 'med_123',
 *   entityName: 'Metformin 500mg',
 *   patientId: 'pat_456',
 *   userId: 'user_789',
 *   action: 'updated',
 *   performedBy: 'user_789',
 *   performedByName: 'John Doe',
 *   changes: [{ field: 'strength', oldValue: '250mg', newValue: '500mg', ... }]
 * })
 * ```
 */
export async function createAuditLog(
  input: CreateAuditLogInput,
  transaction?: FirebaseFirestore.Transaction
): Promise<string> {
  try {
    // Prepare audit log data
    const auditLog: Omit<AuditLog, 'id'> = {
      ...input,
      performedAt: input.performedAt || new Date().toISOString(),
      // Set retention period (HIPAA: 6 years from creation)
      retainUntil: input.retainUntil || getRetentionDate(6)
    }

    // Determine the Firestore path based on entity type
    const collectionPath = getAuditLogPath(input)

    if (transaction) {
      // Use transaction if provided
      const docRef = adminDb.collection(collectionPath).doc()
      transaction.set(docRef, auditLog)
      return docRef.id
    } else {
      // Direct write
      const docRef = await adminDb.collection(collectionPath).add(auditLog)
      logger.info('[Audit] Log created', {
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        logId: docRef.id
      })
      return docRef.id
    }
  } catch (error) {
    logger.error('[Audit] Failed to create audit log', error as Error, {
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action
    })
    throw error
  }
}

/**
 * Create multiple audit logs in a batch
 *
 * @param inputs - Array of audit log inputs
 * @param useTransaction - Whether to use a Firestore transaction (default: false)
 * @returns Array of created audit log IDs
 *
 * @example
 * ```ts
 * const logIds = await createAuditLogsBatch([
 *   { entityType: 'medication', entityId: 'med1', ... },
 *   { entityType: 'document', entityId: 'doc1', ... }
 * ])
 * ```
 */
export async function createAuditLogsBatch(
  inputs: CreateAuditLogInput[],
  useTransaction: boolean = false
): Promise<string[]> {
  try {
    if (useTransaction) {
      // Use Firestore transaction for atomicity
      return await adminDb.runTransaction(async (transaction) => {
        const logIds: string[] = []
        for (const input of inputs) {
          const logId = await createAuditLog(input, transaction)
          logIds.push(logId)
        }
        return logIds
      })
    } else {
      // Use batch write (more efficient for large batches)
      const batch = adminDb.batch()
      const logIds: string[] = []

      for (const input of inputs) {
        const collectionPath = getAuditLogPath(input)
        const docRef = adminDb.collection(collectionPath).doc()
        const auditLog: Omit<AuditLog, 'id'> = {
          ...input,
          performedAt: input.performedAt || new Date().toISOString(),
          retainUntil: input.retainUntil || getRetentionDate(6)
        }
        batch.set(docRef, auditLog)
        logIds.push(docRef.id)
      }

      await batch.commit()
      logger.info('[Audit] Batch logs created', { count: logIds.length })
      return logIds
    }
  } catch (error) {
    logger.error('[Audit] Failed to create audit logs batch', error as Error, {
      count: inputs.length
    })
    throw error
  }
}

// ==================== QUERY OPERATIONS ====================

/**
 * Query audit logs with filters and pagination
 *
 * @param filters - Query filters
 * @returns Paginated audit log response
 *
 * @example
 * ```ts
 * const { logs, total, hasMore } = await queryAuditLogs({
 *   patientId: 'pat_123',
 *   entityType: ['medication', 'document'],
 *   action: 'updated',
 *   startDate: new Date('2024-01-01'),
 *   limit: 50,
 *   orderBy: 'performedAt',
 *   orderDirection: 'desc'
 * })
 * ```
 */
export async function queryAuditLogs(
  filters: AuditLogFilters
): Promise<AuditLogResponse> {
  try {
    // Start with collection group query for cross-entity queries
    let query: FirebaseFirestore.Query = adminDb.collectionGroup('auditLogs')

    // Apply filters
    if (filters.patientId) {
      query = query.where('patientId', '==', filters.patientId)
    }

    if (filters.userId) {
      query = query.where('userId', '==', filters.userId)
    }

    if (filters.performedBy) {
      query = query.where('performedBy', '==', filters.performedBy)
    }

    if (filters.entityType) {
      if (Array.isArray(filters.entityType)) {
        // Note: Firestore doesn't support 'in' with more than 10 items
        if (filters.entityType.length <= 10) {
          query = query.where('entityType', 'in', filters.entityType)
        }
      } else {
        query = query.where('entityType', '==', filters.entityType)
      }
    }

    if (filters.entityId) {
      query = query.where('entityId', '==', filters.entityId)
    }

    if (filters.action) {
      if (Array.isArray(filters.action)) {
        if (filters.action.length <= 10) {
          query = query.where('action', 'in', filters.action)
        }
      } else {
        query = query.where('action', '==', filters.action)
      }
    }

    // Date range filters
    if (filters.startDate) {
      query = query.where('performedAt', '>=', filters.startDate.toISOString())
    }

    if (filters.endDate) {
      query = query.where('performedAt', '<=', filters.endDate.toISOString())
    }

    // Ordering
    const orderBy = filters.orderBy || 'performedAt'
    const orderDirection = filters.orderDirection || 'desc'
    query = query.orderBy(orderBy, orderDirection)

    // Pagination
    const limit = filters.limit || 50
    query = query.limit(limit + 1) // Fetch one extra to check hasMore

    // Execute query
    const snapshot = await query.get()

    // Process results
    const hasMore = snapshot.docs.length > limit
    const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs

    const logs: AuditLog[] = docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    } as AuditLog))

    // Apply client-side search filter if provided
    let filteredLogs = logs
    if (filters.searchQuery) {
      const searchLower = filters.searchQuery.toLowerCase()
      filteredLogs = logs.filter((log) =>
        log.entityName?.toLowerCase().includes(searchLower) ||
        log.performedByName?.toLowerCase().includes(searchLower) ||
        log.metadata?.notes?.toLowerCase().includes(searchLower)
      )
    }

    logger.info('[Audit] Logs queried', {
      filters: JSON.stringify(filters),
      resultCount: filteredLogs.length,
      hasMore
    })

    return {
      logs: filteredLogs,
      total: filteredLogs.length,
      hasMore
    }
  } catch (error) {
    logger.error('[Audit] Failed to query audit logs', error as Error, { filters })
    throw error
  }
}

/**
 * Get audit logs for a specific entity
 *
 * @param entityType - Type of entity
 * @param entityId - Entity ID
 * @param patientId - Patient ID (for security)
 * @param userId - User ID (for security)
 * @param limit - Maximum number of logs to return (default: 100)
 * @returns Array of audit logs
 *
 * @example
 * ```ts
 * const logs = await getEntityAuditLogs(
 *   'medication',
 *   'med_123',
 *   'pat_456',
 *   'user_789'
 * )
 * ```
 */
export async function getEntityAuditLogs(
  entityType: AuditEntityType,
  entityId: string,
  patientId: string,
  userId: string,
  limit: number = 100
): Promise<AuditLog[]> {
  const { logs } = await queryAuditLogs({
    entityType,
    entityId,
    patientId,
    userId,
    limit,
    orderBy: 'performedAt',
    orderDirection: 'desc'
  })
  return logs
}

/**
 * Get recent audit activity for a patient
 *
 * @param patientId - Patient ID
 * @param userId - User ID (for security)
 * @param limit - Maximum number of logs to return (default: 50)
 * @returns Array of recent audit logs
 *
 * @example
 * ```ts
 * const recentActivity = await getRecentAuditActivity('pat_123', 'user_789', 20)
 * ```
 */
export async function getRecentAuditActivity(
  patientId: string,
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const { logs } = await queryAuditLogs({
    patientId,
    userId,
    limit,
    orderBy: 'performedAt',
    orderDirection: 'desc'
  })
  return logs
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Calculate retention date based on years from now
 *
 * @param years - Number of years
 * @returns ISO 8601 date string
 */
function getRetentionDate(years: number): string {
  const date = new Date()
  date.setFullYear(date.getFullYear() + years)
  return date.toISOString()
}

/**
 * Get the Firestore collection path for audit logs based on entity type
 *
 * @param input - Audit log input
 * @returns Firestore collection path
 */
function getAuditLogPath(input: CreateAuditLogInput): string {
  const { entityType, entityId, patientId, userId } = input

  switch (entityType) {
    case 'medication':
      return `users/${userId}/patients/${patientId}/medications/${entityId}/auditLogs`

    case 'document':
      return `users/${userId}/patients/${patientId}/documents/${entityId}/auditLogs`

    case 'health_report':
      return `users/${userId}/patients/${patientId}/healthReports/${entityId}/auditLogs`

    case 'vital_signs':
      return `users/${userId}/patients/${patientId}/vitals/${entityId}/auditLogs`

    case 'weight_log':
      return `users/${userId}/patients/${patientId}/weight-logs/${entityId}/auditLogs`

    case 'meal_log':
      return `users/${userId}/patients/${patientId}/meal-logs/${entityId}/auditLogs`

    case 'step_log':
      return `users/${userId}/patients/${patientId}/step-logs/${entityId}/auditLogs`

    case 'patient_profile':
      return `users/${userId}/patients/${patientId}/auditLogs`

    case 'family_member':
      return `users/${userId}/familyMembers/${entityId}/auditLogs`

    case 'healthcare_provider':
      return `users/${userId}/patients/${patientId}/healthcareProviders/${entityId}/auditLogs`

    default:
      throw new Error(`Unknown entity type: ${entityType}`)
  }
}

/**
 * Calculate field changes between old and new objects
 * Useful for generating AuditFieldChange[] from before/after snapshots
 *
 * @param oldData - Previous state
 * @param newData - New state
 * @param fieldLabels - Map of field names to human-readable labels
 * @returns Array of field changes
 *
 * @example
 * ```ts
 * const changes = calculateFieldChanges(
 *   { name: 'Aspirin', strength: '250mg' },
 *   { name: 'Aspirin', strength: '500mg', notes: 'Take with food' },
 *   { name: 'Medication Name', strength: 'Strength', notes: 'Notes' }
 * )
 * // Returns: [{ field: 'strength', fieldLabel: 'Strength', oldValue: '250mg', newValue: '500mg', dataType: 'string' }, ...]
 * ```
 */
export function calculateFieldChanges(
  oldData: Record<string, any>,
  newData: Record<string, any>,
  fieldLabels: Record<string, string>
): AuditFieldChange[] {
  const changes: AuditFieldChange[] = []

  // Get all unique keys from both objects
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    // Skip system fields
    if (['id', 'lastModified', 'lastModifiedBy', 'createdAt', 'updatedAt'].includes(key)) {
      continue
    }

    const oldValue = oldData[key]
    const newValue = newData[key]

    // Skip if values are the same
    if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
      continue
    }

    // Determine data type
    let dataType: AuditFieldChange['dataType'] = 'string'
    const value = newValue !== undefined ? newValue : oldValue

    if (typeof value === 'number') {
      dataType = 'number'
    } else if (typeof value === 'boolean') {
      dataType = 'boolean'
    } else if (Array.isArray(value)) {
      dataType = 'array'
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      dataType = 'object'
    } else if (key.toLowerCase().includes('date') || key.toLowerCase().includes('at')) {
      dataType = 'date'
    } else if (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) {
      dataType = 'image'
    } else if (key.toLowerCase().includes('file') || key.toLowerCase().includes('document')) {
      dataType = 'file'
    }

    // Prepare metadata for arrays and objects
    const metadata: AuditFieldChange['metadata'] = {}

    if (dataType === 'array' && Array.isArray(oldValue) && Array.isArray(newValue)) {
      const added = newValue.filter((item) => !oldValue.includes(item))
      const removed = oldValue.filter((item) => !newValue.includes(item))
      const unchanged = newValue.filter((item) => oldValue.includes(item))
      metadata.arrayDiff = { added, removed, unchanged }
    }

    if (dataType === 'object' && oldValue && newValue) {
      const oldKeys = new Set(Object.keys(oldValue))
      const newKeys = new Set(Object.keys(newValue))
      const added = Array.from(newKeys).filter((k) => !oldKeys.has(k))
      const removed = Array.from(oldKeys).filter((k) => !newKeys.has(k))
      const modified = Array.from(newKeys).filter(
        (k) => oldKeys.has(k) && JSON.stringify(oldValue[k]) !== JSON.stringify(newValue[k])
      )
      metadata.objectDiff = { added, removed, modified }
    }

    changes.push({
      field: key,
      fieldLabel: fieldLabels[key] || key,
      oldValue: Array.isArray(oldValue) ? oldValue.length : oldValue,
      newValue: Array.isArray(newValue) ? newValue.length : newValue,
      dataType,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined
    })
  }

  return changes
}

/**
 * Archive old audit logs based on retention policy
 * Should be run periodically (e.g., via Cloud Function cron job)
 *
 * @param dryRun - If true, only logs what would be archived without actually archiving
 * @returns Number of logs archived
 *
 * @example
 * ```ts
 * // Archive logs past retention period
 * const archivedCount = await archiveExpiredAuditLogs()
 *
 * // Dry run to see what would be archived
 * const wouldArchiveCount = await archiveExpiredAuditLogs(true)
 * ```
 */
export async function archiveExpiredAuditLogs(dryRun: boolean = false): Promise<number> {
  try {
    const now = new Date().toISOString()
    const query = adminDb
      .collectionGroup('auditLogs')
      .where('retainUntil', '<=', now)
      .where('archived', '!=', true)
      .limit(500) // Process in batches

    const snapshot = await query.get()

    if (dryRun) {
      logger.info('[Audit] Dry run: would archive logs', { count: snapshot.docs.length })
      return snapshot.docs.length
    }

    const batch = adminDb.batch()
    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        archived: true,
        archivedAt: now
      })
    })

    await batch.commit()
    logger.info('[Audit] Logs archived', { count: snapshot.docs.length })
    return snapshot.docs.length
  } catch (error) {
    logger.error('[Audit] Failed to archive expired logs', error as Error)
    throw error
  }
}
