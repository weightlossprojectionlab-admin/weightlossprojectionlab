# WPL — project notes

Multi-tenant white-label home-care / wellness platform (Next.js / TypeScript / Firebase-Firestore /
Stripe / Capacitor). Full capability catalog + competitive teardown: `docs/PLATFORM_CAPABILITIES.md`.

## Single Source (concern → canonical origin)

| Concern | Canonical origin |
|---|---|
| Dietary-relevant medical conditions (vocabulary + normalizer) | `lib/condition-dietary-rules.ts` |
| Medical CRUD | `lib/medical-operations.ts` |
| Franchise plans / tiers / seat caps | `lib/franchise-plans.ts` |
| Tenant creation state machine | `lib/tenant-create.ts` |
| Consumer plan feature-gates | `lib/feature-gates.ts` (`PLAN_CAPS`) |
| Allergen tags (from OFF) | `lib/allergen-parser.ts` |

## Domain landmines (fail silently)

- **Condition vocabulary fracture** — `PatientProfile.healthConditions` is free-text (`'Diabetes'`,
  `'Kidney Disease'`); capture UIs, the questionnaire library, and the engines each spelled conditions
  differently, so the recipe engine + portion caps were dead for real data. Always resolve conditions
  through `normalizeConditions()` — never string-match raw labels.
- Three allergen vocabularies (recipe `AllergyTag` vs product `CanonicalAllergen` vs shopping map) —
  sesame unrepresentable recipe-side; not yet reconciled. Do NOT half-seed allergen gating.

## DOSI ledger

- **2026-08-30 — Wire conditions → recipe engine (I-flagship + S).** `medical-recipe-engine`
  `buildMedicalConstraints` ran on a hardcoded `conditions=[]` (stale "not in PatientProfile" TODO — it
  *is* on the profile), so the CKD/diabetes/cardiac/cancer safety switch never fired. Added
  `lib/condition-dietary-rules.ts` as the single canonical condition vocabulary + `normalizeConditions()`
  (keyword-on-lowercase, absorbs all four stored vocabularies), switched the engine onto it, and deduped
  `portion-recommendation.ts` `CONDITION_CAPS` (was its own ad-hoc lowercase key list) onto the same
  source. Both engines now fire for real stored labels. 29 tests assert every capture vocabulary → one
  canonical key + an end-to-end constraint/flag path.
  - *Deliberate exceptions (correct, not oversights):* (1) `constraints.allergens` still seeds `[]` —
    allergen gating fires at cook-time via `RecipeModal`, and the recipe/product/profile allergen
    vocabularies aren't reconciled yet; a half-mapped list would pass unsafe recipes. (2) Added a
    heart-disease sodium cap to `CONDITION_CAPS` for consistency with the recipe engine (which restricts
    sodium for cardiac); conservative (reduces portion), safe direction.

- **2026-08-30 — Finish the conditions story: precise limits + 3rd site (I + S).** Threaded
  `PatientProfile.conditionDetails` (per-condition questionnaire responses — CKD stage/GFR/sodium/potassium
  limits) from `/recipes` + `RecipeView` into the engine via new `flattenConditionResponses()` (in the same
  single source); the engine now applies the doctor's actual limits instead of conservative defaults. Typed
  `conditionDetails` onto `PatientProfile` (was written by the patient route but untyped — I-caveat). Folded
  the third dead condition site, `app/api/shopping/suggestions/route.ts` (was exact `.includes('diabetes')`,
  never matched stored `'Diabetes'`), onto `normalizeConditions` for the nutrient conditions; kept celiac as
  its own `/celiac|gluten/i` check rather than forcing a gluten concern into `DietaryCondition` (S-caveat:
  don't build the wrong abstraction). +3 unit tests (flatten + precise-limit override); e2e regression green.
</content>
