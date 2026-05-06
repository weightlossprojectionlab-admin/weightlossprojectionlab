/**
 * Allergen pack/unpack utilities — pure, no server-side dependencies.
 *
 * Why this file exists separately from ingredient-allergen-classifier:
 * the classifier imports gemini-invocations → firebase-admin → child_process
 * (Node-only). When client components imported pack/unpack from the
 * classifier file, the bundler tried to ship firebase-admin to the
 * browser and the build failed with 'Module not found: Can't resolve
 * "child_process"'. Splitting these pure utilities into their own
 * file (with no server imports at the top of the module) lets client
 * code use them without dragging server deps along.
 *
 * Pair: server-only Gemini classification stays in
 * lib/ingredient-allergen-classifier.ts. That file re-exports these
 * utilities so existing server-route imports keep working.
 */

import type { AllergyTag } from './meal-suggestions'

export const ALLERGY_TAG_VALUES: AllergyTag[] = [
  'dairy', 'gluten', 'nuts', 'shellfish', 'soy', 'eggs', 'fish',
]

/**
 * Returns true when the cached `ingredientAllergens` array is missing
 * or out-of-sync with the current ingredient list (length mismatch).
 * Caller should re-classify.
 */
export function needsClassification(
  ingredients: string[] | undefined,
  ingredientAllergens: AllergyTag[][] | undefined,
): boolean {
  if (!ingredients?.length) return false
  if (!ingredientAllergens) return true
  return ingredientAllergens.length !== ingredients.length
}

/**
 * Firestore disallows nested arrays. Pack the per-ingredient allergen
 * list into an array of objects for persistence:
 *   [['gluten'], ['dairy'], []]
 *     ↓
 *   [{ tags: ['gluten'] }, { tags: ['dairy'] }, { tags: [] }]
 *
 * Pair with `unpackIngredientAllergens` on read.
 */
export interface IngredientAllergenEntry {
  tags: AllergyTag[]
}

export function packIngredientAllergens(
  tags: AllergyTag[][],
): IngredientAllergenEntry[] {
  return tags.map((t) => ({ tags: t }))
}

export function unpackIngredientAllergens(
  stored: unknown,
): AllergyTag[][] | undefined {
  if (!Array.isArray(stored)) return undefined
  return stored.map((entry) => {
    // Idempotent: tolerate already-unpacked input (entry is an array
    // of strings) so callers like RecipeModal can normalize defensively
    // even when an upstream read path didn't unwrap.
    if (Array.isArray(entry)) {
      return (entry as unknown[]).filter(
        (t): t is AllergyTag =>
          typeof t === 'string' && (ALLERGY_TAG_VALUES as string[]).includes(t),
      )
    }
    // Packed shape: entry is { tags: [...] } as persisted by
    // packIngredientAllergens.
    const tags = (entry as { tags?: unknown })?.tags
    if (!Array.isArray(tags)) return []
    return (tags as unknown[]).filter(
      (t): t is AllergyTag =>
        typeof t === 'string' && (ALLERGY_TAG_VALUES as string[]).includes(t),
    )
  })
}
