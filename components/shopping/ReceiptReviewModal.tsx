'use client'

/**
 * ReceiptReviewModal — Phase C of the receipt OCR feature.
 *
 * Opens automatically after the post-checkout receipt OCR completes.
 * Three sections, each anchored on what the user is doing in that
 * moment:
 *
 *   1. Header strip — store + date + total + Gemini's confidence pill.
 *      Quick "did the OCR even read this thing" signal so a user
 *      doesn't waste time matching nonsense.
 *
 *   2. Matched items — receipt lines auto-paired against the trip's
 *      found-in-cart items. Each row shows the trip item name + the
 *      receipt line + the per-unit price we'd apply, with a checkbox.
 *      User can untoggle weak matches before applying.
 *
 *   3. Receipt-only / Trip-only — passive lists.
 *      • Receipt-only: lines we couldn't match to anything on the trip
 *        (likely impulse buys at the register). Surface them so the
 *        user knows we noticed; v1 doesn't auto-add anything to
 *        inventory — Phase D will route to the existing add flow.
 *      • Trip-only: items the user marked "found" but we couldn't find
 *        on the receipt. Flag so the user knows price wasn't captured
 *        for those.
 *
 * Apply writes the matched prices via lib/apply-receipt-prices.ts then
 * closes. The actor (the user) just confirmed the trip is over — this
 * modal closes onto the inventory list, which is the next thing they'd
 * naturally check.
 */

import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { logger } from '@/lib/logger'
import { applyReceiptPrices } from '@/lib/apply-receipt-prices'
import {
  matchReceiptToTrip,
  pickPriceCents,
  type ReceiptMatch,
} from '@/lib/receipt-matcher'
import type { ReceiptOCRResponse, ReceiptOCRItem } from '@/lib/validations/receipt-ocr'
import type { ShoppingItem } from '@/types/shopping'

export interface ReceiptReviewModalProps {
  isOpen: boolean
  /** Called after Apply (or after Skip). Always closes the modal. */
  onClose: () => void
  /** Parsed Gemini response. Null = nothing to review yet. */
  ocrResult: ReceiptOCRResponse | null
  /** The trip's found-in-cart items — the apply targets. */
  tripItems: ShoppingItem[]
}

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return '—'
  return `$${(cents / 100).toFixed(2)}`
}

function confidenceBadgeClass(score: number): string {
  if (score >= 80) return 'bg-success/15 text-success'
  if (score >= 50) return 'bg-warning/15 text-warning'
  return 'bg-destructive/15 text-destructive'
}

function matchScoreLabel(score: number): { label: string; tone: 'good' | 'meh' | 'weak' } {
  if (score >= 0.7) return { label: 'Strong', tone: 'good' }
  if (score >= 0.5) return { label: 'Likely', tone: 'meh' }
  return { label: 'Weak', tone: 'weak' }
}

export function ReceiptReviewModal({
  isOpen,
  onClose,
  ocrResult,
  tripItems,
}: ReceiptReviewModalProps) {
  const [applying, setApplying] = useState(false)

  // Match once on open. Recompute when ocrResult or tripItems change so
  // a re-OCR (Phase D) reflects fresh matches without remounting.
  const matchResult = useMemo(() => {
    if (!ocrResult) return null
    return matchReceiptToTrip(ocrResult.items, tripItems)
  }, [ocrResult, tripItems])

  // User-toggled match acceptance — defaults to all auto-matches accepted.
  // Stored as a Set keyed by `${receiptIndex}:${tripItemId}` for O(1)
  // toggle and resilience against re-derivation order changes.
  const [unaccepted, setUnaccepted] = useState<Set<string>>(new Set())
  const matchKey = (m: ReceiptMatch) => `${m.receiptIndex}:${m.tripItemId}`

  const tripById = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    for (const it of tripItems) map.set(it.id, it)
    return map
  }, [tripItems])

  if (!isOpen || !ocrResult || !matchResult) return null

  const acceptedMatches = matchResult.matches.filter(
    (m) => m.priceCents != null && !unaccepted.has(matchKey(m)),
  )

  const acceptedTotalCents = acceptedMatches.reduce(
    (sum, m) => sum + (m.priceCents ?? 0),
    0,
  )

  const handleToggleMatch = (m: ReceiptMatch) => {
    setUnaccepted((prev) => {
      const next = new Set(prev)
      const key = matchKey(m)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleApply = async () => {
    if (acceptedMatches.length === 0) {
      onClose()
      return
    }
    setApplying(true)
    try {
      const result = await applyReceiptPrices(
        acceptedMatches
          .filter((m) => m.priceCents != null)
          .map((m) => ({
            itemId: m.tripItemId,
            priceCents: m.priceCents as number,
          })),
        { storeName: ocrResult.store ?? undefined },
      )

      logger.info('[ReceiptReview] Prices applied', {
        applied: result.applied,
        failed: result.failedItemIds.length,
      })

      if (result.applied > 0) {
        toast.success(
          `Applied prices to ${result.applied} item${result.applied === 1 ? '' : 's'}`,
        )
      }
      if (result.failedItemIds.length > 0) {
        toast.error(
          `Couldn't update ${result.failedItemIds.length} item${
            result.failedItemIds.length === 1 ? '' : 's'
          }`,
        )
      }
    } catch (err) {
      logger.error('[ReceiptReview] Apply failed', err as Error)
      toast.error('Failed to apply prices')
    } finally {
      setApplying(false)
      onClose()
    }
  }

  return (
    // Bottom-sheet on phone, centered modal on desktop. z-[72] sits
    // above the receipt-OCR processing overlay (which is z-[71]).
    <div
      className="fixed inset-0 z-[72] bg-black/60 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !applying) onClose()
      }}
    >
      <div className="bg-card text-foreground w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl flex flex-col max-h-[92vh]">
        {/* Drag-handle on phone */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header — store / date / total / confidence */}
        <header className="px-5 pt-3 pb-4 border-b border-border flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold truncate">
              {ocrResult.store || 'Receipt'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {[ocrResult.date, ocrResult.totalCents != null ? `Total ${formatCents(ocrResult.totalCents)}` : null]
                .filter(Boolean)
                .join(' · ') || 'Review the matches below'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${confidenceBadgeClass(ocrResult.confidence)}`}
              title="OCR confidence"
            >
              {ocrResult.confidence}% read
            </span>
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="p-1.5 rounded-full active:bg-muted disabled:opacity-40"
              aria-label="Close review"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Body — scrollable matched + unmatched sections */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-5">
          {/* Matched */}
          <section>
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-sm font-semibold">
                Matched · {matchResult.matches.length}
              </h3>
              <span className="text-xs text-muted-foreground">
                Tap to toggle
              </span>
            </div>
            {matchResult.matches.length === 0 ? (
              <p className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                No receipt lines matched the items in your cart.
                Re-take the receipt photo if it looks blurry.
              </p>
            ) : (
              <ul className="space-y-2">
                {matchResult.matches.map((m) => {
                  const tripItem = tripById.get(m.tripItemId)
                  if (!tripItem) return null
                  const receiptLine = ocrResult.items[m.receiptIndex]
                  const accepted = !unaccepted.has(matchKey(m))
                  const score = matchScoreLabel(m.score)
                  const toneClass =
                    score.tone === 'good'
                      ? 'bg-success/15 text-success'
                      : score.tone === 'meh'
                        ? 'bg-warning/15 text-warning'
                        : 'bg-muted text-muted-foreground'
                  return (
                    <li key={`${m.receiptIndex}-${m.tripItemId}`}>
                      <button
                        type="button"
                        onClick={() => handleToggleMatch(m)}
                        className={`w-full text-left rounded-lg border px-3 py-2.5 flex items-start gap-3 transition-colors ${
                          accepted
                            ? 'border-primary bg-primary/5'
                            : 'border-border bg-card opacity-70'
                        }`}
                      >
                        <span
                          className={`flex-shrink-0 mt-0.5 w-5 h-5 rounded border flex items-center justify-center ${
                            accepted
                              ? 'bg-primary border-primary text-white'
                              : 'border-border bg-card'
                          }`}
                        >
                          {accepted && <CheckIcon className="w-3.5 h-3.5" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline justify-between gap-2">
                            <p className="text-sm font-medium truncate">
                              {tripItem.productName}
                            </p>
                            <span className="text-sm font-semibold flex-shrink-0">
                              {formatCents(m.priceCents)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${toneClass}`}
                            >
                              {score.label}
                            </span>
                            <p className="text-xs text-muted-foreground truncate">
                              {receiptLine?.rawName ?? '—'}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Receipt-only — items on the receipt that didn't match a trip
              item. These are usually impulse buys at the register.
              Passive list in v1; Phase D wires to the add-to-inventory
              flow. */}
          {matchResult.unmatchedReceiptIndices.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">
                On receipt, not on your list · {matchResult.unmatchedReceiptIndices.length}
              </h3>
              <ul className="space-y-1.5">
                {matchResult.unmatchedReceiptIndices.map((i) => {
                  const line = ocrResult.items[i]
                  if (!line) return null
                  const linePrice = pickPriceCents(line)
                  return (
                    <li
                      key={`receipt-only-${i}`}
                      className="text-sm flex items-baseline justify-between gap-3 px-3 py-1.5 bg-muted/40 rounded-lg"
                    >
                      <span className="truncate text-foreground">{line.rawName}</span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {formatCents(linePrice)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}

          {/* Trip-only — found items that didn't appear on the receipt.
              No write happens for these; just an informational flag so
              the user knows price wasn't captured. */}
          {matchResult.unmatchedTripItemIds.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">
                In cart, not on receipt · {matchResult.unmatchedTripItemIds.length}
              </h3>
              <ul className="space-y-1.5">
                {matchResult.unmatchedTripItemIds.map((id) => {
                  const it = tripById.get(id)
                  if (!it) return null
                  return (
                    <li
                      key={`trip-only-${id}`}
                      className="text-sm px-3 py-1.5 bg-muted/40 rounded-lg text-muted-foreground"
                    >
                      {it.productName}
                    </li>
                  )
                })}
              </ul>
              <p className="text-[11px] text-muted-foreground mt-1.5">
                Receipt didn&apos;t mention these — no price will be saved.
              </p>
            </section>
          )}
        </div>

        {/* Footer — running tally + Apply / Skip */}
        <footer className="border-t border-border px-5 py-3 bg-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">
              {acceptedMatches.length} of {matchResult.matches.length} accepted
            </span>
            <span className="text-sm font-semibold">
              {formatCents(acceptedTotalCents)}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={applying}
              className="flex-1 min-h-[44px] py-2 rounded-lg border border-border text-sm font-medium active:bg-muted disabled:opacity-40"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={handleApply}
              disabled={applying || acceptedMatches.length === 0}
              className="flex-1 min-h-[44px] py-2 rounded-lg bg-primary text-white text-sm font-semibold active:bg-primary-dark disabled:opacity-40"
            >
              {applying ? 'Applying…' : `Apply ${acceptedMatches.length || ''}`.trim()}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
