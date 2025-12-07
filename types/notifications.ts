/**
 * Notification System Types
 *
 * Comprehensive TypeScript types for context-aware family member notifications.
 * Supports email and push notifications with detailed metadata for various health events.
 */

import { Timestamp } from 'firebase/firestore'

// ==================== NOTIFICATION TYPES ====================

/**
 * NotificationType - All possible notification event types
 */
export type NotificationType =
  | 'medication_added'
  | 'medication_updated'
  | 'medication_deleted'
  | 'vital_logged'
  | 'meal_logged'
  | 'weight_logged'
  | 'document_uploaded'
  | 'appointment_scheduled'
  | 'appointment_updated'
  | 'appointment_cancelled'
  | 'health_report_generated'
  | 'family_member_invited'
  | 'family_member_joined'
  | 'patient_added'
  | 'vital_alert'
  | 'medication_reminder'
  | 'appointment_reminder'

/**
 * NotificationPriority - Urgency level
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent'

/**
 * NotificationStatus - Delivery and read status
 */
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

// ==================== METADATA TYPES ====================

/**
 * MedicationMetadata - Context for medication events
 */
export interface MedicationMetadata {
  medicationId: string
  medicationName: string
  patientName: string
  strength?: string
  dosageForm?: string
  frequency?: string
  prescribedFor?: string
  actionBy: string // Name of person who performed action
  actionByUserId: string
}

/**
 * VitalMetadata - Context for vital sign logging
 */
export interface VitalMetadata {
  vitalId: string
  vitalType: 'blood_sugar' | 'blood_pressure' | 'pulse_oximeter' | 'temperature' | 'weight'
  value: string // Human-readable value (e.g., "120/80 mmHg", "98.6°F")
  unit: string
  patientName: string
  isAbnormal?: boolean
  abnormalReason?: string
  actionBy: string
  actionByUserId: string
}

/**
 * MealMetadata - Context for meal logging
 */
export interface MealMetadata {
  mealId: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  calories?: number
  patientName: string
  hasPhoto: boolean
  photoUrl?: string
  foodItems?: string[]
  actionBy: string
  actionByUserId: string
}

/**
 * WeightMetadata - Context for weight logging
 */
export interface WeightMetadata {
  weightLogId: string
  weight: number
  unit: 'lbs' | 'kg'
  patientName: string
  changeFromPrevious?: number
  trendDirection?: 'up' | 'down' | 'stable'
  goalProgress?: number
  actionBy: string
  actionByUserId: string
}

/**
 * DocumentMetadata - Context for document uploads
 */
export interface DocumentMetadata {
  documentId: string
  documentName: string
  documentCategory: 'insurance' | 'identification' | 'medical-records' | 'lab-results' | 'prescriptions' | 'imaging' | 'other'
  patientName: string
  fileType: 'image' | 'pdf' | 'other'
  fileSize?: number
  actionBy: string
  actionByUserId: string
}

/**
 * AppointmentMetadata - Context for appointment events
 */
export interface AppointmentMetadata {
  appointmentId: string
  patientName: string
  providerName: string
  appointmentType: string
  appointmentDateTime: string // ISO 8601
  location?: string
  requiresDriver: boolean
  assignedDriverId?: string
  assignedDriverName?: string
  actionBy: string
  actionByUserId: string
  reason?: string // Reason for update/cancellation
}

/**
 * HealthReportMetadata - Context for health report generation
 */
export interface HealthReportMetadata {
  reportId: string
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom'
  patientName: string
  dateRange: {
    start: string // ISO 8601
    end: string // ISO 8601
  }
  includesVitals: boolean
  includesMeals: boolean
  includesWeight: boolean
  includesMedications: boolean
  generatedBy: string
  generatedByUserId: string
  downloadUrl?: string
}

/**
 * FamilyMetadata - Context for family member events
 */
export interface FamilyMetadata {
  familyMemberId?: string
  familyMemberName: string
  familyMemberEmail?: string
  relationship?: string
  role?: string
  patientsShared?: string[]
  actionBy: string
  actionByUserId: string
}

/**
 * PatientMetadata - Context for patient profile events
 */
export interface PatientMetadata {
  patientId: string
  patientName: string
  patientType: 'human' | 'pet'
  relationship: string
  actionBy: string
  actionByUserId: string
}

/**
 * NotificationMetadata - Union type for all metadata types
 */
export type NotificationMetadata =
  | MedicationMetadata
  | VitalMetadata
  | MealMetadata
  | WeightMetadata
  | DocumentMetadata
  | AppointmentMetadata
  | HealthReportMetadata
  | FamilyMetadata
  | PatientMetadata

// ==================== NOTIFICATION INTERFACE ====================

/**
 * Notification - Main notification record
 */
export interface Notification {
  id: string
  userId: string // Primary user account ID
  patientId?: string // Patient this notification is about (if applicable)
  type: NotificationType
  priority: NotificationPriority
  status: NotificationStatus

  // Content
  title: string
  message: string
  actionUrl?: string // Deep link to relevant page
  actionLabel?: string // Button text (e.g., "View Details")

  // Metadata - context-specific data
  metadata: NotificationMetadata

  // Delivery tracking
  read: boolean
  readAt?: string // ISO 8601
  emailSent: boolean
  emailSentAt?: string // ISO 8601
  pushSent: boolean
  pushSentAt?: string // ISO 8601

  // Timestamps
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
  expiresAt?: string // ISO 8601 - auto-delete after this date
}

// ==================== NOTIFICATION PREFERENCES ====================

/**
 * NotificationChannelPreferences - Per-channel notification settings
 */
export interface NotificationChannelPreferences {
  email: boolean
  push: boolean
  inApp: boolean
}

/**
 * NotificationPreferences - User's notification preferences per type
 */
export interface NotificationPreferences {
  // Medication notifications
  medication_added: NotificationChannelPreferences
  medication_updated: NotificationChannelPreferences
  medication_deleted: NotificationChannelPreferences

  // Health tracking notifications
  vital_logged: NotificationChannelPreferences
  meal_logged: NotificationChannelPreferences
  weight_logged: NotificationChannelPreferences

  // Document notifications
  document_uploaded: NotificationChannelPreferences

  // Appointment notifications
  appointment_scheduled: NotificationChannelPreferences
  appointment_updated: NotificationChannelPreferences
  appointment_cancelled: NotificationChannelPreferences
  appointment_reminder: NotificationChannelPreferences

  // Health report notifications
  health_report_generated: NotificationChannelPreferences

  // Family notifications
  family_member_invited: NotificationChannelPreferences
  family_member_joined: NotificationChannelPreferences
  patient_added: NotificationChannelPreferences

  // Alerts
  vital_alert: NotificationChannelPreferences
  medication_reminder: NotificationChannelPreferences

  // Quiet hours (no push notifications during these hours)
  quietHours?: {
    enabled: boolean
    startHour: number // 0-23 (e.g., 22 for 10 PM)
    endHour: number // 0-23 (e.g., 7 for 7 AM)
  }

  // Global settings
  globallyEnabled: boolean
  timezone?: string // IANA timezone (e.g., "America/New_York")
}

/**
 * Default notification preferences (all enabled)
 */
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  medication_added: { email: true, push: true, inApp: true },
  medication_updated: { email: true, push: true, inApp: true },
  medication_deleted: { email: true, push: true, inApp: true },
  vital_logged: { email: false, push: true, inApp: true },
  meal_logged: { email: false, push: false, inApp: true },
  weight_logged: { email: false, push: true, inApp: true },
  document_uploaded: { email: true, push: true, inApp: true },
  appointment_scheduled: { email: true, push: true, inApp: true },
  appointment_updated: { email: true, push: true, inApp: true },
  appointment_cancelled: { email: true, push: true, inApp: true },
  appointment_reminder: { email: true, push: true, inApp: true },
  health_report_generated: { email: true, push: true, inApp: true },
  family_member_invited: { email: true, push: false, inApp: true },
  family_member_joined: { email: true, push: true, inApp: true },
  patient_added: { email: true, push: true, inApp: true },
  vital_alert: { email: true, push: true, inApp: true },
  medication_reminder: { email: true, push: true, inApp: true },
  quietHours: {
    enabled: true,
    startHour: 22, // 10 PM
    endHour: 7 // 7 AM
  },
  globallyEnabled: true
}

// ==================== UTILITY TYPES ====================

/**
 * CreateNotificationParams - Parameters for creating a notification
 */
export interface CreateNotificationParams {
  userId: string
  patientId?: string
  type: NotificationType
  priority?: NotificationPriority
  title: string
  message: string
  metadata: NotificationMetadata
  actionUrl?: string
  actionLabel?: string
  expiresInDays?: number
}

/**
 * SendNotificationResult - Result of sending notification
 */
export interface SendNotificationResult {
  success: boolean
  notificationId?: string
  emailSent: boolean
  pushSent: boolean
  error?: string
  details?: {
    emailError?: string
    pushError?: string
  }
}

/**
 * BatchNotificationResult - Result of batch notification sending
 */
export interface BatchNotificationResult {
  totalRecipients: number
  successCount: number
  failureCount: number
  results: Array<{
    userId: string
    userName?: string
    success: boolean
    error?: string
  }>
}

/**
 * NotificationFilter - Filter for querying notifications
 */
export interface NotificationFilter {
  userId?: string
  patientId?: string
  type?: NotificationType | NotificationType[]
  priority?: NotificationPriority | NotificationPriority[]
  read?: boolean
  startDate?: string // ISO 8601
  endDate?: string // ISO 8601
  limit?: number
  offset?: number
}

/**
 * NotificationStats - Statistics for notifications
 */
export interface NotificationStats {
  total: number
  unread: number
  byType: Record<NotificationType, number>
  byPriority: Record<NotificationPriority, number>
  recentCount: number // Last 7 days
}
