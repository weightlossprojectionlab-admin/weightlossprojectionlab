# PRD — Family Meals & Special-Needs Members

## Status
Draft. Captures decisions made during the /log-meal refactor design conversation. Items ship in sequenced commits across multiple PRs; the foundation must land before any layered feature.

## Background

The app started as a single-user nutrition tracker. Real households use it as a family system: one account, multiple eaters, shared recipes, shared shopping lists, sometimes shared plates, sometimes individual plates. The recipe-completion flow exposed several gaps:

1. A recipe cooked for 4 people produces a single meal log entry today — wrong nutrition for any one person.
2. Family members have different goals, restrictions, allergies, conditions — a recipe safe for Dad may harm Kid.
3. Pets live in the same kitchen / inventory but eat different food and shouldn't be matched as recipe ingredients.
4. Plate portions vary across the table (Dad eats more than Kid). One recipe → multiple meal logs.

This PRD covers the architecture and phasing for a family-aware, special-needs-aware recipe → cooking → meal-logging flow.

## Schema additions to PatientProfile

The patient/family-member profile is the single source of truth. Onboarding captures these; everything downstream reads from them. Graceful degradation when fields are unset.

### Existing (today)

- `foodAllergies: string[]`
- `dietaryRestrictions / dietaryPreferences: string[]`
- Basic demographics (age, sex)

### New fields

- **`medicalConditions: MedicalCondition[]`** — diabetes, renal disease, celiac, hypertension, PKU, etc. Each condition has severity + caps (carb cap, sodium cap, protein cap, etc.). Drives portion-recommendation math.
- **`preferredFoods: string[]`** — positive list of foods the member likes / has identified as "safe foods" (autism context). Recipe browser boosts matches.
- **`aversions: string[]`** — soft negative list (hates mushrooms, sensory aversion to mixed foods). Recipe browser de-prioritizes; substitution engine offers swaps.
- **`preparationNeeds: PrepNeeds`** — texture (pureed/soft/whole), cut size, temperature, separation requirement (foods kept apart). Surfaces as inline mods in cooking instructions.
- **`macroTargetsPerMeal: { breakfast?, lunch?, dinner?, snack? }`** — per-meal-slot calorie + macro budgets. Today's daily target divided by 3 is the fallback.
- **`medicationList: Medication[]`** — for future interaction warnings. Captured but not used until interaction database exists.
- **`avatarColor / avatarIcon`** — user-chosen visual identity (not auto-assigned by sex). Used in family-member badges across the app.

### Onboarding flow updates
- Each new field has a question / picker in the onboarding wizard. Defaults are sensible (no allergies, no restrictions, no medical conditions, empty preferences) so existing users have valid profiles without a migration.
- Reskippable on each member; full data quality comes from progressive enrichment over time.

## CookingSession schema additions

### `eaters: string[]`
Member IDs of who's eating this batch. Defaults to the active patient context (caller of "Cook Now"). Captured at cook-start ("Who's eating this?") OR defaulted to one and adjusted at log-meal time.

### `substitutions?: Substitution[]`
Persists ingredient swaps the user made (`ingredientIndex`, `original`, `replacement`, `replacementBarcode?`, `replacementName?`). Today RecipeModal's `swappedIngredients` is UI-only and lost on save; persisting unblocks accurate Phase 2c deduction and accurate per-meal nutrition.

### `cookedIngredients?: RecipeIngredient[]`
Snapshot of ingredients as cooked (post-substitution, post-scaling). Used for per-eater nutrition computation and per-ingredient disclosure in the meal log.

## MealLog schema additions

### `sourceRefs?: { recipeId?, cookedIngredients?, portion: { method, value, eaterId? } }`
- `recipeId` — link back to the source recipe.
- `cookedIngredients` — snapshot used for per-ingredient disclosure later.
- `portion.method`: `'servings' | 'grams' | 'photo'`.
- `portion.value`: fraction of recipe / grams eaten.
- `portion.eaterId`: which family member this log is for. Multi-eater meals create N log entries.

### `source: 'ai-photo' | 'recipe' | 'manual' | 'barcode-scan'`
Generalized source tracking. Each downstream display (per-item AI breakdown, single recipe summary, etc.) picks its render based on this.

## Pure helper: `lib/portion-recommendation.ts`

```ts
export function computeRecommendedServings(
  recipe: MealSuggestion,
  profile: PatientProfile,
  mealType: MealType
): { recommended: number, reason: 'calories' | 'carbs' | 'sodium' | 'protein' | 'default', warnings: string[] }
```

- Honors `medicalConditions` first (diabetes → carb cap, renal → sodium/protein caps), falls back to calorie-based math.
- Returns `warnings: string[]` for soft signals like "exceeds protein target by 50%."
- Pure function, testable, reusable in `/log-meal` and `/cooking` Serve-step plating guidance.

## Surface-by-surface behavior

### Recipe browser (`/patients/{id}` recipe view, `/recipes`)
- Sorts by preferences (`preferredFoods` → boost).
- Filters out / de-prioritizes `aversions`.
- **Hard-blocks** recipes containing `foodAllergies` for the active patient (with explicit "show anyway" override).
- Recipe-readiness already shipped; this layer adds the safety filter on top.

### RecipeModal — "Cook Now"
- Pre-flight allergen cross-check fires when patient context is known. Recipe contains allergen any selected eater is allergic to → block with explicit override. Today's modal shows allergens passively; we promote to a gate.
- Eater selector: defaults to active patient; "+ Add eater" expands to show family-member checkboxes. Each selected eater contributes to allergen check.

### Cooking session page (`/cooking/{sessionId}`)
- Per-eater prep mods inline ("For Kid: cut into 1/2" cubes after step 7"). Reads `preparationNeeds` from each eater's profile.
- Plating guidance on Serve step ("1 serving ≈ 280g. For Dad: 1 serving fits 600-cal dinner budget. For Kid: 0.5 serving fits 300-cal budget.").

### /log-meal — recipe-completion path
- Single-eater mode: servings stepper + recommendation caption + weight (g/lbs) + Log Meal button.
- "+ Anyone else ate this?" expands to multi-eater rows. Each row has its own stepper + recommendation.
- "Leftovers" line shows `cooked − sum(eaten)` → optional inventory row tagged `source: 'leftover'`.
- Save creates N MealLog entries (one per eater) with `sourceRefs.portion.eaterId` set.

### Substitution engine
- Recipe ingredient + eater preference/aversion/restriction → suggest swap.
- Recipe calls for "milk", Kid is dairy-allergic → suggest oat milk / soy milk from `product_database` filtered by category="beverages" + dairy-free tag.
- Reuses existing `ReplacementCompareModal`.

## Pet integration (separate flow, not in family-meal eater selector)

- Pets are profiles too but they don't eat human recipes.
- Recipe browser hides recipes for pets (filter at the `eaters` selector).
- Pet feeding has its own flow: "Log pet feeding" → pet selector + pet-food product (already supported via `pet-food` ProductCategory).
- Pet macro/calorie targets are species + breed + weight + activity-aware (deferred — bigger scope, may need vet partnership).
- Inventory deduction works naturally — pet-food rows are real inventory; feeding logs deduct.

## Visual identity system

Multi-modal: color + icon + label. Never color alone (WCAG 1.4.1).

### Auto-assigned defaults by demographic axis
- **Species**: Human / Pet — strong differentiation (paw icon vs person icon, distinct palette).
- **Age band**: Infant / Toddler / Child / Teen / Adult / Senior — subtle tone gradient + life-stage icon.
- **Pet type**: Dog / Cat / Other — sub-icon for pets.

### Explicitly avoided
- Male/Female auto-coloring (blue/pink). Reductive, dated, exclusionary. Sex matters for medical math (calorie targets), not visual identity. Users pick their own avatar/color in onboarding.

### Consistency
- Avatar appears identically on /dashboard, /patients/{id}, recipe browser, RecipeModal eater chips, cooking-page eater bar, /log-meal eater rows, meal log history. One visual identity per member.
- Contrast-checked palette so badges/text on chosen color are always readable.

## Phasing

### Foundation — Commit A
- `getRecipeById` canonical lookup (DRY, replaces 6 ad-hoc patterns).
- `lib/portion-recommendation.ts` — `computeRecommendedServings` pure function.
- `MealLog.sourceRefs` schema (recipeId, cookedIngredients, portion).
- `/log-meal` recipe path: single-eater stepper + recommendation caption + weight (g/lbs) + Log Meal button + secondary Add Photo.
- Camera auto-open gate `!fromRecipe`.
- All schema additions to PatientProfile (new fields with defaults).

### Multi-eater — Commit B
- CookingSession `eaters: string[]`.
- `/log-meal` recipe path multi-eater rows.
- Per-eater recommendations honor each member's `medicalConditions`, `macroTargetsPerMeal`.
- **Allergen cross-check** at log-meal: each eater row shows allergen warning if their `foodAllergies` overlap recipe `allergens`.
- Leftover row → optional inventory entry.

### Allergen safety at cook-start — Commit C
- Pre-flight check in RecipeModal "Cook Now" path: each selected eater × recipe allergens → block with explicit override.
- "Cook Now" button disabled until override or all-clear.

### Substitution engine — Commit D
- `lib/substitution-engine.ts` — given recipe ingredient + eater profile, suggest swaps.
- RecipeModal swap UI surfaces engine suggestions (today's hardcoded "alts" become real recommendations).

### Per-eater prep mods — Commit E
- Cooking page reads `preparationNeeds` from each eater's profile.
- Inline mod hints under instruction steps.

### Visual identity — Commit F
- Patient profile gains `avatarColor`, `avatarIcon`.
- Onboarding picker (default by demographic, customizable).
- Member badge component used across surfaces.

### Pet flow — separate ticket
- "Log pet feeding" entry point + flow.
- Pet macro targets (species/breed/weight aware).

## Critical files

- [types/shopping.ts](types/shopping.ts) — extend `MealLog`, `CookingSession`, `ShoppingItem` types.
- [types/medical.ts](types/medical.ts) — extend `PatientProfile` with new fields.
- [lib/portion-recommendation.ts](lib/portion-recommendation.ts) — NEW.
- [lib/substitution-engine.ts](lib/substitution-engine.ts) — NEW (Commit D).
- [lib/firestore-recipes.ts](lib/firestore-recipes.ts) — extend `getRecipeById` to check MEAL_SUGGESTIONS first.
- [app/log-meal/page.tsx](app/log-meal/page.tsx) — single-eater path (Commit A) + multi-eater (Commit B).
- [app/cooking/[sessionId]/page.tsx](app/cooking/[sessionId]/page.tsx) — eater selector + per-eater prep mods.
- [components/ui/RecipeModal.tsx](components/ui/RecipeModal.tsx) — Cook Now allergen pre-flight.
- Onboarding flow components — capture new profile fields.

## Verification (Commit A foundation)

1. `getRecipeById('dn006')` returns the MEAL_SUGGESTIONS hardcoded entry; for an admin-created Firestore recipe ID returns the Firestore doc; for unknown ID returns null.
2. `computeRecommendedServings(recipe, profile, 'dinner')` returns `{ recommended: 1 }` for a default profile + 550-cal recipe + 1800-cal/day target.
3. Same call with `profile.medicalConditions` containing diabetes returns the carb-capped recommendation.
4. /log-meal recipe-completion: single-eater stepper appears, defaults to recommendation, shows caption, shows weight when `recipe.containerSize` is set.
5. Camera does not auto-open when URL has `fromRecipe=true`.
6. Save creates a MealLog with `sourceRefs.recipeId`, `sourceRefs.cookedIngredients`, `sourceRefs.portion`.
7. TypeScript clean across all modified files.

## What this PRD does NOT cover

- In-app chat (separate PRD).
- In-store shopping mode (Stage 2 plan).
- Substitution **persistence** in cooking session (Commit D).
- Medication interaction database.
- Pet macro target engine (vet partnership question).
- Server-side notification routing (covered in chat PRD).

## Estimate

- Commit A (foundation): ~250 lines + schema changes + new helper.
- Commit B (multi-eater + allergen): ~200 lines.
- Commit C (allergen at Cook Now): ~50 lines.
- Commit D (substitution engine): ~300-400 lines + tests.
- Commit E (per-eater prep mods): ~100 lines.
- Commit F (visual identity system): ~150 lines + design tokens.

Total ship surface: ~1000-1100 lines across 6 commits, individually smoke-testable.
