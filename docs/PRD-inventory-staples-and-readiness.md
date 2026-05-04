# PRD — Inventory Staples & Recipe Readiness Defaults

## Status
Draft. Items here are deferred from the spices/non-blocking shipment but explicitly tracked so they don't get lost.

## Background
The recipe→inventory readiness model originally treated every ingredient as equally required. A recipe calling for "1 tsp paprika" or "salt to taste" would block the **Ready to cook!** badge if the user hadn't scanned a paprika or salt entry — even though virtually every kitchen has them.

The shipped fix introduces:
- `spices` ProductCategory enum value (separate from `herbs`)
- `NON_BLOCKING_RECIPE_CATEGORIES = ['herbs', 'spices', 'condiments']` — missing items in these categories don't flip `canMake = false`
- `RecipeIngredient.optional` honored in `calculateRecipeReadiness` (text-prefix `Optional:` heuristic for legacy recipes)
- USDA mapping: `Spices, Seasonings & Herbs` → `spices` (was `condiments`)

This solves the immediate UX problem. The deferred items below extend the same theme.

## Deferred Items

### 1. User-level inventory mode toggle
**Setting:** `userProfile.inventoryMode: 'minimal' | 'detailed'`
- `minimal` (default for new users): non-blocking categories assumed-have. What we ship today.
- `detailed`: power users who scan their spice rack get strict readiness — `NON_BLOCKING_RECIPE_CATEGORIES` is ignored for their account.

**Trigger to ship:** observed user feedback asking "why does it say Ready when I don't have paprika?" Until that signal, default-only is sufficient.

**Implementation sketch:**
- Add the field to user profile schema.
- `calculateRecipeReadiness` accepts an optional `mode: 'minimal' | 'detailed'` parameter (default `'minimal'`).
- Settings UI: simple toggle on `/profile` with copy explaining the trade-off.

### 2. "Typical kitchen" onboarding pre-fill
At signup, offer a one-tap action: **"I have a typical kitchen"**.
- Pre-creates inventory rows for common staples: salt, black pepper, olive oil, flour, sugar, garlic, onion, butter, milk, eggs.
- Each row is flagged `confidence: 'low'` or `source: 'onboarding-default'` so admins/UI can distinguish from scanned items.
- User can dismiss if they prefer to scan from zero.

**Why deferred:** the `NON_BLOCKING_RECIPE_CATEGORIES` mechanism solves the same problem (recipes don't block on staples) without storing rows the user didn't actually confirm. Pre-filled rows risk feeling presumptuous and would interact awkwardly with expiration tracking.

**Trigger to ship:** if Phase 2c amount-aware deduction matures and recipes start *consuming* tracked staples (e.g., "this recipe used 2 tbsp of your salt → now down to X"), then having actual rows for staples becomes necessary.

### 3. Per-ingredient `optional` toggle in /admin/recipes form
The `optional` field exists on `RecipeIngredient` and is honored by `calculateRecipeReadiness`, but the admin form doesn't expose a checkbox to set it directly. Today admins prefix the ingredient text with "Optional:" and the matcher's text-prefix heuristic catches it.

**Why deferred:** the heuristic works for current recipes; an explicit toggle is a UX nicety not a correctness fix.

**When to ship:** during the next pass on `/admin/recipes` form work — same time we'd add quantity-unit inputs or other RecipeIngredient field surfacing.

### 4. Cross-dimension unit conversion (volume ↔ weight)
Phase 2c's `convertUnit` deliberately doesn't convert across dimensions because it'd need per-product density (1 cup of flour ≠ 1 cup of water in grams). Today recipes calling for "1 cup snap peas" against a snap-peas inventory row tracked as `count` produce `hasEnough = null`.

**Why deferred:** density data isn't readily available. Even USDA's branded_food rows don't include it consistently. Solving this would require either a per-category density table (lookup by ingredient class) or a per-product density field admins can fill in.

**When to ship:** if user feedback shows the "(units differ)" hint is a frequent pain point. Until then, the readiness counter treats null cases as "have" and the cooking gate proceeds; the impact is purely cosmetic.

### 5. Smarter fuzzy ingredient matching
The current text matcher fuzzy-matches "Optional: 1 teaspoon cornstarch for crispier tofu" against a "tofu" inventory row because "tofu" is a token in the ingredient text. Pet-category exclusion (shipped) prevents pet-food matches, but in-category false positives still happen.

**Planned fix (separate ticket):** primary-noun extraction in `findMatchingInventoryItem`:
- Strip qualifier phrases: parenthetical notes, "for X", "to taste", "Optional:" prefix, comma-trailing modifiers.
- Score matches by token specificity; reject low-confidence matches (≥2 tokens or primary noun match required).
- Tie-breaks favor longer-token overlap (so "tofu" loses to "cornstarch" when matching cornstarch).

**Estimate:** ~30-50 lines, contained to `lib/ingredient-matcher.ts:findMatchingInventoryItem`.

### 6. Spice/condiment-aware deduction in Phase 2c
Today amount-aware deduction (cooking session completion) decrements `remainingAmount` for any ingredient that has containerSize. If a recipe needs "1 tsp cumin" against a 4 oz cumin jar, the jar drops by ~5 ml. Realistic for *some* users; for users in `minimal` mode (default), they may not even have the cumin row, so no deduction happens — which is fine.

**Open question:** should non-blocking-category items skip Phase 2c deduction by default, on the principle that we're assumed-have for these and tracking depletion of un-tracked items is incoherent? Probably yes — only deduct when the user has explicitly added a row (signaling intent to track).

**When to revisit:** alongside item #1 above.

## Not deferred (already shipped)
- `spices` category enum + metadata + admin dropdowns + USDA map remap
- `NON_BLOCKING_RECIPE_CATEGORIES` constant + readiness consumer
- `optional` field honored (structured + text-prefix heuristic)
- Pet-category filter at the matcher boundary (`filterRecipeRelevantItems`)
- Structured `ingredientsV2` matching with barcode-exact path
- Readiness counter includes `hasEnough === null` cases as effectively-have

## Dependency notes
- Items 4 + 5 are independent; either can ship without the other.
- Item 1 depends on the existing readiness API; no schema migration needed (additive boolean / enum).
- Item 2 needs a design pass on the onboarding flow; not just a backend change.
- Item 6 belongs in the Phase 2c follow-up bucket.
