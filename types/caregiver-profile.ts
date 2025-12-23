/**
 * Caregiver Profile Types
 * Defines types for individual family member/caregiver profiles
 *
 * This module provides comprehensive TypeScript interfaces and Zod validation
 * schemas for caregiver/family member management in the Weight Loss Project Lab.
 */

import { z } from 'zod'
import type { HouseholdDuty } from './household-duties'

// ============================================
// ENUMS & CONSTANTS
// ============================================

/**
 * Relationship types between caregiver and patient
 */
export enum RelationshipType {
  // Family relationships
  MOTHER = 'Mother',
  FATHER = 'Father',
  SPOUSE = 'Spouse',
  PARTNER = 'Partner',
  CHILD = 'Child',
  SON = 'Son',
  DAUGHTER = 'Daughter',
  SIBLING = 'Sibling',
  BROTHER = 'Brother',
  SISTER = 'Sister',
  GRANDPARENT = 'Grandparent',
  GRANDMOTHER = 'Grandmother',
  GRANDFATHER = 'Grandfather',
  GRANDCHILD = 'Grandchild',
  AUNT = 'Aunt',
  UNCLE = 'Uncle',
  NIECE = 'Niece',
  NEPHEW = 'Nephew',
  COUSIN = 'Cousin',

  // Professional relationships
  PROFESSIONAL_CAREGIVER = 'Professional Caregiver',
  NURSE = 'Nurse',
  REGISTERED_NURSE = 'Registered Nurse (RN)',
  LICENSED_PRACTICAL_NURSE = 'Licensed Practical Nurse (LPN)',
  NURSING_ASSISTANT = 'Nursing Assistant (CNA)',
  HOME_HEALTH_AIDE = 'Home Health Aide',
  DOCTOR = 'Doctor',
  PHYSICIAN = 'Physician',
  NURSE_PRACTITIONER = 'Nurse Practitioner',
  PHYSICIAN_ASSISTANT = 'Physician Assistant',
  THERAPIST = 'Therapist',
  PHYSICAL_THERAPIST = 'Physical Therapist',
  OCCUPATIONAL_THERAPIST = 'Occupational Therapist',

  // Other relationships
  FRIEND = 'Friend',
  NEIGHBOR = 'Neighbor',
  OTHER = 'Other'
}

/**
 * Onboarding steps for caregiver profile setup
 */
export enum OnboardingStep {
  WELCOME = 0,
  BASIC_INFO = 1,
  ROLE = 2,
  PROFESSIONAL = 3,
  AVAILABILITY = 4,
  PREFERENCES = 5,
  COMPLETE = 6
}

/**
 * Contact method preferences
 */
export type ContactMethod = 'email' | 'phone' | 'sms' | 'app'

/**
 * Days of the week
 */
export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

/**
 * Languages commonly spoken
 */
export const COMMON_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Chinese (Mandarin)',
  'Chinese (Cantonese)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Russian',
  'Vietnamese',
  'Tagalog',
  'Polish',
  'Other'
] as const

// ============================================
// CORE INTERFACES
// ============================================

/**
 * Daily schedule configuration
 */
export interface DaySchedule {
  /** Whether the caregiver is available on this day */
  available: boolean
  /** Start time in 24-hour format (e.g., "09:00") */
  startTime?: string
  /** End time in 24-hour format (e.g., "17:00") */
  endTime?: string
  /** Additional notes for this day (e.g., "Available after 2 PM") */
  notes?: string
}

/**
 * Weekly schedule for caregiver availability
 */
export interface WeeklySchedule {
  monday: DaySchedule
  tuesday: DaySchedule
  wednesday: DaySchedule
  thursday: DaySchedule
  friday: DaySchedule
  saturday: DaySchedule
  sunday: DaySchedule
}

/**
 * Professional information for licensed caregivers
 */
export interface ProfessionalInfo {
  /** Professional title (e.g., "Registered Nurse", "Home Health Aide") */
  title: string
  /** Professional credentials (e.g., ["RN", "BSN"]) */
  credentials: string[]
  /** Certifications (e.g., ["CPR", "First Aid", "Dementia Care"]) */
  certifications: string[]
  /** Areas of specialization (e.g., ["Diabetes Management", "Elderly Care"]) */
  specializations: string[]
  /** License number (if applicable) */
  licenseNumber?: string
  /** License expiration date */
  licenseExpiresAt?: string
  /** Years of experience */
  yearsOfExperience?: number
  /** Background check completed */
  backgroundCheckCompleted?: boolean
  /** Background check date */
  backgroundCheckDate?: string
}

/**
 * Availability configuration
 */
export interface Availability {
  /** Weekly schedule */
  schedule: WeeklySchedule
  /** Timezone (e.g., "America/New_York") */
  timezone: string
  /** Whether available for emergency calls */
  isAvailableForEmergencies: boolean
  /** Emergency response time in minutes */
  emergencyResponseTime?: number
  /** Maximum hours per week */
  maxHoursPerWeek?: number
}

/**
 * Emergency contact information
 */
export interface CaregiverEmergencyContact {
  /** Full name of emergency contact */
  name: string
  /** Relationship to caregiver */
  relationship: string
  /** Primary phone number */
  phoneNumber: string
  /** Email address */
  email?: string
  /** Alternate phone number */
  alternatePhone?: string
}

/**
 * Physical address
 */
export interface Address {
  /** Street address */
  street: string
  /** Apartment/Unit number */
  unit?: string
  /** City */
  city: string
  /** State/Province */
  state: string
  /** ZIP/Postal code */
  zipCode: string
  /** Country */
  country: string
}

/**
 * Communication and preference settings
 */
export interface CaregiverPreferences {
  /** Languages spoken */
  languagesSpoken: string[]
  /** Preferred contact method */
  preferredContactMethod: ContactMethod
  /** Secondary contact methods */
  alternateContactMethods?: ContactMethod[]
  /** Communication style notes (e.g., "Prefers detailed updates") */
  communicationStyle?: string
  /** Notification preferences */
  notifications?: {
    email: boolean
    sms: boolean
    push: boolean
    emergencyOnly: boolean
  }
  /** Quiet hours (when not to send non-emergency notifications) */
  quietHours?: {
    startTime: string // 24-hour format (e.g., "22:00")
    endTime: string // 24-hour format (e.g., "08:00")
  }
}

/**
 * Household care duties that can be assigned to caregivers
 */
export interface CaregiverDuties {
  /** Assigned household duties */
  assignedDuties: HouseholdDuty[]
  /** Custom duties defined on the fly */
  customDuties?: CustomDuty[]
}

/**
 * Standard household duty types
 * @deprecated Use HouseholdDuty from './household-duties' instead
 * Kept for backward compatibility only
 */
export interface LegacyHouseholdDuty {
  /** Unique duty ID */
  id: string
  /** Duty type */
  type: 'laundry' | 'shopping' | 'cleaning_bedroom' | 'cleaning_bathroom' | 'cleaning_kitchen' | 'meal_prep' | 'medication_management' | 'transportation' | 'companionship' | 'personal_care' | 'custom'
  /** Duty name/label */
  name: string
  /** Whether this duty is currently assigned */
  assigned: boolean
  /** Frequency (e.g., "daily", "weekly", "as needed") */
  frequency?: string
  /** Scheduled days (if applicable) */
  scheduledDays?: DayOfWeek[]
  /** Time estimate in minutes */
  estimatedMinutes?: number
  /** Additional notes */
  notes?: string
  /** Assigned date */
  assignedAt?: string
  /** Last completed date */
  lastCompletedAt?: string
}

/**
 * Custom duty defined on the fly
 * @deprecated Use HouseholdDuty with category 'custom' instead
 */
export interface CustomDuty extends Omit<LegacyHouseholdDuty, 'type'> {
  type: 'custom'
  /** Custom duty description */
  description: string
  /** Who created this custom duty */
  createdBy: string
  /** When it was created */
  createdAt: string
}

/**
 * Main Caregiver Profile Interface
 */
export interface CaregiverProfile {
  /** User ID from Firebase Auth */
  userId: string

  /** Display name */
  displayName: string

  /** Email address */
  email: string

  /** Phone number */
  phoneNumber?: string

  /** Profile photo URL */
  photoUrl?: string

  /** Relationships to patients { patientId: relationshipType } */
  relationshipToPatients: Record<string, string>

  /** Professional information (for licensed caregivers) */
  professionalInfo?: ProfessionalInfo

  /** Availability schedule */
  availability?: Availability

  /** Emergency contact */
  emergencyContact?: CaregiverEmergencyContact

  /** Physical address */
  address?: Address

  /** Communication and notification preferences */
  preferences: CaregiverPreferences

  /** Household care duties */
  duties?: CaregiverDuties

  /** Whether onboarding is complete */
  onboardingComplete: boolean

  /** Current onboarding step */
  onboardingStep: OnboardingStep

  /** Whether this is a professional caregiver (vs family member) */
  isProfessional: boolean

  /** Account status */
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending'

  /** Date account was created */
  createdAt: string

  /** Date profile was last updated */
  updatedAt: string

  /** Last active timestamp */
  lastActiveAt?: string

  /** Notes from account owner/admin */
  adminNotes?: string
}

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Parameters for creating a new caregiver profile
 */
export type CreateCaregiverProfileParams = Omit<
  CaregiverProfile,
  'userId' | 'createdAt' | 'updatedAt' | 'lastActiveAt' | 'onboardingComplete' | 'onboardingStep' | 'accountStatus'
> & {
  userId?: string // Optional - can be generated
}

/**
 * Parameters for updating an existing caregiver profile
 */
export type UpdateCaregiverProfileParams = Partial<
  Omit<CaregiverProfile, 'userId' | 'createdAt'>
>

/**
 * Filter criteria for querying caregiver profiles
 */
export interface CaregiverProfileFilter {
  /** Filter by patient ID */
  patientId?: string

  /** Filter by professional status */
  isProfessional?: boolean

  /** Filter by account status */
  accountStatus?: CaregiverProfile['accountStatus']

  /** Filter by relationship type */
  relationshipType?: string

  /** Filter by availability on specific days */
  availableOn?: DayOfWeek[]

  /** Filter by languages spoken */
  languagesSpoken?: string[]

  /** Filter by onboarding completion */
  onboardingComplete?: boolean

  /** Search by name or email */
  searchQuery?: string
}

/**
 * Caregiver profile summary (for list views)
 */
export interface CaregiverProfileSummary {
  userId: string
  displayName: string
  email: string
  photoUrl?: string
  isProfessional: boolean
  accountStatus: CaregiverProfile['accountStatus']
  relationshipToPatients: Record<string, string>
  onboardingComplete: boolean
  lastActiveAt?: string
}

// ============================================
// ZOD VALIDATION SCHEMAS
// ============================================

/**
 * Day schedule validation schema
 */
export const DayScheduleSchema = z.object({
  available: z.boolean(),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  notes: z.string().max(500).optional()
}).refine(
  (data) => {
    // If available, must have start and end times
    if (data.available && (!data.startTime || !data.endTime)) {
      return false
    }
    return true
  },
  {
    message: 'Start and end times are required when available is true'
  }
)

/**
 * Weekly schedule validation schema
 */
export const WeeklyScheduleSchema = z.object({
  monday: DayScheduleSchema,
  tuesday: DayScheduleSchema,
  wednesday: DayScheduleSchema,
  thursday: DayScheduleSchema,
  friday: DayScheduleSchema,
  saturday: DayScheduleSchema,
  sunday: DayScheduleSchema
})

/**
 * Professional info validation schema
 */
export const ProfessionalInfoSchema = z.object({
  title: z.string().min(1).max(200),
  credentials: z.array(z.string().max(50)),
  certifications: z.array(z.string().max(100)),
  specializations: z.array(z.string().max(100)),
  licenseNumber: z.string().max(100).optional(),
  licenseExpiresAt: z.string().datetime().optional(),
  yearsOfExperience: z.number().min(0).max(100).optional(),
  backgroundCheckCompleted: z.boolean().optional(),
  backgroundCheckDate: z.string().datetime().optional()
})

/**
 * Availability validation schema
 */
export const AvailabilitySchema = z.object({
  schedule: WeeklyScheduleSchema,
  timezone: z.string().min(1),
  isAvailableForEmergencies: z.boolean(),
  emergencyResponseTime: z.number().min(0).max(1440).optional(), // max 24 hours
  maxHoursPerWeek: z.number().min(0).max(168).optional() // max 168 hours/week
})

/**
 * Emergency contact validation schema
 */
export const CaregiverEmergencyContactSchema = z.object({
  name: z.string().min(1).max(200),
  relationship: z.string().min(1).max(100),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/), // E.164 format
  email: z.string().email().optional(),
  alternatePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional()
})

/**
 * Address validation schema
 */
export const AddressSchema = z.object({
  street: z.string().min(1).max(200),
  unit: z.string().max(50).optional(),
  city: z.string().min(1).max(100),
  state: z.string().min(2).max(100),
  zipCode: z.string().min(3).max(20),
  country: z.string().min(2).max(100)
})

/**
 * Caregiver preferences validation schema
 */
export const CaregiverPreferencesSchema = z.object({
  languagesSpoken: z.array(z.string().max(50)).min(1),
  preferredContactMethod: z.enum(['email', 'phone', 'sms', 'app']),
  alternateContactMethods: z.array(z.enum(['email', 'phone', 'sms', 'app'])).optional(),
  communicationStyle: z.string().max(500).optional(),
  notifications: z.object({
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
    emergencyOnly: z.boolean()
  }).optional(),
  quietHours: z.object({
    startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/),
    endTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/)
  }).optional()
})

/**
 * Household duty validation schema
 * @deprecated Use schemas from './household-duties' instead
 */
export const LegacyHouseholdDutySchema = z.object({
  id: z.string().min(1),
  type: z.enum(['laundry', 'shopping', 'cleaning_bedroom', 'cleaning_bathroom', 'cleaning_kitchen', 'meal_prep', 'medication_management', 'transportation', 'companionship', 'personal_care', 'custom']),
  name: z.string().min(1).max(200),
  assigned: z.boolean(),
  frequency: z.string().max(100).optional(),
  scheduledDays: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  estimatedMinutes: z.number().min(0).max(1440).optional(),
  notes: z.string().max(1000).optional(),
  assignedAt: z.string().datetime().optional(),
  lastCompletedAt: z.string().datetime().optional()
})

/**
 * Custom duty validation schema
 * @deprecated Use schemas from './household-duties' instead
 */
export const CustomDutySchema = LegacyHouseholdDutySchema.extend({
  type: z.literal('custom'),
  description: z.string().min(1).max(1000),
  createdBy: z.string().min(1),
  createdAt: z.string().datetime()
})

/**
 * Caregiver duties validation schema
 */
export const CaregiverDutiesSchema = z.object({
  assignedDuties: z.array(LegacyHouseholdDutySchema),
  customDuties: z.array(CustomDutySchema).optional()
})

/**
 * Main caregiver profile validation schema
 */
export const CaregiverProfileSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(200),
  email: z.string().email(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  photoUrl: z.string().url().optional(),
  relationshipToPatients: z.record(z.string(), z.string()),
  professionalInfo: ProfessionalInfoSchema.optional(),
  availability: AvailabilitySchema.optional(),
  emergencyContact: CaregiverEmergencyContactSchema.optional(),
  address: AddressSchema.optional(),
  preferences: CaregiverPreferencesSchema,
  duties: CaregiverDutiesSchema.optional(),
  onboardingComplete: z.boolean(),
  onboardingStep: z.nativeEnum(OnboardingStep),
  isProfessional: z.boolean(),
  accountStatus: z.enum(['active', 'inactive', 'suspended', 'pending']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActiveAt: z.string().datetime().optional(),
  adminNotes: z.string().max(2000).optional()
})

/**
 * Create caregiver profile validation schema
 */
export const CreateCaregiverProfileSchema = CaregiverProfileSchema
  .omit({
    userId: true,
    createdAt: true,
    updatedAt: true,
    lastActiveAt: true,
    onboardingComplete: true,
    onboardingStep: true,
    accountStatus: true
  })
  .extend({
    userId: z.string().min(1).optional()
  })

/**
 * Update caregiver profile validation schema
 */
export const UpdateCaregiverProfileSchema = CaregiverProfileSchema
  .omit({
    userId: true,
    createdAt: true
  })
  .partial()

/**
 * Caregiver profile filter validation schema
 */
export const CaregiverProfileFilterSchema = z.object({
  patientId: z.string().optional(),
  isProfessional: z.boolean().optional(),
  accountStatus: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  relationshipType: z.string().optional(),
  availableOn: z.array(z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).optional(),
  languagesSpoken: z.array(z.string()).optional(),
  onboardingComplete: z.boolean().optional(),
  searchQuery: z.string().optional()
})

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create default weekly schedule (all unavailable)
 */
export function createDefaultWeeklySchedule(): WeeklySchedule {
  const defaultDay: DaySchedule = {
    available: false,
    startTime: undefined,
    endTime: undefined,
    notes: undefined
  }

  return {
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
    sunday: { ...defaultDay }
  }
}

/**
 * Create default caregiver preferences
 */
export function createDefaultCaregiverPreferences(): CaregiverPreferences {
  return {
    languagesSpoken: ['English'],
    preferredContactMethod: 'app',
    alternateContactMethods: ['email'],
    notifications: {
      email: true,
      sms: false,
      push: true,
      emergencyOnly: false
    }
  }
}

/**
 * Validate if a caregiver is available at a specific time
 */
export function isAvailableAt(
  availability: Availability,
  day: DayOfWeek,
  time: string // 24-hour format (e.g., "14:30")
): boolean {
  const daySchedule = availability.schedule[day]

  if (!daySchedule.available || !daySchedule.startTime || !daySchedule.endTime) {
    return false
  }

  // Convert times to minutes for comparison
  const timeToMinutes = (t: string): number => {
    const [hours, minutes] = t.split(':').map(Number)
    return hours * 60 + minutes
  }

  const currentMinutes = timeToMinutes(time)
  const startMinutes = timeToMinutes(daySchedule.startTime)
  const endMinutes = timeToMinutes(daySchedule.endTime)

  return currentMinutes >= startMinutes && currentMinutes <= endMinutes
}

/**
 * Get all patients a caregiver is assigned to
 */
export function getAssignedPatientIds(profile: CaregiverProfile): string[] {
  return Object.keys(profile.relationshipToPatients)
}

/**
 * Check if caregiver is assigned to a specific patient
 */
export function isAssignedToPatient(profile: CaregiverProfile, patientId: string): boolean {
  return patientId in profile.relationshipToPatients
}

/**
 * Get relationship type for a specific patient
 */
export function getRelationshipToPatient(
  profile: CaregiverProfile,
  patientId: string
): string | null {
  return profile.relationshipToPatients[patientId] || null
}

/**
 * Calculate total assigned duties
 */
export function getTotalAssignedDuties(profile: CaregiverProfile): number {
  if (!profile.duties) return 0

  const standardDuties = profile.duties.assignedDuties.filter(d => d.assignedTo && d.assignedTo.length > 0).length
  const customDuties = profile.duties.customDuties?.filter(d => d.assigned).length || 0

  return standardDuties + customDuties
}
