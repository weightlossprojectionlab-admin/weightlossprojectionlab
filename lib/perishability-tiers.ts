/**
 * Perishability tier — canonical "what to pick first vs. last" mapping
 * for shopping-order optimization.
 *
 * Semantic intent: a caregiver walking through a store should pick
 * shelf-stable items FIRST, refrigerated items LATER, and frozen items
 * LAST so frozen doesn't thaw while the rest of the trip happens. This
 * is universal grocery wisdom; codifying it as a deterministic table
 * keyed by `ProductCategory` is the rule-baseline upgrade to
 * useShopping's smartSort.
 *
 * Tier scale (smaller = pick earlier):
 *   1 — Shelf-stable. Pantry / canned / household / paper / spices.
 *       Indifferent to temperature; bottom-of-cart friendly.
 *   2 — Produce + bakery. Fresh but tolerate a 30-min cart wait.
 *       Slightly sturdier than chilled goods.
 *   3 — Refrigerated, less sensitive. Eggs, deli. Can warm briefly
 *       without harm; pick before the cold-chain items.
 *   4 — Refrigerated, more sensitive. Dairy, meat, seafood. Cold-
 *       chain matters; pick after produce so they spend less time
 *       at room temperature.
 *   5 — Frozen. LAST. Must stay frozen for safety + quality.
 *
 * Where this is used: hooks/useShopping.ts smartSort, as the
 * secondary sort key after aisle order (when the store has one) and
 * as the PRIMARY ordering when no aisle data exists. The "frozen last"
 * invariant holds at both levels.
 *
 * Future enhancements (rule v2-v6, captured in
 * [[project-shopping-phase-0b]] memory):
 *   - Wait-counter signal (deli, seafood, pharmacy Rx) → pick FIRST,
 *     come back for pickup near checkout
 *   - Weight signal → heavy items EARLY (bottom of cart)
 *   - Fragility signal → fragile items LATE (top of cart)
 *   - Bulk size → late (when cart space is known)
 *
 * ML upgrade (Phase C, deferred): per-(caregiver, store) learned
 * aisle-visit order from sequential scan events. Currently we capture
 * `itemsScanned: number` (count only) on shopping_sessions; the
 * substrate gap to fill before ML can learn is per-event timestamps
 * (extend session with `scanSequence: ScanEvent[]` or a new
 * scan_events collection). The rule table here remains the floor —
 * "frozen last" survives even when ML overrides the rest, because
 * cold-chain safety isn't a learnable preference.
 */

import type { ProductCategory } from '@/types/shopping'

export type PerishabilityTier = 1 | 2 | 3 | 4 | 5

/**
 * Tier per ProductCategory. Exhaustive over the union so adding a new
 * category to the enum is a TypeScript compile error here — forces a
 * deliberate decision about where it slots.
 */
export const PERISHABILITY_TIER: Record<ProductCategory, PerishabilityTier> = {
  // Tier 1 — shelf-stable
  other: 1,
  'pet-supplies': 1,
  spices: 1,
  condiments: 1,
  pantry: 1,
  'pet-food': 1,
  beverages: 1,
  baby: 1,
  // Tier 2 — produce + bakery (fresh but stable for the trip)
  produce: 2,
  herbs: 2,
  bakery: 2,
  // Tier 3 — refrigerated, less sensitive
  eggs: 3,
  deli: 3,
  // Tier 4 — refrigerated, more sensitive (cold-chain matters)
  dairy: 4,
  meat: 4,
  seafood: 4,
  // Tier 5 — frozen. LAST.
  frozen: 5,
}

/**
 * Tier-aware comparator for sorting items so frozen ends up last.
 * Returns a negative number when `a` should be picked BEFORE `b`,
 * positive when after, zero when equal. Caller chains this into a
 * larger sort (e.g. after aisle order, before priority).
 */
export function comparePerishability(
  a: { category: ProductCategory },
  b: { category: ProductCategory },
): number {
  return PERISHABILITY_TIER[a.category] - PERISHABILITY_TIER[b.category]
}
