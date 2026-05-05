/**
 * Portion recommendation engine — pure helper.
 *
 * Computes a recommended servings count for a given recipe + family-
 * member profile + meal slot. Honors medical constraints first
 * (carb cap for diabetes, sodium/protein caps for renal disease,
 * etc.), falls back to calorie-budget math.
 *
 * Pure function. No side effects, no hooks, no I/O. Safe to use in
 * render code, in cooking-session plating guidance, and in unit
 * tests. Reused across /log-meal and /cooking; deliberately
 * decoupled from React.
 *
 * Returns the count along with the limiting factor that drove it
 * (so the UI can caption "Recommended: 1 serving (carb-capped for
 * diabetes)") and any soft warnings worth surfacing under the
 * stepper ("Exceeds protein target by 50%").
 */

import type { MealSuggestion, MealType } from './meal-suggestions'
import type { PatientProfile } from '@/types/medical'

export type PortionLimitingFactor =
  | 'calories'
  | 'carbs'
  | 'sodium'
  | 'protein'
  | 'default'

export interface PortionRecommendation {
  /** Servings count rounded to nearest 0.5. Always ≥ 0.5. */
  recommended: number
  /** Which constraint drove the recommendation. */
  reason: PortionLimitingFactor
  /**
   * Soft warnings worth showing to the user. Doesn't block; the
   * caller decides whether to surface them and how prominently.
   */
  warnings: string[]
}

/**
 * Default per-meal calorie budget when the profile has no explicit
 * macroTargetsPerMeal override. Splits a 1800-kcal/day target into
 * ~30/30/40 across breakfast/lunch/dinner with snacks at 10%.
 */
const DEFAULT_MEAL_CALORIE_FRACTION: Record<MealType, number> = {
  breakfast: 0.3,
  lunch: 0.3,
  dinner: 0.4,
  snack: 0.1,
}

const DEFAULT_DAILY_CALORIE_TARGET = 1800

/**
 * Hard caps by medical condition. Conservative defaults — these
 * are not personalized clinical guidance, just safety guardrails
 * for the recommendation. Real clinical caps come from the
 * patient's `medicalConditions[].caps` field once that schema is
 * populated (Commit B of the family-meal PRD); until then we use
 * these condition-name lookups against `healthConditions: string[]`.
 */
const CONDITION_CAPS: Record<
  string,
  { carbsG?: number; sodiumMg?: number; proteinG?: number }
> = {
  diabetes: { carbsG: 60 }, // per meal — ADA general guidance
  'type-2-diabetes': { carbsG: 60 },
  'type-1-diabetes': { carbsG: 60 },
  renal: { sodiumMg: 600, proteinG: 25 },
  'chronic-kidney-disease': { sodiumMg: 600, proteinG: 25 },
  hypertension: { sodiumMg: 600 },
  ckd: { sodiumMg: 600, proteinG: 25 },
}

/**
 * Round to nearest 0.5 with a floor of 0.5 servings — kids /
 * portion-sensitive eaters often want half-servings, but zero
 * doesn't make sense from a "what should I eat" recommender.
 */
function roundToHalf(n: number): number {
  return Math.max(0.5, Math.round(n * 2) / 2)
}

/**
 * Pick the per-meal calorie target for this profile. Respects
 * future macroTargetsPerMeal overrides (Commit B), falls back to
 * a fraction of the daily target derived from the goals object,
 * falls back further to a 1800-kcal default.
 */
function getMealCalorieTarget(profile: PatientProfile, mealType: MealType): number {
  const perMeal = (profile as { macroTargetsPerMeal?: Record<MealType, { calories?: number }> })
    .macroTargetsPerMeal
  const explicit = perMeal?.[mealType]?.calories
  if (typeof explicit === 'number' && explicit > 0) {
    return explicit
  }

  const daily = profile.goals?.dailyCalorieGoal ?? DEFAULT_DAILY_CALORIE_TARGET
  return Math.round(daily * DEFAULT_MEAL_CALORIE_FRACTION[mealType])
}

/**
 * Compute the recommended servings count for `profile` eating
 * `recipe` at `mealType`. See module docstring for details.
 */
export function computeRecommendedServings(
  recipe: MealSuggestion,
  profile: PatientProfile,
  mealType: MealType
): PortionRecommendation {
  const warnings: string[] = []

  // Per-serving recipe macros — guard against zeros so we don't
  // divide by zero on under-curated recipes. Sodium is a real
  // first-class field on MealSuggestion.macros (mg) — no cast.
  const perServingCals = Math.max(1, recipe.calories ?? 0)
  const perServingCarbs = recipe.macros?.carbs ?? 0
  const perServingProtein = recipe.macros?.protein ?? 0
  const perServingSodium = recipe.macros?.sodium ?? 0

  // 1) Calorie-budget servings — the default.
  const calorieTarget = getMealCalorieTarget(profile, mealType)
  const calorieServings = calorieTarget / perServingCals

  // 2) Apply medical-condition caps when present. Each condition
  //    yields a candidate cap; the smallest cap wins.
  const conditions = (profile.healthConditions ?? []).map((c) => c.toLowerCase())
  let cappedServings = calorieServings
  let limitingFactor: PortionLimitingFactor = 'calories'

  for (const cond of conditions) {
    const caps = CONDITION_CAPS[cond]
    if (!caps) continue
    if (caps.carbsG !== undefined && perServingCarbs > 0) {
      const carbServings = caps.carbsG / perServingCarbs
      if (carbServings < cappedServings) {
        cappedServings = carbServings
        limitingFactor = 'carbs'
      }
    }
    if (caps.sodiumMg !== undefined && perServingSodium > 0) {
      const naServings = caps.sodiumMg / perServingSodium
      if (naServings < cappedServings) {
        cappedServings = naServings
        limitingFactor = 'sodium'
      }
    }
    if (caps.proteinG !== undefined && perServingProtein > 0) {
      const protServings = caps.proteinG / perServingProtein
      if (protServings < cappedServings) {
        cappedServings = protServings
        limitingFactor = 'protein'
      }
    }
  }

  const recommended = roundToHalf(cappedServings)

  // 3) Soft warnings — surface notable overshoots even when the
  //    cap didn't bind. Useful for "no condition flagged but this
  //    meal is heavy on protein" hints.
  if (perServingProtein > 0 && perServingProtein * recommended > 60) {
    warnings.push(
      `Protein per serving (${perServingProtein}g) is high — adjust if needed.`
    )
  }
  if (perServingSodium > 0 && perServingSodium * recommended > 800) {
    warnings.push(
      `Sodium per serving (${perServingSodium}mg) is high — adjust if needed.`
    )
  }

  // No conditions hit and calorie math gave the default — flag as
  // 'default' rather than 'calories' so callers can render a
  // simpler caption ("1 serving").
  const reason: PortionLimitingFactor =
    limitingFactor === 'calories' && conditions.length === 0 && recommended === 1
      ? 'default'
      : limitingFactor

  return { recommended, reason, warnings }
}
