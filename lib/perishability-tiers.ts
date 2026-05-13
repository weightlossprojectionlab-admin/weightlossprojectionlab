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

/**
 * Wait-counter categories — items the caregiver ORDERS at a counter
 * (deli slicing, seafood selection + cleaning) and the staff prepare
 * while the caregiver shops the rest of the store. Picked EARLIER
 * within their perishability tier so the order is in flight by the
 * time the cold-chain pass finishes — staff hand it off as the
 * caregiver heads toward checkout.
 *
 * Cross-tier ordering still belongs to perishability — wait-counter
 * doesn't yank seafood (tier 4) ahead of pantry (tier 1). The signal
 * only matters within a tier: among tier-4 items {dairy, meat,
 * seafood}, seafood sorts first because its counter prep has lead
 * time the others don't.
 *
 * Currently:
 *   - `deli`    (tier 3 non-fragile) — already first in its tier
 *     before this rule (deli vs. eggs within tier 3); adding the
 *     signal here keeps the right answer if a future tier-3 entry
 *     is added that would otherwise compete.
 *   - `seafood` (tier 4) — sorts BEFORE dairy + meat within tier 4.
 *     New behavior introduced by this rule.
 *
 * NOT a tier modifier — wait-counter items stay in their natural
 * perishability tier (seafood is still cold-chain; counter prep
 * doesn't change that). The signal only nudges within-tier order.
 *
 * Future extension: pharmacy-Rx counter (caregiver drops off
 * prescription) lives in DutyCategory, not ProductCategory, so it's
 * handled separately when the duty-side flow lands per-item store
 * pickup support.
 */
export const WAIT_COUNTER_CATEGORIES: ReadonlySet<ProductCategory> = new Set<ProductCategory>([
  'deli',
  'seafood',
])

export function isWaitCounter(category: ProductCategory): boolean {
  return WAIT_COUNTER_CATEGORIES.has(category)
}

/**
 * Within-tier comparator: wait-counter items sort BEFORE non-wait-counter.
 * Returns -1 when `a` is a counter-order category and `b` is not,
 * +1 when reversed, 0 when both are same class. Chains AFTER
 * comparePerishability and BEFORE compareFragility — temporal
 * strategy (counter prep starts) takes precedence over cart-loading
 * strategy (fragile on top) at the within-tier level.
 */
export function compareWaitCounter(
  a: { category: ProductCategory },
  b: { category: ProductCategory },
): number {
  const aw = isWaitCounter(a.category) ? 0 : 1
  const bw = isWaitCounter(b.category) ? 0 : 1
  return aw - bw
}

/**
 * Fragility — categories whose items get crushed under heavier
 * groceries. Picked LATER within the same perishability tier so they
 * end up on TOP of the cart when loaded. Cross-tier ordering still
 * belongs to perishability (frozen always last); this only breaks
 * ties WITHIN a tier.
 *
 * Currently:
 *   - `bakery`  (tier 2) — soft fresh bread + pastries crush easily;
 *     sorts AFTER produce + herbs within tier 2.
 *   - `eggs`    (tier 3) — self-explanatory; sorts AFTER deli within
 *     tier 3.
 *
 * Adjacent signals captured for future rule iterations (see
 * [[project-shopping-phase-0b]] memory) — weight (heavy EARLY,
 * bottom of cart), bulk size (LATE, when cart space known),
 * quantity-by-weight clustering. Ship piecemeal.
 */
export const FRAGILE_CATEGORIES: ReadonlySet<ProductCategory> = new Set<ProductCategory>([
  'bakery',
  'eggs',
])

export function isFragile(category: ProductCategory): boolean {
  return FRAGILE_CATEGORIES.has(category)
}

/**
 * Within-tier comparator: non-fragile items sort BEFORE fragile items.
 * Returns -1 when `a` is non-fragile and `b` is fragile (pick `a` first),
 * +1 when reversed, 0 when both have the same fragility class.
 * Chains AFTER comparePerishability so frozen-last invariant wins.
 */
export function compareFragility(
  a: { category: ProductCategory },
  b: { category: ProductCategory },
): number {
  const af = isFragile(a.category) ? 1 : 0
  const bf = isFragile(b.category) ? 1 : 0
  return af - bf
}
