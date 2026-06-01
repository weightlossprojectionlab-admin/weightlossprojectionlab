/**
 * Adapter: session/DB shapes → the pure health-scoring inputs.
 *
 * Keeps the scoring engine (health-demand / inventoryAttentionScore) ignorant of
 * PatientProfile and ShoppingItem (Separation of Concerns) and gives every
 * inventory surface ONE place to assemble the AttentionContext. Pure +
 * isomorphic — no I/O, `now` injectable for deterministic tests.
 */

import type { PatientProfile } from '@/types/medical'
import type { ShoppingItem } from '@/types/shopping'
import type { MemberHealthProfile, ItemHealthProfile } from './health-demand'

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000

/** Whole years from an ISO date of birth; undefined if absent/unparseable/future. */
export function ageFromDateOfBirth(dob: string | undefined, now: number = Date.now()): number | undefined {
  if (!dob) return undefined
  const ms = new Date(dob).getTime()
  if (Number.isNaN(ms)) return undefined
  const years = Math.floor((now - ms) / YEAR_MS)
  return years >= 0 ? years : undefined
}

/** PatientProfile → the pure MemberHealthProfile the scorer consumes. */
export function toMemberHealthProfile(p: PatientProfile, now: number = Date.now()): MemberHealthProfile {
  return {
    id: p.id,
    conditions: p.healthConditions ?? [],
    allergies: p.foodAllergies ?? [],
    dietaryRestrictions: p.dietaryRestrictions ?? [],
    ageYears: ageFromDateOfBirth(p.dateOfBirth, now),
  }
}

export function toMemberHealthProfiles(patients: PatientProfile[], now: number = Date.now()): MemberHealthProfile[] {
  return patients.map((p) => toMemberHealthProfile(p, now))
}

/**
 * ShoppingItem → its health attributes for scoring.
 *
 * Only `allergenTags` is mapped today. Nutrients are deliberately NOT pulled
 * from `item.nutrition`: it carries the BENEFICIAL ones (fiber/protein) but not
 * the HARMFUL ones (sodium/added sugar/fats), so mapping the partial set would
 * reward an item without ever penalizing it — breaking the harm/benefit balance.
 * Nutrients (and supply/staple flags) fill in once the full enrichment lands;
 * until then the demand weight D stays correctly inert.
 */
export function toItemHealthProfile(item: ShoppingItem): ItemHealthProfile {
  return {
    allergenTags: item.allergenTags ?? [],
  }
}
