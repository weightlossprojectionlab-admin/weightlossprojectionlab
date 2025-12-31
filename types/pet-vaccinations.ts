/**
 * Pet Vaccination and Parasite Prevention Types
 * For veterinary record keeping and compliance tracking
 */

import { Timestamp } from 'firebase/firestore'

/**
 * Vaccination Record
 * Tracks vaccines administered and due dates
 */
export interface VaccinationRecord {
  id: string
  petId: string

  // Vaccine Info
  vaccineName: string // "Rabies", "DHPP", "Bordetella", "FVRCP", etc.
  vaccineType: VaccineType
  manufacturer?: string
  lotNumber?: string

  // Administration
  administeredDate: string // ISO 8601
  administeredBy: string // Vet clinic name
  administeredByVetId?: string // License number or ID
  administrationSite?: string // "Left shoulder", "Right hip", etc.

  // Scheduling
  dueDate: string // ISO 8601
  nextDueDate?: string // ISO 8601 for boosters
  expirationDate: string // ISO 8601
  isBooster: boolean
  boosterNumber?: number // 1, 2, 3 for multi-dose series

  // Reactions
  hadReaction: boolean
  reactionType?: 'mild' | 'moderate' | 'severe'
  reactionNotes?: string

  // Compliance
  status: 'current' | 'due-soon' | 'overdue' | 'expired'
  reminderSent: boolean
  reminderSentDate?: string

  // Documentation
  certificateUrl?: string // Storage URL for PDF certificate
  receiptUrl?: string
  notes?: string

  // Audit
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Vaccine types by species
 */
export type VaccineType =
  // Dogs
  | 'rabies'
  | 'dhpp' // Distemper, Hepatitis, Parvovirus, Parainfluenza
  | 'bordetella' // Kennel cough
  | 'leptospirosis'
  | 'lyme-disease'
  | 'canine-influenza'
  // Cats
  | 'fvrcp' // Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia
  | 'felv' // Feline Leukemia
  | 'fiv' // Feline Immunodeficiency Virus
  // Birds
  | 'polyomavirus'
  | 'pacheco-disease'
  // Rabbits
  | 'myxomatosis'
  | 'rvhd' // Rabbit Viral Hemorrhagic Disease
  // Other
  | 'other'

/**
 * Species-specific vaccine recommendations
 */
export const SPECIES_VACCINES: Record<string, { name: VaccineType; description: string; frequencyYears: number; required: boolean }[]> = {
  Dog: [
    { name: 'rabies', description: 'Rabies - Required by law', frequencyYears: 3, required: true },
    { name: 'dhpp', description: 'DHPP (Distemper, Hepatitis, Parvovirus, Parainfluenza)', frequencyYears: 3, required: true },
    { name: 'bordetella', description: 'Bordetella (Kennel Cough)', frequencyYears: 1, required: false },
    { name: 'leptospirosis', description: 'Leptospirosis', frequencyYears: 1, required: false },
    { name: 'lyme-disease', description: 'Lyme Disease', frequencyYears: 1, required: false },
    { name: 'canine-influenza', description: 'Canine Influenza', frequencyYears: 1, required: false }
  ],
  Cat: [
    { name: 'rabies', description: 'Rabies - Required by law', frequencyYears: 3, required: true },
    { name: 'fvrcp', description: 'FVRCP (Feline Viral Rhinotracheitis, Calicivirus, Panleukopenia)', frequencyYears: 3, required: true },
    { name: 'felv', description: 'FeLV (Feline Leukemia)', frequencyYears: 2, required: false },
    { name: 'fiv', description: 'FIV (Feline Immunodeficiency Virus)', frequencyYears: 1, required: false }
  ],
  Bird: [
    { name: 'polyomavirus', description: 'Polyomavirus', frequencyYears: 1, required: false },
    { name: 'pacheco-disease', description: "Pacheco's Disease", frequencyYears: 1, required: false }
  ],
  Rabbit: [
    { name: 'myxomatosis', description: 'Myxomatosis', frequencyYears: 1, required: true },
    { name: 'rvhd', description: 'RVHD (Rabbit Viral Hemorrhagic Disease)', frequencyYears: 1, required: true }
  ],
  Reptile: [
    { name: 'other', description: 'Reptiles typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Turtle: [
    { name: 'other', description: 'Turtles typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Lizard: [
    { name: 'other', description: 'Lizards typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Snake: [
    { name: 'other', description: 'Snakes typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Ferret: [
    { name: 'rabies', description: 'Rabies - Required by law', frequencyYears: 1, required: true },
    { name: 'canine-distemper', description: 'Canine Distemper (for Ferrets)', frequencyYears: 1, required: true }
  ],
  'Guinea Pig': [
    { name: 'other', description: 'Guinea pigs typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Hamster: [
    { name: 'other', description: 'Hamsters typically do not require vaccinations', frequencyYears: 1, required: false }
  ],
  Other: [
    { name: 'other', description: 'Custom Vaccine', frequencyYears: 1, required: false }
  ]
}

/**
 * Parasite Prevention Record
 * Tracks monthly flea/tick/heartworm medications
 */
export interface ParasitePreventionRecord {
  id: string
  petId: string

  // Product Info
  productName: string // "Heartgard Plus", "Bravecto", "Revolution", etc.
  preventionType: ParasitePrevention[]
  manufacturer?: string
  dosage: string // "25-50 lbs", "Blue (11-22 lbs)", etc.

  // Administration
  administeredDate: string // ISO 8601
  administeredBy: string // User ID or "You"
  administeredByName?: string

  // Scheduling
  nextDueDate: string // ISO 8601 (usually 1 month later)
  frequency: 'monthly' | 'quarterly' | '6-months' | 'yearly'

  // Compliance
  status: 'given' | 'due-soon' | 'overdue' | 'skipped'
  reminderSent: boolean

  // Notes
  notes?: string

  // Audit
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Types of parasite prevention
 */
export type ParasitePrevention =
  | 'heartworm'
  | 'flea'
  | 'tick'
  | 'intestinal-worms' // Roundworm, hookworm, whipworm
  | 'ear-mites'
  | 'mange'

/**
 * Vaccination Status Summary
 * For dashboard quick view
 */
export interface VaccinationStatus {
  totalVaccines: number
  currentVaccines: number
  dueSoon: number // Due within 30 days
  overdue: number
  nextDueDate?: string
  nextDueVaccine?: string
}

/**
 * Parasite Prevention Status Summary
 */
export interface ParasitePreventionStatus {
  totalDoses: number
  givenThisMonth: boolean
  nextDueDate?: string
  nextDueProduct?: string
  overdueCount: number
}

/**
 * Vet Clinic Record
 * For tracking where pet receives care
 */
export interface VetClinicRecord {
  id: string
  petId: string

  // Clinic Info
  clinicName: string
  isPrimary: boolean

  // Contact
  phone?: string
  email?: string
  website?: string

  // Address
  address?: string
  city?: string
  state?: string
  zipCode?: string

  // Veterinarians
  primaryVetName?: string
  vetLicenseNumber?: string

  // Notes
  notes?: string

  // Audit
  createdBy: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

/**
 * Vaccination Reminder Settings
 */
export interface VaccinationReminderSettings {
  enabled: boolean
  daysBeforeDue: number // Default: 30 days
  channels: {
    push: boolean
    email: boolean
    sms: boolean
  }
}

/**
 * Form data for creating/editing vaccination records
 */
export interface VaccinationFormData {
  vaccineName: string
  vaccineType: VaccineType
  manufacturer?: string
  lotNumber?: string
  administeredDate: string
  administeredBy: string
  administeredByVetId?: string
  administrationSite?: string
  nextDueDate?: string
  expirationDate: string
  isBooster: boolean
  boosterNumber?: number
  hadReaction: boolean
  reactionType?: 'mild' | 'moderate' | 'severe'
  reactionNotes?: string
  notes?: string
}

/**
 * Form data for creating/editing parasite prevention records
 */
export interface ParasitePreventionFormData {
  productName: string
  preventionType: ParasitePrevention[]
  manufacturer?: string
  dosage: string
  administeredDate: string
  frequency: 'monthly' | 'quarterly' | '6-months' | 'yearly'
  notes?: string
}
