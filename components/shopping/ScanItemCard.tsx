'use client'

/**
 * ScanItemCard — per-item drilldown UI shared across the three scan
 * surfaces (in-store shopping, home inventory, shopping-list build).
 *
 * Ergonomic contract: user has one hand to scan / hold the package
 * and one hand to interact, so every action is a single thumb-reach
 * tap. Image is large at the top with tap-to-enlarge; primary CTA
 * (scan) is the bottom button; quantity stepper sits between them.
 *
 * Why a separate leaf component (vs. extending SequentialShoppingFlow):
 * the existing Sequential flow has 9 steps and 5 sub-modals tuned for
 * tap-to-purchase from /shopping. In-store mode wants a much simpler
 * shape — image + qty + scan + maybe-photo. Building a new leaf keeps
 * that simplicity uncoupled from the heavier flow; later, Sequential
 * can be migrated to consume this primitive (separate ticket) without
 * impacting today's working callers.
 *
 * Controlled-input pattern: parent owns `quantity` so the value is
 * preserved if the parent re-renders (e.g. fullscreen image overlay
 * mounts/unmounts), and so the parent can use the value when a scan
 * succeeds without round-tripping through internal state.
 */

import { useState } from 'react'

interface ScanItemCardProps {
  item: {
    id: string
    productName: string
    brand: string
    /** Empty string when product has no curated image yet. */
    imageUrl: string
    /** Container size + unit shown under the title (e.g., "2.8 oz"). */
    sizeLabel?: string
    /** Optional context line (e.g., "Last bought 2 wks ago"). */
    secondaryLabel?: string
  }
  /**
   * Information rows below the primary CTA — Instacart's per-item
   * card pattern (Location, Price, etc.). Pure display; parent
   * computes labels/values from whatever data it has.
   */
  infoRows?: Array<{ label: string; value: string }>
  /** Current quantity value (controlled). */
  quantity: number
  onQuantityChange: (quantity: number) => void
  /** Camera scanner request — parent opens the BarcodeScanner. */
  onScanRequested: () => void
  /**
   * Photo-capture request — parent opens the camera in still-photo
   * mode so the user can contribute a product image. Shown only when
   * `showAddPhoto` is true (typically when imageUrl is empty).
   */
  onPhotoRequested?: () => void
  /** Return to the parent list without changing this item's state. */
  onCancel: () => void
  /** Opt-in: render the "Add Photo" button. */
  showAddPhoto?: boolean
  /**
   * Open an expiration picker for this item. Stage 2a: small
   * affordance below the info rows so the shopper can stamp an
   * expiry while at the shelf instead of guessing later.
   */
  onCheckExpiration?: () => void
  /**
   * "Can't find item" — moves the row to IN-REVIEW for a family
   * member to suggest a replacement or remove it. Stage 2b wires
   * the actual state transition; today this is a Stage-2b stub
   * so the affordance is in place for users to discover.
   */
  onCantFindItem?: () => void
  /**
   * Family-member context for the "Message <name>" affordance.
   * Phase 3 (family-meal PRD) populates this from the row's
   * forPatientId. Today: typically undefined → message link
   * stays hidden.
   */
  forMember?: { name: string }
  /**
   * Open chat scoped to this item + the family member it's for.
   * Wired in Phase 1 of the in-app chat PRD; if not provided, the
   * Message link is suppressed regardless of forMember.
   */
  onMessageFor?: () => void
  /** Disable inputs while a parent operation is in flight. */
  disabled?: boolean
}

export function ScanItemCard({
  item,
  infoRows,
  quantity,
  onQuantityChange,
  onScanRequested,
  onPhotoRequested,
  onCancel,
  showAddPhoto = false,
  onCheckExpiration,
  onCantFindItem,
  forMember,
  onMessageFor,
  disabled = false,
}: ScanItemCardProps) {
  const [imageEnlarged, setImageEnlarged] = useState(false)

  const decrement = () => onQuantityChange(Math.max(1, quantity - 1))
  const increment = () => onQuantityChange(quantity + 1)

  return (
    <div className="flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      {/* Header bar — X close only. Chat lives in the parent's
          navbar (ActiveShoppingMode header) so we don't duplicate
          the affordance; the per-item card delegates to "Message
          <member>" in the link-style action stack below. */}
      <div className="px-4 py-3 flex items-center">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="text-foreground text-2xl leading-none w-8 h-8 flex items-center justify-center disabled:opacity-50"
          aria-label="Back to list"
        >
          ✕
        </button>
      </div>

      {/* Image — centered, capped height. Tap to enlarge fullscreen. */}
      <div className="px-4 pb-4 flex justify-center">
        <div className="w-full max-w-xs h-44 bg-muted rounded flex items-center justify-center overflow-hidden">
          {item.imageUrl ? (
            <button
              type="button"
              onClick={() => setImageEnlarged(true)}
              className="w-full h-full"
              aria-label="Enlarge product image"
            >
              <img
                src={item.imageUrl}
                alt={item.productName}
                className="w-full h-full object-contain"
              />
            </button>
          ) : (
            <span className="text-6xl" aria-label="No image">
              📦
            </span>
          )}
        </div>
      </div>

      {/* Title with inline quantity prefix + size subtitle. Qty is
          driven by the controlled `quantity` prop so it stays in
          sync with the stepper below. */}
      <div className="px-4 pb-4">
        <h2 className="text-xl font-semibold text-foreground leading-tight">
          <span className="font-bold">{quantity} ×</span> {item.productName}
        </h2>
        {item.sizeLabel && (
          <p className="text-sm text-muted-foreground mt-1">{item.sizeLabel}</p>
        )}
        {item.brand && (
          <p className="text-sm text-muted-foreground mt-1">{item.brand}</p>
        )}
        {item.secondaryLabel && (
          <p className="text-xs text-muted-foreground mt-1">{item.secondaryLabel}</p>
        )}
      </div>

      {/* Primary CTA — green Found item button. Functionally fires
          the scan camera; same handler as before. */}
      <div className="px-4 pb-4">
        <button
          type="button"
          onClick={onScanRequested}
          disabled={disabled}
          className="w-full px-6 py-4 bg-success text-white rounded-lg font-semibold text-base disabled:opacity-50 active:bg-success-hover"
        >
          Found item
        </button>
      </div>

      {/* Info rows — Location / Price / etc., parent-supplied. Match
          Instacart's flat key-value list under the green CTA. */}
      {infoRows && infoRows.length > 0 && (
        <div className="px-4 pb-2 border-t border-border pt-3">
          {infoRows.map((row, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{row.label}</span>
              <span className="text-foreground font-medium">{row.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quantity stepper — Instacart's flow doesn't allow qty
          adjustment (their orders are pre-set); ours does because
          the shopper may grab more/fewer than originally requested
          at the shelf. Secondary visual weight. */}
      <div className="px-4 pb-3 pt-2 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Quantity</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || quantity <= 1}
            className="w-10 h-10 rounded-full bg-muted text-foreground text-xl font-bold disabled:opacity-30 active:bg-muted/80"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[2.5rem] text-center text-lg font-bold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={disabled}
            className="w-10 h-10 rounded-full bg-muted text-foreground text-xl font-bold disabled:opacity-30 active:bg-muted/80"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Secondary link-style actions stack — matches Instacart's
          per-item card pattern: Check expiration / Can't Find Item
          / Message <member> / Add product photo. Each row is
          opt-in (parent provides handler), so cards adapt to
          available data without empty rows. Section is hidden
          entirely when none are active. */}
      {(onCheckExpiration ||
        onCantFindItem ||
        onMessageFor ||
        (showAddPhoto && onPhotoRequested)) && (
        <div className="px-4 pb-4 border-t border-border pt-3 flex flex-col items-start gap-3">
          {onCheckExpiration && (
            <button
              type="button"
              onClick={onCheckExpiration}
              disabled={disabled}
              className="text-sm font-medium text-primary disabled:opacity-50"
            >
              Check expiration date
            </button>
          )}
          {onCantFindItem && (
            <button
              type="button"
              onClick={onCantFindItem}
              disabled={disabled}
              className="text-sm font-medium text-primary disabled:opacity-50"
            >
              Can&apos;t find item
            </button>
          )}
          {onMessageFor && (
            <button
              type="button"
              onClick={onMessageFor}
              disabled={disabled}
              className="text-sm font-medium text-primary disabled:opacity-50"
            >
              Message {forMember?.name ?? 'family'}
            </button>
          )}
          {showAddPhoto && onPhotoRequested && (
            <button
              type="button"
              onClick={onPhotoRequested}
              disabled={disabled}
              className="text-sm font-medium text-primary disabled:opacity-50"
            >
              Add product photo
            </button>
          )}
        </div>
      )}

      {/* Fullscreen image overlay — tap anywhere to dismiss. */}
      {imageEnlarged && item.imageUrl && (
        <div
          onClick={() => setImageEnlarged(false)}
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          role="button"
          aria-label="Dismiss enlarged image"
        >
          <img
            src={item.imageUrl}
            alt={item.productName}
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </div>
  )
}
