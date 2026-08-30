/**
 * Condition → Dietary Rules — canonical condition vocabulary (single source)
 *
 * WHY THIS EXISTS
 * ---------------
 * A patient's conditions are stored as free-text label strings on
 * `PatientProfile.healthConditions` (e.g. `'Diabetes'`, `'Kidney Disease'`).
 * But three different capture UIs and two downstream engines each invented
 * their own spelling of the same conditions:
 *
 *   - Family/patient UIs store Title-case labels:  'Diabetes', 'Kidney Disease'
 *   - Tenant intake stores parenthetical variants:  'Diabetes (Type 2)'
 *   - The questionnaire library keys on kebab-case:  'type-2-diabetes', 'kidney-disease-ckd'
 *   - `medical-recipe-engine` switched on yet another: 'diabetes-type-2'
 *   - `portion-recommendation` capped on yet another:  'diabetes', 'ckd', 'renal'
 *
 * Result: the stored `'Diabetes'` matched NONE of the consumer vocabularies,
 * so the medical-recipe-engine condition switch AND the portion-size caps were
 * both dead code for every real patient. This module is the ONE place that
 * decides "what dietarily-relevant conditions does this patient have," so every
 * downstream engine reads the same normalized set.
 *
 * SCOPE: only conditions with a dietary consequence the platform can act on.
 * Asthma, arthritis, thyroid, depression, etc. are real conditions but carry no
 * recipe/portion rule here, so they normalize to `null` (excluded) rather than
 * being forced into a bucket.
 */

/**
 * Canonical, dietarily-relevant condition keys. These are the only conditions
 * that carry a nutrition rule in the recipe/portion engines. Keep this union in
 * sync with the `switch` in `medical-recipe-engine.buildMedicalConstraints` —
 * it is exhaustively matched there, so adding a member is a compile-time prompt
 * to give it a rule.
 */
export type DietaryCondition =
  | 'ckd'
  | 'diabetes'
  | 'hypertension'
  | 'heart-disease'
  | 'high-cholesterol'
  | 'cancer-treatment'

/**
 * Keyword matchers, most-specific first. Matching is substring-on-lowercase
 * (the same robust approach `inferConstraintsFromMedication` already uses),
 * so it absorbs every stored vocabulary — Title-case labels, parenthetical
 * variants, and both kebab-case key sets — without an exhaustive alias list.
 */
const CONDITION_MATCHERS: ReadonlyArray<{
  canonical: DietaryCondition
  keywords: readonly string[]
}> = [
  // CKD before anything else — 'renal'/'kidney' are unambiguous.
  { canonical: 'ckd', keywords: ['kidney', 'ckd', 'renal', 'nephro', 'dialysis'] },
  { canonical: 'diabetes', keywords: ['diabet', 'glycemi', 'a1c'] },
  // Cholesterol before heart/hypertension: 'high cholesterol' is its own rule.
  { canonical: 'high-cholesterol', keywords: ['cholesterol', 'hyperlipid', 'ldl', 'dyslipid'] },
  { canonical: 'heart-disease', keywords: ['heart', 'cardiac', 'coronary', 'chf', 'congestive'] },
  { canonical: 'hypertension', keywords: ['hypertension', 'blood pressure', 'high bp'] },
  { canonical: 'cancer-treatment', keywords: ['cancer', 'oncolog', 'chemo', 'tumor', 'malignan'] },
]

/**
 * Normalize a single raw condition string to its canonical key, or `null` when
 * the condition carries no dietary rule we act on.
 */
export function normalizeCondition(raw: string): DietaryCondition | null {
  if (!raw) return null
  const c = raw.toLowerCase()
  for (const { canonical, keywords } of CONDITION_MATCHERS) {
    if (keywords.some((k) => c.includes(k))) return canonical
  }
  return null
}

/**
 * Normalize a patient's `healthConditions` array to the deduped set of
 * canonical, dietarily-relevant conditions. Unrecognized/non-dietary entries
 * are dropped. Order follows first appearance in the input.
 */
export function normalizeConditions(raw: string[] | undefined | null): DietaryCondition[] {
  if (!raw?.length) return []
  const seen = new Set<DietaryCondition>()
  const out: DietaryCondition[] = []
  for (const entry of raw) {
    const canonical = normalizeCondition(entry)
    if (canonical && !seen.has(canonical)) {
      seen.add(canonical)
      out.push(canonical)
    }
  }
  return out
}
