/**
 * Pet Symptom Tracking Types
 * For logging health symptoms and patterns for veterinary diagnosis
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Symptom Log Record
 * Tracks individual symptom occurrences with severity and context
 */
export interface SymptomLog {
  id: string
  petId: string

  // Symptom Info
  symptomType: SymptomType
  symptomName: string // Display name
  customSymptom?: string // For "Other" type

  // Occurrence
  occurredAt: string // ISO 8601
  duration?: number // Duration in minutes
  frequency?: number // How many times in the period

  // Severity
  severity: 'mild' | 'moderate' | 'severe'

  // Context
  beforeActivity?: string // "After eating", "After exercise", "During sleep", etc.
  afterActivity?: string // What happened after
  triggerSuspected?: string // What might have caused it

  // Associated Symptoms (multiple symptoms in one event)
  associatedSymptoms?: SymptomType[]

  // Medical Details
  vomitContents?: string // For vomiting: "Food", "Bile", "Blood", "Hairball"
  diarrheaType?: string // For diarrhea: "Watery", "Mucus", "Bloody"
  dischargeLoc?: string // For discharge: "Eyes", "Nose", "Ears"
  dischargeType?: string // "Clear", "Cloudy", "Bloody", "Pus"
  limbingLeg?: string // For limping: "Front Left", "Front Right", "Back Left", "Back Right"
  seizureDuration?: number // For seizures: duration in seconds
  seizureType?: string // "Focal", "Generalized", "Unknown"

  // Measurements
  temperature?: number // Body temperature in °F
  respiratoryRate?: number // Breaths per minute
  heartRate?: number // Beats per minute

  // Photos/Videos
  photoUrls?: string[] // Storage URLs for symptom photos
  videoUrls?: string[] // Storage URLs for symptom videos

  // Treatment
  treatmentGiven?: string // "None", "Home remedy", "Medication", "Vet visit"
  medicationGiven?: string
  vetVisitScheduled?: boolean
  vetVisitDate?: string

  // Resolution
  resolved?: boolean
  resolvedAt?: string
  resolutionNotes?: string

  // Notes
  notes?: string

  // Audit
  loggedBy: string
  loggedByName?: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Symptom Types by Species
 */
export type SymptomType =
  // Gastrointestinal
  | 'vomiting'
  | 'diarrhea'
  | 'constipation'
  | 'loss-of-appetite'
  | 'excessive-eating'
  | 'excessive-drinking'
  | 'drooling'
  | 'bloody-stool'

  // Respiratory
  | 'coughing'
  | 'sneezing'
  | 'wheezing'
  | 'difficulty-breathing'
  | 'nasal-discharge'

  // Mobility
  | 'limping'
  | 'difficulty-standing'
  | 'difficulty-walking'
  | 'paralysis'
  | 'trembling'

  // Skin & Coat
  | 'scratching'
  | 'hair-loss'
  | 'skin-rash'
  | 'hot-spots'
  | 'swelling'
  | 'lumps-bumps'

  // Behavioral
  | 'lethargy'
  | 'aggression'
  | 'anxiety'
  | 'excessive-vocalization'
  | 'disorientation'
  | 'pacing'
  | 'hiding'

  // Neurological
  | 'seizures'
  | 'head-tilt'
  | 'loss-of-balance'
  | 'circling'

  // Eyes & Ears
  | 'eye-discharge'
  | 'red-eyes'
  | 'squinting'
  | 'ear-discharge'
  | 'head-shaking'
  | 'ear-scratching'

  // Urinary
  | 'frequent-urination'
  | 'difficulty-urinating'
  | 'bloody-urine'
  | 'accidents-in-house'

  // Pain
  | 'vocalization-pain'
  | 'aggression-when-touched'
  | 'hunched-posture'
  | 'reluctance-to-move'

  // Other
  | 'bleeding'
  | 'swollen-abdomen'
  | 'bad-breath'
  | 'weight-loss'
  | 'weight-gain'

  // Fish-specific
  | 'difficulty-swimming'
  | 'fin-damage'

  | 'other'

/**
 * Species-specific common symptoms
 */
export const SPECIES_SYMPTOMS: Record<string, { name: string; type: SymptomType; urgent?: boolean }[]> = {
  Dog: [
    { name: 'Vomiting', type: 'vomiting' },
    { name: 'Diarrhea', type: 'diarrhea' },
    { name: 'Limping', type: 'limping' },
    { name: 'Coughing', type: 'coughing' },
    { name: 'Scratching', type: 'scratching' },
    { name: 'Lethargy', type: 'lethargy' },
    { name: 'Loss of Appetite', type: 'loss-of-appetite' },
    { name: 'Excessive Drinking', type: 'excessive-drinking' },
    { name: 'Seizures', type: 'seizures', urgent: true },
    { name: 'Difficulty Breathing', type: 'difficulty-breathing', urgent: true },
    { name: 'Bloody Stool', type: 'bloody-stool', urgent: true }
  ],
  Cat: [
    { name: 'Vomiting', type: 'vomiting' },
    { name: 'Diarrhea', type: 'diarrhea' },
    { name: 'Loss of Appetite', type: 'loss-of-appetite' },
    { name: 'Hiding', type: 'hiding' },
    { name: 'Excessive Grooming', type: 'scratching' },
    { name: 'Lethargy', type: 'lethargy' },
    { name: 'Difficulty Urinating', type: 'difficulty-urinating', urgent: true },
    { name: 'Difficulty Breathing', type: 'difficulty-breathing', urgent: true },
    { name: 'Not Eating 24+ Hours', type: 'loss-of-appetite', urgent: true }
  ],
  Bird: [
    { name: 'Feather Plucking', type: 'hair-loss' },
    { name: 'Loss of Appetite', type: 'loss-of-appetite' },
    { name: 'Lethargy', type: 'lethargy' },
    { name: 'Difficulty Breathing', type: 'difficulty-breathing', urgent: true },
    { name: 'Tail Bobbing', type: 'difficulty-breathing' },
    { name: 'Nasal Discharge', type: 'nasal-discharge' },
    { name: 'Fluffed Feathers', type: 'lethargy' }
  ],
  Fish: [
    { name: 'Swimming Abnormally', type: 'difficulty-swimming' },
    { name: 'Loss of Appetite', type: 'loss-of-appetite' },
    { name: 'White Spots (Ich)', type: 'skin-rash' },
    { name: 'Fin Rot', type: 'fin-damage' },
    { name: 'Gasping at Surface', type: 'difficulty-breathing', urgent: true },
    { name: 'Bloating', type: 'swollen-abdomen' }
  ],
  Rabbit: [
    { name: 'Loss of Appetite', type: 'loss-of-appetite', urgent: true },
    { name: 'Diarrhea', type: 'diarrhea' },
    { name: 'Head Tilt', type: 'head-tilt' },
    { name: 'Difficulty Breathing', type: 'difficulty-breathing', urgent: true },
    { name: 'Lethargy', type: 'lethargy' },
    { name: 'Eye Discharge', type: 'eye-discharge' }
  ],
  Other: [
    { name: 'Loss of Appetite', type: 'loss-of-appetite' },
    { name: 'Lethargy', type: 'lethargy' },
    { name: 'Vomiting', type: 'vomiting' },
    { name: 'Diarrhea', type: 'diarrhea' },
    { name: 'Other', type: 'other' }
  ]
}

// Fish-specific symptoms
export type FishSymptomType =
  | 'difficulty-swimming'
  | 'fin-damage'
  | 'white-spots'
  | 'fungal-growth'
  | 'gasping'
  | 'laying-on-bottom'

/**
 * Symptom Pattern Analysis
 * For detecting recurring patterns
 */
export interface SymptomPattern {
  symptomType: SymptomType
  occurrenceCount: number
  firstOccurrence: string
  lastOccurrence: string
  averageFrequency: number // Days between occurrences
  commonTriggers: string[]
  escalating: boolean // Is severity increasing?
}

/**
 * Symptom Summary
 * For dashboard quick view
 */
export interface SymptomSummary {
  totalSymptoms: number
  symptomsLast7Days: number
  symptomsLast30Days: number
  unresolvedSymptoms: number
  urgentSymptoms: number
  mostCommonSymptom?: {
    type: SymptomType
    name: string
    count: number
  }
}

/**
 * Form data for creating symptom logs
 */
export interface SymptomFormData {
  symptomType: SymptomType
  symptomName: string
  customSymptom?: string
  occurredAt: string
  duration?: number
  frequency?: number
  severity: 'mild' | 'moderate' | 'severe'
  beforeActivity?: string
  afterActivity?: string
  triggerSuspected?: string
  associatedSymptoms?: SymptomType[]
  vomitContents?: string
  diarrheaType?: string
  dischargeLoc?: string
  dischargeType?: string
  limbingLeg?: string
  seizureDuration?: number
  seizureType?: string
  temperature?: number
  respiratoryRate?: number
  heartRate?: number
  treatmentGiven?: string
  medicationGiven?: string
  vetVisitScheduled?: boolean
  vetVisitDate?: string
  notes?: string
}

/**
 * Emergency Symptom Detection
 * Symptoms that require immediate vet attention
 */
export const EMERGENCY_SYMPTOMS: Record<string, SymptomType[]> = {
  Dog: [
    'difficulty-breathing',
    'seizures',
    'bloody-stool',
    'bloody-urine',
    'paralysis',
    'swollen-abdomen'
  ],
  Cat: [
    'difficulty-breathing',
    'difficulty-urinating',
    'seizures',
    'paralysis',
    'loss-of-appetite' // 24+ hours for cats is critical
  ],
  Bird: [
    'difficulty-breathing',
    'seizures',
    'bleeding'
  ],
  Fish: [
    'gasping',
    'laying-on-bottom'
  ],
  Rabbit: [
    'difficulty-breathing',
    'loss-of-appetite', // Critical for rabbits
    'head-tilt',
    'seizures'
  ]
}

/**
 * Symptom Frequency Tracking
 * For pattern detection
 */
export interface SymptomFrequency {
  symptomType: SymptomType
  symptomName: string
  count: number
  dates: string[]
  averageSeverity: number // 1-3 scale
}
