# WPL — project notes

Multi-tenant white-label home-care / wellness platform (Next.js / TypeScript / Firebase-Firestore /
Stripe / Capacitor). Full capability catalog + competitive teardown: `docs/PLATFORM_CAPABILITIES.md`.

## DOSI Code Standard

Four pillars — each with the caveat that keeps it from biting when taken literally.

- **DRY** — Centralize domain logic and validation into shared utilities and custom hooks; build
  composable UI shells over copy-paste blocks.
  - *Caveat (rule-of-three):* Tolerate duplication over a premature or incorrect abstraction — extract
    only after a pattern repeats a third time.
- **Optimize** — Target re-renders by narrowing state and context scope; code-split heavy views.
  - *Caveats:* Optimize where instrumented, never by guess. In Next.js the primary lever is React
    Server Components — fetch on the server and ship less client JavaScript.
  - *Security caveat:* server-rendering is only "free" for PUBLIC or already-authorized data. On a route
    with NO server-side viewer auth (e.g. the tenant-shell dashboard, guarded only by a client component),
    fetching sensitive data in a server component serializes it into the RSC payload for anyone who
    requests the URL. There, fetch it CLIENT-side behind a gated API + the guard instead.
- **Single Source** — Maintain one canonical origin for schemas, API contracts, and core state;
  downstream components derive from it.
  - *Caveat:* Optimistic/local copies are permitted but must reconcile back to the canonical origin
    (Firestore) — e.g. the notes component does an optimistic append, then a reload reads Firestore back.
- **Semantic Intent** — File paths, folders, and names mirror the domain; explicit types;
  self-documenting code over dense abstractions.
- **Config-driven behavior** — Phase definitions, permission schemas, and structural rules live in ONE
  constants/config module (e.g. `PREDEFINED_DUTIES` in `types/household-duties.ts`), never scattered
  across components.

## Single Source (concern → canonical origin)

| Concern | Canonical origin |
|---|---|
| Dietary-relevant medical conditions (vocabulary + normalizer) | `lib/condition-dietary-rules.ts` |
| Medical CRUD | `lib/medical-operations.ts` |
| Franchise plans / tiers / seat caps | `lib/franchise-plans.ts` |
| Tenant creation state machine | `lib/tenant-create.ts` |
| Consumer plan feature-gates | `lib/feature-gates.ts` (`PLAN_CAPS`) |
| Agency tenant role (franchise_admin / franchise_staff) | `useTenantRole` hook |
| Allergen tags (from OFF) | `lib/allergen-parser.ts` |

## Domain landmines (fail silently)

- **Condition vocabulary fracture** — `PatientProfile.healthConditions` is free-text (`'Diabetes'`,
  `'Kidney Disease'`); capture UIs, the questionnaire library, and the engines each spelled conditions
  differently, so the recipe engine + portion caps were dead for real data. Always resolve conditions
  through `normalizeConditions()` — never string-match raw labels.
- Three allergen vocabularies (recipe `AllergyTag` vs product `CanonicalAllergen` vs shopping map) —
  sesame unrepresentable recipe-side; not yet reconciled. Do NOT half-seed allergen gating.
- **Tenant-shell RSC / PHI** — tenant-shell routes have no server-side viewer auth (client-guarded), so
  server-fetching sensitive data serializes PII/PHI into the RSC payload (see the Optimize security
  caveat). Fetch client-side behind a gated API on those routes.

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

- **2026-08-30 — Reconcile local `main` with `origin/main` (white-label/EVV foundation).** Merged origin's
  40-commit white-label/tenant/EVV/agency-CRM body of work (PR #36) into local `main` (onboarding + nutrition
  flagship). Histories were complementary; only `CLAUDE.md` conflicted (both authored a standards section —
  resolved to this one file) and `onboarding/page.tsx` auto-merged (verified semantically: origin's
  franchise-operator / tenant-subdomain gating coexists with local's archetype removal + `tracksSelf`).
