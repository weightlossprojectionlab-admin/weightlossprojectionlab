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
import type { MemberHealthProfile, ItemHealthProfile, Nutrient } from './health-demand'

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
 * `allergenTags` always maps. Nutrients map from the per-serving `item.nutrients`
 * panel (lib/nutrition-extract), BUT only under the harm-anchor guard below:
 * the panel must carry the HARMFUL anchors (sodium, total sugar, saturated fat)
 * before any nutrient is attached. Otherwise a partial panel of only-beneficial
 * fields (fiber/protein) would reward an item without ever penalizing it —
 * breaking the harm/benefit balance. Missing panel → D stays correctly inert.
 *
 * `sugars` (total) stands in for the engine's `addedSugar` — the best proxy OFF
 * provides; slightly over-penalizes naturally-sweet whole foods (documented).
 */
export function toItemHealthProfile(item: ShoppingItem): ItemHealthProfile {
  const profile: ItemHealthProfile = {
    allergenTags: item.allergenTags ?? [],
  }

  const n = item.nutrients
  if (n && n.sodium != null && n.sugars != null && n.saturatedFat != null) {
    const nutrients: Partial<Record<Nutrient, number>> = {
      sodium: n.sodium,
      addedSugar: n.sugars, // total-sugar proxy
      saturatedFat: n.saturatedFat,
    }
    if (n.transFat != null) nutrients.transFat = n.transFat
    if (n.fiber != null) nutrients.fiber = n.fiber
    if (n.protein != null) nutrients.protein = n.protein
    if (n.potassium != null) nutrients.potassium = n.potassium
    if (n.calories != null) nutrients.calorieDensity = n.calories
    profile.nutrients = nutrients
  }

  return profile
}
