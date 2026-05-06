/**
 * lib/eater-eligibility.ts
 *
 * Compliance gate: who can be the ACTOR on an action surface in
 * the platform. User-flagged on 2026-05-05 as a HIPAA / health-data
 * compliance concern. Captured in
 * project_eater_eligibility_age_gate.md.
 *
 * The rule:
 *   Children under 16 (computed from dateOfBirth) AND pets
 *   (type === 'pet') CANNOT be the actor on any user-action
 *   surface. They appear in the family roster, get tracked, and
 *   have caregivers act on their behalf — but they cannot
 *   OPERATE the app to take an action themselves.
 *
 * Surfaces this gates:
 *   - AccountSwitcher / subaccount selection — ineligible entries
 *     are filtered or visibly disabled
 *   - Self-action surfaces (vitals self-entry, /log-meal as self,
 *     shopping-mode "Start Shopping", journal entry, etc.)
 *
 * What this does NOT gate:
 *   - Family roster display (kids and pets still appear with
 *     their cards)
 *   - Caregiver-acting-for paths (caregiver picks the kid as the
 *     patient and logs FOR them — kid is the eaterId, caregiver
 *     is the actor)
 *   - Read-only data displays (kids' meal history is still
 *     visible to caregivers)
 *
 * Edge cases:
 *   - Missing dateOfBirth: treat as eligible (don't block on
 *     missing data; caregiver should fill DOB during intake)
 *   - Birthday today (turning 16): eligible from the day of
 */

import type { PatientProfile } from '@/types/medical'

export type EaterIneligibilityReason = 'under-age' | 'non-human'

export interface EaterEligibility {
  canBeActor: boolean
  reason?: EaterIneligibilityReason
  /** Human-readable explanation for UI display. */
  message?: string
}

/**
 * The minimum age (in years) a human family member must reach to
 * be the actor on an action surface. Set to 16 per the user's
 * guidance — covers state-by-state minor consent regulations and
 * the GDPR-K upper bound (most member states set digital consent
 * age at 13-16; 16 is the conservative ceiling).
 */
const MIN_ACTOR_AGE_YEARS = 16

/**
 * Compute eater age in whole years from an ISO date string.
 * Returns null when DOB is missing or invalid.
 */
function computeAgeInYears(dob: string | undefined): number | null {
  if (!dob) return null
  const d = new Date(dob)
  if (isNaN(d.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  // Subtract one if the birthday this year hasn't happened yet
  const monthDiff = now.getMonth() - d.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < d.getDate())) {
    age--
  }
  return age
}

/**
 * Determine whether a given patient is eligible to be the ACTOR on
 * an action surface (i.e., to operate the app on their own behalf).
 *
 * Pets are never eligible (different domain — caregivers act for
 * them). Humans under 16 are not eligible (HIPAA / state-law minor
 * consent + parental authorization). Humans 16+ are eligible by
 * default; missing DOB defaults to eligible (don't block on
 * missing data).
 */
export function getEaterEligibility(
  patient: Pick<PatientProfile, 'type' | 'dateOfBirth'> & {
    dateOfBirth?: string
  },
): EaterEligibility {
  if (patient.type === 'pet') {
    return {
      canBeActor: false,
      reason: 'non-human',
      message: 'Pet care is logged by a family caregiver.',
    }
  }
  const age = computeAgeInYears(patient.dateOfBirth)
  if (age !== null && age < MIN_ACTOR_AGE_YEARS) {
    return {
      canBeActor: false,
      reason: 'under-age',
      message: `Under ${MIN_ACTOR_AGE_YEARS} — actions are recorded by a caregiver.`,
    }
  }
  return { canBeActor: true }
}

/**
 * Convenience: filter a patient roster down to actor-eligible
 * members. Useful for AccountSwitcher / similar pickers.
 */
export function filterActorEligible<
  T extends Pick<PatientProfile, 'type' | 'dateOfBirth'> & {
    dateOfBirth?: string
  },
>(patients: T[]): T[] {
  return patients.filter((p) => getEaterEligibility(p).canBeActor)
}
