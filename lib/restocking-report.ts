/**
 * Restocking Report — turns the inventory Attention model into household-level
 * diagnostics: how much money is leaking out as waste, and where the naive
 * cadence prediction is too shaky to trust.
 *
 * Pure + isomorphic (no 'use client', no async) — a derivation over the already
 * loaded inventory set, the same way the Restocking Report tab already reads it.
 * No backend/API needed; the client holds the data. Reuses
 * inventoryAttentionScore for the discard decision + the depletion clock.
 */

import type { ShoppingItem, ProductCategory } from '@/types/shopping'
import { inventoryAttentionScore, toEpochMs } from './inventory-attention'

const DAY_MS = 1000 * 60 * 60 * 24

/**
 * Best-available unit price in CENTS, or null when the item carries no price at
 * all. We never fabricate a default — an unpriced item is reported as unpriced
 * rather than silently counted as $5 (which would invent a waste figure).
 * Preference: expectedPrice (the learned per-buy price) → latest paid → unit →
 * the most recent purchaseHistory price (dollars → cents).
 */
export function resolveItemPriceCents(item: ShoppingItem): number | null {
  if (typeof item.expectedPriceCents === 'number') return item.expectedPriceCents
  if (typeof item.purchasePriceCents === 'number') return item.purchasePriceCents
  if (typeof item.unitPriceCents === 'number') return item.unitPriceCents
  const lastWithPrice = [...(item.purchaseHistory ?? [])]
    .reverse()
    .find((p) => typeof p.price === 'number')
  if (lastWithPrice) return Math.round(lastWithPrice.price! * 100)
  return null
}

export interface WasteCategoryRow {
  category: ProductCategory
  count: number
  /** Sum of resolved prices (cents) for the items in this category that have one. */
  knownCostCents: number
  /** Items in this category with no price on record (counted, not costed). */
  unpricedCount: number
}

export interface CadenceRow {
  id: string
  productName: string
  category: ProductCategory
  /** Model's current depletion countdown T_empty (days; negative = overdue). */
  predictedDays: number
  /** Mean interval between purchases — the cadence the model assumes (days). */
  meanIntervalDays: number
  /** Spread of intervals (max − min, days). 0 = perfectly regular. */
  intervalSpreadDays: number
  /** Number of intervals the cadence is based on (purchases − 1). */
  sampleSize: number
  /** Cadence too erratic to trust: spread ≥ mean (e.g. 7d ± 7d). */
  lowConfidence: boolean
}

export interface RestockingReport {
  waste: {
    /** Total resolved waste cost (cents) across all discard-state items. */
    totalKnownCostCents: number
    /** Discard-state items with no price on record (not in the cost total). */
    unpricedCount: number
    /** Total discard-state (already-expired, still in-stock) item count. */
    itemCount: number
    /** Per-category breakdown, highest cost first. */
    byCategory: WasteCategoryRow[]
  }
  cadence: CadenceRow[]
}

/**
 * Build the report from the loaded inventory set.
 *
 * Waste = items whose Attention action is `discard` (T_spoil < 0 — expired
 * stock still on hand). Cadence = per-item depletion prediction plus the spread
 * of its real purchase intervals, so low-confidence (erratic) items surface
 * first — that's the instrumentation that tells you where the naive baseline
 * fails and ML would pay off.
 */
export function buildRestockingReport(
  items: ShoppingItem[],
  now: number = Date.now(),
): RestockingReport {
  // --- Financial waste: discard-state items, grouped by category ---
  const catMap = new Map<ProductCategory, WasteCategoryRow>()
  let totalKnownCostCents = 0
  let unpricedCount = 0
  let itemCount = 0

  for (const item of items) {
    if (inventoryAttentionScore(item, now).action !== 'discard') continue
    itemCount++
    const price = resolveItemPriceCents(item)
    const row =
      catMap.get(item.category) ??
      { category: item.category, count: 0, knownCostCents: 0, unpricedCount: 0 }
    row.count++
    if (price === null) {
      row.unpricedCount++
      unpricedCount++
    } else {
      row.knownCostCents += price
      totalKnownCostCents += price
    }
    catMap.set(item.category, row)
  }

  const byCategory = [...catMap.values()].sort((a, b) => b.knownCostCents - a.knownCostCents)

  // --- Cadence calibration: confidence in each depletion prediction ---
  const cadence: CadenceRow[] = []
  for (const item of items) {
    const stamps = (item.purchaseHistory ?? [])
      .map((p) => toEpochMs(p.date))
      .filter((t) => !Number.isNaN(t))
      .sort((a, b) => a - b)
    if (stamps.length < 2) continue // need ≥2 buys for an interval

    const intervals: number[] = []
    for (let i = 1; i < stamps.length; i++) {
      intervals.push(Math.round((stamps[i] - stamps[i - 1]) / DAY_MS))
    }
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length
    const spread = Math.max(...intervals) - Math.min(...intervals)

    const att = inventoryAttentionScore(item, now)
    if (att.tEmpty === null) continue // no live depletion prediction to calibrate

    cadence.push({
      id: item.id,
      productName: item.productName,
      category: item.category,
      predictedDays: Math.round(att.tEmpty),
      meanIntervalDays: Math.round(mean),
      intervalSpreadDays: spread,
      sampleSize: intervals.length,
      lowConfidence: spread >= mean,
    })
  }
  // Shakiest predictions first: low-confidence, then widest spread.
  cadence.sort(
    (a, b) =>
      Number(b.lowConfidence) - Number(a.lowConfidence) ||
      b.intervalSpreadDays - a.intervalSpreadDays,
  )

  return {
    waste: { totalKnownCostCents, unpricedCount, itemCount, byCategory },
    cadence,
  }
}
