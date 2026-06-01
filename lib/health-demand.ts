/**
 * Household health-demand weight `D` for the inventory Attention model.
 *
 * Computes how much an item helps or harms the household's actual health
 * profile, with the MOST VULNERABLE members weighted hardest and HARM penalized
 * harder than benefit (do-no-harm). Output is a bounded multiplier `D` that
 * drops into the Attention score: A = D · max(restock_u, spoil_u).
 *
 *   D = clamp( 1 + Σ_m κ_m · ( boostₘ + harmAsym(nutrientImpactₘ) ),  Dmin, Dmax )
 *
 * STATUS / CONTRACT: this is the pure LOGIC + the contract (`ItemHealthProfile`)
 * the item-enrichment pipeline must fill. It reads NOTHING off ShoppingItem
 * directly — the caller assembles an ItemHealthProfile from item fields +
 * product_database (allergens, the key nutrients, supply/staple classification).
 * Every attribute is optional: a missing one DROPS that term, so until items are
 * enriched the weight is a safe, neutral D = 1. See project_inventory_demand_weight.
 *
 * Config (W matrix, α's, ref_n, β, κ params) is injected as DATA so the
 * coefficients can be tuned/learned later without touching this logic
 * (feedback_rule_first_then_ml). Pure + isomorphic — no client/async deps.
 */

import { normalizeAllergen, type CanonicalAllergen } from './allergen-parser'

export type Nutrient =
  | 'sodium'
  | 'addedSugar'
  | 'saturatedFat'
  | 'transFat'
  | 'fiber'
  | 'potassium'
  | 'protein'
  | 'calorieDensity'

/** Free-form so new conditions don't require a code change (matches PatientProfile.healthConditions). */
export type HealthCondition = string

/** What the enrichment pipeline must produce per item. All optional → graceful. */
export interface ItemHealthProfile {
  /** Per-serving nutrient levels in natural units; missing = unknown (term skipped). */
  nutrients?: Partial<Record<Nutrient, number>>
  /** Structured allergen tags on the item, lower-cased (e.g. ['peanuts','gluten']). */
  allergenTags?: string[]
  /** Conditions this item is a medical SUPPLY for (e.g. diabetes test strips, insulin). */
  medicalSupplyFor?: HealthCondition[]
  /** Conditions this item is a flagged dietary STAPLE for (DASH / low-GI labeled). */
  conditionStapleFor?: HealthCondition[]
}

/** Reads straight off PatientProfile (healthConditions / foodAllergies / dietaryRestrictions / age). */
export interface MemberHealthProfile {
  id: string
  conditions: HealthCondition[]
  allergies: string[]
  dietaryRestrictions: string[]
  ageYears?: number
}

export interface HealthDemandConfig {
  /** Signed W(condition, nutrient) ∈ [-1,1]: negative aggravates, positive supports. */
  conditionNutrient: Record<HealthCondition, Partial<Record<Nutrient, number>>>
  /** ref_n: nutrient level treated as "1.0" for [0,1] normalization (per-category override later). */
  nutrientRef: Partial<Record<Nutrient, number>>
  alphaSupply: number // categorical boost for a matching medical supply
  alphaStaple: number // categorical boost for a matching condition staple
  beta: number // harm asymmetry (>1): harmful impacts weigh more than beneficial
  kappaConditionBoost: number // per chronic condition the member has
  kappaAgeVulnBoost: number // if age ≤12 or ≥65
  kappaCap: number
  dMin: number
  dMax: number
}

export const DEFAULT_HEALTH_DEMAND_CONFIG: HealthDemandConfig = {
  conditionNutrient: {
    hypertension: { sodium: -0.3, potassium: 0.15, saturatedFat: -0.1 },
    high_blood_pressure: { sodium: -0.3, potassium: 0.15, saturatedFat: -0.1 },
    diabetes: { addedSugar: -0.35, fiber: 0.2, protein: 0.1 },
    heart_disease: { transFat: -0.4, saturatedFat: -0.25, sodium: -0.2 },
    high_cholesterol: { transFat: -0.4, saturatedFat: -0.3, fiber: 0.2 },
  },
  nutrientRef: {
    sodium: 600, // mg/serving counted as "high"
    addedSugar: 20, // g
    saturatedFat: 8, // g
    transFat: 1, // g (any is bad)
    fiber: 6, // g counted as "high"
    potassium: 500, // mg
    protein: 20, // g
    calorieDensity: 400, // kcal/serving
  },
  alphaSupply: 0.6,
  alphaStaple: 0.3,
  beta: 1.5,
  kappaConditionBoost: 0.3,
  kappaAgeVulnBoost: 0.4,
  kappaCap: 2.0,
  dMin: 0.4,
  dMax: 2.0,
}

const lc = (s: string) => s.toLowerCase().trim()
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x))

/** Normalize a nutrient level to [0,1]; missing level/ref → null (term skipped). */
function normNutrient(level: number | undefined, ref: number | undefined): number | null {
  if (level == null || ref == null || ref <= 0) return null
  return clamp(level / ref, 0, 1)
}

function memberCriticality(m: MemberHealthProfile, cfg: HealthDemandConfig): number {
  let k = 1
  k += cfg.kappaConditionBoost * m.conditions.length
  if (m.ageYears != null && (m.ageYears <= 12 || m.ageYears >= 65)) k += cfg.kappaAgeVulnBoost
  return Math.min(k, cfg.kappaCap)
}

/**
 * Derive the canonical allergen(s) a "X-free" restriction forbids — from the
 * shared allergen vocabulary (normalizeAllergen), NOT a duplicated map. Only
 * "nut-free" needs an explicit case, since "nut" spans two canonical allergens.
 */
function restrictionToCanonical(restriction: string): CanonicalAllergen[] {
  const r = restriction.toLowerCase().trim()
  if (r === 'nut-free' || r === 'nut free') return ['tree_nut', 'peanut']
  const word = r.replace(/[-\s]?free$/, '').trim()
  const c = normalizeAllergen(word)
  return c ? [c] : []
}

/**
 * Hard avoid: a food allergy, or a "X-free" restriction whose canonical allergen
 * the item carries. Both sides run through normalizeAllergen, so an item tag
 * ('milk') and the member's free-form term ('dairy') speak ONE vocabulary —
 * the parser owns it (DRY).
 */
function isUnsafeFor(item: ItemHealthProfile, m: MemberHealthProfile): boolean {
  const itemTags = new Set(
    (item.allergenTags ?? [])
      .map((t) => normalizeAllergen(t))
      .filter((t): t is CanonicalAllergen => t !== null),
  )
  if (itemTags.size === 0) return false

  for (const a of m.allergies) {
    const c = normalizeAllergen(a)
    if (c && itemTags.has(c)) return true
  }
  for (const r of m.dietaryRestrictions) {
    if (restrictionToCanonical(r).some((c) => itemTags.has(c))) return true
  }
  return false
}

/** Signed nutrient impact s(i,m) = Σ_{c∈conditions} Σ_n W(c,n)·ν_n(i). */
function nutrientImpact(item: ItemHealthProfile, m: MemberHealthProfile, cfg: HealthDemandConfig): number {
  let s = 0
  for (const c of m.conditions) {
    const row = cfg.conditionNutrient[lc(c)] ?? cfg.conditionNutrient[c]
    if (!row) continue
    for (const key of Object.keys(row) as Nutrient[]) {
      const x = normNutrient(item.nutrients?.[key], cfg.nutrientRef[key])
      if (x === null) continue // missing data → skip (graceful)
      s += (row[key] as number) * x
    }
  }
  return s
}

export interface HouseholdAlignment {
  /** Net household alignment (positive = beneficial, negative = harmful). */
  align: number
  /** Member ids for whom the item is a hard avoid (allergen/restriction) — surfaced, never folded into D. */
  unsafeFor: string[]
  perMember: { id: string; criticality: number; categoricalBoost: number; nutrientImpact: number }[]
}

/**
 * Aggregate an item against every household member: vulnerability-weighted,
 * harm-asymmetric. Categorical boosts (medical supply / condition staple) add
 * linearly; nutrient impact is harm-asymmetric (negative ×β).
 */
export function calculateHouseholdAlignment(
  item: ItemHealthProfile,
  members: MemberHealthProfile[],
  cfg: HealthDemandConfig = DEFAULT_HEALTH_DEMAND_CONFIG,
): HouseholdAlignment {
  const unsafeFor: string[] = []
  const perMember: HouseholdAlignment['perMember'] = []
  let align = 0

  for (const m of members) {
    if (isUnsafeFor(item, m)) unsafeFor.push(m.id)

    const kappa = memberCriticality(m, cfg)

    let boost = 0
    if (item.medicalSupplyFor?.some((c) => m.conditions.map(lc).includes(lc(c)))) boost += cfg.alphaSupply
    if (item.conditionStapleFor?.some((c) => m.conditions.map(lc).includes(lc(c)))) boost += cfg.alphaStaple

    const s = nutrientImpact(item, m, cfg)
    const harmAdjusted = s >= 0 ? s : cfg.beta * s // harm weighs heavier

    align += kappa * (boost + harmAdjusted)
    perMember.push({ id: m.id, criticality: kappa, categoricalBoost: boost, nutrientImpact: s })
  }

  return { align, unsafeFor, perMember }
}

/**
 * The bounded demand multiplier D for the Attention model. Linear-then-clamp
 * keeps strong categorical boosts (a medical supply) from being squashed while
 * still bounding the weight. Neutral (1) when no signals/attributes are present.
 */
export function healthDemandWeight(
  item: ItemHealthProfile,
  members: MemberHealthProfile[],
  cfg: HealthDemandConfig = DEFAULT_HEALTH_DEMAND_CONFIG,
): { D: number; unsafeFor: string[] } {
  const { align, unsafeFor } = calculateHouseholdAlignment(item, members, cfg)
  return { D: clamp(1 + align, cfg.dMin, cfg.dMax), unsafeFor }
}
