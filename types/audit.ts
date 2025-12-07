/**
 * Unified Audit Trail System Types
 *
 * Enterprise-grade audit logging across all entities in the application.
 * Supports medications, documents, health reports, vitals, and more.
 *
 * Key Features:
 * - Entity-agnostic design (works with any entity type)
 * - Immutable audit trail (write-once, read-many)
 * - Granular field-level change tracking
 * - Rich metadata for compliance and forensics
 * - Real-time filtering and pagination support
 */

// ==================== CORE TYPES ====================

/**
 * Entity types that support audit logging
 * Extensible - add new entity types as needed
 */
export type AuditEntityType =
  | 'medication'
  | 'document'
  | 'health_report'
  | 'vital_signs'
  | 'weight_log'
  | 'meal_log'
  | 'step_log'
  | 'patient_profile'
  | 'family_member'
  | 'healthcare_provider'

/**
 * Actions that can be audited
 * Following CRUD + domain-specific actions
 */
export type AuditAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'restored'
  | 'shared'
  | 'unshared'
  | 'downloaded'
  | 'viewed'
  | 'exported'
  | 'imported'
  | 'dose_logged'      // Medication-specific
  | 'dose_skipped'     // Medication-specific
  | 'refilled'         // Medication-specific

/**
 * Data types for field changes
 * Used to render appropriate UI for before/after comparison
 */
export type FieldDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'image'
  | 'file'

// ==================== FIELD CHANGE TRACKING ====================

/**
 * Individual field change within an audit log entry
 * Captures what changed, from what value, to what value
 */
export interface AuditFieldChange {
  field: string                    // Field name (e.g., 'strength', 'dosageForm')
  fieldLabel: string               // Human-readable label (e.g., 'Medication Strength')
  oldValue: any                    // Previous value (null if newly created)
  newValue: any                    // New value (null if deleted)
  dataType: FieldDataType          // Type of data for rendering
  metadata?: {
    arrayDiff?: {                  // For array changes
      added: any[]
      removed: any[]
      unchanged: any[]
    }
    objectDiff?: {                 // For object changes
      added: string[]
      removed: string[]
      modified: string[]
    }
  }
}

// ==================== AUDIT LOG ENTRY ====================

/**
 * Unified audit log entry
 * Stored in Firestore collection groups for cross-entity queries
 *
 * Firestore paths:
 * - Medications: users/{userId}/patients/{patientId}/medications/{medicationId}/auditLogs/{logId}
 * - Documents: users/{userId}/patients/{patientId}/documents/{documentId}/auditLogs/{logId}
 * - Health Reports: users/{userId}/patients/{patientId}/healthReports/{reportId}/auditLogs/{logId}
 * - Vitals: users/{userId}/patients/{patientId}/vitals/{vitalId}/auditLogs/{logId}
 * - Patient Profiles: users/{userId}/patients/{patientId}/auditLogs/{logId}
 */
export interface AuditLog {
  // Identity
  id: string                       // Firestore document ID

  // Entity context
  entityType: AuditEntityType      // Type of entity being audited
  entityId: string                 // ID of the entity (medicationId, documentId, etc.)
  entityName?: string              // Human-readable name (medication name, document title, etc.)

  // Patient/User context
  patientId: string                // Patient this audit log is for
  patientName?: string             // Patient's name for display
  userId: string                   // Owner's Firebase Auth UID (account owner)

  // Action details
  action: AuditAction              // What happened
  performedBy: string              // Firebase Auth UID of the actor
  performedByName?: string         // Display name of the actor
  performedByRole?: 'owner' | 'family_member' | 'system' // Role of the actor
  performedAt: string              // ISO 8601 timestamp

  // Change tracking
  changes?: AuditFieldChange[]     // Field-level changes (for update actions)

  // Additional metadata
  metadata?: {
    ipAddress?: string             // IP address of the actor (privacy considerations)
    userAgent?: string             // Browser/device info
    location?: string              // Geolocation (if available and permitted)
    reason?: string                // Optional reason for the action
    notes?: string                 // Additional notes
    sessionId?: string             // Session identifier

    // Entity-specific metadata
    previousStatus?: string        // For status changes
    newStatus?: string             // For status changes
    fileSize?: number              // For document operations (in bytes)
    fileType?: string              // For document operations (MIME type)
    dosage?: {                     // For medication dose logging
      amount: string
      takenAt: string
      notes?: string
    }
  }

  // Compliance & retention
  retainUntil?: string             // ISO 8601 - when this log can be purged (HIPAA: 6 years)
  archived?: boolean               // Soft delete for data retention
  archivedAt?: string              // ISO 8601
}

// ==================== QUERY FILTERS ====================

/**
 * Filter options for querying audit logs
 * Used by useAuditTrail hook and AuditFilters component
 */
export interface AuditLogFilters {
  // Entity filters
  entityType?: AuditEntityType | AuditEntityType[]
  entityId?: string

  // Patient/User filters
  patientId?: string
  userId?: string
  performedBy?: string

  // Action filters
  action?: AuditAction | AuditAction[]

  // Time range filters
  startDate?: Date
  endDate?: Date

  // Search
  searchQuery?: string             // Search in entity names, performer names, notes

  // Pagination
  limit?: number
  offset?: number
  orderBy?: 'performedAt' | 'entityType' | 'action'
  orderDirection?: 'asc' | 'desc'
}

// ==================== RESPONSE TYPES ====================

/**
 * Paginated audit log response
 * Returned by audit trail queries
 */
export interface AuditLogResponse {
  logs: AuditLog[]
  total: number
  hasMore: boolean
  nextCursor?: string              // For cursor-based pagination
}

/**
 * Audit log statistics
 * Summary metrics for dashboard displays
 */
export interface AuditLogStats {
  totalLogs: number
  logsByAction: Record<AuditAction, number>
  logsByEntity: Record<AuditEntityType, number>
  recentActivity: {
    last24Hours: number
    last7Days: number
    last30Days: number
  }
  topPerformers: Array<{
    userId: string
    userName: string
    actionCount: number
  }>
}

// ==================== DISPLAY TYPES ====================

/**
 * Display configuration for different entity types
 * Maps entity types to human-readable labels and icons
 */
export interface AuditEntityConfig {
  label: string
  labelPlural: string
  icon: string                     // Icon name or emoji
  color: string                    // Tailwind color class
  description: string
}

/**
 * Display configuration for different actions
 * Maps actions to human-readable labels, colors, and icons
 */
export interface AuditActionConfig {
  label: string
  icon: string
  color: string                    // Tailwind color class
  severity: 'info' | 'warning' | 'success' | 'danger'
}

// ==================== CONFIGURATION MAPS ====================

/**
 * Entity type configurations
 * Used by UI components for consistent display
 */
export const AUDIT_ENTITY_CONFIGS: Record<AuditEntityType, AuditEntityConfig> = {
  medication: {
    label: 'Medication',
    labelPlural: 'Medications',
    icon: '💊',
    color: 'blue',
    description: 'Prescription medications and supplements'
  },
  document: {
    label: 'Document',
    labelPlural: 'Documents',
    icon: '📄',
    color: 'purple',
    description: 'Medical records and documents'
  },
  health_report: {
    label: 'Health Report',
    labelPlural: 'Health Reports',
    icon: '📊',
    color: 'green',
    description: 'AI-generated health reports'
  },
  vital_signs: {
    label: 'Vital Signs',
    labelPlural: 'Vital Signs',
    icon: '❤️',
    color: 'red',
    description: 'Blood pressure, blood sugar, etc.'
  },
  weight_log: {
    label: 'Weight Log',
    labelPlural: 'Weight Logs',
    icon: '⚖️',
    color: 'indigo',
    description: 'Weight tracking entries'
  },
  meal_log: {
    label: 'Meal Log',
    labelPlural: 'Meal Logs',
    icon: '🍽️',
    color: 'orange',
    description: 'Meal and nutrition tracking'
  },
  step_log: {
    label: 'Step Log',
    labelPlural: 'Step Logs',
    icon: '👟',
    color: 'teal',
    description: 'Activity and step tracking'
  },
  patient_profile: {
    label: 'Patient Profile',
    labelPlural: 'Patient Profiles',
    icon: '👤',
    color: 'gray',
    description: 'Patient profile information'
  },
  family_member: {
    label: 'Family Member',
    labelPlural: 'Family Members',
    icon: '👨‍👩‍👧‍👦',
    color: 'pink',
    description: 'Family member access and permissions'
  },
  healthcare_provider: {
    label: 'Healthcare Provider',
    labelPlural: 'Healthcare Providers',
    icon: '🩺',
    color: 'cyan',
    description: 'Healthcare provider information'
  }
}

/**
 * Action configurations
 * Used by UI components for consistent display
 */
export const AUDIT_ACTION_CONFIGS: Record<AuditAction, AuditActionConfig> = {
  created: {
    label: 'Created',
    icon: '➕',
    color: 'green',
    severity: 'success'
  },
  updated: {
    label: 'Updated',
    icon: '✏️',
    color: 'blue',
    severity: 'info'
  },
  deleted: {
    label: 'Deleted',
    icon: '🗑️',
    color: 'red',
    severity: 'danger'
  },
  restored: {
    label: 'Restored',
    icon: '♻️',
    color: 'green',
    severity: 'success'
  },
  shared: {
    label: 'Shared',
    icon: '🔗',
    color: 'indigo',
    severity: 'info'
  },
  unshared: {
    label: 'Unshared',
    icon: '🔓',
    color: 'gray',
    severity: 'info'
  },
  downloaded: {
    label: 'Downloaded',
    icon: '⬇️',
    color: 'purple',
    severity: 'info'
  },
  viewed: {
    label: 'Viewed',
    icon: '👁️',
    color: 'gray',
    severity: 'info'
  },
  exported: {
    label: 'Exported',
    icon: '📤',
    color: 'teal',
    severity: 'info'
  },
  imported: {
    label: 'Imported',
    icon: '📥',
    color: 'teal',
    severity: 'info'
  },
  dose_logged: {
    label: 'Dose Logged',
    icon: '✅',
    color: 'green',
    severity: 'success'
  },
  dose_skipped: {
    label: 'Dose Skipped',
    icon: '⏭️',
    color: 'yellow',
    severity: 'warning'
  },
  refilled: {
    label: 'Refilled',
    icon: '🔄',
    color: 'blue',
    severity: 'success'
  }
}

// ==================== HELPER TYPES ====================

/**
 * Audit log creation input
 * Use this type when creating new audit logs via API or lib functions
 */
export type CreateAuditLogInput = Omit<AuditLog, 'id' | 'performedAt'> & {
  performedAt?: string  // Optional - defaults to current timestamp
}

/**
 * Batch audit log creation
 * For creating multiple audit logs in a single transaction
 */
export interface BatchAuditLogInput {
  logs: CreateAuditLogInput[]
  transaction?: boolean  // Whether to use Firestore transaction
}
