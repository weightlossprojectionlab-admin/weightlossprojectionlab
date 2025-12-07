/**
 * Vital Monitoring Schedules - Type Definitions
 *
 * Data structures for vital sign monitoring schedules with multi-platform reminders.
 * Supports recurring schedules, compliance tracking, and notification preferences.
 */

import { VitalType } from './medical'

/**
 * Schedule Frequency Options
 */
export type ScheduleFrequency =
  | '1x' // Once per day
  | '2x' // Twice per day
  | '3x' // Three times per day
  | '4x' // Four times per day
  | '6x' // Six times per day
  | 'daily' // Once daily
  | 'weekly' // Once per week
  | 'biweekly' // Every two weeks
  | 'monthly' // Once per month

/**
 * Voice Assistant Platform
 */
export type VoiceAssistantPlatform = 'alexa' | 'google' | 'siri' | 'bixby'

/**
 * Voice Assistant Configuration
 */
export interface VoiceAssistantConfig {
  platform: VoiceAssistantPlatform
  enabled: boolean
  deviceId?: string // Link to specific device
  skillEnabled?: boolean // Has user enabled the skill/action?
  lastInteraction?: string // ISO 8601 timestamp
}

/**
 * Notification Channel Configuration
 */
export interface NotificationChannels {
  app: boolean // In-app push notifications (FCM)
  email: boolean // Email notifications
  sms: boolean // SMS text messages
  voice: VoiceAssistantConfig[] // Voice assistant reminders
}

/**
 * Quiet Hours Configuration
 */
export interface QuietHours {
  start: string // Time in HH:mm format (e.g., "22:00")
  end: string // Time in HH:mm format (e.g., "07:00")
}

/**
 * Vital Monitoring Schedule
 * Main schedule configuration for a specific vital type
 *
 * Firestore path: /vitalSchedules/{scheduleId}
 */
export interface VitalMonitoringSchedule {
  id: string
  userId: string // Account owner
  patientId: string
  patientName: string // Denormalized for queries
  vitalType: VitalType

  // Schedule Configuration
  frequency: ScheduleFrequency
  specificTimes: string[] // ["08:00", "12:00", "18:00", "22:00"] - Local time HH:mm format
  daysOfWeek?: number[] // [0,1,2,3,4,5,6] - 0=Sunday, optional for daily schedules
  timezone: string // IANA timezone (e.g., "America/New_York")

  // Notification Preferences
  notificationChannels: NotificationChannels
  quietHours?: QuietHours
  advanceReminderMinutes: number // Reminder before scheduled time (15, 30, 60)

  // Compliance Tracking
  complianceTarget: number // Percentage target (e.g., 90 = 90% of scheduled readings)
  complianceWindow: number // Hours allowed before marked missed (e.g., 2 hours)

  // Metadata
  active: boolean
  createdAt: string // ISO 8601
  createdBy: string // userId
  lastModified: string // ISO 8601
  lastModifiedBy?: string // userId

  // Clinical Context (optional)
  condition?: string // "Type 2 Diabetes", "Hypertension" - for context
  doctorRecommended?: boolean
  doctorNotes?: string
  prescribingPhysician?: string
}

/**
 * Scheduled Vital Instance Status
 */
export type ScheduledVitalStatus =
  | 'pending' // Not yet due or reminded
  | 'reminded' // Reminder sent
  | 'completed' // Vital logged on time
  | 'completed_late' // Vital logged after window
  | 'missed' // Not logged within window
  | 'skipped' // User manually skipped

/**
 * Reason for Missed Reading
 */
export type MissedReason =
  | 'user_skipped' // User manually skipped
  | 'timeout' // Compliance window expired
  | 'user_inactive' // User hasn't opened app
  | 'device_unavailable' // Measurement device not available
  | 'feeling_unwell' // User reported feeling unwell
  | 'other' // Other reason

/**
 * Scheduled Vital Instance
 * Represents a single scheduled reading occurrence
 *
 * Firestore path: /vitalSchedules/{scheduleId}/instances/{instanceId}
 */
export interface ScheduledVitalInstance {
  id: string
  scheduleId: string
  patientId: string
  patientName: string // Denormalized
  vitalType: VitalType

  // Scheduled Time
  scheduledFor: string // ISO 8601 - exact scheduled time in UTC
  scheduledDate: string // YYYY-MM-DD for indexing and grouping
  scheduledTimeLocal: string // HH:mm in patient timezone (for display)

  // Status Tracking
  status: ScheduledVitalStatus
  completedAt?: string // ISO 8601
  completedVitalId?: string // Link to actual VitalSign record
  missedReason?: MissedReason
  skipNotes?: string // User-provided reason for skipping

  // Reminder Tracking
  reminderSentAt?: string // ISO 8601
  reminderChannels?: string[] // ["app", "email", "alexa"]
  reminderAcknowledged?: boolean
  advanceReminderSentAt?: string // ISO 8601 for advance reminder

  // Compliance Window
  windowStart: string // ISO 8601 - earliest acceptable time
  windowEnd: string // ISO 8601 - latest acceptable time (scheduledFor + complianceWindow)

  // Metadata
  createdAt: string // ISO 8601
  lastModified?: string // ISO 8601
}

/**
 * Compliance Status
 */
export type ComplianceStatus =
  | 'excellent' // 95-100%
  | 'good' // 85-94%
  | 'needs_improvement' // 70-84%
  | 'poor' // Below 70%

/**
 * Compliance Color Code
 */
export type ComplianceColorCode = 'green' | 'yellow' | 'red'

/**
 * Completion Channel
 */
export type CompletionChannel =
  | 'app' // Logged via app
  | 'voice' // Logged via voice assistant
  | 'proactive' // User logged before reminder

/**
 * Compliance Report
 * Daily/weekly/monthly compliance summary for caregiver dashboard
 *
 * Firestore path: /patients/{patientId}/complianceReports/{reportId}
 */
export interface ComplianceReport {
  id: string
  patientId: string
  patientName: string // Denormalized
  userId: string
  vitalType: VitalType
  scheduleId: string

  // Reporting Period
  periodStart: string // ISO 8601
  periodEnd: string // ISO 8601
  periodType: 'daily' | 'weekly' | 'monthly'

  // Compliance Metrics
  scheduledCount: number // Total scheduled readings in period
  completedCount: number // Readings taken on time
  completedLateCount: number // Readings taken outside window but logged
  missedCount: number // Readings not taken
  skippedCount: number // Readings manually skipped
  complianceRate: number // Percentage (0-100)
  onTimeRate: number // Percentage of on-time readings

  // Trends
  averageDelayMinutes: number // How late readings typically are
  mostCommonMissedTime?: string // "18:00" - which reminder is missed most
  bestComplianceDay?: number // Day of week (0-6) with best compliance
  worstComplianceDay?: number // Day of week (0-6) with worst compliance

  // Breakdown by Channel
  completionByChannel: {
    app: number
    voice: number
    proactive: number
  }

  // Visual Indicators
  status: ComplianceStatus
  colorCode: ComplianceColorCode

  // Streaks
  currentStreak: number // Consecutive days with 100% compliance
  longestStreak: number // Best streak in period

  // Metadata
  generatedAt: string // ISO 8601
  generatedBy: 'system' | string // userId if manually generated
}

/**
 * Compliance Trend Data Point
 * Used for charting compliance over time
 */
export interface ComplianceTrendDataPoint {
  date: string // YYYY-MM-DD
  complianceRate: number // 0-100
  scheduledCount: number
  completedCount: number
  missedCount: number
  status: ComplianceStatus
  colorCode: ComplianceColorCode
}

/**
 * Patient Vital Monitoring Summary
 * Extension to PatientProfile for vital monitoring metadata
 */
export interface PatientVitalMonitoring {
  activeSchedules: string[] // scheduleIds
  complianceTargets?: {
    [vitalType: string]: number // Target percentage per vital type
  }
  lastComplianceCheck?: string // ISO 8601
  overallComplianceRate?: number // Aggregate across all vitals (0-100)
  totalScheduledReadings?: number // All-time scheduled readings
  totalCompletedReadings?: number // All-time completed readings
}

/**
 * Schedule Creation Parameters
 */
export interface CreateScheduleParams {
  userId: string
  patientId: string
  patientName: string
  vitalType: VitalType
  frequency: ScheduleFrequency
  specificTimes: string[]
  daysOfWeek?: number[]
  timezone: string
  notificationChannels: NotificationChannels
  quietHours?: QuietHours
  advanceReminderMinutes?: number
  complianceTarget?: number
  complianceWindow?: number
  condition?: string
  doctorRecommended?: boolean
  doctorNotes?: string
}

/**
 * Schedule Update Parameters
 */
export interface UpdateScheduleParams {
  frequency?: ScheduleFrequency
  specificTimes?: string[]
  daysOfWeek?: number[]
  timezone?: string
  notificationChannels?: NotificationChannels
  quietHours?: QuietHours
  advanceReminderMinutes?: number
  complianceTarget?: number
  complianceWindow?: number
  active?: boolean
  doctorNotes?: string
}

/**
 * Upcoming Reminder
 * Denormalized view for notification service
 */
export interface UpcomingReminder {
  instanceId: string
  scheduleId: string
  patientId: string
  patientName: string
  userId: string
  vitalType: VitalType
  scheduledFor: string // ISO 8601
  scheduledTimeLocal: string // HH:mm
  notificationChannels: NotificationChannels
  advanceReminderMinutes: number
  condition?: string
}

/**
 * Schedule Statistics
 * Summary stats for dashboard
 */
export interface ScheduleStatistics {
  totalSchedules: number
  activeSchedules: number
  inactiveSchedules: number
  totalDailyReadings: number // Sum of all daily readings across schedules
  vitalTypeBreakdown: {
    [vitalType: string]: number // Count of schedules per vital type
  }
}

/**
 * Compliance Alert
 * Notification when compliance drops below threshold
 */
export interface ComplianceAlert {
  id: string
  patientId: string
  patientName: string
  vitalType: VitalType
  scheduleId: string
  complianceRate: number
  threshold: number // Threshold that triggered alert
  period: 'daily' | 'weekly' | 'monthly'
  missedReadings: number
  createdAt: string // ISO 8601
  acknowledged: boolean
  acknowledgedBy?: string // userId
  acknowledgedAt?: string // ISO 8601
}
