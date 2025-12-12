/**
 * Health Episodes - Illness and Injury Tracking
 *
 * Track family members and pets through stages of illness/injury recovery.
 * Supports symptom logging, treatment tracking, and recovery milestones.
 *
 * NOTE: patientType is used internally for conditional logic (symptom libraries, etc.)
 * but NEVER shown in UI. Only pets get visual "Pet" indicators in the interface.
 */

export type EpisodeType = 'illness' | 'injury'

export type EpisodeStatus =
  | 'onset'       // Just started, initial symptoms
  | 'active'      // In full swing, symptoms present
  | 'improving'   // Getting better, symptoms reducing
  | 'recovered'   // Fully recovered
  | 'worsened'    // Condition deteriorated, may need medical attention

export type TreatmentType =
  | 'medication'   // Prescription or OTC medication
  | 'therapy'      // Physical therapy, occupational therapy
  | 'rest'         // Bed rest, restricted activity
  | 'diet_change'  // Dietary modifications
  | 'vet_visit'    // Veterinary appointment (pets)
  | 'doctor_visit' // Medical appointment (humans)

/**
 * HealthEpisode - Main episode tracking entity
 *
 * Stored at: /users/{uid}/patients/{patientId}/health-episodes/{episodeId}
 */
export interface HealthEpisode {
  id: string
  patientId: string
  patientType: 'human' | 'pet' // Used for backend logic ONLY, never shown in UI

  type: EpisodeType
  title: string // "Flu", "Sprained Ankle", "UTI", "ACL Injury"
  description?: string // Optional detailed description
  status: EpisodeStatus

  // Enhanced Timeline - When did symptoms start?
  startDate: string // ISO 8601 date (YYYY-MM-DD) - when episode started
  startTime?: string // ISO 8601 time (HH:MM) - exact time if known
  approximateStartTime?: 'morning' | 'afternoon' | 'evening' | 'night' // Approximate time if exact unknown
  endDate?: string // ISO 8601 - when fully recovered (status = 'recovered')

  // Initial Event Photos (captured at episode creation - "Day 0" baseline)
  initialPhotos?: {
    photoUrl: string
    thumbnailUrl?: string
    caption?: string
    uploadedAt: string
  }[] // Max 4 photos at creation time

  // Medical professional involvement
  providerId?: string // Reference to healthcare provider (doctor/vet)
  providerName?: string // Name of doctor/vet
  diagnosis?: string // Official diagnosis if provided

  // Metadata
  createdBy: string // userId of person who created episode
  createdAt: string // ISO 8601
  lastUpdatedBy?: string // userId of last person to update
  lastUpdatedAt: string // ISO 8601

  // Summary counts (denormalized for quick display)
  activeSymptomCount?: number // Number of unresolved symptoms
  totalMilestones?: number // Number of milestones achieved
}

/**
 * HealthSymptom - Individual symptom tracking
 *
 * Stored at: /users/{uid}/patients/{patientId}/health-episodes/{episodeId}/symptoms/{symptomId}
 *
 * Symptoms differ by patient type:
 * - Human: Fever, Cough, Headache, Body aches, Nausea, etc.
 * - Pet: Lethargy, Loss of appetite, Limping, Excessive scratching, etc.
 */
export interface HealthSymptom {
  id: string
  episodeId: string
  patientId: string

  symptom: string // Name of symptom (from predefined library or custom)
  severity: 1 | 2 | 3 | 4 | 5 // 1 = mild, 5 = severe

  // Timeline
  firstObserved: string // ISO 8601 - when symptom first appeared
  lastObserved?: string // ISO 8601 - most recent observation
  resolved: boolean // true when symptom is gone
  resolvedAt?: string // ISO 8601 - when symptom resolved

  notes?: string // Additional observations

  // Metadata
  loggedBy: string // userId of person who logged symptom
  createdAt: string // ISO 8601
  lastUpdatedAt: string // ISO 8601
}

/**
 * TreatmentAction - Treatment and care actions taken
 *
 * Stored at: /users/{uid}/patients/{patientId}/health-episodes/{episodeId}/treatments/{treatmentId}
 */
export interface TreatmentAction {
  id: string
  episodeId: string
  patientId: string

  type: TreatmentType
  description: string // "Ibuprofen 200mg", "Restricted activity", "Veterinary exam"

  // Timeline
  startDate: string // ISO 8601 - when treatment started
  endDate?: string // ISO 8601 - when treatment ended (if applicable)

  frequency?: string // "3x daily", "As needed", "Once daily"
  dosage?: string // "200mg", "1 tablet", "5ml"

  // Link to existing medication tracking
  medicationId?: string // Reference to Medication document if applicable

  notes?: string // Additional instructions or observations

  // Metadata
  prescribedBy?: string // Doctor/vet name who prescribed
  loggedBy: string // userId of person who logged treatment
  createdAt: string // ISO 8601
  lastUpdatedAt: string // ISO 8601
}

/**
 * RecoveryMilestone - Significant recovery progress markers
 *
 * Stored at: /users/{uid}/patients/{patientId}/health-episodes/{episodeId}/milestones/{milestoneId}
 *
 * Milestones differ by patient type:
 * - Human: "Returned to work", "First full night's sleep", "No symptoms for 24h"
 * - Pet: "First meal eaten", "Playing normally", "Using injured limb"
 */
export interface RecoveryMilestone {
  id: string
  episodeId: string
  patientId: string

  milestone: string // Description of milestone achieved
  achievedDate: string // ISO 8601 - when milestone was achieved

  notes?: string // Additional context

  // Metadata
  loggedBy: string // userId of person who logged milestone
  createdAt: string // ISO 8601
}

/**
 * ProgressPhoto - Visual documentation of injury/illness progression
 *
 * Stored at: /users/{uid}/patients/{patientId}/health-episodes/{episodeId}/photos/{photoId}
 *
 * Use case: Track wound healing, rash progression, swelling reduction, etc.
 * Especially valuable for injuries where visual progress is important.
 */
export interface ProgressPhoto {
  id: string
  episodeId: string
  patientId: string

  photoUrl: string // Storage URL for the photo
  thumbnailUrl?: string // Optional thumbnail for faster loading

  // Context
  capturedAt: string // ISO 8601 - when photo was taken
  dayNumber: number // Day X of episode (calculated from episode startDate)

  caption?: string // User description: "Day 3 - Swelling reduced significantly"
  tags?: string[] // 'before', 'after', 'day3', 'morning', 'evening', 'bandage-removed'

  // Associate with specific symptom if relevant
  relatedSymptomId?: string // Link to specific symptom being tracked visually

  // Metadata
  uploadedBy: string // userId of person who uploaded
  uploadedAt: string // ISO 8601
  fileSize?: number // Bytes
  mimeType?: string // 'image/jpeg', 'image/png'
}

/**
 * PhotoComparison - Side-by-side comparison metadata
 *
 * Allows users to create before/after comparisons or progress sequences
 */
export interface PhotoComparison {
  id: string
  episodeId: string
  patientId: string

  title: string // "Week 1 vs Week 3 Progress"
  photoIds: string[] // Array of photo IDs in comparison order

  notes?: string // Observations about the comparison

  createdBy: string
  createdAt: string
}

/**
 * EpisodeSummary - Aggregated episode data for dashboard display
 *
 * This is a computed view combining episode + subcollection data
 * Used for list views and dashboards
 */
export interface EpisodeSummary extends HealthEpisode {
  symptoms: HealthSymptom[] // Active symptoms
  recentTreatments: TreatmentAction[] // Recent 3 treatments
  milestones: RecoveryMilestone[] // All milestones achieved
  photos: ProgressPhoto[] // Progress photos

  // Computed fields
  durationDays: number // Days since episode started
  daysUntilRecovery?: number // Days from start to recovery (if recovered)
  hasVisualProgress: boolean // True if photos exist
}
