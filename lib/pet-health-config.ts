/**
 * Pet Health Tracking Configuration
 * Species-specific dashboard features, vitals, and tracking capabilities
 */

import { VitalType } from '@/types/medical'

// Species-specific vitals that can be tracked
export const PET_VITAL_CONFIG: Record<string, VitalType[]> = {
  Dog: ['weight', 'temperature'],
  Cat: ['weight', 'temperature'],
  Bird: ['weight'],
  Fish: ['temperature'], // Water temperature
  Rabbit: ['weight', 'temperature'],
  'Guinea Pig': ['weight'],
  Hamster: ['weight'],
  Reptile: ['weight', 'temperature'], // Basking spot temperature
  Other: ['weight']
}

// Default vitals for unknown species
export const DEFAULT_PET_VITALS: VitalType[] = ['weight']

// Dashboard tabs visible for each species
export const PET_TAB_VISIBILITY: Record<string, string[]> = {
  Dog: ['info', 'vitals', 'feeding', 'activity', 'medications', 'appointments', 'grooming', 'settings'],
  Cat: ['info', 'vitals', 'feeding', 'activity', 'medications', 'appointments', 'grooming', 'settings'],
  Bird: ['info', 'vitals', 'feeding', 'medications', 'appointments', 'settings'],
  Fish: ['info', 'vitals', 'feeding', 'settings'], // Fish rarely need vet appointments
  Rabbit: ['info', 'vitals', 'feeding', 'medications', 'appointments', 'grooming', 'settings'],
  'Guinea Pig': ['info', 'vitals', 'feeding', 'medications', 'appointments', 'grooming', 'settings'],
  Hamster: ['info', 'vitals', 'feeding', 'medications', 'settings'], // Hamsters rarely need vet visits
  Reptile: ['info', 'vitals', 'feeding', 'medications', 'appointments', 'settings'],
  Other: ['info', 'vitals', 'feeding', 'medications', 'settings']
}

// Human dashboard tabs for reference
export const HUMAN_TAB_VISIBILITY: string[] = [
  'info', 'vitals', 'meals', 'steps', 'medications', 'recipes', 'appointments', 'settings'
]

// Species-specific label overrides
export const PET_TAB_LABELS: Record<string, Record<string, string>> = {
  Dog: {
    feeding: '🍖 Feeding',
    activity: '🏃 Exercise',
    vitals: '🩺 Vitals',
    grooming: '✂️ Grooming',
    medications: '💉 Health Care'
  },
  Cat: {
    feeding: '🐟 Feeding',
    activity: '🎾 Activity',
    vitals: '🩺 Vitals',
    grooming: '✂️ Grooming',
    medications: '💉 Health Care'
  },
  Bird: {
    feeding: '🌾 Feeding',
    vitals: '🩺 Vitals',
    medications: '💉 Health Care'
  },
  Fish: {
    feeding: '🐠 Feeding',
    vitals: '🌡️ Water Vitals',
    medications: '💊 Treatments'
  },
  Rabbit: {
    feeding: '🥕 Feeding',
    activity: '🏃 Exercise',
    vitals: '🩺 Vitals',
    grooming: '✂️ Grooming',
    medications: '💉 Health Care'
  },
  'Guinea Pig': {
    feeding: '🥬 Feeding',
    activity: '🎡 Exercise',
    vitals: '🩺 Vitals',
    grooming: '✂️ Grooming',
    medications: '💉 Health Care'
  },
  Hamster: {
    feeding: '🌰 Feeding',
    vitals: '🩺 Vitals',
    medications: '💉 Health Care'
  },
  Reptile: {
    feeding: '🦗 Feeding',
    vitals: '🌡️ Habitat Vitals',
    medications: '💉 Health Care'
  }
}

// Helper functions

/**
 * Get available vitals for a pet species
 */
export function getPetVitals(species?: string): VitalType[] {
  if (!species) return DEFAULT_PET_VITALS
  return PET_VITAL_CONFIG[species] || DEFAULT_PET_VITALS
}

/**
 * Get visible tabs for a pet species
 */
export function getPetTabs(species?: string): string[] {
  if (!species) return PET_TAB_VISIBILITY.Other
  return PET_TAB_VISIBILITY[species] || PET_TAB_VISIBILITY.Other
}

/**
 * Get tab label for a species (with emoji)
 */
export function getPetTabLabel(species: string, tab: string): string {
  const speciesLabels = PET_TAB_LABELS[species] || {}
  return speciesLabels[tab] || getDefaultTabLabel(tab)
}

/**
 * Get default tab labels for fallback
 */
function getDefaultTabLabel(tab: string): string {
  const defaultLabels: Record<string, string> = {
    info: 'ℹ️ Info',
    vitals: '🩺 Vitals',
    feeding: '🍽️ Feeding',
    meals: '🍽️ Meals',
    steps: '🚶 Steps',
    activity: '🏃 Activity',
    medications: '💊 Medications', // For humans
    recipes: '📖 Recipes',
    appointments: '📅 Appt',
    grooming: '✂️ Groom',
    settings: '⚙️ Settings'
  }
  return defaultLabels[tab] || tab
}

/**
 * Check if a vital type is allowed for a pet species
 */
export function canTrackVital(species: string | undefined, vitalType: VitalType): boolean {
  if (!species) return DEFAULT_PET_VITALS.includes(vitalType)
  const allowedVitals = PET_VITAL_CONFIG[species] || DEFAULT_PET_VITALS
  return allowedVitals.includes(vitalType)
}

/**
 * Check if a tab should be visible for a pet species
 */
export function shouldShowTab(species: string | undefined, tab: string): boolean {
  if (!species) return PET_TAB_VISIBILITY.Other.includes(tab)
  const visibleTabs = PET_TAB_VISIBILITY[species] || PET_TAB_VISIBILITY.Other
  return visibleTabs.includes(tab)
}

/**
 * Get human-readable vital name for pets
 */
export function getPetVitalName(vitalType: VitalType, species?: string): string {
  // Special cases for specific species
  if (vitalType === 'temperature') {
    if (species === 'Fish') return 'Water Temperature'
    if (species === 'Reptile') return 'Habitat Temperature'
    return 'Temperature'
  }

  // Default vital names
  const vitalNames: Record<VitalType, string> = {
    weight: 'Weight',
    temperature: 'Temperature',
    blood_pressure: 'Blood Pressure',
    blood_sugar: 'Blood Sugar',
    pulse_oximeter: 'Oxygen Level',
    mood: 'Mood',
    // Pet-specific vitals
    heartRate: 'Heart Rate',
    respiratoryRate: 'Respiratory Rate',
    bodyConditionScore: 'Body Condition Score',
    // Fish-specific vitals
    waterTemp: 'Water Temperature',
    pH: 'pH Level',
    ammonia: 'Ammonia',
    nitrite: 'Nitrite',
    nitrate: 'Nitrate',
    // Reptile-specific vitals
    baskingTemp: 'Basking Temperature',
    coolSideTemp: 'Cool Side Temperature',
    humidity: 'Humidity',
    // Newborn-specific vitals
    newborn_heart_rate: 'Heart Rate',
    newborn_respiratory_rate: 'Respiratory Rate',
    newborn_oxygen_saturation: 'Oxygen Saturation',
    newborn_bilirubin: 'Bilirubin',
    newborn_blood_glucose: 'Blood Glucose',
    newborn_head_circumference: 'Head Circumference',
    newborn_diaper_output: 'Diaper Output',
    newborn_fontanelle: 'Fontanelle',
    newborn_umbilical_cord: 'Umbilical Cord',
  }

  return vitalNames[vitalType] || vitalType
}

/**
 * Get species emoji for UI
 */
export function getSpeciesEmoji(species?: string): string {
  const emojiMap: Record<string, string> = {
    Dog: '🐕',
    Cat: '🐱',
    Bird: '🐦',
    Fish: '🐠',
    Rabbit: '🐰',
    'Guinea Pig': '🐹',
    Hamster: '🐹',
    Reptile: '🦎',
    Other: '🐾'
  }
  return emojiMap[species || 'Other'] || '🐾'
}

/**
 * Check if species supports step/activity tracking
 */
export function supportsActivityTracking(species?: string): boolean {
  return ['Dog', 'Cat', 'Rabbit', 'Guinea Pig'].includes(species || '')
}

/**
 * Check if species needs grooming tracking
 */
export function supportsGroomingTracking(species?: string): boolean {
  return ['Dog', 'Cat', 'Rabbit', 'Guinea Pig'].includes(species || '')
}

/**
 * Get activity label for species
 */
export function getActivityLabel(species?: string): string {
  if (species === 'Dog') return 'Exercise Minutes'
  if (species === 'Cat') return 'Activity Level'
  if (species === 'Rabbit' || species === 'Guinea Pig') return 'Exercise Time'
  return 'Activity'
}
