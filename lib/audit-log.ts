/**
 * Audit Log Primitives
 *
 * Single source of truth for HIPAA-aligned audit logging of changes to
 * patient records and related entities. Every endpoint that mutates a
 * tracked entity calls these primitives; no per-route entry construction.
 *
 * See memory/project_audit_log_primitives.md for the full architecture
 * and build order.
 *
 * Storage layout (preserved from the original inline writer in the
 * DELETE handler for backwards-compat with existing entries):
 *   users/{ownerUserId}/auditLogs/{auto-id}
 *
 * Reader, formatter, actor-label, and PHI policy helpers will land in
 * follow-up commits. This module currently exposes only the writer.
 */
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export type AuditEntityType = 'patient' | 'medication' | 'vital' | 'appointment' | 'document'

export type AuditAction = 'created' | 'updated' | 'deleted' | 'archived' | 'restored'

export interface AuditLogChange {
  /** Dotted path of the field that changed (e.g. "name", "preferences.vitalReminders.weight"). */
  field: string
  oldValue: unknown
  newValue: unknown
  /** Human-readable field label for the formatter (e.g. "Patient Name"). */
  fieldLabel?: string
  /** Hint for the formatter — 'string' | 'number' | 'boolean' | 'object' | 'array'. */
  dataType?: string
}

export interface WriteAuditEntryOptions {
  entityType: AuditEntityType
  entityId: string
  /** Identifier shown in admin lists (typically the patient's name). */
  entityName: string
  /** UID of the user who owns the record (the audit log lives under their subcollection). */
  userId: string
  action: AuditAction
  /** UID of the user who performed the change. */
  performedBy: string
  /** Display name of the actor for human-readable logs. */
  performedByName: string
  changes: AuditLogChange[]
  /** Arbitrary metadata — reason text, deletion reason, etc. */
  metadata?: Record<string, unknown>
  /**
   * Optional request — captures IP + user-agent into metadata for
   * forensic context. When omitted, those fields are not recorded.
   */
  request?: Request
}

/**
 * Write a single audit-log entry. NEVER throws — audit logging must
 * not block a user-facing operation. Failures are logged and
 * swallowed.
 *
 * For multi-field updates, prefer building one entry with a `changes`
 * array of N items rather than calling this N times. The reader UI
 * groups by entry, so one write per request keeps the timeline clean.
 */
export async function writeAuditEntry(opts: WriteAuditEntryOptions): Promise<void> {
  try {
    const performedAt = new Date().toISOString()

    const metadata: Record<string, unknown> = { ...(opts.metadata ?? {}) }
    if (opts.request) {
      metadata.ipAddress = opts.request.headers.get('x-forwarded-for') ?? 'unknown'
      metadata.userAgent = opts.request.headers.get('user-agent') ?? 'unknown'
    }

    const auditLogRef = adminDb
      .collection('users')
      .doc(opts.userId)
      .collection('auditLogs')
      .doc()

    await auditLogRef.set({
      entityType: opts.entityType,
      entityId: opts.entityId,
      entityName: opts.entityName,
      // Backwards-compat: existing entries (DELETE writer) carried a
      // `patientId` field that duplicated `entityId` for patient rows.
      // Preserve so older queries filtering on `patientId` keep working.
      ...(opts.entityType === 'patient' ? { patientId: opts.entityId } : {}),
      userId: opts.userId,
      action: opts.action,
      performedBy: opts.performedBy,
      performedByName: opts.performedByName,
      performedAt,
      changes: opts.changes,
      metadata,
    })
  } catch (error) {
    // Audit failures must NEVER block user operations. Log and swallow.
    logger.error(
      '[audit-log] Failed to write entry',
      error instanceof Error ? error : undefined,
      {
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
      },
    )
  }
}
