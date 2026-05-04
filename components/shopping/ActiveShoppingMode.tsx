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

import { Fragment, useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import { ChatBubbleOvalLeftIcon } from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  markItemAsPurchased,
  linkBarcodeToManualItem,
  logStoreVisit,
  deleteShoppingItem,
} from '@/lib/shopping-operations'
import { addProductImage } from '@/lib/product-image-upload'
import { barcodeVariants } from '@/lib/barcode-variants'
import type { ShoppingItem } from '@/types/shopping'
import { ScanItemCard } from './ScanItemCard'
import { PurchaseConfirmation } from './PurchaseConfirmation'

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
  // 2.4 — Summary screen state. End button opens this; Save & exit
  // logs the StoreVisit then router.backs.
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryStoreName, setSummaryStoreName] = useState('')
  const [summaryRemoveSkipped, setSummaryRemoveSkipped] = useState(false)
  const [summarySaving, setSummarySaving] = useState(false)
  // PurchaseConfirmation modal — bulk-mark fallback for users who
  // shopped without scanning. Reuses the existing component as-is
  // (DRY) rather than re-implementing checkbox-multi-select logic
  // inside ActiveShoppingMode. Only one items-view is on screen at
  // a time (modal swap), so no list duplication.
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false)
  // List view tab — TO-PICK (still need to find) | IN-REVIEW
  // (parked items pending a decision: out-of-stock, brand mismatch
  // the shopper wants to think on, items being messaged about) |
  // DONE (already marked found this trip). IN-REVIEW state on
  // items lights up in Stage 2b (out-of-stock / substitution flow);
  // the tab structure is in place now so it doesn't appear later
  // as a surprise when the data starts populating.
  const [listTab, setListTab] = useState<'to-pick' | 'in-review' | 'done'>('to-pick')

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
      setSummaryOpen(false)
      setSummaryStoreName('')
      setSummaryRemoveSkipped(false)
      setBulkConfirmOpen(false)
      setListTab('to-pick')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const liveItemsById = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    for (const it of items) map.set(it.id, it)
    return map
  }, [items])

  // Walk-the-store category order. Items group into sections by
  // category, with sections ordered to minimize backtracking on a
  // typical store layout: perimeter (fresh) first, interior aisles
  // (shelf-stable) middle, far-back / non-food last. Categories
  // missing from this list fall through to the end via Infinity.
  const STORE_LAYOUT_ORDER: Record<string, number> = useMemo(
    () => ({
      produce: 0,
      bakery: 1,
      deli: 2,
      meat: 3,
      seafood: 4,
      dairy: 5,
      eggs: 6,
      herbs: 7,
      frozen: 8,
      spices: 9,
      condiments: 10,
      pantry: 11,
      beverages: 12,
      baby: 13,
      'pet-food': 14,
      'pet-supplies': 15,
      other: 99,
    }),
    []
  )

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

  // Group pending items by category so the shopper walks the store
  // section by section instead of zig-zagging across aisles. Sections
  // emerge in STORE_LAYOUT_ORDER; categories not in the map fall to
  // the end. Within a section, items keep their original session
  // order (avoids reshuffling under the user's finger mid-trip).
  const pendingByCategory = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>()
    for (const it of orderedSessionRows.pending) {
      const cat = it.category || 'other'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(it)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const oa = STORE_LAYOUT_ORDER[a] ?? 100
      const ob = STORE_LAYOUT_ORDER[b] ?? 100
      return oa - ob
    })
  }, [orderedSessionRows.pending, STORE_LAYOUT_ORDER])

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

  // End-of-session handler: if nothing was found, just exit (no
  // visit to log). Otherwise show the summary screen.
  const handleEndPressed = () => {
    if (foundCount === 0) {
      onClose()
      return
    }
    setSummaryOpen(true)
  }

  // Save & exit: log the StoreVisit, optionally remove skipped
  // items, then router.back via onClose. Saving never blocks the
  // exit — even if the visit log fails, the user gets out cleanly
  // and the next session still starts fresh.
  const handleSaveAndExit = async () => {
    setSummarySaving(true)
    try {
      const userId = auth.currentUser?.uid
      if (userId) {
        const foundBarcodes = orderedSessionRows.found
          .map((it) => it.barcode)
          .filter((b): b is string => !!b)
        try {
          await logStoreVisit(
            userId,
            summaryStoreName.trim() || 'Unspecified store',
            // Geolocation is not in scope for Stage 2a — placeholder
            // {0,0} keeps the StoreVisit type satisfied. Stage 2d
            // (per-store layout learning) will collect real coords.
            { latitude: 0, longitude: 0 },
            foundBarcodes
          )
        } catch (err) {
          logger.warn('[ActiveShopping] StoreVisit log failed', {
            error: (err as Error).message,
          })
        }
      }

      if (summaryRemoveSkipped) {
        const stillNeeded = orderedSessionRows.pending.filter(
          (it) => it.needed && !it.foundInStore
        )
        const failures: string[] = []
        for (const it of stillNeeded) {
          try {
            await deleteShoppingItem(it.id)
          } catch (err) {
            logger.warn('[ActiveShopping] failed to remove skipped item', {
              itemId: it.id,
              error: (err as Error).message,
            })
            failures.push(it.productName)
          }
        }
        if (failures.length > 0) {
          toast.error(
            `Couldn't remove ${failures.length} item${failures.length > 1 ? 's' : ''}`
          )
        }
      }

      toast.success(`Trip saved — ${foundCount} item${foundCount > 1 ? 's' : ''} found`)
    } finally {
      setSummarySaving(false)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Notification chime (preloaded). */}
      <audio ref={audioRef} src="/notification.mp3" preload="auto" />

      {/* Header */}
      <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-card sticky top-0">
        <div>
          <h1 className="text-base font-bold text-foreground">
            {summaryOpen ? 'Trip summary' : 'Shopping'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {foundCount} of {totalCount} found
          </p>
        </div>
        {!summaryOpen && (
          <div className="flex items-center gap-2">
            {orderedSessionRows.pending.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkConfirmOpen(true)}
                className="px-3 py-2 bg-muted text-foreground rounded-lg text-sm font-medium active:bg-muted/80"
              >
                Mark multiple
              </button>
            )}
            {/* Chat icon → in-app messaging entry point (PRD-in-
                app-chat.md, Phase 1). Today fires a placeholder
                toast; real chat lights up when chat ships. The
                trip-end gesture has moved to a Wrap up trip CTA
                in the DONE tab (and the all-found empty state),
                so the header is utility-only. */}
            <button
              type="button"
              onClick={() =>
                toast('Family chat coming soon', { icon: '💬' })
              }
              className="p-2 bg-muted text-foreground rounded-lg active:bg-muted/80"
              aria-label="Open family chat"
            >
              <ChatBubbleOvalLeftIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      {/* Body */}
      {summaryOpen ? (
        <div className="flex-1 overflow-y-auto">
          {/* Stats card */}
          <div className="px-4 py-6 text-center border-b border-border">
            <p className="text-4xl font-bold text-foreground">
              {foundCount}
              <span className="text-muted-foreground font-normal"> of {totalCount}</span>
            </p>
            <p className="text-sm text-muted-foreground mt-1">items found</p>
          </div>

          {/* Optional store name */}
          <div className="px-4 py-4 border-b border-border">
            <label
              htmlFor="trip-store-name"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Where did you shop? (optional)
            </label>
            <input
              id="trip-store-name"
              type="text"
              value={summaryStoreName}
              onChange={(e) => setSummaryStoreName(e.target.value)}
              placeholder="e.g., Trader Joe's, Kroger"
              maxLength={100}
              className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Skipped items + bulk-remove option */}
          {orderedSessionRows.pending.length > 0 && (
            <div className="px-4 py-4 border-b border-border">
              <p className="text-sm font-medium text-foreground mb-2">
                Skipped {orderedSessionRows.pending.length}{' '}
                {orderedSessionRows.pending.length === 1 ? 'item' : 'items'}
              </p>
              <ul className="space-y-1 mb-3">
                {orderedSessionRows.pending.map((it) => (
                  <li key={it.id} className="text-sm text-muted-foreground">
                    • {it.productName}
                  </li>
                ))}
              </ul>
              <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={summaryRemoveSkipped}
                  onChange={(e) => setSummaryRemoveSkipped(e.target.checked)}
                  className="w-4 h-4 rounded border-border"
                />
                Remove these from my list
              </label>
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                Otherwise they stay on the list for next time.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="px-4 py-4 space-y-2">
            <button
              type="button"
              onClick={handleSaveAndExit}
              disabled={summarySaving}
              className="w-full px-6 py-3 bg-success text-white rounded-lg font-semibold disabled:opacity-50 active:bg-success-hover"
            >
              {summarySaving ? 'Saving…' : 'Save & exit'}
            </button>
            <button
              type="button"
              onClick={() => setSummaryOpen(false)}
              disabled={summarySaving}
              className="w-full px-6 py-3 bg-muted text-foreground rounded-lg font-medium disabled:opacity-50 active:bg-muted/80"
            >
              Back to shopping
            </button>
          </div>
        </div>
      ) : activeItem ? (
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
            onCheckExpiration={() => {
              // TODO: open ExpirationPicker. Existing component lives
              // in components/shopping/ExpirationPicker.tsx and is
              // already used by /shopping's tap-to-purchase flow —
              // wiring it here is a small follow-up.
              toast('Expiration picker coming soon', { icon: '📅' })
            }}
            onCantFindItem={() => {
              // Stage 2b — moves the item to IN-REVIEW for a family
              // member to suggest a replacement or remove. Stub for
              // now so the affordance is discoverable; real
              // state-transition lands with the out-of-stock flow.
              toast('Out-of-stock flow coming in Stage 2b', { icon: '⏳' })
            }}
            onMessageFor={() => {
              // In-app chat (PRD-in-app-chat.md, Phase 1) wires the
              // real handler — context payload would include
              // sessionId, itemId, and the family member this row
              // is for. Today: placeholder toast so the link is
              // discoverable.
              toast('Family chat coming soon', { icon: '💬' })
            }}
            // forMember stays undefined for now → Message link
            // renders as "Message family". Once Phase 3 populates
            // forPatientId on rows, this becomes "Message <name>".
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
            <>
              {/* Tab strip — TO-PICK / IN-REVIEW / DONE. IN-REVIEW
                  is the "park for a decision" workspace: out-of-
                  stock items pending a sub, brand mismatches the
                  shopper wants to think on, items being messaged
                  about. The data populating it lives in Stage 2b;
                  the tab structure ships now so it's not a surprise
                  later. */}
              <div className="flex border-b border-border bg-card sticky top-0 z-10">
                <button
                  type="button"
                  onClick={() => setListTab('to-pick')}
                  className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    listTab === 'to-pick'
                      ? 'text-success border-b-2 border-success'
                      : 'text-muted-foreground border-b-2 border-transparent'
                  }`}
                >
                  {orderedSessionRows.pending.length} To-Pick
                </button>
                <button
                  type="button"
                  onClick={() => setListTab('in-review')}
                  className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    listTab === 'in-review'
                      ? 'text-success border-b-2 border-success'
                      : 'text-muted-foreground border-b-2 border-transparent'
                  }`}
                >
                  In Review
                </button>
                <button
                  type="button"
                  onClick={() => setListTab('done')}
                  className={`flex-1 px-3 py-3 text-xs font-semibold uppercase tracking-wide transition-colors ${
                    listTab === 'done'
                      ? 'text-success border-b-2 border-success'
                      : 'text-muted-foreground border-b-2 border-transparent'
                  }`}
                >
                  Done ({orderedSessionRows.found.length})
                </button>
              </div>

              {listTab === 'to-pick' ? (
                orderedSessionRows.pending.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-foreground text-lg font-medium">
                      All items found 🎉
                    </p>
                    <button
                      type="button"
                      onClick={handleEndPressed}
                      className="mt-4 px-6 py-3 bg-success text-white rounded-lg font-semibold active:bg-success-hover"
                    >
                      Wrap up trip
                    </button>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {/* Pending items grouped by category — section
                        headers minimize backtracking through the
                        store (produce → meat → dairy → frozen →
                        pantry). Sections render in store-walk
                        order; categories not in the layout map
                        fall to the end. */}
                    {pendingByCategory.map(([cat, catItems]) => (
                      <Fragment key={cat}>
                        <li className="px-4 py-2 bg-muted/30">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            {formatCategoryLabel(cat)}
                          </p>
                        </li>
                        {catItems.map((item) => (
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
                                {/* Title with bold qty prefix. */}
                                <p className="font-medium text-foreground">
                                  <span className="font-bold">{item.quantity || 1} ×</span>{' '}
                                  {item.productName}
                                </p>
                                {item.brand && (
                                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                                    {item.brand}
                                    {formatSizeLabel(item) ? ` • ${formatSizeLabel(item)}` : ''}
                                  </p>
                                )}
                              </div>
                            </button>
                          </li>
                        ))}
                      </Fragment>
                    ))}
                  </ul>
                )
              ) : listTab === 'in-review' ? (
                /* IN-REVIEW: items the shopper marked out-of-
                   stock at the store, waiting on a family member
                   to decide whether to suggest a replacement or
                   remove the item from the list. Two-party flow
                   (shopper + family admin) — distinct from
                   real-time decisions the shopper makes alone in
                   the per-item card. The data + actions populate
                   in Stage 2b. */
                <div className="p-8 text-center text-muted-foreground">
                  <p>Nothing in review.</p>
                  <p className="text-xs mt-2 max-w-xs mx-auto leading-relaxed">
                    When you can&apos;t find an item, marking it
                    out-of-stock will park it here while a family
                    member suggests a replacement or removes it
                    from the list.
                  </p>
                </div>
              ) : orderedSessionRows.found.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Nothing marked found yet.</p>
                  <p className="text-xs mt-1">Switch to To-Pick to start scanning.</p>
                </div>
              ) : (
                <>
                  {/* Wrap up trip CTA at the top of the DONE tab —
                      the natural finish-line moment. Same handler as
                      the all-found empty state on TO-PICK. */}
                  <div className="px-4 py-3 border-b border-border">
                    <button
                      type="button"
                      onClick={handleEndPressed}
                      className="w-full px-6 py-3 bg-success text-white rounded-lg font-semibold active:bg-success-hover"
                    >
                      Wrap up trip ({orderedSessionRows.found.length}{' '}
                      {orderedSessionRows.found.length === 1 ? 'item' : 'items'})
                    </button>
                  </div>
                  <ul className="divide-y divide-border">
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
                </>
              )}
            </>
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

      {/* Bulk-confirm modal — wraps PurchaseConfirmation as-is.
          DRY: same component, same backend (/api/shopping/confirm-
          purchases), no parallel implementation. Items aren't
          duplicated on screen because this is a modal swap, not an
          inline render. */}
      {bulkConfirmOpen && (
        <div className="fixed inset-0 z-[60] bg-background flex flex-col overflow-y-auto">
          <header className="px-4 py-3 border-b border-border flex items-center justify-between bg-card sticky top-0">
            <h2 className="text-base font-bold text-foreground">Mark multiple as purchased</h2>
            <button
              type="button"
              onClick={() => setBulkConfirmOpen(false)}
              className="text-foreground text-2xl leading-none w-8 h-8 flex items-center justify-center"
              aria-label="Close bulk confirm"
            >
              ✕
            </button>
          </header>
          <div className="flex-1 p-4">
            <PurchaseConfirmation
              pendingItems={orderedSessionRows.pending}
              onConfirm={() => {
                // useShopping is realtime — items will reflect via
                // the live subscription. Just close the modal.
                setBulkConfirmOpen(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pretty-print a category enum value for section headers
 * (`'pet-food'` → `'Pet Food'`, `'produce'` → `'Produce'`).
 */
function formatCategoryLabel(cat: string): string {
  return cat
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
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
 * Instacart's "Location: Snacks", "Price: $4.29", "UPC: ..." rows
 * under the green CTA. We use category as the Location proxy until
 * per-store aisle data exists (Stage 2d).
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
  if (item.barcode) {
    rows.push({ label: 'UPC', value: item.barcode })
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
