import type { ShoppingItem } from '@/types/shopping'

/**
 * On-hand formatter — single source of truth for "you have N of this" copy.
 *
 * Mirrors the inventory Item Details tab's behavior: when an item has a
 * pack tier > 1 (case/pack of multiple units), the on-hand displays split
 * as "X containers + Y units" rather than collapsing to a single
 * misleading total (a 24-can case with quantity=26 shouldn't read as "26"
 * — that's ambiguous, the user wants to know it's 1 case + 2 loose).
 *
 * Two consumers today:
 *   - /inventory Item Details + Adjustment tab headers
 *   - /shopping AddToShoppingListSheet (qty + on-hand context for adds)
 *
 * Future consumers (anywhere we render "you have N"): import and use.
 *
 * Pluralization is naive English (-s suffix) — "case/cases", "bottle/bottles".
 * Sufficient for grocery domain; revisit if non-English UX ships.
 */

export type FormatOnHandResult =
  | { mode: 'flat'; total: number; unit: string }
  | {
      mode: 'split'
      cases: number
      loose: number
      tierLabel: string
      unitLabel: string
    }

export function formatOnHand(
  item: Pick<ShoppingItem, 'quantity' | 'packQuantity' | 'unit' | 'packTier'>,
): FormatOnHandResult {
  const total = item.quantity ?? 0
  const pq = item.packQuantity ?? 1
  if (pq <= 1) {
    return { mode: 'flat', total, unit: item.unit ?? '' }
  }
  const cases = Math.floor(total / pq)
  const loose = total - cases * pq
  const tierBase =
    item.packTier === 'C' ? 'case' : item.packTier === 'P' ? 'pack' : 'container'
  const unitBase = item.unit ?? 'unit'
  return {
    mode: 'split',
    cases,
    loose,
    tierLabel: `${tierBase}${cases === 1 ? '' : 's'}`,
    unitLabel: `${unitBase}${loose === 1 ? '' : 's'}`,
  }
}

/**
 * Convenience wrapper that returns a single human-readable string, e.g.
 *   "5 bottles"          (flat)
 *   "1 case + 2 bottles" (split)
 *   "3"                  (flat with no unit set — fall through)
 *
 * For consumers that just want to drop a string into a label.
 */
export function formatOnHandText(
  item: Pick<ShoppingItem, 'quantity' | 'packQuantity' | 'unit' | 'packTier'>,
): string {
  const f = formatOnHand(item)
  if (f.mode === 'flat') {
    return f.unit ? `${f.total} ${f.unit}${f.total === 1 ? '' : 's'}` : `${f.total}`
  }
  // Split mode — render both parts when both > 0; collapse to one when the
  // other is zero (e.g. "1 case" when there are no loose units).
  const parts: string[] = []
  if (f.cases > 0) parts.push(`${f.cases} ${f.tierLabel}`)
  if (f.loose > 0) parts.push(`${f.loose} ${f.unitLabel}`)
  if (parts.length === 0) return '0'
  return parts.join(' + ')
}
