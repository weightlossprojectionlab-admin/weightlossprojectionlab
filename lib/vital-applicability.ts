/**
 * Vital Applicability — life-stage and species awareness
 *
 * Single source of truth for "which vital types make sense for this patient".
 * Used by /profile (to gate which vitals can be enabled as reminders) and any
 * other surface that lists vital options for a patient.
 *
 * Composes existing helpers rather than restating the rules:
 *   - getHumanLifeStage() in lib/life-stage-utils.ts (newborn/infant/toddler/...)
 *   - getPetVitals(species) in lib/pet-health-config.ts (species → VitalType[])
 *
 * Falls back to the full adult set when life-stage data is missing so a
 * partially-onboarded patient never has *zero* options.
 */

import type { PatientProfile, VitalType } from '@/types/medical'
import { getHumanLifeStage } from '@/lib/life-stage-utils'
import { getPetVitals } from '@/lib/pet-health-config'

// Life-stage → applicable vital types. Order is stable and used as a display
// order in the UI (don't sort alphabetically — it puts "blood_*" first which
// is medically alarming for an infant).
const VITALS_BY_LIFE_STAGE: Record<string, VitalType[]> = {
  newborn: [
    'weight',
    'temperature',
    'newborn_heart_rate',
    'newborn_respiratory_rate',
    'newborn_oxygen_saturation',
    'newborn_diaper_output',
    'newborn_blood_glucose',
    'newborn_bilirubin',
    'newborn_head_circumference',
    'newborn_fontanelle',
  ],
  infant: [
    'weight',
    'temperature',
    'newborn_heart_rate',
    'newborn_respiratory_rate',
    'newborn_oxygen_saturation',
    'newborn_diaper_output',
    'newborn_head_circumference',
  ],
  toddler: ['weight', 'temperature', 'mood'],
  child: ['weight', 'temperature', 'mood', 'pulse_oximeter'],
  teen: ['weight', 'temperature', 'mood', 'pulse_oximeter', 'blood_pressure'],
  adult: ['blood_pressure', 'blood_sugar', 'temperature', 'pulse_oximeter', 'weight', 'mood'],
  senior: ['blood_pressure', 'blood_sugar', 'temperature', 'pulse_oximeter', 'weight', 'mood'],
}

const ADULT_FALLBACK: VitalType[] = VITALS_BY_LIFE_STAGE.adult

/**
 * Return the vital types that are clinically applicable for a given patient.
 *
 * Rules:
 *  - Pets: delegate to species-specific config (getPetVitals).
 *  - Humans with a known dateOfBirth: filter by life stage.
 *  - Humans without dateOfBirth: assume adult (so partially-onboarded users
 *    aren't presented with an empty reminder list).
 */
export function getApplicableVitalTypes(patient: Pick<PatientProfile, 'type' | 'species' | 'dateOfBirth'>): VitalType[] {
  if (patient?.type === 'pet') {
    return getPetVitals(patient.species)
  }

  if (!patient?.dateOfBirth) {
    return ADULT_FALLBACK
  }

  const { stage } = getHumanLifeStage(patient.dateOfBirth)
  return VITALS_BY_LIFE_STAGE[stage] ?? ADULT_FALLBACK
}
