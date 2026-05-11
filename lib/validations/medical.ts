/**
 * Medical Records System - Zod Validation Schemas
 *
 * Validation schemas for patient profiles, vital signs, providers, and appointments
 * Based on MEDICAL_RECORDS_PRD.json specification
 */

import { z } from 'zod'

/**
 * Platform rule: appointment/pickup times must fall on 15-minute increments
 * (:00, :15, :30, :45). Enforced on the server as a safety net in case the
 * client bypasses the TimeInput component.
 */
const isFifteenMinuteIncrement = (iso: string): boolean => {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  return d.getMinutes() % 15 === 0 && d.getSeconds() === 0 && d.getMilliseconds() === 0
}

// ==================== PATIENT PROFILE SCHEMAS ====================

export const emergencyContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  alternatePhone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  email: z.string().email('Invalid email').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional()
})

export const patientProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1, 'User ID is required'),
  /** Physical residence the patient belongs to. Assigned via
   *  /api/households (canonical Household type in types/household.ts).
   *  Optional — patients can exist unassigned. */
  householdId: z.string().min(1).optional(),
  type: z.enum(['human', 'pet']),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  photo: z.string().url('Invalid photo URL').optional(),
  dateOfBirth: z.string().datetime('Invalid date format'),
  relationship: z.enum(['self', 'spouse', 'parent', 'child', 'sibling', 'grandparent', 'pet']),

  // Pet-specific fields
  species: z.string().optional(),
  breed: z.string().optional(),
  microchipNumber: z.string().optional(),

  // Human-specific fields
  gender: z.enum(['male', 'female', 'other', 'prefer-not-to-say']).optional(),
  emergencyContacts: z.array(emergencyContactSchema).optional(),
  // Emergency identification — transfusion compatibility. 'unknown'
  // is a valid stored value (not a missing field) so users who
  // genuinely don't know can record that explicitly.
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown']).optional(),

  // Metadata
  createdAt: z.string().datetime(),
  lastModified: z.string().datetime()
}).passthrough().refine(
  (data) => {
    // If type is 'pet', species is required
    if (data.type === 'pet') {
      return !!data.species
    }
    return true
  },
  {
    message: 'Species is required for pets',
    path: ['species']
  }
).refine(
  (data) => {
    // If type is 'human', gender is required for medical emergency info
    if (data.type === 'human') {
      return !!data.gender
    }
    return true
  },
  {
    message: 'Gender is required for humans',
    path: ['gender']
  }
)

// Form schema (for creating/updating patients)
export const patientProfileFormSchema = patientProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  lastModified: true
}).partial({
  emergencyContacts: true,
  photo: true
})

// ==================== VITAL SIGNS SCHEMAS ====================

export const vitalTypeSchema = z.enum([
  'blood_sugar',
  'blood_pressure',
  'pulse_oximeter',
  'temperature',
  'weight',
  'mood'
])

export const vitalUnitSchema = z.enum([
  'mg/dL',
  'mmol/L',
  'mmHg',
  'bpm',
  '%',
  '°F',
  '°C',
  'lbs',
  'kg',
  'SpO₂% / bpm',  // For pulse oximeter readings (combines SpO2 and pulse rate)
  'scale'  // For mood tracking (1-10 scale)
])

export const bloodPressureValueSchema = z.object({
  systolic: z.number().min(40).max(300, 'Systolic value out of range'),
  diastolic: z.number().min(20).max(200, 'Diastolic value out of range')
}).refine(
  (data) => data.systolic > data.diastolic,
  {
    message: 'Systolic must be greater than diastolic',
    path: ['systolic']
  }
)

export const pulseOximeterValueSchema = z.object({
  spo2: z.number().min(70).max(100, 'SpO₂ value out of range (70-100%)'),
  pulseRate: z.number().min(30).max(220, 'Pulse rate out of range (30-220 bpm)'),
  perfusionIndex: z.number().min(0).max(20).optional()
})

export const vitalValueSchema = z.union([
  z.number().positive('Value must be positive'),
  z.string().min(1, 'Value cannot be empty'),
  bloodPressureValueSchema,
  pulseOximeterValueSchema
])

export const vitalSignSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid('Invalid patient ID'),
  type: vitalTypeSchema,
  value: vitalValueSchema,
  unit: vitalUnitSchema,
  recordedAt: z.string().datetime(),
  notes: z.string().max(500, 'Notes too long').optional(),
  takenBy: z.string().min(1, 'Taken by is required'),
  method: z.enum(['manual', 'device', 'imported']).default('manual'),
  deviceId: z.string().optional(),
  tags: z.array(z.string()).optional()
}).refine(
  (data) => {
    // Blood pressure must have blood pressure value structure
    if (data.type === 'blood_pressure') {
      return typeof data.value === 'object' && 'systolic' in data.value && 'diastolic' in data.value
    }
    // Pulse oximeter must have pulse oximeter value structure
    if (data.type === 'pulse_oximeter') {
      return typeof data.value === 'object' && 'spo2' in data.value && 'pulseRate' in data.value
    }
    // Mood can be string or number
    if (data.type === 'mood') {
      return typeof data.value === 'string' || typeof data.value === 'number'
    }
    return typeof data.value === 'number'
  },
  {
    message: 'Value structure does not match vital type',
    path: ['value']
  }
).refine(
  (data) => {
    // Validate unit matches vital type
    const validUnits: Record<string, string[]> = {
      'blood_sugar': ['mg/dL', 'mmol/L'],
      'blood_pressure': ['mmHg'],
      'pulse_oximeter': ['SpO₂% / bpm'],
      'temperature': ['°F', '°C'],
      'weight': ['lbs', 'kg'],
      'mood': ['scale']
    }
    return validUnits[data.type]?.includes(data.unit) ?? false
  },
  {
    message: 'Unit does not match vital type',
    path: ['unit']
  }
)

// Form schema (for logging vitals)
export const vitalSignFormSchema = vitalSignSchema.omit({
  id: true,
  patientId: true,
  takenBy: true
}).partial({
  recordedAt: true,
  method: true
})

// ==================== PROVIDER SCHEMAS ====================

export const providerTypeSchema = z.enum([
  'physician',
  'specialist',
  'dentist',
  'veterinarian',
  'pharmacy',
  'lab',
  'imaging_center',
  'urgent_care',
  'hospital',
  'therapy',
  'other'
])

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180)
})

export const officeHoursSchema = z.object({
  monday: z.string().optional(),
  tuesday: z.string().optional(),
  wednesday: z.string().optional(),
  thursday: z.string().optional(),
  friday: z.string().optional(),
  saturday: z.string().optional(),
  sunday: z.string().optional()
})

export const visitFrequencySchema = z.object({
  value: z.number().positive(),
  unit: z.enum(['days', 'weeks', 'months', 'years'])
})

// ==================== IMMUNIZATIONS ====================

/**
 * Schema for the structured immunization record. Mirrors the
 * Immunization interface in types/medical.ts. Required: vaccine
 * name + administered date. Everything else optional so a user
 * who only knows "I got a tetanus shot last year" can still
 * record it.
 */
export const immunizationSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1),
  userId: z.string().min(1),
  vaccineName: z.string().min(1, 'Vaccine name is required').max(200),
  administeredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Administered date must be a valid date'),
  doseNumber: z.number().int().positive().optional(),
  lotNumber: z.string().max(100).optional(),
  administeredBy: z.string().max(200).optional(),
  nextDueAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Next-due date must be a valid date').optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(['manual', 'spreadsheet-import', 'ocr']).default('manual'),
  addedAt: z.string().datetime(),
  addedBy: z.string().min(1),
  importBatchId: z.string().optional(),
})

/** Form-input shape — drops system-managed fields. */
export const immunizationFormSchema = immunizationSchema.omit({
  id: true,
  patientId: true,
  userId: true,
  source: true,
  addedAt: true,
  addedBy: true,
  importBatchId: true,
})

export type ImmunizationForm = z.infer<typeof immunizationFormSchema>

// ==================== MEDICAL EQUIPMENT ====================

/**
 * Schema for durable medical equipment (CPAP, glucose monitor,
 * etc.). Mirrors MedicalEquipment in types/medical.ts. Required:
 * device name. Everything else optional — a user who only knows
 * "we have a nebulizer" can still record it.
 */
export const medicalEquipmentSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1, 'Equipment name is required').max(200),
  type: z.string().max(100).optional(),
  manufacturer: z.string().max(200).optional(),
  model: z.string().max(200).optional(),
  serialNumber: z.string().max(200).optional(),
  prescribedBy: z.string().max(200).optional(),
  acquiredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Acquired date must be a valid date').optional(),
  nextMaintenanceAt: z.string().regex(/^\d{4}-\d{2}-\d{2}/, 'Maintenance date must be a valid date').optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(['manual', 'spreadsheet-import', 'ocr']).default('manual'),
  addedAt: z.string().datetime(),
  addedBy: z.string().min(1),
  importBatchId: z.string().optional(),
})

/** Form-input shape — drops system-managed fields. */
export const medicalEquipmentFormSchema = medicalEquipmentSchema.omit({
  id: true,
  patientId: true,
  userId: true,
  source: true,
  addedAt: true,
  addedBy: true,
  importBatchId: true,
})

export type MedicalEquipmentForm = z.infer<typeof medicalEquipmentFormSchema>

// ==================== FAMILY MEDICAL HISTORY ====================

/**
 * Schema for family-medical-history entries (relative + condition
 * + age of onset). Required: relationship + condition. Everything
 * else optional — patients often don't know specifics.
 */
export const familyRelationshipSchema = z.enum([
  'mother',
  'father',
  'sibling',
  'maternal_grandparent',
  'paternal_grandparent',
  'aunt_uncle',
  'child',
  'other',
])

export const familyHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().min(1),
  userId: z.string().min(1),
  relativeRelationship: familyRelationshipSchema,
  condition: z.string().min(1, 'Condition is required').max(200),
  ageOfOnset: z.number().int().min(0).max(150).optional(),
  isLiving: z.boolean().optional(),
  causeOfDeath: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  source: z.enum(['manual', 'spreadsheet-import', 'ocr']).default('manual'),
  addedAt: z.string().datetime(),
  addedBy: z.string().min(1),
  importBatchId: z.string().optional(),
})

/** Form-input shape — drops system-managed fields. */
export const familyHistoryFormSchema = familyHistoryEntrySchema.omit({
  id: true,
  patientId: true,
  userId: true,
  source: true,
  addedAt: true,
  addedBy: true,
  importBatchId: true,
})

export type FamilyHistoryForm = z.infer<typeof familyHistoryFormSchema>

export const providerSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  type: providerTypeSchema,
  name: z.string().min(1, 'Provider name is required').max(200),
  specialty: z.string().max(100).optional(),
  organization: z.string().max(200).optional(),
  npi: z.string().length(10, 'NPI must be 10 digits').regex(/^\d+$/).optional(),
  taxId: z.string().optional(),

  // Contact Info
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2 letters').toUpperCase(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  coordinates: coordinatesSchema.optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number'),
  fax: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),

  // Office Hours
  officeHours: officeHoursSchema.optional(),

  // Additional Info
  acceptsInsurance: z.array(z.string()).optional(),
  notes: z.string().max(1000).optional(),
  isPrimary: z.boolean().default(false),
  patientsServed: z.array(z.string().uuid()),
  recommendedVisitFrequency: visitFrequencySchema.optional(),

  // Metadata
  addedAt: z.string().datetime(),
  averageWaitTime: z.number().min(0).optional(),
  parkingAvailable: z.boolean().optional(),
  wheelchairAccessible: z.boolean().optional()
})

// Form schema (for creating/updating providers)
export const providerFormSchema = providerSchema.omit({
  id: true,
  userId: true,
  addedAt: true,
  patientsServed: true
}).partial({
  // Make all contact info optional for form submission
  address: true,
  city: true,
  state: true,
  zipCode: true,
  phone: true,
  fax: true,
  email: true,
  website: true,
  npi: true,
  taxId: true,
  coordinates: true,
  officeHours: true,
  isPrimary: true,
  organization: true,
  notes: true,
  acceptsInsurance: true,
  recommendedVisitFrequency: true,
  averageWaitTime: true,
  parkingAvailable: true,
  wheelchairAccessible: true
})

// ==================== APPOINTMENT SCHEMAS ====================

export const appointmentSourceSchema = z.enum(['manual', 'ai-recommendation', 'recurring'])

export const appointmentTypeSchema = z.enum([
  'routine-checkup',
  'follow-up',
  'specialist',
  'lab',
  'imaging',
  'urgent-care',
  'telehealth',
  'other'
])

export const appointmentStatusSchema = z.enum([
  'scheduled',
  'confirmed',
  'completed',
  'cancelled',
  'no-show'
])

export const driverStatusSchema = z.enum(['not-needed', 'pending', 'accepted', 'declined'])

export const recommendationSeveritySchema = z.enum(['low', 'medium', 'high', 'urgent'])

export const conflictSeveritySchema = z.enum(['none', 'warning', 'critical'])

export const appointmentLocationSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2).toUpperCase(),
  zipCode: z.string().regex(/^\d{5}(-\d{4})?$/),
  coordinates: coordinatesSchema.optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/).optional(),
  parkingInstructions: z.string().max(500).optional(),
  officeNumber: z.string().optional(),
  floor: z.string().optional()
})

export const reminderSettingsSchema = z.object({
  daysBefore: z.array(z.number().positive()).optional(),
  hoursBefore: z.array(z.number().positive()).optional(),
  arrivalNotification: z.boolean().optional(),
  geofenceRadius: z.number().positive().default(200) // meters
})

export const liveUpdateSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string().datetime(),
  status: z.string().min(1),
  message: z.string().max(500).optional(),
  updatedBy: z.string().min(1),
  updatedByName: z.string().min(1),
  location: z.string().optional(),
  isSystemGenerated: z.boolean().default(false)
})

export const appointmentSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1, 'User ID is required'),
  patientId: z.string().uuid(),
  patientName: z.string().min(1),
  providerId: z.string().uuid().optional(),
  providerName: z.string().min(1).optional(),
  specialty: z.string().optional(),

  // Scheduling
  dateTime: z.string().datetime().refine(isFifteenMinuteIncrement, 'Appointment time must fall on a 15-minute increment'),
  endTime: z.string().datetime().optional(),
  duration: z.number().positive().max(480).optional(), // max 8 hours
  type: appointmentTypeSchema,
  reason: z.string().min(1, 'Reason is required').max(500),
  location: z.string().max(500).optional(), // Simplified to string
  status: appointmentStatusSchema.default('scheduled'),
  notes: z.string().max(2000).optional(),

  // Source - HOW was this created?
  createdFrom: appointmentSourceSchema,
  aiRecommendationId: z.string().uuid().optional(),
  recommendationReason: z.string().max(500).optional(),
  recommendationSeverity: recommendationSeveritySchema.optional(),

  // Transportation / Driver Assignment
  requiresDriver: z.boolean(),
  assignedDriverId: z.string().optional(),
  assignedDriverName: z.string().max(100).optional(),
  driverStatus: driverStatusSchema,
  driverAcceptedAt: z.string().datetime().optional(),
  driverDeclinedAt: z.string().datetime().optional(),
  driverDeclineReason: z.string().max(500).optional(),
  driverNotes: z.string().max(500).optional(),
  pickupTime: z.string().datetime().refine((v) => !v || isFifteenMinuteIncrement(v), 'Pickup time must fall on a 15-minute increment').optional(),
  dropoffTime: z.string().datetime().optional(),

  // Lifecycle
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  updatedAt: z.string().datetime(),
  updatedBy: z.string().optional(),
  completedAt: z.string().datetime().optional(),
  cancelledAt: z.string().datetime().optional(),
  cancellationReason: z.string().max(500).optional(),

  // Optional advanced features
  reminderSettings: reminderSettingsSchema.optional(),
  travelTime: z.number().min(0).optional(),

  // Visit lifecycle (Phase E) — pre/post structured fields
  preVisitNotes: z.string().max(4000).optional(),
  preVisitQuestions: z.array(z.string().min(1).max(500)).max(20).optional(),
  visitSummary: z.string().max(2000).optional(),
  diagnosisGiven: z.string().max(1000).optional(),
  testsOrdered: z.array(z.string().min(1).max(200)).max(20).optional(),
  treatmentPlan: z.string().max(2000).optional(),
  followUpNeeded: z.boolean().optional(),
  nextAppointmentDate: z.string().datetime().optional(),
  followUpAppointmentId: z.string().optional(),
  parentAppointmentId: z.string().optional()
}).refine(
  (data) => {
    // If cancelled, cancellation reason should be provided
    if (data.status === 'cancelled') {
      return !!data.cancellationReason
    }
    return true
  },
  {
    message: 'Cancellation reason is required when status is cancelled',
    path: ['cancellationReason']
  }
).refine(
  (data) => {
    // If requiresDriver is true and driver assigned, must have driverStatus
    if (data.requiresDriver && data.assignedDriverId) {
      return data.driverStatus !== 'not-needed'
    }
    return true
  },
  {
    message: 'Driver status must be set when driver is assigned',
    path: ['driverStatus']
  }
)

// Form schema (for creating/updating appointments)
export const appointmentFormSchema = appointmentSchema.omit({
  id: true,
  userId: true,
  patientName: true,
  providerName: true,
  createdAt: true,
  createdBy: true,
  updatedAt: true,
  updatedBy: true
}).partial({
  status: true,
  location: true,
  notes: true,
  endTime: true,
  duration: true,
  specialty: true,
  providerId: true, // Provider is optional
  // Driver fields all optional in form
  assignedDriverId: true,
  assignedDriverName: true,
  driverAcceptedAt: true,
  driverDeclinedAt: true,
  driverDeclineReason: true,
  driverNotes: true,
  pickupTime: true,
  dropoffTime: true,
  // AI recommendation fields optional
  aiRecommendationId: true,
  recommendationReason: true,
  recommendationSeverity: true,
  // Advanced features optional
  reminderSettings: true,
  travelTime: true,
  visitSummary: true,
  followUpNeeded: true,
  nextAppointmentDate: true,
  completedAt: true,
  cancelledAt: true,
  cancellationReason: true
})

// ==================== FAMILY COLLABORATION SCHEMAS ====================

/**
 * IMPORTANT: Schema defaults should match role-based presets from lib/family-permissions.ts
 * Default to "Viewer" role permissions (read-only) for safety.
 * Actual permissions will be set based on FamilyRole when invitation is created.
 *
 * DO NOT use these defaults directly - always use getDefaultPermissionsForRole() from lib/family-roles.ts
 */
export const familyMemberPermissionsSchema = z.object({
  viewPatientProfile: z.boolean().default(true), // VIEW_ONLY preset
  viewMedicalRecords: z.boolean().default(true), // VIEW_ONLY preset
  editMedications: z.boolean().default(false),
  scheduleAppointments: z.boolean().default(false),
  editAppointments: z.boolean().default(false),
  deleteAppointments: z.boolean().default(false),
  uploadDocuments: z.boolean().default(false),
  deleteDocuments: z.boolean().default(false),
  logVitals: z.boolean().default(false), // VIEW_ONLY preset (read-only by default)
  viewVitals: z.boolean().default(true), // VIEW_ONLY preset
  chatAccess: z.boolean().default(true), // VIEW_ONLY preset
  inviteOthers: z.boolean().default(false),
  viewSensitiveInfo: z.boolean().default(false),
  editPatientProfile: z.boolean().default(false),
  deletePatient: z.boolean().default(false),
  importPatients: z.boolean().default(false) // Off by default; account owner grants explicitly
})

export const notificationPreferencesSchema = z.object({
  appointmentReminders: z.boolean().default(true),
  appointmentUpdates: z.boolean().default(true),
  vitalAlerts: z.boolean().default(true),
  medicationReminders: z.boolean().default(true),
  documentUploads: z.boolean().default(true),
  aiRecommendations: z.boolean().default(true),
  chatMessages: z.boolean().default(true),
  urgentAlerts: z.boolean().default(true) // Always enabled
})

export const familyMemberSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1).max(100),
  photo: z.string().url().optional(),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'caregiver', 'friend', 'other']),
  invitedBy: z.string().min(1),
  invitedAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'revoked']),
  permissions: familyMemberPermissionsSchema,
  notificationPreferences: notificationPreferencesSchema,
  patientsAccess: z.array(z.string().uuid()),
  lastActive: z.string().datetime().optional(),
  deviceTokens: z.array(z.string()).optional()
})

export const familyInvitationSchema = z.object({
  id: z.string().uuid(),
  inviteCode: z.string().length(8, 'Invite code must be 8 characters'),
  invitedByUserId: z.string().min(1),
  invitedByName: z.string().min(1),
  recipientEmail: z.string().email(),
  recipientPhone: z.string().optional(),
  patientsShared: z.array(z.string().min(1)).min(1, 'At least one patient must be shared'),
  permissions: familyMemberPermissionsSchema,
  familyRole: z.enum(['account_owner', 'co_admin', 'caregiver', 'viewer']).default('caregiver'),
  message: z.string().max(500).optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'revoked']),
  acceptedBy: z.string().optional(),
  acceptedAt: z.string().datetime().optional(),
  emailSentAt: z.string().datetime().optional(),
  reminderSentAt: z.string().datetime().optional()
})

// Form schema for creating invitations
export const familyInvitationFormSchema = familyInvitationSchema.omit({
  id: true,
  inviteCode: true,
  invitedByUserId: true,
  invitedByName: true,
  createdAt: true,
  expiresAt: true,
  status: true,
  acceptedBy: true,
  acceptedAt: true,
  emailSentAt: true,
  reminderSentAt: true
}).extend({
  permissions: familyMemberPermissionsSchema.partial() // Allow partial permissions for easier form handling
})

// ==================== DOCUMENT OCR — GEMINI EXTRACTION OUTPUT ====================
//
// Runtime gate at the JSON.parse boundary in lib/document-data-extractor.ts.
// Gemini parses uploaded medical-document OCR text into a structured
// shape that flows into patient labResults / medications / diagnoses
// records — high-PHI risk if a malformed shape (e.g., status as an
// arbitrary string, value as null instead of optional) sneaks past
// the existing manual coercion in normalizeExtractionResult.
//
// Schema is intentionally permissive on enum-like fields (status,
// documentType) — the existing normalizer at lib/document-data-extractor
// .ts:148 filters bad enum values to undefined. Zod's job here is to
// reject SHAPE drift (objects becoming strings, arrays becoming
// objects, missing required fields), not enum drift.

const LabResultEntryGeminiSchema = z.object({
  testName: z.string(),
  // Gemini sometimes returns numbers, sometimes strings. Accept both;
  // normalizer coerces to string.
  value: z.union([z.string(), z.number()]),
  unit: z.string().nullable().optional(),
  referenceRange: z.string().nullable().optional(),
  // Loose — normalizer enforces the enum.
  status: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
})

const ExtractedMedicationEntryGeminiSchema = z.object({
  name: z.string(),
  dosage: z.string().nullable().optional(),
  frequency: z.string().nullable().optional(),
  prescribedFor: z.string().nullable().optional(),
  prescribedBy: z.string().nullable().optional(),
})

export const DocumentExtractionResponseSchema = z.object({
  documentType: z.string().optional(),
  labResults: z.array(LabResultEntryGeminiSchema).optional(),
  medications: z.array(ExtractedMedicationEntryGeminiSchema).optional(),
  diagnoses: z.array(z.string()).optional(),
  procedures: z.array(z.string()).optional(),
  providerName: z.string().nullable().optional(),
  facilityName: z.string().nullable().optional(),
  documentDate: z.string().nullable().optional(),
})

export type DocumentExtractionResponse = z.infer<typeof DocumentExtractionResponseSchema>

// ==================== EXPORT ALL SCHEMAS ====================

export const medicalSchemas = {
  // Patient
  emergencyContact: emergencyContactSchema,
  patientProfile: patientProfileSchema,
  patientProfileForm: patientProfileFormSchema,

  // Vitals
  vitalType: vitalTypeSchema,
  vitalUnit: vitalUnitSchema,
  vitalValue: vitalValueSchema,
  bloodPressureValue: bloodPressureValueSchema,
  vitalSign: vitalSignSchema,
  vitalSignForm: vitalSignFormSchema,

  // Provider
  providerType: providerTypeSchema,
  provider: providerSchema,
  providerForm: providerFormSchema,

  // Appointment
  appointmentType: appointmentTypeSchema,
  appointmentStatus: appointmentStatusSchema,
  appointmentLocation: appointmentLocationSchema,
  appointment: appointmentSchema,
  appointmentForm: appointmentFormSchema,
  liveUpdate: liveUpdateSchema,

  // Family Collaboration
  familyMemberPermissions: familyMemberPermissionsSchema,
  notificationPreferences: notificationPreferencesSchema,
  familyMember: familyMemberSchema,
  familyInvitation: familyInvitationSchema,
  familyInvitationForm: familyInvitationFormSchema
}

// Type exports (inferred from schemas)
export type EmergencyContact = z.infer<typeof emergencyContactSchema>
export type PatientProfile = z.infer<typeof patientProfileSchema>
export type PatientProfileForm = z.infer<typeof patientProfileFormSchema>

export type VitalType = z.infer<typeof vitalTypeSchema>
export type VitalUnit = z.infer<typeof vitalUnitSchema>
export type VitalValue = z.infer<typeof vitalValueSchema>
export type BloodPressureValue = z.infer<typeof bloodPressureValueSchema>
export type VitalSign = z.infer<typeof vitalSignSchema>
export type VitalSignForm = z.infer<typeof vitalSignFormSchema>

export type ProviderType = z.infer<typeof providerTypeSchema>
export type Provider = z.infer<typeof providerSchema>
export type ProviderForm = z.infer<typeof providerFormSchema>

export type AppointmentType = z.infer<typeof appointmentTypeSchema>
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>
export type AppointmentLocation = z.infer<typeof appointmentLocationSchema>
export type Appointment = z.infer<typeof appointmentSchema>
export type AppointmentForm = z.infer<typeof appointmentFormSchema>
export type LiveUpdate = z.infer<typeof liveUpdateSchema>

export type FamilyMemberPermissions = z.infer<typeof familyMemberPermissionsSchema>
export type FamilyMemberNotificationPreferences = z.infer<typeof notificationPreferencesSchema>
export type FamilyMember = z.infer<typeof familyMemberSchema>
export type FamilyInvitation = z.infer<typeof familyInvitationSchema>
export type FamilyInvitationForm = z.infer<typeof familyInvitationFormSchema>
