/**
 * Caregiver Profile & Directory Types
 *
 * Types for caregiver profiles, availability, and directory management
 */

import { FamilyRole, FamilyMemberPermissions } from './medical'

// ==================== CAREGIVER PROFILE ====================

export type AvailabilityStatus = 'available' | 'busy' | 'away' | 'offline'

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'

export interface TimeSlot {
  start: string // HH:MM format (24-hour)
  end: string // HH:MM format (24-hour)
}

export interface DailyAvailability {
  available: boolean
  slots: TimeSlot[]
}

export type WeeklyAvailability = Record<DayOfWeek, DailyAvailability>

export interface ProfessionalInfo {
  title?: string // e.g., "Registered Nurse", "Home Health Aide"
  organization?: string
  credentials?: string[] // e.g., ["RN", "BSN", "CNA"]
  specialties?: string[] // e.g., ["Dementia Care", "Diabetes Management"]
  yearsOfExperience?: number
  licenseNumber?: string
  certifications?: string[]
}

export interface CaregiverPreferences {
  notificationMethods: ('email' | 'sms' | 'push')[]
  quietHoursStart?: string // HH:MM format
  quietHoursEnd?: string // HH:MM format
  preferredContactMethod?: 'email' | 'phone' | 'text'
  language?: string
  timezone?: string // IANA timezone
}

export interface EmergencyContactInfo {
  name: string
  relationship: string
  phone: string
  alternatePhone?: string
  email?: string
}

export interface CaregiverProfile {
  id: string // Same as userId
  userId: string // Firebase Auth UID

  // Basic Info
  name: string
  email: string
  phone?: string
  photo?: string
  dateOfBirth?: string // ISO 8601

  // Role & Relationship
  familyRole: FamilyRole
  relationship?: string // e.g., "daughter", "son", "spouse", "professional caregiver"

  // Professional Info (optional - mainly for external caregivers)
  professionalInfo?: ProfessionalInfo

  // Patient Access
  patientsAccess: string[] // patientIds they have access to
  patientRelationships: Record<string, string> // patientId -> relationship description

  // Permissions
  permissions: FamilyMemberPermissions

  // Availability
  availabilityStatus: AvailabilityStatus
  weeklySchedule?: WeeklyAvailability
  unavailableDates?: string[] // ISO 8601 dates when unavailable

  // Contact & Preferences
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
  emergencyContact?: EmergencyContactInfo
  preferences: CaregiverPreferences

  // Metadata
  joinedAt: string // ISO 8601
  lastActive?: string // ISO 8601
  invitedBy?: string // userId of who invited them
  managedBy: string // userId of account owner

  // Privacy
  profileVisibility: 'all' | 'family_only' | 'private'
  shareContactInfo: boolean
  shareAvailability: boolean

  // Bio/Notes
  bio?: string
  notes?: string // Internal notes (only visible to account owner)
}

// ==================== DIRECTORY FILTERING ====================

export interface DirectoryFilters {
  search?: string
  patientId?: string
  role?: FamilyRole | FamilyRole[]
  relationship?: string
  availabilityStatus?: AvailabilityStatus
  hasAvailability?: boolean // Filter by those with schedule set
  permissions?: Partial<FamilyMemberPermissions> // Filter by specific permissions
}

export type SortField = 'name' | 'role' | 'lastActive' | 'joinedAt'
export type SortDirection = 'asc' | 'desc'

export interface DirectorySort {
  field: SortField
  direction: SortDirection
}

// ==================== FORM TYPES ====================

export interface CaregiverProfileFormData {
  // Basic Info
  name: string
  email: string
  phone?: string
  photo?: string
  relationship?: string

  // Professional Info
  professionalInfo?: ProfessionalInfo

  // Availability
  availabilityStatus?: AvailabilityStatus
  weeklySchedule?: WeeklyAvailability

  // Contact Info
  address?: {
    street?: string
    city?: string
    state?: string
    zipCode?: string
  }
  emergencyContact?: EmergencyContactInfo

  // Preferences
  preferences?: Partial<CaregiverPreferences>

  // Privacy
  profileVisibility?: 'all' | 'family_only' | 'private'
  shareContactInfo?: boolean
  shareAvailability?: boolean

  // Bio
  bio?: string
}

export interface AvailabilityFormData {
  weeklySchedule: WeeklyAvailability
  unavailableDates?: string[]
}

// ==================== VALIDATION HELPERS ====================

export const DEFAULT_WEEKLY_AVAILABILITY: WeeklyAvailability = {
  monday: { available: false, slots: [] },
  tuesday: { available: false, slots: [] },
  wednesday: { available: false, slots: [] },
  thursday: { available: false, slots: [] },
  friday: { available: false, slots: [] },
  saturday: { available: false, slots: [] },
  sunday: { available: false, slots: [] }
}

export const DEFAULT_CAREGIVER_PREFERENCES: CaregiverPreferences = {
  notificationMethods: ['email', 'push'],
  preferredContactMethod: 'email',
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
}

// ==================== UTILITY TYPES ====================

export interface CaregiverCardData {
  id: string
  name: string
  photo?: string
  role: FamilyRole
  relationship?: string
  availabilityStatus: AvailabilityStatus
  patientsAccess: string[]
  patientNames: string[]
  email: string
  phone?: string
  lastActive?: string
  professionalTitle?: string
}

export interface CaregiverDirectoryResponse {
  caregivers: CaregiverProfile[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}
