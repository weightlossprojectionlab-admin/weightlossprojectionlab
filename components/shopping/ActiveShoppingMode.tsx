'use client'

/**
 * Active Shopping Mode (Stage 2a) — full-screen overlay invoked from
 * the /shopping page's "Start Shopping" button.
 *
 * Flow:
 *   1. List view of needed items, header shows "X of Y found".
 *   2. User taps an item → ScanItemCard renders for that item.
 *   3. User adjusts qty if needed, taps Scan Item → BarcodeScanner.
 *   4. On scan: branch on result (a–d below), then return to the
 *      list with the item moved to "found" (or stay on the card on
 *      retake / cancel).
 *   5. User taps End → exits the mode (StoreVisit summary lives in
 *      a follow-up commit, 2.4).
 *
 * Scan branches (matches the approved plan):
 *   (a) Scanned barcode == this item's barcode (variant-aware) →
 *       buzz + chime, mark purchased + foundInStore + qty.
 *   (b) Item is a manual entry (no barcode) → confirmation modal
 *       "Is this <name>?" → on Yes, linkBarcodeToManualItem +
 *       branch (a) outcome. On No, return to scanner.
 *   (c) Mismatch (item HAS a barcode but scanned one differs) →
 *       confirmation modal "Barcode doesn't match. Is this still
 *       <name>?" → on Yes, linkBarcodeToManualItem (replaces the
 *       wrong stored barcode) + branch (a) outcome. On No, return
 *       to scanner.
 *   (d) Scanned barcode matches a DIFFERENT needed item → toast
 *       "That looks like <other>. Switch to that?" → on Switch,
 *       reroute the active card; on Stay, return to scanner.
 *
 * DRY notes:
 *   - BarcodeScanner — shared component, identical prop shape used
 *     by /shopping, /inventory, RecipeModal.
 *   - barcodeVariants — pure helper from lib/barcode-variants.ts;
 *     same matching logic the resolver uses on the server.
 *   - linkBarcodeToManualItem + addProductImage — Stage 2a.1
 *     primitives, surface-agnostic.
 *   - markItemAsPurchased — extended in this commit to accept
 *     foundInStore + purchasedBy options.
 *   - notification.mp3 — same chime CookingTimer uses.
 */

import { useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  markItemAsPurchased,
  linkBarcodeToManualItem,
} from '@/lib/shopping-operations'
import { addProductImage } from '@/lib/product-image-upload'
import { barcodeVariants } from '@/lib/barcode-variants'
import type { ShoppingItem } from '@/types/shopping'
import { ScanItemCard } from './ScanItemCard'

const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then((mod) => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

interface ActiveShoppingModeProps {
  isOpen: boolean
  onClose: () => void
  items: ShoppingItem[]
}

interface PendingConfirm {
  kind: 'manual-link' | 'mismatch'
  scannedBarcode: string
  itemBarcode?: string
}

export function ActiveShoppingMode({ isOpen, onClose, items }: ActiveShoppingModeProps) {
  // The list of items relevant to the active session — frozen on
  // open so newly-added rows mid-session don't shuffle the user's
  // place. Refreshed on every session open.
  const [sessionItems, setSessionItems] = useState<ShoppingItem[]>([])

  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [activeQuantity, setActiveQuantity] = useState(1)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)

  // Snapshot the items on open. After that, derive found/pending
  // status from the LIVE items prop (so the list updates as
  // markItemAsPurchased fires) but keep the original ordering.
  useEffect(() => {
    if (isOpen) {
      setSessionItems(items.filter((i) => i.needed))
      setActiveItemId(null)
      setPendingConfirm(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const liveItemsById = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    for (const it of items) map.set(it.id, it)
    return map
  }, [items])

  // Sort: pending items first (in original order), found items last
  // and visually distinct. Done in a memo so the order doesn't churn
  // every render.
  const orderedSessionRows = useMemo(() => {
    const pending: ShoppingItem[] = []
    const found: ShoppingItem[] = []
    for (const snap of sessionItems) {
      const live = liveItemsById.get(snap.id) ?? snap
      if (live.foundInStore || !live.needed) {
        found.push(live)
      } else {
        pending.push(live)
      }
    }
    return { pending, found }
  }, [sessionItems, liveItemsById])

  const totalCount = sessionItems.length
  const foundCount = orderedSessionRows.found.length

  const activeItem = activeItemId ? liveItemsById.get(activeItemId) ?? null : null

  // Tap-to-scan entry: open the per-item card.
  const openItem = (item: ShoppingItem) => {
    setActiveItemId(item.id)
    setActiveQuantity(item.quantity || 1)
  }

  const closeItem = () => {
    setActiveItemId(null)
    setPendingConfirm(null)
  }

  // Mark the active item purchased + foundInStore. The buzz + chime
  // is the user's confirmation that the scan was accepted — fires
  // once per success path.
  const fulfillActiveItem = async (opts?: { linkedBarcode?: string }) => {
    if (!activeItem) return
    setSubmitting(true)
    try {
      const userId = auth.currentUser?.uid

      if (opts?.linkedBarcode) {
        // Branch (b) or (c): write the barcode onto the row first,
        // then mark purchased. The link helper also upserts the
        // catalog stub so the alias resolver finds it next scan.
        await linkBarcodeToManualItem(activeItem.id, opts.linkedBarcode)
      }

      await markItemAsPurchased(activeItem.id, {
        quantity: activeQuantity,
        unit: activeItem.unit,
        foundInStore: true,
        purchasedBy: userId,
      })

      // Haptic + audible confirmation.
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50)
        }
        audioRef.current?.play().catch(() => {})
      } catch {
        // Best-effort feedback; never block.
      }

      toast.success(`Got it: ${activeItem.productName}`)
      closeItem()
    } catch (err) {
      logger.error('[ActiveShopping] mark-purchased failed', err as Error, {
        itemId: activeItem.id,
      })
      toast.error('Could not mark item as found. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // Branch logic for scan results.
  const handleScan = (rawBarcode: string) => {
    setScannerOpen(false)
    if (!activeItem) return

    const cleaned = (rawBarcode || '').replace(/\D/g, '').trim()
    if (!cleaned) {
      toast.error('Could not read that barcode')
      return
    }

    // Variant-aware match: any plausible representation of this
    // item's stored barcode (UPC-E, UPC-A, EAN-13, GTIN-14) counts
    // as a hit.
    const itemBarcode = activeItem.barcode
    if (itemBarcode) {
      const itemVariants = new Set(barcodeVariants(itemBarcode))
      const scannedVariants = barcodeVariants(cleaned)
      const matchesActive = scannedVariants.some((v) => itemVariants.has(v))
      if (matchesActive) {
        // Branch (a): exact match.
        void fulfillActiveItem()
        return
      }
    }

    // Branch (d): does this barcode match a DIFFERENT pending item?
    const scannedSet = new Set(barcodeVariants(cleaned))
    const otherMatch = orderedSessionRows.pending.find((it) => {
      if (it.id === activeItem.id || !it.barcode) return false
      const itVariants = barcodeVariants(it.barcode)
      return itVariants.some((v) => scannedSet.has(v))
    })
    if (otherMatch) {
      toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <span>
              That looks like <strong>{otherMatch.productName}</strong>. Switch to it?
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id)
                  setActiveItemId(otherMatch.id)
                  setActiveQuantity(otherMatch.quantity || 1)
                }}
                className="px-3 py-1 bg-primary text-white rounded text-sm"
              >
                Switch
              </button>
              <button
                onClick={() => toast.dismiss(t.id)}
                className="px-3 py-1 bg-muted text-foreground rounded text-sm"
              >
                Stay
              </button>
            </div>
          </div>
        ),
        { duration: 8000 }
      )
      return
    }

    // Branch (b): manual entry — no stored barcode. Confirm + link.
    if (!itemBarcode) {
      setPendingConfirm({ kind: 'manual-link', scannedBarcode: cleaned })
      return
    }

    // Branch (c): mismatch — item has a barcode but the scanned one
    // differs. Confirm with the user before overwriting.
    setPendingConfirm({
      kind: 'mismatch',
      scannedBarcode: cleaned,
      itemBarcode,
    })
  }

  // Photo capture handler — fires the hidden file input that has
  // capture=environment so phones default to the rear camera.
  const handlePhotoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file || !activeItem?.barcode) {
      setPhotoCaptureOpen(false)
      return
    }
    setSubmitting(true)
    try {
      await addProductImage(activeItem.barcode, file)
      toast.success('Photo added')
    } catch (err) {
      logger.error('[ActiveShopping] photo upload failed', err as Error)
      toast.error('Photo upload failed')
    } finally {
      setSubmitting(false)
      setPhotoCaptureOpen(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Notification chime (preloaded). */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-card sticky top-0">
        <div>
          <h1 className="text-base font-bold text-foreground">Shopping</h1>
          <p className="text-xs text-muted-foreground">
            {foundCount} of {totalCount} found
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium active:bg-gray-300"
        >
          End
        </button>
      </header>

      {/* Body */}
      {activeItem ? (
        <div className="flex-1 overflow-y-auto p-4">
          <ScanItemCard
            item={{
              id: activeItem.id,
              productName: activeItem.productName,
              brand: activeItem.brand,
              imageUrl: activeItem.imageUrl,
              sizeLabel: formatSizeLabel(activeItem),
              secondaryLabel:
                activeItem.lastPurchased
                  ? `Last bought ${formatDateAgo(activeItem.lastPurchased)}`
                  : undefined,
            }}
            infoRows={buildInfoRows(activeItem)}
            quantity={activeQuantity}
            onQuantityChange={setActiveQuantity}
            onScanRequested={() => setScannerOpen(true)}
            onPhotoRequested={
              activeItem.barcode
                ? () => {
                    setPhotoCaptureOpen(true)
                    photoInputRef.current?.click()
                  }
                : undefined
            }
            onCancel={closeItem}
            showAddPhoto={!activeItem.imageUrl && !!activeItem.barcode}
            disabled={submitting}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {totalCount === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <p>No items on your list to shop for.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {orderedSessionRows.pending.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => openItem(item)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left active:bg-muted"
                  >
                    <div className="w-20 h-20 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-3xl">📦</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title with bold qty prefix — Instacart
                          pattern, our typography tokens. */}
                      <p className="font-medium text-foreground">
                        <span className="font-bold">{item.quantity || 1} ×</span>{' '}
                        {item.productName}
                      </p>
                      {(item.brand || item.category) && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {[item.brand, item.category].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
              {orderedSessionRows.found.length > 0 && (
                <li className="px-4 py-2 bg-muted/30">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Found
                  </p>
                </li>
              )}
              {orderedSessionRows.found.map((item) => (
                <li
                  key={item.id}
                  className="px-4 py-3 flex items-center gap-3 opacity-60"
                >
                  <div className="w-20 h-20 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-3xl">📦</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate line-through">
                      <span className="font-bold">{item.quantity || 1} ×</span>{' '}
                      {item.productName}
                    </p>
                  </div>
                  <span className="text-success">✓</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Hidden file input — capture=environment puts phones on the
          rear camera by default. Triggered by the Add Photo button. */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoFile}
      />

      {/* Barcode scanner overlay. */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
      />

      {/* Confirmation modals — branches (b) and (c). */}
      {pendingConfirm && activeItem && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg shadow-xl max-w-sm w-full p-6">
            <h2 className="text-lg font-bold text-foreground mb-2">
              {pendingConfirm.kind === 'manual-link'
                ? `Is this ${activeItem.productName}?`
                : `Barcode doesn't match`}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {pendingConfirm.kind === 'manual-link'
                ? "We'll learn this barcode for next time so the scan goes straight through."
                : `Is this still ${activeItem.productName}? We'll update the linked barcode.`}
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  const scanned = pendingConfirm.scannedBarcode
                  setPendingConfirm(null)
                  void fulfillActiveItem({ linkedBarcode: scanned })
                }}
                className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium disabled:opacity-50"
              >
                Yes, link this barcode
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setPendingConfirm(null)
                  setScannerOpen(true)
                }}
                className="w-full px-6 py-3 bg-muted text-foreground rounded-lg font-medium disabled:opacity-50"
              >
                No, scan again
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setPendingConfirm(null)}
                className="w-full px-6 py-2 text-muted-foreground text-sm disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {photoCaptureOpen /* file picker is invisible; this is a placeholder for future inline UI */}
    </div>
  )
}

/**
 * Container size + unit pulled from Phase 2b fields when available
 * (e.g., "2.8 oz", "16 oz", "1 lb"). Returns undefined when the row
 * predates Phase 2a or didn't get a containerSize at scan-add.
 *
 * Mirrors Instacart's "2.8 oz" subtitle under the title.
 */
function formatSizeLabel(item: ShoppingItem): string | undefined {
  if (typeof item.containerSize === 'number' && item.containerSize > 0 && item.containerUnit) {
    // Strip trailing .0 to keep "16 oz" not "16.0 oz"
    const num = item.containerSize % 1 === 0
      ? String(item.containerSize)
      : item.containerSize.toFixed(2).replace(/\.?0+$/, '')
    return `${num} ${item.containerUnit}`
  }
  return undefined
}

/**
 * Build the info-rows list for the per-item card. Mirrors
 * Instacart's "Location: Snacks", "Price: $4.29" rows under the
 * green CTA. We use category as the Location proxy until per-store
 * aisle data exists (Stage 2d).
 */
function buildInfoRows(item: ShoppingItem): Array<{ label: string; value: string }> {
  const rows: Array<{ label: string; value: string }> = []
  if (item.category) {
    // Capitalize for display: 'produce' → 'Produce'
    const cat = item.category.charAt(0).toUpperCase() + item.category.slice(1).replace('-', ' ')
    rows.push({ label: 'Location', value: cat })
  }
  if (typeof item.expectedPriceCents === 'number' && item.expectedPriceCents > 0) {
    rows.push({
      label: 'Price',
      value: `$${(item.expectedPriceCents / 100).toFixed(2)}`,
    })
  }
  return rows
}

/**
 * Quick-and-dirty relative date for the secondaryLabel. Avoids
 * pulling in a heavy date library for one string. Uses calendar
 * weeks/days/months — good enough for "last bought" hint.
 */
function formatDateAgo(date: Date | string | { toDate?: () => Date }): string {
  let d: Date
  if (date instanceof Date) {
    d = date
  } else if (typeof date === 'string') {
    d = new Date(date)
  } else if (date && typeof (date as any).toDate === 'function') {
    d = (date as any).toDate()
  } else {
    return ''
  }
  const ms = Date.now() - d.getTime()
  if (ms < 0) return 'just now'
  const days = Math.floor(ms / (1000 * 60 * 60 * 24))
  if (days < 1) return 'today'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}
