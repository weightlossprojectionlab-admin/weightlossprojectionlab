/**
 * Health Episode Constants
 *
 * Predefined libraries for symptoms, milestones, and common illnesses/injuries.
 * Separated by patient type (human/pet) for appropriate suggestions.
 *
 * NOTE: These are used for autocomplete suggestions and quick-add functionality.
 * Users can always enter custom values.
 */

// ==================== HUMAN SYMPTOMS ====================

export const HUMAN_SYMPTOMS = [
  'Fever',
  'Cough',
  'Headache',
  'Body aches',
  'Nausea',
  'Vomiting',
  'Diarrhea',
  'Congestion',
  'Sore throat',
  'Fatigue',
  'Chills',
  'Rash',
  'Shortness of breath',
  'Chest pain',
  'Dizziness',
  'Loss of appetite',
  'Difficulty sleeping',
  'Runny nose',
  'Sneezing',
  'Watery eyes',
  'Muscle weakness',
  'Joint pain',
  'Swelling',
  'Bruising',
  'Bleeding',
  'Abdominal pain',
] as const

// ==================== PET SYMPTOMS ====================

export const PET_SYMPTOMS = [
  'Lethargy',
  'Loss of appetite',
  'Vomiting',
  'Diarrhea',
  'Limping',
  'Excessive scratching',
  'Whining/crying',
  'Hiding',
  'Aggression',
  'Excessive drinking',
  'Difficulty breathing',
  'Not using litter box',
  'Excessive licking',
  'Discharge from eyes/nose',
  'Coughing',
  'Sneezing',
  'Drooling',
  'Trembling/shaking',
  'Loss of balance',
  'Seizures',
  'Swelling',
  'Hair loss',
  'Bad breath',
  'Weight loss',
  'Restlessness',
  'Pacing',
] as const

// ==================== HUMAN RECOVERY MILESTONES ====================

export const HUMAN_MILESTONES = [
  'First full night of sleep',
  'No fever for 24 hours',
  'First day without symptoms',
  'Returned to work/school',
  'Full activity restored',
  'Completed medication course',
  'No pain for 24 hours',
  'Full range of motion restored',
  'Able to walk without assistance',
  'First meal kept down',
  'Energy levels back to normal',
  'Appetite fully restored',
] as const

// ==================== PET RECOVERY MILESTONES ====================

export const PET_MILESTONES = [
  'First meal eaten',
  'Playing normally',
  'Using injured limb',
  'Normal energy level',
  'Grooming self again',
  'Using litter box normally',
  'Stopped vomiting',
  'Normal bowel movements',
  'Drinking normal amounts',
  'Tail wagging/purring',
  'Responding to commands',
  'Sleeping through the night',
  'No limping observed',
  'Full activity restored',
] as const

// ==================== COMMON ILLNESSES (HUMAN) ====================

export const COMMON_HUMAN_ILLNESSES = [
  'Common cold',
  'Flu (Influenza)',
  'COVID-19',
  'Strep throat',
  'Sinus infection',
  'Ear infection',
  'Bronchitis',
  'Pneumonia',
  'Stomach flu (Gastroenteritis)',
  'Food poisoning',
  'Migraine',
  'Allergic reaction',
  'Urinary tract infection (UTI)',
] as const

// ==================== COMMON ILLNESSES (PET) ====================

export const COMMON_PET_ILLNESSES = [
  'Kennel cough',
  'Upper respiratory infection',
  'Urinary tract infection (UTI)',
  'Ear infection',
  'Skin infection',
  'Gastroenteritis',
  'Pancreatitis',
  'Intestinal parasites',
  'Allergic reaction',
  'Flea infestation',
  'Hot spot',
  'Eye infection',
] as const

// ==================== COMMON INJURIES (HUMAN) ====================

export const COMMON_HUMAN_INJURIES = [
  'Sprained ankle',
  'Sprained wrist',
  'Pulled muscle',
  'Torn ligament',
  'Fracture',
  'Concussion',
  'Cut/laceration',
  'Burn',
  'Bruise/contusion',
  'Back strain',
  'Dislocated joint',
] as const

// ==================== COMMON INJURIES (PET) ====================

export const COMMON_PET_INJURIES = [
  'ACL tear',
  'Broken bone',
  'Sprained leg',
  'Cut/laceration',
  'Bite wound',
  'Broken tooth',
  'Torn nail',
  'Eye injury',
  'Snake bite',
  'Insect sting',
  'Heat stroke',
  'Poisoning',
] as const

// ==================== HELPER FUNCTIONS ====================

/**
 * Get symptom library based on patient type
 */
export function getSymptomLibrary(patientType: 'human' | 'pet'): readonly string[] {
  return patientType === 'pet' ? PET_SYMPTOMS : HUMAN_SYMPTOMS
}

/**
 * Get milestone library based on patient type
 */
export function getMilestoneLibrary(patientType: 'human' | 'pet'): readonly string[] {
  return patientType === 'pet' ? PET_MILESTONES : HUMAN_MILESTONES
}

/**
 * Get common illnesses based on patient type
 */
export function getCommonIllnesses(patientType: 'human' | 'pet'): readonly string[] {
  return patientType === 'pet' ? COMMON_PET_ILLNESSES : COMMON_HUMAN_ILLNESSES
}

/**
 * Get common injuries based on patient type
 */
export function getCommonInjuries(patientType: 'human' | 'pet'): readonly string[] {
  return patientType === 'pet' ? COMMON_PET_INJURIES : COMMON_HUMAN_INJURIES
}

/**
 * Get appropriate treatment type label based on patient type
 */
export function getTreatmentTypeLabel(
  treatmentType: string,
  patientType: 'human' | 'pet'
): string {
  const labels: Record<string, { human: string; pet: string }> = {
    doctor_visit: { human: 'Doctor Visit', pet: 'Vet Visit' },
    vet_visit: { human: 'Doctor Visit', pet: 'Vet Visit' },
    medication: { human: 'Medication', pet: 'Medication' },
    therapy: { human: 'Physical Therapy', pet: 'Rehabilitation' },
    rest: { human: 'Rest', pet: 'Restricted Activity' },
    diet_change: { human: 'Diet Change', pet: 'Diet Change' },
  }

  const label = labels[treatmentType]
  return label ? label[patientType] : treatmentType
}

/**
 * Get status label with emoji
 */
export function getStatusLabel(status: string): { label: string; emoji: string; color: string } {
  const statusMap: Record<
    string,
    { label: string; emoji: string; color: string }
  > = {
    onset: { label: 'Onset', emoji: '⚠️', color: 'yellow' },
    active: { label: 'Active', emoji: '🤒', color: 'orange' },
    improving: { label: 'Improving', emoji: '📈', color: 'blue' },
    recovered: { label: 'Recovered', emoji: '✅', color: 'green' },
    worsened: { label: 'Worsened', emoji: '⚠️', color: 'red' },
  }

  return statusMap[status] || { label: status, emoji: '❓', color: 'gray' }
}

/**
 * Get severity label with emoji
 */
export function getSeverityLabel(severity: 1 | 2 | 3 | 4 | 5): { label: string; emoji: string } {
  const severityMap: Record<number, { label: string; emoji: string }> = {
    1: { label: 'Mild', emoji: '😊' },
    2: { label: 'Moderate', emoji: '😐' },
    3: { label: 'Uncomfortable', emoji: '😟' },
    4: { label: 'Severe', emoji: '😢' },
    5: { label: 'Critical', emoji: '😭' },
  }

  return severityMap[severity] || { label: 'Unknown', emoji: '❓' }
}
