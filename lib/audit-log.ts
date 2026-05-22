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

/**
 * Canonical list of patient fields we audit. Adding a field here
 * makes it appear in the History tab; removing it stops new
 * entries from recording it (existing entries are untouched).
 *
 * Kept in the audit module rather than per-route so every writer
 * agrees on what's worth recording.
 */
export const PATIENT_TRACKED_FIELDS: ReadonlyArray<{ field: string; label: string; dataType: string }> = [
  // Identity
  { field: 'name', label: 'Legal Full Name', dataType: 'string' },
  { field: 'firstName', label: 'First Name', dataType: 'string' },
  { field: 'middleName', label: 'Middle Name', dataType: 'string' },
  { field: 'lastName', label: 'Last Name', dataType: 'string' },
  { field: 'nickname', label: 'Nickname', dataType: 'string' },
  { field: 'displayPreference', label: 'Display Preference', dataType: 'string' },
  { field: 'gender', label: 'Gender', dataType: 'string' },
  { field: 'relationship', label: 'Relationship', dataType: 'string' },
  { field: 'dateOfBirth', label: 'Date of Birth', dataType: 'string' },
  // Medical identifiers
  { field: 'bloodType', label: 'Blood Type', dataType: 'string' },
  // Vitals profile (goal/lifestyle, not logged readings)
  { field: 'height', label: 'Height', dataType: 'number' },
  { field: 'heightUnit', label: 'Height Unit', dataType: 'string' },
  { field: 'weightUnit', label: 'Weight Unit', dataType: 'string' },
  { field: 'activityLevel', label: 'Activity Level', dataType: 'string' },
  { field: 'weightGoal', label: 'Weight Goal', dataType: 'string' },
  { field: 'targetWeight', label: 'Target Weight', dataType: 'number' },
  // Health
  { field: 'healthConditions', label: 'Health Conditions', dataType: 'array' },
  { field: 'foodAllergies', label: 'Food Allergies', dataType: 'array' },
]

export interface WriteAuditEntriesOptions {
  entityType: AuditEntityType
  entityId: string
  entityName: string
  userId: string
  action: AuditAction
  performedBy: string
  performedByName: string
  /** The record's state BEFORE the update. */
  oldDoc: Record<string, unknown>
  /** The record's state AFTER the update (already merged + persisted, or about to be). */
  newDoc: Record<string, unknown>
  /** Which fields to diff. Use PATIENT_TRACKED_FIELDS for patients. */
  trackedFields: ReadonlyArray<{ field: string; label: string; dataType: string }>
  metadata?: Record<string, unknown>
  request?: Request
}

/**
 * Diff `oldDoc` against `newDoc` over the tracked fields and emit ONE
 * audit-log entry capturing every changed field as a single entry's
 * `changes` array. No-op when nothing tracked actually changed.
 *
 * One entry per request keeps the reader's timeline grouped naturally
 * — a multi-field save shows as one event with N sub-changes, not N
 * adjacent rows.
 */
export async function writeAuditEntries(opts: WriteAuditEntriesOptions): Promise<void> {
  const changes: AuditLogChange[] = []
  for (const tracked of opts.trackedFields) {
    const oldValue = opts.oldDoc[tracked.field]
    const newValue = opts.newDoc[tracked.field]
    // Strict diff. Treat undefined and missing as equivalent. For
    // arrays/objects we compare JSON form — simpler than deep-equal,
    // and the tracked fields don't include preference blobs deep
    // enough to make stringification expensive.
    if (deepEqual(oldValue, newValue)) continue
    changes.push({
      field: tracked.field,
      oldValue: oldValue ?? null,
      newValue: newValue ?? null,
      fieldLabel: tracked.label,
      dataType: tracked.dataType,
    })
  }

  if (changes.length === 0) return // nothing tracked changed

  await writeAuditEntry({
    entityType: opts.entityType,
    entityId: opts.entityId,
    entityName: opts.entityName,
    userId: opts.userId,
    action: opts.action,
    performedBy: opts.performedBy,
    performedByName: opts.performedByName,
    changes,
    metadata: opts.metadata,
    request: opts.request,
  })
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (a == null && b == null) return true
  if (a == null || b == null) return false
  if (typeof a !== 'object' || typeof b !== 'object') return false
  return JSON.stringify(a) === JSON.stringify(b)
}
