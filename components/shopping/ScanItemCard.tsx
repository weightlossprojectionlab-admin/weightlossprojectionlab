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
    /** Optional context surfaced under the name (e.g., "Last bought 2 wks ago"). */
    secondaryLabel?: string
  }
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
  /** Disable inputs while a parent operation is in flight. */
  disabled?: boolean
}

export function ScanItemCard({
  item,
  quantity,
  onQuantityChange,
  onScanRequested,
  onPhotoRequested,
  onCancel,
  showAddPhoto = false,
  disabled = false,
}: ScanItemCardProps) {
  const [imageEnlarged, setImageEnlarged] = useState(false)

  const decrement = () => onQuantityChange(Math.max(1, quantity - 1))
  const increment = () => onQuantityChange(quantity + 1)

  return (
    <div className="flex flex-col bg-card rounded-lg border border-border overflow-hidden">
      {/* Image — large, tap to enlarge. */}
      <div className="relative w-full aspect-square bg-muted flex items-center justify-center">
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
          <div className="text-center px-4">
            <div className="text-6xl mb-2">📦</div>
            <p className="text-sm text-muted-foreground">No image yet</p>
          </div>
        )}
      </div>

      {/* Name + brand + secondary label. */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-lg font-bold text-foreground leading-tight">
          {item.productName}
        </h2>
        {item.brand && (
          <p className="text-sm text-muted-foreground mt-0.5">{item.brand}</p>
        )}
        {item.secondaryLabel && (
          <p className="text-xs text-muted-foreground mt-1">{item.secondaryLabel}</p>
        )}
      </div>

      {/* Quantity stepper — large touch targets. */}
      <div className="px-4 py-4 flex items-center justify-between border-b border-border">
        <span className="text-sm font-medium text-foreground">Quantity</span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={decrement}
            disabled={disabled || quantity <= 1}
            className="w-12 h-12 rounded-full bg-muted text-foreground text-2xl font-bold disabled:opacity-30 active:bg-gray-300"
            aria-label="Decrease quantity"
          >
            −
          </button>
          <span className="min-w-[3rem] text-center text-2xl font-bold tabular-nums">
            {quantity}
          </span>
          <button
            type="button"
            onClick={increment}
            disabled={disabled}
            className="w-12 h-12 rounded-full bg-muted text-foreground text-2xl font-bold disabled:opacity-30 active:bg-gray-300"
            aria-label="Increase quantity"
          >
            +
          </button>
        </div>
      </div>

      {/* Action buttons — primary scan at bottom for thumb reach. */}
      <div className="p-4 space-y-2">
        <button
          type="button"
          onClick={onScanRequested}
          disabled={disabled}
          className="w-full px-6 py-4 bg-primary text-white rounded-lg font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 active:bg-primary-hover"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan Item
        </button>

        {showAddPhoto && onPhotoRequested && (
          <button
            type="button"
            onClick={onPhotoRequested}
            disabled={disabled}
            className="w-full px-6 py-3 bg-muted text-foreground rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:bg-gray-300"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Add Photo
          </button>
        )}

        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="w-full px-6 py-3 text-muted-foreground rounded-lg font-medium text-sm disabled:opacity-50"
        >
          Cancel
        </button>
      </div>

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
