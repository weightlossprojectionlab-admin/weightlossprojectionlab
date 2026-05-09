/**
 * Match receipt OCR line items against the active shopping trip's
 * found-in-cart items. Pure function — no I/O — so it's trivially
 * testable and the UI can re-run it cheaply when the user fixes a
 * match by hand.
 *
 * Strategy is intentionally simple for v1:
 *   1. Normalize both sides (lowercase, strip punctuation, expand a
 *      small set of common store-brand abbreviations).
 *   2. Tokenize, compute a Jaccard-ish score = shared / total-unique.
 *   3. Greedy assignment: for each receipt line, take the best trip
 *      candidate above threshold; once consumed, that trip item is
 *      out of the pool.
 *
 * Why not Levenshtein / cosine / embeddings? Receipt strings are short
 * and noisy, and the trip-side item count is small (typically <30).
 * Token overlap captures the dominant signal — "GV WHL MILK 1G" and
 * "Great Value Whole Milk Gallon" share the expanded tokens after
 * normalization. We can layer in a similarity engine later if recall
 * proves weak; for now keep the dependency surface zero.
 */

import type { ReceiptOCRItem } from '@/lib/validations/receipt-ocr'
import type { ShoppingItem } from '@/types/shopping'

/**
 * Common store-brand abbreviations seen in receipt OCR output. Expanded
 * during normalization so they match the spelled-out forms used in the
 * shopping list. Conservative — only abbreviations specific enough to
 * unlikely false-positive.
 */
const ABBREVIATION_EXPANSIONS: Record<string, string> = {
  gv: 'great value',
  ks: 'kirkland signature',
  ksig: 'kirkland signature',
  kirk: 'kirkland',
  wm: 'walmart',
  whl: 'whole',
  org: 'organic',
  rfg: 'refrigerated',
  fz: 'frozen',
  frz: 'frozen',
  lg: 'large',
  sm: 'small',
  med: 'medium',
  pk: 'pack',
  ct: 'count',
  ea: 'each',
  oz: 'oz',
  lb: 'lb',
  lbs: 'lb',
  gal: 'gallon',
}

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'with', 'in', 'for', 'to',
])

/** Normalize a name for matching: lowercase, expand abbreviations,
 *  strip punctuation, collapse whitespace. Returns a token list. */
function tokenize(raw: string): string[] {
  if (!raw) return []
  const lower = raw.toLowerCase().replace(/[^a-z0-9\s]/g, ' ')
  const expanded = lower
    .split(/\s+/)
    .map((t) => ABBREVIATION_EXPANSIONS[t] ?? t)
    .join(' ')
  return expanded
    .split(/\s+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
}

/** Jaccard similarity over the token sets. 0 = no overlap, 1 = identical. */
function similarity(aTokens: string[], bTokens: string[]): number {
  if (aTokens.length === 0 || bTokens.length === 0) return 0
  const aSet = new Set(aTokens)
  const bSet = new Set(bTokens)
  let shared = 0
  for (const t of aSet) if (bSet.has(t)) shared += 1
  const unique = new Set([...aSet, ...bSet]).size
  return unique === 0 ? 0 : shared / unique
}

/** Above this we accept a match without user review. Tuned by hand;
 *  one-token overlap on a two-token name = 0.5, two-token overlap on
 *  a three-token name = 0.66. Below 0.4 is too noisy to trust. */
const MATCH_THRESHOLD = 0.4

export interface ReceiptMatch {
  /** Index into the original receipt items array. */
  receiptIndex: number
  /** ShoppingItem.id of the matched trip item. */
  tripItemId: string
  /** Score 0-1 — UI shows confidence pill so user can spot weak matches. */
  score: number
  /** Per-unit price in cents that we'd apply (totalPrice / quantity, or unitPrice). */
  priceCents: number | null
}

export interface ReceiptMatchResult {
  matches: ReceiptMatch[]
  /** Receipt lines that didn't match any trip item — likely impulse buys. */
  unmatchedReceiptIndices: number[]
  /** Trip items that didn't match any receipt line — price not captured. */
  unmatchedTripItemIds: string[]
}

/**
 * Pick a per-unit price in cents from a receipt line. Prefers the
 * unitPrice field; falls back to totalPrice/quantity; then totalPrice
 * (when quantity is unknown, the line total IS the per-unit price for
 * single-unit items).
 */
export function pickPriceCents(line: ReceiptOCRItem): number | null {
  if (line.unitPriceCents != null && line.unitPriceCents > 0) {
    return line.unitPriceCents
  }
  if (line.totalPriceCents != null && line.totalPriceCents > 0) {
    if (line.quantity != null && line.quantity > 1) {
      return Math.round(line.totalPriceCents / line.quantity)
    }
    return line.totalPriceCents
  }
  return null
}

export function matchReceiptToTrip(
  receiptItems: ReceiptOCRItem[],
  tripItems: ShoppingItem[],
): ReceiptMatchResult {
  const matches: ReceiptMatch[] = []
  const consumedTripIds = new Set<string>()
  const unmatchedReceiptIndices: number[] = []

  // Pre-tokenize trip items (one pass instead of N×M).
  const tripTokens = tripItems.map((it) => ({
    id: it.id,
    tokens: tokenize(it.productName || ''),
  }))

  for (let i = 0; i < receiptItems.length; i++) {
    const line = receiptItems[i]
    // Use normalizedName when present (Gemini's expanded form) AND the
    // raw name as a backup signal — combine tokens to maximize recall.
    const lineTokens = [
      ...tokenize(line.normalizedName || ''),
      ...tokenize(line.rawName),
    ]

    let best: { tripId: string; score: number } | null = null
    for (const t of tripTokens) {
      if (consumedTripIds.has(t.id)) continue
      const score = similarity(lineTokens, t.tokens)
      if (score >= MATCH_THRESHOLD && (best === null || score > best.score)) {
        best = { tripId: t.id, score }
      }
    }

    if (best) {
      consumedTripIds.add(best.tripId)
      matches.push({
        receiptIndex: i,
        tripItemId: best.tripId,
        score: best.score,
        priceCents: pickPriceCents(line),
      })
    } else {
      unmatchedReceiptIndices.push(i)
    }
  }

  const unmatchedTripItemIds = tripItems
    .map((it) => it.id)
    .filter((id) => !consumedTripIds.has(id))

  return { matches, unmatchedReceiptIndices, unmatchedTripItemIds }
}
