/**
 * Allergen cross-check — detects overlap between a recipe's
 * allergen tags and an eater's foodAllergies list.
 *
 * Pure function. Used at "Cook Now" pre-flight in RecipeModal,
 * and in the family-meal multi-eater log path (Commit B). Liberal
 * matching is the right default — false positives nudge the user
 * to confirm; false negatives expose them to a real allergen.
 *
 * Two normalization layers:
 *   1. Lowercase + trim + simple plural strip on both sides.
 *   2. Alias map collapses common synonyms onto a canonical
 *      key. "milk" → "dairy", "peanuts" / "tree nuts" → "nuts",
 *      "wheat" → "gluten", etc. The map favors safety: we'd
 *      rather warn on "wheat" when the recipe says "gluten" than
 *      miss it because the words don't match literally.
 *
 * Output is the list of *recipe* allergen tags that triggered the
 * overlap (plus the user term that matched, for display). Caller
 * decides whether to gate the Cook Now button or just surface a
 * warning.
 */

import type { AllergyTag } from './meal-suggestions'

/**
 * Synonym map: user-facing allergen term → canonical key. The
 * canonical keys align with AllergyTag where possible so a recipe
 * tag can be compared directly against a user's allergy.
 *
 * Entries are written lower-case singular; the normalizer strips
 * trailing 's' so "peanuts" and "peanut" both hit the same key.
 *
 * Add new entries when users surface allergens we missed — e.g.,
 * sesame is FDA Big 9 but isn't in AllergyTag yet.
 */
const ALLERGEN_ALIASES: Record<string, string> = {
  // Dairy / milk family
  milk: 'dairy',
  dairy: 'dairy',
  cheese: 'dairy',
  butter: 'dairy',
  cream: 'dairy',
  yogurt: 'dairy',
  whey: 'dairy',
  casein: 'dairy',
  lactose: 'dairy',

  // Tree nuts + peanuts collapse to 'nuts' since recipes tag
  // both under one banner. Distinct medical sensitivities should
  // surface via the user's specific term in the warning.
  nut: 'nuts',
  nuts: 'nuts',
  peanut: 'nuts',
  'tree nut': 'nuts',
  almond: 'nuts',
  cashew: 'nuts',
  walnut: 'nuts',
  pecan: 'nuts',
  hazelnut: 'nuts',
  pistachio: 'nuts',
  'macadamia nut': 'nuts',
  'brazil nut': 'nuts',

  // Gluten / wheat
  wheat: 'gluten',
  gluten: 'gluten',
  barley: 'gluten',
  rye: 'gluten',

  // Soy
  soy: 'soy',
  soya: 'soy',
  soybean: 'soy',
  edamame: 'soy',
  tofu: 'soy',

  // Eggs
  egg: 'eggs',
  eggs: 'eggs',

  // Shellfish
  shellfish: 'shellfish',
  shrimp: 'shellfish',
  prawn: 'shellfish',
  lobster: 'shellfish',
  crab: 'shellfish',
  crayfish: 'shellfish',
  oyster: 'shellfish',
  clam: 'shellfish',
  mussel: 'shellfish',
  scallop: 'shellfish',

  // Fish (distinct from shellfish in clinical terms)
  fish: 'fish',
  salmon: 'fish',
  tuna: 'fish',
  cod: 'fish',
  trout: 'fish',
  tilapia: 'fish',
  bass: 'fish',
  anchovy: 'fish',
  sardine: 'fish',
}

/**
 * Normalize a free-text allergen term to its canonical key.
 * Lowercase, trim, strip trailing 's' for simple pluralization,
 * then alias-map. Returns the input lowercased when no alias hit
 * — preserves user-supplied terms we don't know about so they
 * can still match identical recipe-side terms.
 */
function normalizeAllergen(term: string): string {
  const cleaned = term.toLowerCase().trim()
  if (!cleaned) return ''
  // Try the input verbatim, then with trailing 's' stripped.
  if (ALLERGEN_ALIASES[cleaned]) return ALLERGEN_ALIASES[cleaned]
  const singular = cleaned.endsWith('s') ? cleaned.slice(0, -1) : cleaned
  if (ALLERGEN_ALIASES[singular]) return ALLERGEN_ALIASES[singular]
  return cleaned
}

export interface AllergenMatch {
  /** The recipe-side AllergyTag that triggered the overlap. */
  recipeTag: AllergyTag
  /** The user-supplied term that matched (for display). */
  userTerm: string
}

/**
 * Find the set of allergen overlaps between a recipe's allergens
 * and an eater's foodAllergies. Empty array means safe; non-empty
 * means the caller should warn / gate.
 */
export function findAllergenOverlap(
  recipeAllergens: AllergyTag[] | undefined,
  eaterAllergies: string[] | undefined
): AllergenMatch[] {
  if (!recipeAllergens?.length || !eaterAllergies?.length) {
    return []
  }

  // Build a map of canonical-key → user-supplied-term so we can
  // surface the user's exact word in the warning ("you flagged
  // 'milk'") rather than the recipe's tag ("dairy").
  const eaterByKey = new Map<string, string>()
  for (const term of eaterAllergies) {
    const key = normalizeAllergen(term)
    if (key && !eaterByKey.has(key)) {
      eaterByKey.set(key, term)
    }
  }

  const matches: AllergenMatch[] = []
  for (const recipeTag of recipeAllergens) {
    const recipeKey = normalizeAllergen(recipeTag)
    const userTerm = eaterByKey.get(recipeKey)
    if (userTerm) {
      matches.push({ recipeTag, userTerm })
    }
  }
  return matches
}
