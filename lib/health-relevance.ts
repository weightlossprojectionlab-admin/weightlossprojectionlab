/**
 * Caregiver-facing "why" for the inventory demand weight D. Turns the engine's
 * per-nutrient contributions (lib/health-demand.memberNutrientContributions)
 * into a plain-language note tied to a household member —
 * "High in sugar — best to limit for Dad".
 *
 * This is the ONLY place the health-note wording lives, so every surface (the
 * inventory list card, the item-details card, any future view) reads ONE voice
 * (DRY). Pure + isomorphic; member-name resolution is INJECTED so this module
 * stays free of UI / Firestore deps.
 *
 * Scope: the softer condition/diet nudge. A hard allergen is a separate, stronger
 * signal handled by the `unsafeFor` banner — NOT duplicated here.
 *
 * Voice: practitioner/caregiver, 7th-grade reading level (feedback_marketing_voice,
 * feedback_reading_level). No engine jargon ("D", "deprioritized") ever reaches a user.
 */

import {
  memberNutrientContributions,
  DEFAULT_HEALTH_DEMAND_CONFIG,
  type Nutrient,
  type ItemHealthProfile,
  type MemberHealthProfile,
  type HealthDemandConfig,
} from './health-demand'

/** Plain words for the nutrients D scores on. */
const NUTRIENT_WORD: Record<Nutrient, string> = {
  sodium: 'sodium',
  addedSugar: 'sugar',
  saturatedFat: 'saturated fat',
  transFat: 'trans fat',
  fiber: 'fiber',
  potassium: 'potassium',
  protein: 'protein',
  calorieDensity: 'calories',
}

// Below this absolute contribution the nudge isn't worth surfacing (avoids noise
// from trace amounts). Tunable alongside the W matrix / ref_n calibration.
const NOTE_THRESHOLD = 0.12

export interface HealthNote {
  memberId: string
  tone: 'limit' | 'good'
  nutrient: Nutrient
  /** Caregiver-voice line, member name already resolved. */
  text: string
}

/**
 * One note per affected household member — the single dominant driving nutrient,
 * in caregiver voice. Empty array when nothing is significant, so the UI renders
 * nothing. `nameOf` resolves a member id to a display name (nickname-wins, etc.).
 */
export function householdHealthNotes(
  item: ItemHealthProfile,
  members: MemberHealthProfile[],
  nameOf: (memberId: string) => string,
  cfg: HealthDemandConfig = DEFAULT_HEALTH_DEMAND_CONFIG,
): HealthNote[] {
  const notes: HealthNote[] = []
  for (const m of members) {
    const contrib = memberNutrientContributions(item, m, cfg)
    // Dominant nutrient by absolute contribution.
    let top: { nutrient: Nutrient; value: number } | null = null
    for (const [k, v] of Object.entries(contrib) as [Nutrient, number][]) {
      if (top === null || Math.abs(v) > Math.abs(top.value)) top = { nutrient: k, value: v }
    }
    if (top === null || Math.abs(top.value) < NOTE_THRESHOLD) continue

    const tone: HealthNote['tone'] = top.value < 0 ? 'limit' : 'good'
    const name = nameOf(m.id) || 'them'
    const word = NUTRIENT_WORD[top.nutrient]
    const text =
      tone === 'limit'
        ? `High in ${word} — best to limit for ${name}`
        : `High in ${word} — good for ${name}`
    notes.push({ memberId: m.id, tone, nutrient: top.nutrient, text })
  }
  return notes
}
