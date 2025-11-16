/**
 * Medical Records System Types
 *
 * TypeScript interfaces for the Family Health & Medical Records Management System
 * Based on MEDICAL_RECORDS_PRD.json specification
 */

// ==================== RBAC / AUTHORIZATION ====================

export type UserRole = 'owner' | 'family'

export interface AuthorizationResult {
  authorized: boolean
  role?: UserRole
  permissions?: FamilyMemberPermissions
  userId?: string
}

// ==================== PATIENT PROFILE ====================

export interface PatientProfile {
  id: string
  userId: string // Owner's Firebase Auth UID
  type: 'human' | 'pet'
  name: string
  photo?: string
  dateOfBirth: string // ISO 8601
  relationship: 'self' | 'spouse' | 'parent' | 'child' | 'sibling' | 'grandparent' | 'pet'

  // Pet-specific fields
  species?: string // 'dog', 'cat', 'bird', etc.
  breed?: string
  microchipNumber?: string

  // Human-specific fields
  gender?: 'male' | 'female' | 'other' | 'prefer-not-to-say'
  emergencyContacts?: EmergencyContact[]

  // Metadata
  createdAt: string // ISO 8601
  lastModified: string // ISO 8601
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phone: string
  alternatePhone?: string
  email?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  isPrimary: boolean
  notes?: string
}

// ==================== VITAL SIGNS ====================

export type VitalType =
  | 'blood_sugar'
  | 'blood_pressure'
  | 'heart_rate'
  | 'blood_oxygen'
  | 'temperature'
  | 'weight'

export type VitalUnit =
  | 'mg/dL'
  | 'mmol/L'
  | 'mmHg'
  | 'bpm'
  | '%'
  | '°F'
  | '°C'
  | 'lbs'
  | 'kg'

export interface BloodPressureValue {
  systolic: number
  diastolic: number
}

export type VitalValue = number | BloodPressureValue

export interface VitalSign {
  id: string
  patientId: string
  type: VitalType
  value: VitalValue
  unit: VitalUnit
  recordedAt: string // ISO 8601
  notes?: string
  takenBy: string // userId of family member who recorded
  method: 'manual' | 'device' | 'imported'
  deviceId?: string // For future smart device integration
  tags?: string[] // 'fasting', 'post-meal', 'morning', 'evening', 'before_medication', 'after_medication'
}

// ==================== PROVIDERS ====================

export type ProviderType =
  | 'physician'
  | 'specialist'
  | 'dentist'
  | 'veterinarian'
  | 'pharmacy'
  | 'lab'
  | 'imaging_center'
  | 'urgent_care'
  | 'hospital'
  | 'therapy'
  | 'other'

export interface Provider {
  id: string
  userId: string // Owner
  type: ProviderType
  name: string
  specialty?: string
  organization?: string
  npi?: string // National Provider Identifier
  taxId?: string

  // Contact Info
  address: string
  city: string
  state: string
  zipCode: string
  coordinates?: {
    lat: number
    lng: number
  }
  phone: string
  fax?: string
  email?: string
  website?: string

  // Office Hours
  officeHours?: {
    monday?: string
    tuesday?: string
    wednesday?: string
    thursday?: string
    friday?: string
    saturday?: string
    sunday?: string
  }

  // Additional Info
  acceptsInsurance?: string[]
  notes?: string
  isPrimary: boolean
  patientsServed: string[] // patientIds
  recommendedVisitFrequency?: {
    value: number
    unit: 'days' | 'weeks' | 'months' | 'years'
  }

  // Metadata
  addedAt: string // ISO 8601
  averageWaitTime?: number // minutes
  parkingAvailable?: boolean
  wheelchairAccessible?: boolean
}

// ==================== APPOINTMENTS ====================

export type AppointmentSource = 'manual' | 'ai-recommendation' | 'recurring'

export type AppointmentType =
  | 'routine-checkup'
  | 'follow-up'
  | 'specialist'
  | 'lab'
  | 'imaging'
  | 'urgent-care'
  | 'telehealth'
  | 'other'

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no-show'

export type DriverStatus =
  | 'not-needed'
  | 'pending'
  | 'accepted'
  | 'declined'

export type RecommendationSeverity = 'low' | 'medium' | 'high' | 'urgent'

export type ConflictSeverity = 'none' | 'warning' | 'critical'

export interface AppointmentLocation {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  coordinates?: {
    lat: number
    lng: number
  }
  phone?: string
  parkingInstructions?: string
  officeNumber?: string
  floor?: string
}

export interface Appointment {
  id: string
  userId: string // owning user account
  patientId: string
  patientName: string
  providerId: string
  providerName: string
  specialty?: string

  // Scheduling
  dateTime: string // ISO 8601 (start time)
  endTime?: string // ISO 8601 (calculated from duration if needed)
  duration?: number // minutes
  type: AppointmentType
  reason: string // renamed from 'purpose' for clarity
  location?: string // simplified - can be address string or location name
  status: AppointmentStatus
  notes?: string

  // Source - HOW was this appointment created?
  createdFrom: AppointmentSource
  aiRecommendationId?: string
  recommendationReason?: string
  recommendationSeverity?: RecommendationSeverity

  // Transportation / Driver Assignment
  requiresDriver: boolean
  assignedDriverId?: string // family member userId
  assignedDriverName?: string
  driverStatus: DriverStatus
  driverAcceptedAt?: string // ISO 8601
  driverDeclinedAt?: string // ISO 8601
  driverDeclineReason?: string
  driverNotes?: string
  pickupTime?: string // ISO 8601 - when driver should pick up patient
  dropoffTime?: string // ISO 8601 - estimated return time

  // Lifecycle
  createdAt: string // ISO 8601
  createdBy: string
  updatedAt: string // ISO 8601 (renamed from lastModified)
  updatedBy?: string
  completedAt?: string // ISO 8601
  cancelledAt?: string // ISO 8601
  cancellationReason?: string

  // Optional advanced features (keep for future slices)
  reminderSettings?: {
    daysBefore?: number[]
    hoursBefore?: number[]
  }
  travelTime?: number // estimated minutes from home
  visitSummary?: string
  followUpNeeded?: boolean
  nextAppointmentDate?: string // ISO 8601
}

// ==================== APPOINTMENT RECOMMENDATIONS ====================

export type RecommendationType =
  | 'nutritionist'
  | 'doctor-checkup'
  | 'specialist'
  | 'mental-health'
  | 'routine-checkup'
  | 'follow-up'
  | 'urgent-care'

export type RecommendationUrgency =
  | 'urgent'
  | 'soon'
  | 'normal'
  | 'routine'

export interface AppointmentRecommendation {
  id: string
  userId: string
  patientId: string
  patientName?: string

  type: RecommendationType
  reason: string // "Weight loss has plateaued for 3 weeks"
  severity: RecommendationSeverity
  urgency: RecommendationUrgency

  suggestedProviderType: ProviderType
  suggestedProviders?: string[] // providerIds

  triggerMetrics: {
    weightLossStalled?: boolean
    paceTooSlow?: boolean
    paceTooFast?: boolean
    vitalAlert?: string // "BP elevated 3 readings"
    daysSinceLastVisit?: number | null
    missedRecommendedVisit?: boolean
    overdueAppointment?: boolean
    currentWeight?: number
    weeklyChangeRate?: number
  }

  status: 'active' | 'dismissed' | 'scheduled' | 'expired'
  createdFrom: 'ai-analysis' | 'manual'
  createdAt: string
  updatedAt: string
  dismissedAt?: string
  dismissReason?: string
  scheduledAt?: string
  scheduledAppointmentId?: string
  expiresAt: string
}

// ==================== FAMILY COLLABORATION ====================

export interface FamilyMemberPermissions {
  viewMedicalRecords: boolean
  editMedications: boolean
  scheduleAppointments: boolean
  editAppointments: boolean
  deleteAppointments: boolean
  uploadDocuments: boolean
  deleteDocuments: boolean
  logVitals: boolean
  viewVitals: boolean
  chatAccess: boolean
  inviteOthers: boolean
  viewSensitiveInfo: boolean // SSN, full insurance Member ID
  editPatientProfile: boolean
}

export interface FamilyMemberNotificationPreferences {
  appointmentReminders: boolean
  appointmentUpdates: boolean
  vitalAlerts: boolean
  medicationReminders: boolean
  documentUploads: boolean
  aiRecommendations: boolean
  chatMessages: boolean
  urgentAlerts: boolean // Always enabled for critical vitals
  // Driver-specific notifications (Slice A6)
  driverAssignmentNotifications: boolean // When assigned as driver
  driverReminderDaysBefore: number[] // e.g., [7, 3, 1] for 1 week, 3 days, 1 day before
}

export interface FamilyMember {
  id: string
  userId: string // Their Firebase Auth UID
  email: string
  name: string
  photo?: string
  relationship: string // 'spouse', 'child', 'parent', 'sibling', 'caregiver', 'friend', 'other'
  invitedBy: string // userId who sent invite
  invitedAt: string // ISO 8601
  acceptedAt?: string // ISO 8601
  status: 'pending' | 'accepted' | 'declined' | 'revoked'
  permissions: FamilyMemberPermissions
  notificationPreferences: FamilyMemberNotificationPreferences
  patientsAccess: string[] // patientIds they can manage
  lastActive?: string // ISO 8601
  deviceTokens?: string[] // FCM tokens for push notifications
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired' | 'revoked'

export interface FamilyInvitation {
  id: string
  inviteCode: string // Unique 8-char code
  invitedByUserId: string
  invitedByName: string
  recipientEmail: string
  recipientPhone?: string
  patientsShared: string[] // patientIds
  permissions: FamilyMemberPermissions
  message?: string // Personal message from inviter
  createdAt: string // ISO 8601
  expiresAt: string // ISO 8601 (default 7 days)
  status: InvitationStatus
  acceptedBy?: string // userId
  acceptedAt?: string // ISO 8601
  emailSentAt?: string // ISO 8601
  reminderSentAt?: string // ISO 8601
}

// ==================== FORM TYPES ====================

export interface PatientProfileForm {
  name: string
  type: 'human' | 'pet'
  dateOfBirth: string
  relationship: string
  gender?: string
  species?: string
  breed?: string
  photo?: string
}

export interface FamilyInvitationForm {
  recipientEmail: string
  recipientPhone?: string
  patientsShared: string[]
  permissions: Partial<FamilyMemberPermissions>
  message?: string
}

export interface VitalSignForm {
  type: VitalType
  value: VitalValue
  unit: VitalUnit
  recordedAt?: string
  notes?: string
  tags?: string[]
}

export interface ProviderForm {
  type: ProviderType
  name: string
  specialty?: string
  organization?: string
  address: string
  city: string
  state: string
  zipCode: string
  phone: string
  email?: string
  website?: string
  isPrimary?: boolean
}

export interface AppointmentForm {
  patientId: string
  providerId: string
  dateTime: string
  duration: number
  type: AppointmentType
  purpose: string
  location?: Partial<AppointmentLocation>
  escort?: string
  notes?: string
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// ==================== VALIDATION HELPERS ====================

export function isBloodPressureValue(value: VitalValue): value is BloodPressureValue {
  return typeof value === 'object' && 'systolic' in value && 'diastolic' in value
}

export function isNumericVitalValue(value: VitalValue): value is number {
  return typeof value === 'number'
}
