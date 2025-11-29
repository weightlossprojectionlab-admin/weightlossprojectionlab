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

// ==================== FAMILY ROLES (Account Management) ====================

/**
 * Family Role Hierarchy
 *
 * account_owner: The primary account holder (highest authority)
 * co_admin: Trusted family member with elevated privileges
 * caregiver: Standard caregiver with assigned permissions
 * viewer: Read-only access to assigned patients
 */
export type FamilyRole = 'account_owner' | 'co_admin' | 'caregiver' | 'viewer'

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

  // Unified Family Member + Caregiver Model
  accountUserId?: string // Firestore Auth UID if they have an account
  accountStatus?: 'owner' | 'member' | 'pending_invite' | 'no_account'
  invitedAt?: string
  acceptedAt?: string

  // Caregiver Permissions (if age-appropriate)
  caregiverStatus?: {
    enabled: boolean // Can this person be a caregiver?
    eligibleByAge: boolean // Age >= 13
    trustedByOwner: boolean // Owner override for minors
    permissionLevel: 'none' | 'view_only' | 'limited' | 'full'
    canManagePatients: string[] // Patient IDs they can manage
    canEditSettings: boolean
    canInviteOthers: boolean
  }

  // Billing (always true for family members)
  countsAsSeat?: boolean
  addedBy?: string // Account owner who added them
  addedAt?: string

  // Health vitals (for both humans and pets)
  height?: number // in inches (imperial) or cm (metric)
  heightUnit?: 'imperial' | 'metric'
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active'
  targetWeight?: number
  targetWeightUnit?: 'lbs' | 'kg'
  weightGoal?: 'lose-weight' | 'maintain-weight' | 'gain-muscle' | 'improve-health'

  // Check-in preferences (set during onboarding)
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'

  // Health Goals (patient-specific)
  goals?: {
    targetWeight?: number // Target weight goal
    startWeight?: number // Starting weight (for progress calculation)
    dailyCalorieGoal?: number // Daily calorie target
    dailyStepGoal?: number // Daily step goal
  }

  // Onboarding status
  vitalsComplete?: boolean // true if height + initial weight provided

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
  | 'pulse_oximeter'
  | 'temperature'
  | 'weight'

// ==================== WEIGHT LOGS ====================

export interface WeightLog {
  id: string
  patientId: string
  userId: string // Owner of the patient record
  weight: number
  unit: 'lbs' | 'kg'
  loggedAt: string // ISO 8601
  loggedBy: string // userId of family member who recorded
  notes?: string
  bodyFat?: number // Optional body fat percentage
  bmi?: number // Calculated BMI
  source: 'manual' | 'scale' | 'health_app'
  deviceId?: string // For smart scale integration
  tags?: string[] // 'morning', 'evening', 'after_workout', 'before_meal'
}

// ==================== MEAL LOGS ====================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealLog {
  id: string
  patientId: string
  userId: string // Owner of the patient record
  mealType: MealType
  foodItems: string[]
  description?: string
  photoUrl?: string
  photoHash?: string // For deduplication
  calories?: number
  protein?: number
  carbs?: number
  fat?: number
  fiber?: number
  loggedAt: string // ISO 8601
  loggedBy: string // userId of family member who recorded
  consumedAt?: string // ISO 8601 - when meal was actually eaten
  notes?: string
  tags?: string[] // 'homemade', 'restaurant', 'takeout', 'meal-prep'
  location?: string // Restaurant name or location
  aiAnalyzed?: boolean
  aiConfidence?: number
}

// ==================== STEP LOGS ====================

export type StepSource = 'manual' | 'fitbit' | 'apple-health' | 'google-fit' | 'samsung-health' | 'garmin' | 'other'

export interface StepLog {
  id: string
  patientId: string
  userId: string // Owner of the patient record
  steps: number
  date: string // YYYY-MM-DD format
  distance?: number // kilometers
  calories?: number // Calories burned from activity
  activeMinutes?: number
  floors?: number // Flights of stairs
  source: StepSource
  deviceId?: string
  loggedAt: string // ISO 8601 - when logged to system
  loggedBy: string // userId of family member who recorded
  notes?: string
  synced?: boolean // If from external app
  lastSyncedAt?: string // ISO 8601
}

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

export interface PulseOximeterValue {
  spo2: number          // Blood oxygen saturation (%)
  pulseRate: number     // Heart rate (bpm)
  perfusionIndex?: number // Optional perfusion index (%)
}

export type VitalValue = number | BloodPressureValue | PulseOximeterValue

/**
 * VitalModification - Audit trail entry for vital sign changes
 */
export interface VitalModification {
  modifiedBy: string // userId of person who made the change
  modifiedAt: string // ISO 8601
  changes: {
    field: string // Which field was changed
    oldValue: any // Previous value
    newValue: any // New value
  }[]
  reason?: string // Optional reason for modification
}

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

  // Audit trail
  createdAt?: string // ISO 8601 - When first created
  lastModifiedBy?: string // userId of last person to modify
  lastModifiedAt?: string // ISO 8601 - When last modified
  modificationHistory?: VitalModification[] // History of all modifications
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
  viewPatientProfile: boolean
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
  deletePatient: boolean
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

  // Family Role Management (Account Owner System)
  familyRole: FamilyRole // Default: 'caregiver'
  managedBy: string // userId of who invited/manages them
  canBeEditedBy: string[] // Array of userIds who can modify this member
  roleAssignedAt?: string // ISO 8601 - when role was last changed
  roleAssignedBy?: string // userId who assigned the current role
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
  familyRole?: FamilyRole // Role to assign (default: caregiver)
  invitationType?: 'family_member' | 'external_caregiver' // NEW: distinguish invitation types
  message?: string // Personal message from inviter
  createdAt: string // ISO 8601
  expiresAt: string // ISO 8601 (default 7 days)
  status: InvitationStatus
  acceptedBy?: string // userId
  acceptedAt?: string // ISO 8601
  emailSentAt?: string // ISO 8601
  reminderSentAt?: string // ISO 8601
}

// ==================== EXTERNAL CAREGIVERS ====================

/**
 * External Caregiver - Professional caregiver (non-family)
 * - Access-only, not billable
 * - Does NOT get a patient profile
 * - Examples: nurses, doctors, home health aides, therapists
 */

export type ExternalCaregiverRole = 'nurse' | 'doctor' | 'aide' | 'therapist' | 'other'

export type ExternalCaregiverAccessLevel = 'view_only' | 'limited' | 'full'

export interface ExternalCaregiverPermissions {
  viewMedicalRecords: boolean
  editMedicalRecords: boolean
  viewMedications: boolean
  manageMedications: boolean
  viewDocuments: boolean
  uploadDocuments: boolean
  receiveAlerts: boolean
  logVitals: boolean
  viewAppointments: boolean
  manageAppointments: boolean
}

export interface ExternalCaregiver {
  id: string
  userId: string // Must have Firestore Auth account
  email: string
  name: string
  photo?: string

  // Professional Info
  role: ExternalCaregiverRole
  organization?: string
  credentials?: string

  // Access Control
  accessLevel: ExternalCaregiverAccessLevel
  patientsAccess: string[] // Which patients they can manage
  accessGrantedBy: string // Account owner userId
  accessGrantedAt: string // ISO 8601
  accessExpiresAt?: string // Optional expiration

  // Permissions
  permissions: ExternalCaregiverPermissions

  // Metadata
  status: 'active' | 'expired' | 'revoked'
  lastActive?: string // ISO 8601

  // Not a Patient Profile (always false)
  countsAsSeat: false
  isExternal: true
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

// ==================== CAREGIVER ACTION ITEMS ====================

export type ActionItemPriority = 'urgent' | 'this_week' | 'this_month' | 'ongoing'
export type ActionItemCategory = 'medication' | 'appointment' | 'shopping' | 'monitoring' | 'nutrition' | 'general'

export interface CaregiverActionItem {
  id: string
  patientId: string
  userId: string // Caregiver who needs to complete this

  // Task details
  task: string
  category: ActionItemCategory
  priority: ActionItemPriority
  details?: string[] // Sub-tasks or additional information

  // Completion tracking
  completed: boolean
  completedAt?: string // ISO 8601
  completedBy?: string // userId

  // Source tracking
  sourceReportId?: string // ID of the health report that generated this
  generatedAt: string // ISO 8601 - when the report was generated

  // Reminders
  dueDate?: string // ISO 8601
  reminderSent?: boolean

  // Metadata
  createdAt: string // ISO 8601
  lastModified: string // ISO 8601
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

// ==================== DOCUMENTS ====================

export type DocumentCategory =
  | 'insurance'
  | 'identification'
  | 'medical-records'
  | 'lab-results'
  | 'prescriptions'
  | 'imaging'
  | 'other'

export type DocumentFileType = 'image' | 'pdf' | 'other'

export type OcrStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface DocumentImage {
  url: string
  label?: string
  position: number
}

export interface DocumentMetadata {
  provider?: string
  memberName?: string
  memberId?: string
  groupNumber?: string
  rxBin?: string
  rxPcn?: string
  rxGroup?: string
  policyNumber?: string
  effectiveDate?: string
  expirationDate?: string
  issueDate?: string
  licenseNumber?: string
  dateOfBirth?: string
  address?: string
  [key: string]: any
}

export interface PatientDocument {
  id: string
  patientId: string
  userId: string
  name: string
  fileName?: string
  category: DocumentCategory
  fileType: DocumentFileType
  fileSize?: number
  originalUrl: string
  images?: DocumentImage[]
  metadata?: DocumentMetadata
  extractedText?: string
  ocrStatus?: OcrStatus
  uploadedAt: string
  uploadedBy: string
  tags?: string[]
  notes?: string
}

// ==================== VALIDATION HELPERS ====================

export function isBloodPressureValue(value: VitalValue): value is BloodPressureValue {
  return typeof value === 'object' && 'systolic' in value && 'diastolic' in value
}

export function isPulseOximeterValue(value: VitalValue): value is PulseOximeterValue {
  return typeof value === 'object' && 'spo2' in value && 'pulseRate' in value
}

export function isNumericVitalValue(value: VitalValue): value is number {
  return typeof value === 'number'
}

// ==================== MEDICATIONS ====================

export interface PatientMedication {
  id: string
  patientId: string
  userId: string // Owner of the patient record

  // Drug Information
  name: string // Generic drug name (e.g., "Metformin")
  brandName?: string // Brand name if applicable (e.g., "Glucophage")
  strength: string // e.g., "500 mg", "10 mg"
  dosageForm: string // e.g., "tablet", "capsule", "gel", "injection"

  // Prescription Details
  frequency?: string // COMPLETE dosage instructions (e.g., "Take 1 tablet by mouth every day")
  prescribedFor?: string // Condition name (e.g., "Type 2 Diabetes")
  prescribingDoctor?: string // Prescribing doctor name (e.g., "V.Atieh")
  rxNumber?: string // Prescription number
  quantity?: string // Quantity dispensed (e.g., "30 tablets", "60 capsules")
  refills?: string // Refills remaining (e.g., "3 refills", "No refills")
  fillDate?: string // Date prescription was filled (ISO string)
  expirationDate?: string // Expiration date (ISO string)

  // Adherence Tracking
  quantityRemaining?: number // Pills/doses remaining
  lastTaken?: string // ISO string of last dose taken
  adherenceRate?: number // Percentage (0-100) of doses taken on time

  // Clinical Data
  rxcui?: string // RxNorm Concept Unique Identifier
  ndc?: string // National Drug Code
  drugClass?: string // Therapeutic class
  warnings?: string[] // Special warnings

  // Pharmacy Info
  pharmacyName?: string
  pharmacyPhone?: string

  // Image/Photo
  imageUrl?: string // URL to medication bottle image
  photoUrl?: string // Alternative field name for image URL (for compatibility)

  // Metadata
  addedAt: string // ISO 8601
  addedBy: string // userId of person who added
  scannedAt?: string // ISO 8601 - if scanned from label
  lastModified: string // ISO 8601
  notes?: string
}
