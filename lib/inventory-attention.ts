/**
 * Inventory "Attention" score — the single per-item ranking primitive behind
 * the inventory tab. Replaces the scattered reorder/expiry/priority heuristics
 * with one number. See project_reorder_restocking_ml memory + the plan file
 * glimmering-brewing-eclipse.md for the full model.
 *
 * Two clocks drive every reason an item needs attention:
 *   • depletion  T_empty — when it runs out   → action: restock
 *   • spoilage   T_spoil — when it goes bad    → action: use-soon
 * Each clock maps through an urgency kernel u(T;τ) = exp(−max(0,T)/τ) ∈ (0,1]
 * (→1 as the clock hits zero, →0 far out). The item's attention is the MAX of
 * the two — whichever crisis is sooner OWNS the item — scaled by demand D:
 *
 *     A = D · max( w_r·u(T_empty;τ_r),  w_s·u(T_spoil;τ_s) )
 *
 * PHASE 0 (this file): rule-based point estimates, demand D = 1.
 *   • T_empty from purchase cadence (averageDaysBetweenPurchases − daysSince
 *     last purchase) — the only depletion signal maintained today. The Q/r
 *     form (on-hand ÷ consumption rate) is the Phase 2 target, once real-time
 *     consumption is tracked.
 *   • T_spoil from expiresAt, else (perishable) typicalShelfLife / category
 *     default shelf-life minus age.
 * Phase 1 layers in learned shelf-life + a real demand weight D (recipe need,
 * health priority); Phase 2 swaps the point estimates for learned distributions
 * (seasonal / day-of-week / per-household / collaborative).
 *
 * Kept isomorphic on purpose (no 'use client', no client-only imports) so the
 * Restocking Report and any server-side ML job can reuse it. The days-until
 * calc mirrors getDaysUntilExpiration in lib/expiration-tracker.ts (that module
 * is 'use client', so the one-liner is inlined rather than imported).
 */

import type { ShoppingItem } from '@/types/shopping'
import { CATEGORY_METADATA } from './product-categories'
import {
  calculateHouseholdAlignment,
  DEFAULT_HEALTH_DEMAND_CONFIG,
  type MemberHealthProfile,
  type ItemHealthProfile,
} from './health-demand'

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Coerce a date-ish value to epoch millis. Firestore hands back Timestamps for
 * fields the inventory hook does NOT normalize (lastPurchased,
 * purchaseHistory[].date — unlike expiresAt/createdAt), so a bare
 * `new Date(value)` would be Invalid Date. Handles Timestamp ({toDate}/{seconds}),
 * Date, ISO string, and millis; returns NaN for anything unparseable.
 */
export function toEpochMs(value: unknown): number {
  if (value == null) return NaN
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = value as any
  if (typeof v.toDate === 'function') return v.toDate().getTime()
  if (typeof v.seconds === 'number') return v.seconds * 1000
  return new Date(v).getTime()
}

// Urgency horizons (days): at T = τ the kernel is 1/e ≈ 0.37; at T = 0 it is 1.
const TAU_RESTOCK = 7
const TAU_SPOIL = 5
// Phase 0 weights — restock and spoil weighted equally.
const W_RESTOCK = 1
const W_SPOIL = 1
// Cold start: no cadence yet, but on-hand at/below the low-stock floor is a
// restock signal. Treated as a depletion clock already at zero.
const COLD_START_LOW_STOCK_URGENCY = 1
const DEFAULT_LOW_STOCK_THRESHOLD = 1
// Below this, an item needs no action (sorts to the bottom / hidden).
export const ATTENTION_EPSILON = 0.05
// Health-importance floor — a third attention channel so a strongly BENEFICIAL
// item (high positive household alignment) stays on the radar even when fully
// stocked / shelf-stable. Harm is NOT floored (that would surface junk); harm is
// handled by D suppressing the item's clocks + the unsafeFor flag. Inert until
// items carry health attributes (alignment 0 → floor 0).
const W_HEALTH_FLOOR = 0.4
const HEALTH_FLOOR_THRESHOLD = 0.5

export type AttentionAction = 'restock' | 'use-soon' | 'discard' | 'ok'

export interface AttentionResult {
  /** A = D · max(restockUrgency, spoilUrgency). Phase 0: D = 1, so ∈ [0,1]. */
  score: number
  /** w_r·u(T_empty;τ_r) ∈ [0,1]. */
  restockUrgency: number
  /** w_s·u(T_spoil;τ_s) ∈ [0,1]. */
  spoilUrgency: number
  /** Days until the item runs out (cadence estimate). null = no cadence yet. */
  tEmpty: number | null
  /** Days until the item spoils. null = non-perishable / unknown. */
  tSpoil: number | null
  /**
   * The sooner of the two RAW clocks (cold-start out-of-stock = 0, missing
   * clock = +∞). This is the secondary sort key: among items with an equal
   * `score` — e.g. everything overdue pinned at 1.00 — the more-negative
   * (more overdue) clock ranks first. Keeps the score a clean [0,1] index
   * while still ordering the crisis pile deterministically. See compareAttention.
   */
  soonestClock: number
  /** Which clock wins → what to do about it. */
  action: AttentionAction
  /**
   * Household health demand weight D (the clamped multiplier on the clocks).
   * 1 when no health context is supplied or the item isn't enriched yet.
   */
  demandWeight: number
  /** Member ids for whom the item is a hard avoid (allergen/restriction). */
  unsafeFor: string[]
}

/**
 * Optional health context. When supplied AND items carry health attributes, the
 * score picks up the household demand weight D + the beneficial-importance floor.
 * Omit it (the default) for byte-identical Phase-0/1 behavior — the routing is
 * wired now so the system lights up organically the moment enrichment lands.
 */
export interface AttentionContext {
  members?: MemberHealthProfile[]
  itemHealth?: ItemHealthProfile
}

/** Urgency kernel u(T;τ) = exp(−max(0,T)/τ). Past-due (T<0) clamps to 1. */
function urgencyKernel(days: number, tau: number): number {
  return Math.exp(-Math.max(0, days) / tau)
}

/** Whole days elapsed since `date` (null when absent or unparseable). */
function daysSince(date: Date | undefined, now: number): number | null {
  if (!date) return null
  const ms = toEpochMs(date)
  if (Number.isNaN(ms)) return null
  return Math.floor((now - ms) / DAY_MS)
}

/**
 * Depletion clock T_empty (days until run out) — Phase 0 cadence estimate:
 * averageDaysBetweenPurchases − daysSinceLastPurchase. null when there is no
 * purchase cadence yet (handled by the cold-start low-stock floor below).
 */
function computeTEmpty(item: ShoppingItem, now: number): number | null {
  const avgDays = item.averageDaysBetweenPurchases
  const since = daysSince(item.lastPurchased, now)
  if (avgDays !== undefined && avgDays > 0 && since !== null) {
    return avgDays - since
  }
  return null
}

/**
 * Spoilage clock T_spoil (days until it goes bad):
 *   • expiresAt present → exact countdown.
 *   • else perishable   → (typicalShelfLife | category default) − age.
 *   • else              → null (never spoils).
 */
function computeTSpoil(item: ShoppingItem, now: number): number | null {
  if (item.expiresAt) {
    const ms = toEpochMs(item.expiresAt)
    if (!Number.isNaN(ms)) return Math.ceil((ms - now) / DAY_MS)
  }
  const meta = CATEGORY_METADATA[item.category]
  const perishable = item.isPerishable ?? meta?.isPerishable ?? false
  if (!perishable) return null
  const shelfLife = item.typicalShelfLife ?? meta?.defaultShelfLifeDays
  if (shelfLife === undefined) return null
  // Age from last purchase, else creation.
  const age = daysSince(item.lastPurchased, now) ?? daysSince(item.createdAt, now) ?? 0
  return shelfLife - age
}

/**
 * Compute the attention score + both clocks for one inventory item.
 *
 * @param item - the inventory ShoppingItem
 * @param now  - current time in ms (injectable for tests / determinism)
 */
export function inventoryAttentionScore(
  item: ShoppingItem,
  now: number = Date.now(),
  ctx?: AttentionContext,
): AttentionResult {
  const tEmpty = computeTEmpty(item, now)
  const tSpoil = computeTSpoil(item, now)

  // Restock urgency from the depletion clock; cold start falls back to a
  // low-stock floor when there's no cadence yet.
  let restockUrgency: number
  if (tEmpty !== null) {
    restockUrgency = W_RESTOCK * urgencyKernel(tEmpty, TAU_RESTOCK)
  } else {
    const threshold = item.lowStockThreshold ?? DEFAULT_LOW_STOCK_THRESHOLD
    restockUrgency =
      (item.quantity ?? 0) <= threshold ? W_RESTOCK * COLD_START_LOW_STOCK_URGENCY : 0
  }

  const spoilUrgency = tSpoil !== null ? W_SPOIL * urgencyKernel(tSpoil, TAU_SPOIL) : 0

  // Base urgency (raw clocks) drives the ACTION + the ok/discard gates — it must
  // NOT be moved by D or the health floor, only the ranking score is.
  const baseScore = Math.max(restockUrgency, spoilUrgency)

  // Household health demand weight D + the beneficial-only importance floor.
  // Inert (D = 1, floor = 0) unless a caller passes members + an enriched item.
  let demandWeight = 1
  let healthFloor = 0
  let unsafeFor: string[] = []
  if (ctx?.members?.length && ctx.itemHealth) {
    const a = calculateHouseholdAlignment(ctx.itemHealth, ctx.members)
    unsafeFor = a.unsafeFor
    demandWeight = Math.min(
      DEFAULT_HEALTH_DEMAND_CONFIG.dMax,
      Math.max(DEFAULT_HEALTH_DEMAND_CONFIG.dMin, 1 + a.align),
    )
    // align⁺ only: keep BENEFICIAL important items visible; harm is suppressed
    // via D + flagged via unsafeFor, never floored up the list.
    healthFloor = a.align > HEALTH_FLOOR_THRESHOLD ? Math.min(1, a.align) : 0
  }

  // Ranking score: D scales the two clocks (suppress harmful / boost beneficial),
  // plus the health floor as the third channel. Equals baseScore when no health
  // context is present (D = 1, floor = 0).
  const score = Math.max(
    demandWeight * restockUrgency,
    demandWeight * spoilUrgency,
    W_HEALTH_FLOOR * healthFloor,
  )

  // Effective clocks: cold-start low stock acts as a depletion clock already
  // at 0; a missing clock is +∞. soonestClock (the sooner of the two) is the
  // composite tie-break key.
  const restockClock = tEmpty !== null ? tEmpty : restockUrgency > 0 ? 0 : Infinity
  const spoilClock = tSpoil !== null ? tSpoil : Infinity
  const soonestClock = Math.min(restockClock, spoilClock)

  // Action follows whichever RAW clock is sooner (the plan's T_empty < T_spoil
  // rule — not the weighted urgencies, since τ_r ≠ τ_s could disagree with
  // raw-clock order), with two refinements:
  //   • already expired (T_spoil < 0) → DISCARD: on-hand stock is waste, not a
  //     "use-soon" candidate, so it leaves the use-soon curve for its own state.
  //   • below ε → ok.
  let action: AttentionAction
  if (baseScore < ATTENTION_EPSILON) {
    action = 'ok'
  } else if (tSpoil !== null && tSpoil < 0) {
    action = 'discard'
  } else {
    action = restockClock <= spoilClock ? 'restock' : 'use-soon'
  }

  return {
    score,
    restockUrgency,
    spoilUrgency,
    tEmpty,
    tSpoil,
    soonestClock,
    action,
    demandWeight,
    unsafeFor,
  }
}

/**
 * Composite ranking comparator: **score DESC, then soonestClock ASC.**
 *
 * The score alone pins every overdue/out-of-stock item to 1.00, so a flat sort
 * leaves those ties in arbitrary order — with 20 stockouts the ranking among
 * them collapses. This breaks the tie by raw clock: the most-overdue item
 * (most-negative `soonestClock`) ranks first. The score stays a clean,
 * interpretable [0,1] index — no unbounding required.
 */
export function compareAttention(a: AttentionResult, b: AttentionResult): number {
  if (b.score !== a.score) return b.score - a.score
  return a.soonestClock - b.soonestClock
}
