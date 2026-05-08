'use client'

/**
 * Add-to-Shopping-List Sheet
 *
 * Surfaces qty + on-hand context at the moment the user is adding an item to
 * the shopping list, so the qty decision is informed instead of guessed.
 *
 * Semantic intent: "how many should I buy?" is fundamentally a function of
 * "how much do I already have?" — surfacing on-hand at add time turns blind
 * data entry into an informed choice. The sheet shows current inventory
 * count (when known), a qty stepper defaulted to 1, and an Add button.
 *
 * UX shape:
 *   - Mobile: bottom-sheet (slides up from below, full-width, action bar
 *     pinned to bottom for thumb-reach).
 *   - Desktop: centered modal at sm: breakpoint.
 *
 * Caller responsibilities:
 *   1. Compute the on-hand value (look up inventory by barcode for scans, or
 *      by productKey/name for suggestion-based adds).
 *   2. Provide an onConfirm(qty) callback that performs the actual add.
 *      This component is intentionally dumb about WHERE the item ends up;
 *      it just collects the qty input.
 *
 * Skipped fields (intentional): unit selection, expiration date, store. The
 * shopping list's purpose is "I want to buy this" — those refinements belong
 * on the inventory side after purchase.
 */

import { useEffect, useState } from 'react'
import type { ShoppingItem } from '@/types/shopping'
import { formatOnHand, formatOnHandText } from '@/lib/format-on-hand'

export interface AddToShoppingListSheetProps {
  isOpen: boolean
  onClose: () => void
  /**
   * Called when the user confirms the add. The component closes itself
   * before calling — caller can show a toast or do any other follow-up.
   * Returns a Promise so the sheet can show a "Adding…" spinner if the
   * write is async.
   *
   * Second arg `nameOverride` is set only when `editableName` is true and
   * the user typed a different name than the prop. Caller uses it to
   * persist the user-supplied name on the new row.
   */
  onConfirm: (quantity: number, nameOverride?: string) => Promise<void> | void
  /**
   * Product name. When `editableName` is false (default), this is rendered
   * as static text (the canonical "we know what this is" UX). When true,
   * the value is the initial state of an editable input (used by the
   * not-found-in-catalog path: scan a barcode that doesn't resolve, user
   * types the name themselves).
   */
  productName: string
  brand?: string
  imageUrl?: string
  /**
   * When true, the productName renders as an editable input the user must
   * fill in before confirm. onConfirm receives the entered name as a
   * second argument. Used by the not-found-in-catalog path on /shopping
   * and /inventory — barcode scanned, but the catalog + USDA + OFF all
   * missed it, so the user supplies the name themselves.
   */
  editableName?: boolean
  /**
   * Optional barcode to display + pass through. Useful in editableName
   * mode so the user can confirm they're naming the right thing.
   */
  barcode?: string
  /**
   * The matched household-inventory item (or null when no match found).
   * Sheet computes the on-hand display from this using the shared
   * formatOnHandText() helper so the format matches what /inventory's
   * Item Details tab renders ("1 case + 2 bottles", "5 bottles", etc.).
   * When null/undefined, the sheet shows "Not in your kitchen yet" so the
   * answer to "how much do I have" is always explicit — silent omission
   * leaves the user wondering whether the data is missing or zero.
   */
  inventoryMatch?: ShoppingItem | null
  /** Initial qty — defaults to 1. Caller can override (e.g. recipe-fed adds). */
  initialQuantity?: number
  /**
   * Label for the qty stepper question. Default "How many to buy?" suits
   * the shopping-list add path; the inventory scan-add path overrides
   * with "How many are you adding?" so the verb matches the surface.
   */
  qtyQuestion?: string
  /**
   * Submit-button base copy. Default "Add" — sheet appends qty when >1
   * and the trailing context (e.g. "to list" / "to inventory"). Pass a
   * full string to override entirely.
   */
  submitLabel?: string
}

export function AddToShoppingListSheet({
  isOpen,
  onClose,
  onConfirm,
  productName,
  brand,
  imageUrl,
  editableName = false,
  barcode,
  inventoryMatch,
  initialQuantity = 1,
  qtyQuestion = 'How many to buy?',
  submitLabel = 'Add to list',
}: AddToShoppingListSheetProps) {
  const [quantity, setQuantity] = useState(initialQuantity)
  const [nameDraft, setNameDraft] = useState(productName)
  const [submitting, setSubmitting] = useState(false)

  // Reset qty + name draft when the sheet opens for a new item — different
  // products shouldn't inherit the previous one's stepper state.
  useEffect(() => {
    if (isOpen) {
      setQuantity(initialQuantity)
      setNameDraft(productName)
      setSubmitting(false)
    }
  }, [isOpen, initialQuantity, productName])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (submitting) return
    // In editableName mode, the user must have entered a name — empty
    // submission is meaningless ("add nothing to my list").
    if (editableName) {
      const trimmed = nameDraft.trim()
      if (!trimmed) return
    }
    setSubmitting(true)
    try {
      const nameOverride = editableName ? nameDraft.trim() : undefined
      await onConfirm(quantity, nameOverride)
      onClose()
    } catch {
      // Caller is responsible for surfacing errors via toast. We just
      // reset the spinner so the user can retry without a stuck button.
      setSubmitting(false)
    }
  }

  // On-hand context — three states, always rendered (silent omission was
  // worse UX than just saying "not in your kitchen"):
  //   - matched + qty > 0:  formatted via formatOnHandText (matches /inventory)
  //   - matched + qty == 0: "0 on hand" with red tone (= you should buy)
  //   - no match:           "Not in your kitchen yet" (typed/suggested name
  //                          that doesn't correspond to any tracked row)
  const onHandQty = inventoryMatch?.quantity ?? null
  const onHandLabel = (() => {
    if (!inventoryMatch) return 'Not in your kitchen yet'
    if (onHandQty === 0) return '0 on hand'
    return formatOnHandText(inventoryMatch)
  })()

  // Color hint — semantic green/amber/red so the user reads the state at
  // a glance. "Not in kitchen" treated like 0 (you should buy this).
  const onHandToneCls = (() => {
    if (!inventoryMatch || onHandQty === 0) return 'text-red-700'
    // For pack-tier items, "low" is fewer than 1 full pack. For flat items,
    // "low" is ≤2 units. formatOnHand gives us the structure to decide.
    const f = formatOnHand(inventoryMatch)
    const isLow = f.mode === 'flat' ? f.total <= 2 : f.cases === 0 && f.loose <= 2
    return isLow ? 'text-amber-700' : 'text-green-700'
  })()

  return (
    // Backdrop. Click outside dismisses (matching native sheet behavior on iOS).
    <div
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose()
      }}
    >
      <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
        {/* Sheet handle (mobile affordance — visual hint that it can be swiped) */}
        <div className="sm:hidden flex justify-center -mt-2 mb-1">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Product identity */}
        <div className="flex items-center gap-3">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              aria-hidden="true"
              className="h-14 w-14 rounded-lg object-cover border border-border bg-white flex-shrink-0"
            />
          ) : (
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
              <svg
                className="w-6 h-6 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 7l-8 4-8-4m16 0l-8-4-8 4m16 0v10a2 2 0 01-2 2H6a2 2 0 01-2-2V7"
                />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            {editableName ? (
              <>
                <label
                  htmlFor="add-sheet-name"
                  className="block text-[10px] uppercase tracking-wide font-bold text-muted-foreground"
                >
                  Item name
                </label>
                <input
                  id="add-sheet-name"
                  type="text"
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  placeholder="e.g. Bumble Bee Whole Baby Clams"
                  className="w-full text-base font-semibold text-foreground bg-transparent border-b-2 border-border focus:outline-none focus:border-primary py-1"
                />
                {barcode && (
                  <p className="text-[11px] font-mono text-muted-foreground truncate mt-1">
                    Barcode: {barcode}
                  </p>
                )}
              </>
            ) : (
              <>
                <h2 className="text-base font-semibold text-foreground truncate leading-tight">
                  {productName}
                </h2>
                {brand && (
                  <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
                    {brand}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* On-hand context — always rendered (no inventory match prints
            "Not in your kitchen yet" instead of being silent). */}
        <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">You have</span>
          <span className={`text-sm font-semibold ${onHandToneCls}`}>{onHandLabel}</span>
        </div>

        {/* Qty stepper — large tap targets (44×44 minimum), centered for
            thumb-reach. Numeric input lets users type a value directly when
            the stepper is too slow (e.g., "12" for stocking up). */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">{qtyQuestion}</span>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={submitting || quantity <= 1}
              className="h-12 w-12 rounded-full border-2 border-border bg-card flex items-center justify-center text-2xl font-bold text-foreground hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              type="number"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                if (Number.isFinite(n) && n >= 1) setQuantity(n)
                else if (e.target.value === '') setQuantity(1)
              }}
              disabled={submitting}
              className="h-12 w-20 text-center text-2xl font-bold text-foreground border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Quantity"
              min={1}
            />
            <button
              type="button"
              onClick={() => setQuantity((q) => q + 1)}
              disabled={submitting}
              className="h-12 w-12 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        {/* Action row */}
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 h-12 rounded-lg border border-border text-foreground hover:bg-muted transition-colors font-medium disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || (editableName && !nameDraft.trim())}
            className="flex-1 h-12 rounded-lg bg-primary hover:bg-primary-hover text-white font-semibold transition-colors disabled:opacity-60"
          >
            {submitting
              ? 'Adding…'
              : quantity > 1
                ? `${submitLabel} (${quantity})`
                : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
