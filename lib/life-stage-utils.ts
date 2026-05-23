/**
 * Life Stage Utilities
 * Computes life stages and age-appropriate displays for both humans and pets
 */

// ==================== HUMAN LIFE STAGES ====================

export type HumanLifeStage = 'newborn' | 'infant' | 'toddler' | 'child' | 'teen' | 'adult' | 'senior'

interface LifeStageResult {
  stage: string
  label: string
}

interface HealthNotice {
  type: 'warning' | 'info'
  message: string
}

/**
 * Calculate age in months from date of birth (month-level precision for young dependents)
 */
export function calculateAgeInMonths(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  const months = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth())
  // Adjust if day hasn't passed yet this month
  if (today.getDate() < birth.getDate()) {
    return Math.max(0, months - 1)
  }
  return Math.max(0, months)
}

/**
 * Calculate age in weeks from date of birth (for newborns)
 */
export function calculateAgeInWeeks(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  const diffMs = today.getTime() - birth.getTime()
  return Math.max(0, Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)))
}

/**
 * Calculate age in days from date of birth
 */
export function calculateAgeInDays(dob: string): number {
  if (!dob) return 0
  const birth = new Date(dob)
  const today = new Date()
  const diffMs = today.getTime() - birth.getTime()
  return Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)))
}

/**
 * Get human life stage from date of birth
 */
export function getHumanLifeStage(dob: string): LifeStageResult {
  if (!dob) return { stage: 'adult', label: 'Adult' }

  const months = calculateAgeInMonths(dob)
  const years = Math.floor(months / 12)

  if (months < 1) return { stage: 'newborn', label: 'Newborn' }
  if (months < 12) return { stage: 'infant', label: 'Infant' }
  if (years < 3) return { stage: 'toddler', label: 'Toddler' }
  if (years < 13) return { stage: 'child', label: 'Child' }
  if (years < 18) return { stage: 'teen', label: 'Teen' }
  if (years < 65) return { stage: 'adult', label: 'Adult' }
  return { stage: 'senior', label: 'Senior' }
}

/**
 * Compute the user-facing badge label for a Patient — the single
 * short string shown on patient cards. Combines age and relationship
 * honestly:
 *
 *   - MINORS (newborn / infant / toddler / child / teen):
 *     show the life-stage label. A 5-year-old offspring is "Child",
 *     a 14-year-old is "Teen" — age-appropriate even though the
 *     stored `relationship` is the same.
 *
 *   - ADULTS / SENIORS:
 *     show a gender-aware relationship label ("Son" / "Daughter" /
 *     "Father" / "Mother" / "Brother" / "Sister" / "Husband" / etc.).
 *     This is what fixes the "25-year-old labeled as child" bug —
 *     `relationship: 'child'` is offspring-of-owner, not an age
 *     category. The previous PatientCard logic compared raw
 *     relationship strings case-incorrectly (`'Child'` vs stored
 *     `'child'`), so the badge always fell through to the raw
 *     relationship value.
 *
 *   - PETS:
 *     species (capitalized) if present, else "Pet". Pets don't have
 *     human life stages or relationship-with-gender semantics.
 */
/**
 * Canonical display-name for everyday UI surfaces (dashboard cards,
 * lists, dropdowns, hero headers). Returns the patient's nickname
 * when set, falling back to the legal full name. Formal/medical
 * surfaces (settings page header, exported reports, audit logs)
 * should bypass this helper and use `name` directly so the legal
 * record remains visible where it matters.
 */
export function getPatientDisplayName(patient: {
  name: string
  nickname?: string | null
  authDisplayName?: string | null
  /** Per-patient override. Three distinct sources, each from its own
   *  stored field (added Phase 2.1, 2026-05-23):
   *    'auth'     → authDisplayName (captured at onboarding from
   *                 Firebase Auth when the user picked "Auth")
   *    'legal'    → name (composed legal name)
   *    'nickname' → nickname (falls back to name if nickname empty)
   *  Undefined keeps the original nickname-or-name rule for patients
   *  pre-dating Phase 2.1. */
  displayPreference?: 'auth' | 'legal' | 'nickname' | null
}): string {
  if (patient.displayPreference === 'auth') {
    const authName = patient.authDisplayName?.trim()
    // Fall back to nickname or legal name if 'auth' was picked but
    // the field is somehow empty — defensive, shouldn't happen for
    // accounts that completed onboarding after Phase 2.1.
    if (authName) return authName
  }
  if (patient.displayPreference === 'legal') return patient.name
  const trimmed = patient.nickname?.trim()
  return trimmed || patient.name
}

export function getPatientBadgeLabel(patient: {
  type?: 'human' | 'pet' | null
  dateOfBirth?: string | null
  relationship?: string | null
  gender?: string | null
  species?: string | null
}): string {
  if (patient.type === 'pet') {
    if (patient.species && patient.species.length > 0) {
      return patient.species.charAt(0).toUpperCase() + patient.species.slice(1)
    }
    return 'Pet'
  }

  const stage = patient.dateOfBirth
    ? getHumanLifeStage(patient.dateOfBirth)
    : { stage: 'adult', label: 'Adult' }

  // Minors: age category is the most informative single label.
  if (['newborn', 'infant', 'toddler', 'child', 'teen'].includes(stage.stage)) {
    return stage.label
  }

  // Adults / seniors: prefer gender-aware relationship label.
  const isMale = patient.gender === 'male'
  const isFemale = patient.gender === 'female'
  switch (patient.relationship) {
    case 'self':
      return 'You'
    case 'spouse':
      return isMale ? 'Husband' : isFemale ? 'Wife' : 'Spouse'
    case 'parent':
      return isMale ? 'Father' : isFemale ? 'Mother' : 'Parent'
    case 'child':
      return isMale ? 'Son' : isFemale ? 'Daughter' : stage.label
    case 'sibling':
      return isMale ? 'Brother' : isFemale ? 'Sister' : 'Sibling'
    case 'grandparent':
      return isMale ? 'Grandfather' : isFemale ? 'Grandmother' : 'Grandparent'
    default:
      return stage.label
  }
}

/**
 * Format human age for display with appropriate precision
 * - Newborns: "X days" or "X weeks"
 * - Infants: "X months"
 * - Toddlers/Children: "X years, Y months" or "X years"
 * - Adults: "Age X"
 */
export function formatHumanAgeDisplay(dob: string): string {
  if (!dob) return ''

  const days = calculateAgeInDays(dob)
  const weeks = calculateAgeInWeeks(dob)
  const months = calculateAgeInMonths(dob)
  const years = Math.floor(months / 12)

  if (days === 0) return 'Born today'
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} old`
  if (months < 1) return `${weeks} week${weeks === 1 ? '' : 's'} old`
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} old`
  if (years < 13) {
    const remainingMonths = months % 12
    if (remainingMonths > 0) {
      return `${years} yr${years === 1 ? '' : 's'}, ${remainingMonths} mo old`
    }
    return `${years} year${years === 1 ? '' : 's'} old`
  }
  return `Age ${years}`
}

/**
 * Get health notices appropriate for the human life stage
 */
export function getHumanLifeStageNotices(dob: string): HealthNotice[] {
  if (!dob) return []

  const { stage } = getHumanLifeStage(dob)
  const notices: HealthNotice[] = []

  switch (stage) {
    case 'newborn':
      notices.push({
        type: 'info',
        message: 'Newborns have frequent pediatric checkups in the first month. Consult your pediatrician for feeding and weight-gain guidance.'
      })
      notices.push({
        type: 'warning',
        message: 'This app does not provide calorie or dietary recommendations for newborns. Always follow your pediatrician\'s guidance.'
      })
      break
    case 'infant':
      notices.push({
        type: 'info',
        message: 'Infants should have regular well-baby visits. Track growth milestones with your pediatrician.'
      })
      notices.push({
        type: 'warning',
        message: 'This app does not provide calorie or dietary recommendations for infants. Always follow your pediatrician\'s guidance.'
      })
      break
    case 'toddler':
      notices.push({
        type: 'info',
        message: 'Toddlers have unique nutritional needs for rapid growth and development. Regular pediatric checkups are important.'
      })
      break
    case 'child':
      notices.push({
        type: 'info',
        message: 'Children have specific nutritional needs for healthy growth. Consult a pediatrician before making dietary changes.'
      })
      break
  }

  return notices
}

// ==================== PET LIFE STAGES ====================

export type PetLifeStage = 'young' | 'adult' | 'senior'

interface PetLifeStageThresholds {
  youngLabel: string
  youngMonths: number
  seniorYears: number
}

const PET_LIFE_STAGE_MAP: Record<string, PetLifeStageThresholds> = {
  Dog:        { youngLabel: 'Puppy',     youngMonths: 12, seniorYears: 7 },
  Cat:        { youngLabel: 'Kitten',    youngMonths: 12, seniorYears: 10 },
  Horse:      { youngLabel: 'Foal',      youngMonths: 12, seniorYears: 20 },
  Bird:       { youngLabel: 'Chick',     youngMonths: 6,  seniorYears: 15 },
  Rabbit:     { youngLabel: 'Kit',       youngMonths: 4,  seniorYears: 5 },
  Hamster:    { youngLabel: 'Pup',       youngMonths: 2,  seniorYears: 1.5 },
  'Guinea Pig': { youngLabel: 'Pup',     youngMonths: 3,  seniorYears: 5 },
  Reptile:    { youngLabel: 'Hatchling', youngMonths: 6,  seniorYears: 10 },
  Fish:       { youngLabel: 'Fry',       youngMonths: 3,  seniorYears: 3 },
}

const DEFAULT_PET_THRESHOLDS: PetLifeStageThresholds = {
  youngLabel: 'Juvenile',
  youngMonths: 12,
  seniorYears: 8,
}

/**
 * Get pet life stage with species-specific labels
 */
export function getPetLifeStage(dob: string, species: string): LifeStageResult {
  if (!dob) return { stage: 'adult', label: 'Adult' }

  const thresholds = PET_LIFE_STAGE_MAP[species] || DEFAULT_PET_THRESHOLDS
  const months = calculateAgeInMonths(dob)
  const years = months / 12

  if (months < thresholds.youngMonths) {
    return { stage: 'young', label: thresholds.youngLabel }
  }
  if (years >= thresholds.seniorYears) {
    return { stage: 'senior', label: 'Senior' }
  }
  return { stage: 'adult', label: 'Adult' }
}

/**
 * Format pet age for display with appropriate precision
 */
export function formatPetAgeDisplay(dob: string): string {
  if (!dob) return ''

  const days = calculateAgeInDays(dob)
  const weeks = calculateAgeInWeeks(dob)
  const months = calculateAgeInMonths(dob)
  const years = Math.floor(months / 12)

  if (days === 0) return 'Born today'
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} old`
  if (months < 1) return `${weeks} week${weeks === 1 ? '' : 's'} old`
  if (months < 24) return `${months} month${months === 1 ? '' : 's'} old`
  const remainingMonths = months % 12
  if (remainingMonths > 0) {
    return `${years} yr${years === 1 ? '' : 's'}, ${remainingMonths} mo old`
  }
  return `${years} year${years === 1 ? '' : 's'} old`
}

/**
 * Get health notices appropriate for the pet life stage
 */
export function getPetLifeStageNotices(dob: string, species: string): HealthNotice[] {
  if (!dob) return []

  const { stage } = getPetLifeStage(dob, species)
  const notices: HealthNotice[] = []

  if (stage === 'young') {
    const thresholds = PET_LIFE_STAGE_MAP[species] || DEFAULT_PET_THRESHOLDS

    if (species === 'Dog' || species === 'Cat') {
      notices.push({
        type: 'info',
        message: `${thresholds.youngLabel}s need a series of vaccinations in their first year. Consult your vet for a vaccination schedule.`
      })
      notices.push({
        type: 'info',
        message: `Monitor your ${thresholds.youngLabel.toLowerCase()}'s growth regularly. Rapid weight changes may indicate health issues.`
      })
      notices.push({
        type: 'info',
        message: 'Discuss spay/neuter timing with your veterinarian — typically recommended between 4-6 months of age.'
      })
    } else {
      notices.push({
        type: 'info',
        message: `Young ${species.toLowerCase()}s have specific care needs. Consult your vet for age-appropriate feeding and health guidance.`
      })
    }
  }

  if (stage === 'senior') {
    notices.push({
      type: 'info',
      message: `Senior ${species.toLowerCase()}s benefit from more frequent vet checkups and may need adjusted nutrition for their age.`
    })
  }

  return notices
}

// ==================== PEDIATRIC HEALTH CONDITIONS ====================

export const NEWBORN_INFANT_CONDITIONS = [
  'Jaundice',
  'Colic',
  'Reflux (GERD)',
  'Eczema',
  'Food Allergies',
  'Respiratory Issues',
  'Congenital Heart Condition',
  'Failure to Thrive',
  'Lactose Intolerance',
  'Other',
]

export const TODDLER_CHILD_CONDITIONS = [
  'Asthma',
  'Allergies',
  'Ear Infections',
  'Eczema',
  'Food Allergies',
  'Developmental Concerns',
  'ADHD',
  'Respiratory Issues',
  'Digestive Issues',
  'Other',
]

/**
 * Get age-appropriate health conditions list for humans
 * Returns undefined if adult conditions should be used (age 13+)
 */
export function getPediatricConditions(dob: string): string[] | undefined {
  if (!dob) return undefined

  const { stage } = getHumanLifeStage(dob)

  switch (stage) {
    case 'newborn':
    case 'infant':
      return NEWBORN_INFANT_CONDITIONS
    case 'toddler':
    case 'child':
      return TODDLER_CHILD_CONDITIONS
    default:
      return undefined
  }
}

// ==================== WEIGHT UNIT HELPERS ====================

/**
 * Get the recommended default weight unit based on life stage
 */
export function getDefaultWeightUnit(
  dob: string,
  type: 'human' | 'pet',
  species?: string
): 'lbs' | 'kg' | 'oz' | 'g' {
  if (type === 'human') {
    const { stage } = getHumanLifeStage(dob)
    if (stage === 'newborn' || stage === 'infant') return 'oz'
    return 'lbs'
  }

  // Small pets default to grams
  const smallPets = ['Hamster', 'Guinea Pig', 'Fish', 'Bird']
  if (species && smallPets.includes(species)) return 'g'

  return 'lbs'
}
