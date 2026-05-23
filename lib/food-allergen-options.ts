/**
 * FDA "Big 9" food allergens — the canonical user-facing vocabulary.
 *
 * Single source of truth for any UI that asks "what are you allergic
 * to?" — patient-detail editor, family-member onboarding wizard,
 * user profile, etc. Keeps the list consistent across surfaces so a
 * value chosen in one place renders identically in the others.
 *
 * The stored value (e.g. "Milk", "Peanuts") flows into
 * `PatientProfile.foodAllergies: string[]` and is consumed at
 * meal-time by `findAllergenOverlap` in `lib/allergen-cross-check.ts`
 * — that helper handles canonical normalization (milk → dairy,
 * peanuts/tree-nuts → nuts, wheat → gluten, etc.) so the stored
 * label here doesn't need to match the canonical AllergyTag form.
 *
 * Add new entries when users surface allergens we missed; the alias
 * map in `allergen-cross-check.ts` should already collapse most
 * variants onto a canonical key.
 */

export type FoodAllergenOption = { value: string; label: string }

export const FOOD_ALLERGEN_OPTIONS: FoodAllergenOption[] = [
  { value: 'Milk', label: 'Milk / dairy' },
  { value: 'Eggs', label: 'Eggs' },
  { value: 'Fish', label: 'Fish' },
  { value: 'Shellfish', label: 'Shellfish' },
  { value: 'Tree nuts', label: 'Tree nuts' },
  { value: 'Peanuts', label: 'Peanuts' },
  { value: 'Wheat', label: 'Wheat / gluten' },
  { value: 'Soy', label: 'Soy' },
  { value: 'Sesame', label: 'Sesame' },
]
