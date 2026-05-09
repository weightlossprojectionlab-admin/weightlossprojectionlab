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
 *   - playStepDoneChime — synthesized two-note doorbell from
 *     lib/cook-chime.ts (no asset dependency).
 */

import { Fragment, useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import {
  ChatBubbleOvalLeftIcon,
  PlusIcon,
  TrashIcon,
  EllipsisVerticalIcon,
  CameraIcon,
  ShareIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  markItemAsPurchased,
  markItemAsFoundInStore,
  linkBarcodeToManualItem,
  logStoreVisit,
  deleteShoppingItem,
  updateShoppingItem,
} from '@/lib/shopping-operations'
import { addProductImage } from '@/lib/product-image-upload'
import { barcodeVariants } from '@/lib/barcode-variants'
import { playStepDoneChime } from '@/lib/cook-chime'
import type { ShoppingItem } from '@/types/shopping'
import { ScanItemCard } from './ScanItemCard'
import { ReceiptCaptureSurface } from './ReceiptCaptureSurface'
import { ReceiptReviewModal } from './ReceiptReviewModal'
import { extractReceiptFromImages, type ReceiptOCRResponse } from '@/lib/ocr-receipt'

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
  const [scannerOpen, setScannerOpen] = useState(false)
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // 2.4 — Summary screen state. End button opens this; Save & exit
  // logs the StoreVisit then router.backs.
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [summaryStoreName, setSummaryStoreName] = useState('')
  // Skipped-items decision — explicit either/or instead of a passive default.
  // Required when there ARE skipped items: the purchase-complete gate stays
  // disabled until the user picks. Forces an active decision rather than
  // letting stale items sit on the list silently.
  //   null   = no decision yet (gates Confirm Purchase)
  //   'remove' = bulk-delete on confirm
  //   'keep'   = leave on list for next trip
  const [summarySkippedDecision, setSummarySkippedDecision] = useState<'remove' | 'keep' | null>(
    null,
  )
  // Convenience derived value used at confirm-time and in the existing
  // delete loop. Replaces the old `summaryRemoveSkipped` flag.
  const summaryRemoveSkipped = summarySkippedDecision === 'remove'
  const [summarySaving, setSummarySaving] = useState(false)
  // Gating checkbox on the trip summary — Confirm Purchase only
  // enables once the shopper confirms checkout completed at the
  // register. Without this, items could land in inventory before
  // the user actually paid for them.
  const [transactionConfirmed, setTransactionConfirmed] = useState(false)
  // List view tab — TO-PICK (still need to find) | IN-REVIEW
  // (parked items pending a decision: out-of-stock, brand mismatch
  // the shopper wants to think on, items being messaged about) |
  // DONE (already marked found this trip). IN-REVIEW state on
  // items lights up in Stage 2b (out-of-stock / substitution flow);
  // the tab structure is in place now so it doesn't appear later
  // as a surprise when the data starts populating.
  const [listTab, setListTab] = useState<'to-pick' | 'in-review' | 'done'>('to-pick')

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
      setSummarySkippedDecision(null)
      setTransactionConfirmed(false)
      setAdjustQtyTarget(null)
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
  // Derive rows from sessionItems (preserves session order + membership)
  // crossed with liveItemsById (real-time deletes / updates from
  // useShopping's onSnapshot subscription).
  //
  // Deletion handling: when a row is removed via the trash button, the
  // Firestore onSnapshot fires, useShopping re-emits items WITHOUT the
  // deleted row, liveItemsById drops that id, and we SKIP it here. The
  // previous `?? snap` fallback was resurrecting the cached snapshot —
  // deleted items kept showing until session re-open. Now the trash
  // tap reflects in the UI within ~one frame of the Firestore round-trip.
  //
  // totalCount also derives from the live filtered count (not raw
  // sessionItems.length) so "1 of 3 found" doesn't keep counting items
  // the user explicitly dropped from the list.
  const orderedSessionRows = useMemo(() => {
    const pending: ShoppingItem[] = []
    const found: ShoppingItem[] = []
    for (const snap of sessionItems) {
      const live = liveItemsById.get(snap.id)
      if (!live) continue // deleted — drop from rows
      if (live.foundInStore || !live.needed) {
        found.push(live)
      } else {
        pending.push(live)
      }
    }
    return { pending, found }
  }, [sessionItems, liveItemsById])

  const totalCount = orderedSessionRows.pending.length + orderedSessionRows.found.length
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
  }

  const closeItem = () => {
    setActiveItemId(null)
    setPendingConfirm(null)
  }

  // Per-row "remove from list" — friction-minimum tap target with a real
  // UI confirmation modal (NOT browser native confirm — looks broken on
  // mobile and out of step with the design language). Available on both
  // TO-PICK and DONE rows so the shopper can drop an item from either
  // state without leaving the active screen. Confirmation target carries
  // the full item so the modal can show thumbnail + name for clarity.
  const [removeConfirmTarget, setRemoveConfirmTarget] = useState<ShoppingItem | null>(null)
  const [removeSubmitting, setRemoveSubmitting] = useState(false)

  const requestRemoveItem = (item: ShoppingItem, event?: React.MouseEvent) => {
    if (event) event.stopPropagation()
    setRemoveConfirmTarget(item)
  }

  // Cancel-trip prompt — surfaces when the user removes the last item from
  // an active session (deliberately or by accident). An empty trip is
  // useless; prompting lets them either bail out cleanly or stay in to
  // re-build via the + Add button. Without this prompt, users would sit on
  // a "0 of 0 found" screen wondering what to do next.
  const [showCancelTripPrompt, setShowCancelTripPrompt] = useState(false)

  // 3-dot menu — header overflow for less-frequent actions (Snap receipt,
  // Message family, Export list, Cancel trip). Bottom sheet on mobile so
  // each option gets a real tap target instead of cramming a popover.
  // Some entries are semantic placeholders for features we'll wire later
  // (receipt OCR, in-app chat, share/export); the menu structure defines
  // the IA up front so each feature lands in a known place.
  const [tripMenuOpen, setTripMenuOpen] = useState(false)

  // Receipt capture surface — Phase A of the OCR feature. Opens fullscreen
  // camera + multi-shot stack; Done returns the captured image array.
  // Two entry points:
  //   - 'mid-trip': user opened it via the 3-dot menu. Closing returns to
  //     the trip view (don't exit the active session).
  //   - 'post-checkout': auto-opened after handleConfirmPurchase succeeds,
  //     because the receipt is fresh in the user's hand right at that
  //     moment. Closing here exits the active shopping session via
  //     onClose() — the trip is over either way.
  // Phase A is no-OCR; Phase B will POST captures to /api/ocr/receipt and
  // surface a results-review screen.
  const [receiptCaptureMode, setReceiptCaptureMode] = useState<
    'closed' | 'mid-trip' | 'post-checkout'
  >('closed')
  const receiptCaptureOpen = receiptCaptureMode !== 'closed'

  // Phase B — receipt OCR processing state. After capture closes, we POST
  // the images to /api/ocr/receipt and surface a fullscreen "Reading
  // receipt…" overlay (Gemini takes 5–30s on multi-shot receipts, so a
  // toast isn't enough feedback). On success we hold the parsed result
  // here for Phase C's review-and-apply modal to consume; for now we
  // surface a summary toast so the user can sanity-check OCR quality.
  const [receiptOcrProcessing, setReceiptOcrProcessing] = useState(false)
  const [receiptOcrResult, setReceiptOcrResult] = useState<ReceiptOCRResponse | null>(null)

  const confirmRemoveItem = async () => {
    const item = removeConfirmTarget
    if (!item) return
    setRemoveSubmitting(true)
    // Snapshot the live total BEFORE the delete fires. If we're at 1 and
    // about to delete it, the post-delete state will be 0 — that's our
    // empty-trip trigger.
    const willBeEmpty = totalCount === 1
    try {
      await deleteShoppingItem(item.id)
      // If the user just removed the active item, close the per-item card.
      if (activeItemId === item.id) closeItem()
      toast.success(`Removed: ${item.productName}`)
      setRemoveConfirmTarget(null)
      if (willBeEmpty) {
        setShowCancelTripPrompt(true)
      }
    } catch (err) {
      logger.error('[ActiveShopping] remove failed', err as Error, { itemId: item.id })
      toast.error('Could not remove item. Try again.')
    } finally {
      setRemoveSubmitting(false)
    }
  }

  // Friction-minimum scan flow — every successful scan fulfills the active
  // item AT THE LIST QUANTITY immediately. No qty-confirm modal in the
  // common case (shopper grabbed what the list asked for, hardly anyone
  // grabs a different number). Edge case (shelf had 1, list said 2): the
  // success toast carries a "Got 2 — tap to adjust" affordance so the user
  // can correct without backtracking. The Adjust path opens
  // QtyAdjustModal (below) which is the only place the modal still
  // surfaces.
  //
  // North star (per user direction): get the shopper out of the store fast.
  // Every modal between scan and "next item" is friction. The tappable
  // toast keeps adjustment possible without imposing it on the 95% case.
  const autoFulfillFromScan = (linkedBarcode?: string) => {
    if (!activeItem) return
    const qty = activeItem.quantity || 1
    void fulfillActiveItem(qty, linkedBarcode ? { linkedBarcode } : undefined)
  }

  // Pending adjustment — set when the user taps the toast affordance after
  // an auto-fulfill, indicating they want to change the qty. The modal
  // reads this to know which item + which originally-applied qty to adjust.
  const [adjustQtyTarget, setAdjustQtyTarget] = useState<{
    itemId: string
    productName: string
    listedQty: number
    appliedQty: number
    unit?: string
  } | null>(null)

  // Confirm the entered Quantity Found and persist. Writes the
  // foundInStore flag with the chosen quantity, optionally writing
  // a barcode link first for branches (b/c). Buzz + chime confirm
  // the scan was accepted; fires once per success path.
  const fulfillActiveItem = async (
    quantity: number,
    opts?: { linkedBarcode?: string }
  ) => {
    if (!activeItem) return
    setSubmitting(true)
    try {
      const userId = auth.currentUser?.uid

      if (opts?.linkedBarcode) {
        // Branch (b) or (c): write the barcode onto the row first,
        // then mark found-in-cart. The link helper also upserts
        // the catalog stub so the alias resolver finds it next scan.
        await linkBarcodeToManualItem(activeItem.id, opts.linkedBarcode)
      }

      // Scan-at-shelf is "found in cart" — NOT yet in inventory.
      // The transition to inStock + needed:false fires from the
      // trip summary's Confirm Purchase action after the user
      // confirms checkout cleared at the register.
      await markItemAsFoundInStore(activeItem.id, {
        quantity,
        purchasedBy: userId,
      })

      // Haptic + audible confirmation. Synthesized chime (no asset
      // file) so this works even when /notification.mp3 is missing.
      try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate(50)
        }
        playStepDoneChime()
      } catch {
        // Best-effort feedback; never block.
      }

      // Friction-minimum success toast. Carries enough info that the user
      // can verify the right thing happened (product name + qty) AND tap
      // to adjust if shelf reality didn't match list qty (partial / extra).
      // The Adjust path opens the qty modal — the only place that modal
      // surfaces, and only when the user explicitly asks for it.
      const fulfilledItem = activeItem
      const unit = fulfilledItem.unit ?? ''
      const unitLabel = quantity === 1 ? unit : `${unit}${unit && !unit.endsWith('s') ? 's' : ''}`
      const qtySummary = unit
        ? `${quantity} ${unitLabel.trim()}`
        : `${quantity}`
      toast.success(
        (t) => (
          <div className="flex items-center gap-3 max-w-xs">
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">
                ✓ Got {qtySummary}
              </div>
              <div className="text-xs opacity-80 truncate">
                {fulfilledItem.productName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id)
                setAdjustQtyTarget({
                  itemId: fulfilledItem.id,
                  productName: fulfilledItem.productName,
                  listedQty: fulfilledItem.quantity || 1,
                  appliedQty: quantity,
                  unit: fulfilledItem.unit,
                })
              }}
              className="text-xs font-semibold underline whitespace-nowrap"
            >
              Adjust
            </button>
          </div>
        ),
        { duration: 4000 },
      )
      closeItem()
    } catch (err) {
      logger.error('[ActiveShopping] mark-found failed', err as Error, {
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
        // Branch (a): exact match → friction-minimum auto-fulfill at list
        // qty. The success toast (fired inside fulfillActiveItem) is the
        // entry point to qty adjustment for the rare partial case.
        autoFulfillFromScan()
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
                  // Friction-minimum: the scanned barcode matched this
                  // OTHER item's barcode (branch d), so we switch active
                  // and immediately auto-fulfill at the OTHER item's
                  // list qty — no second scan, no qty modal. User can
                  // adjust via the success toast if needed.
                  setActiveItemId(otherMatch.id)
                  // Defer one frame so activeItem reflects the new id
                  // before fulfillActiveItem reads it.
                  setTimeout(() => {
                    void fulfillActiveItem(otherMatch.quantity || 1)
                  }, 0)
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

  // Confirm purchase: receives the trip's found-in-cart items
  // into inventory (sets inStock, needed:false, lastPurchased,
  // appends purchaseHistory via markItemAsPurchased — full
  // inventory write). Logs the StoreVisit, optionally removes
  // skipped items, then router.back via onClose. Inventory writes
  // never block the exit — even if a few fail, the user gets out
  // cleanly; partial state is recoverable.
  const handleConfirmPurchase = async () => {
    setSummarySaving(true)
    try {
      const userId = auth.currentUser?.uid

      // 1) Move foundInStore items into inventory. Each call sets
      //    inStock:true, needed:false, lastPurchased, and appends
      //    a purchaseHistory entry. Done sequentially so a single
      //    failure doesn't stop the rest.
      const foundFailures: string[] = []
      for (const it of orderedSessionRows.found) {
        try {
          await markItemAsPurchased(it.id, {
            quantity: it.quantity,
            unit: it.unit,
            store: summaryStoreName.trim() || undefined,
            foundInStore: true,
            purchasedBy: userId,
          })
        } catch (err) {
          logger.warn('[ActiveShopping] confirm-purchase write failed', {
            itemId: it.id,
            error: (err as Error).message,
          })
          foundFailures.push(it.productName)
        }
      }
      if (foundFailures.length > 0) {
        toast.error(
          `Couldn't update ${foundFailures.length} item${
            foundFailures.length > 1 ? 's' : ''
          } in inventory`
        )
      }

      // 2) Log the trip.
      if (userId) {
        const foundBarcodes = orderedSessionRows.found
          .map((it) => it.barcode)
          .filter((b): b is string => !!b)
        try {
          await logStoreVisit(
            userId,
            summaryStoreName.trim() || 'Unspecified store',
            // Geolocation not in scope for Stage 2a — placeholder
            // {0,0} keeps the StoreVisit type satisfied. Stage 2d
            // collects real coords for per-store layout learning.
            { latitude: 0, longitude: 0 },
            foundBarcodes
          )
        } catch (err) {
          logger.warn('[ActiveShopping] StoreVisit log failed', {
            error: (err as Error).message,
          })
        }
      }

      // 3) Optionally remove skipped (still-needed, not-found) items.
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
            `Couldn't remove ${failures.length} skipped item${
              failures.length > 1 ? 's' : ''
            }`
          )
        }
      }

      toast.success(
        `Purchase confirmed — ${foundCount} item${foundCount > 1 ? 's' : ''} added to inventory`,
      )
    } finally {
      setSummarySaving(false)
      // Auto-open the receipt capture surface — the receipt is fresh in
      // the user's hand right now, this is the highest-success-rate
      // moment to capture it. Skipping (X close) exits the trip; capturing
      // also exits after Done. The 'post-checkout' mode tells the surface's
      // close/complete handlers to fire onClose() to leave the active
      // session rather than just dismissing the surface.
      setReceiptCaptureMode('post-checkout')
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
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
          /* Header utility actions:
             1. "+ Add" — primary, frequent action: add a non-list item to
                the cart on the fly. Filled button so it stands out.
             2. "⋮ menu" — overflow for everything else (Snap receipt,
                Message family, Export list, Cancel trip). Bottom sheet
                surfaces those without crowding the header.
          */
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                toast('Add to cart on the fly — coming soon', { icon: '🛒' })
              }
              className="min-h-[44px] px-3 py-2 flex items-center gap-1.5 bg-primary text-white rounded-lg font-medium text-sm active:bg-primary-dark transition-colors"
              aria-label="Add item to cart"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add</span>
            </button>
            <button
              type="button"
              onClick={() => setTripMenuOpen(true)}
              className="min-h-[44px] min-w-[44px] p-2 bg-muted text-foreground rounded-lg active:bg-muted/80"
              aria-label="More trip options"
            >
              <EllipsisVerticalIcon className="w-5 h-5" />
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

          {/* Skipped items — required either/or decision before the user
              can confirm purchase. Two button-style options ("Remove from
              list" / "Keep for next trip") so the choice is explicit and
              both default outcomes are clearly named. The Confirm Purchase
              gate below stays disabled until this is answered. */}
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
              <p className="text-sm text-foreground mb-2">
                What do you want to do with{' '}
                {orderedSessionRows.pending.length === 1 ? 'it' : 'them'}?
              </p>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setSummarySkippedDecision('keep')}
                  className={`min-h-[48px] px-4 py-3 rounded-lg text-left text-sm font-medium border-2 transition-colors ${
                    summarySkippedDecision === 'keep'
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Keep for next trip
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Items stay on your shopping list.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setSummarySkippedDecision('remove')}
                  className={`min-h-[48px] px-4 py-3 rounded-lg text-left text-sm font-medium border-2 transition-colors ${
                    summarySkippedDecision === 'remove'
                      ? 'border-error bg-error/10 text-error-dark'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  }`}
                >
                  Remove from list
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    {orderedSessionRows.pending.length === 1 ? "We'll delete it" : "We'll delete them"}{' '}
                    when you confirm purchase.
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* Transaction confirmation gate — Confirm Purchase only enables
              once the shopper says checkout cleared at the register. Without
              this, items would land in inventory before the purchase was
              actually completed (over-budget item put back, brand swap, etc.).
              Additionally gated on the skipped-items decision so the user
              must consciously address those before checking out. */}
          {(() => {
            const skippedDecisionPending =
              orderedSessionRows.pending.length > 0 && summarySkippedDecision === null
            return (
          <div className="px-4 py-4 border-b border-border">
            <label
              className={`flex items-start gap-3 text-sm text-foreground ${
                skippedDecisionPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
              }`}
            >
              <input
                type="checkbox"
                checked={transactionConfirmed}
                onChange={(e) => setTransactionConfirmed(e.target.checked)}
                disabled={skippedDecisionPending}
                className="w-5 h-5 rounded border-border mt-0.5 disabled:cursor-not-allowed"
              />
              <span>
                I&apos;ve completed my purchase at the register.
                <span className="block text-xs text-muted-foreground mt-1">
                  {skippedDecisionPending
                    ? 'Choose what to do with skipped items first.'
                    : 'Found items will be added to your inventory.'}
                </span>
              </span>
            </label>
          </div>
            )
          })()}

          {/* Action buttons */}
          <div className="px-4 py-4 space-y-2">
            <button
              type="button"
              onClick={handleConfirmPurchase}
              disabled={summarySaving || !transactionConfirmed}
              className="w-full px-6 py-3 bg-success text-white rounded-lg font-semibold disabled:opacity-50 active:bg-success-hover"
            >
              {summarySaving
                ? 'Adding to inventory…'
                : `Confirm Purchase${
                    foundCount > 0 ? ` (${foundCount} item${foundCount > 1 ? 's' : ''})` : ''
                  }`}
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
              quantity: activeItem.quantity || 1,
            }}
            infoRows={buildInfoRows(activeItem)}
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
                      Go to Check Out
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
                          <li
                            key={item.id}
                            className="flex items-stretch active:bg-muted"
                          >
                            <button
                              type="button"
                              onClick={() => openItem(item)}
                              className="flex-1 px-4 py-3 flex items-center gap-3 text-left min-w-0"
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
                            {/* Trash — sits OUTSIDE the row's open-item button
                                so taps don't bubble. stopPropagation + its own
                                tap target. Confirmation modal handles the
                                destructive moment. */}
                            <button
                              type="button"
                              onClick={(e) => requestRemoveItem(item, e)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-error active:bg-muted/80 mr-2"
                              aria-label={`Remove ${item.productName} from list`}
                            >
                              <TrashIcon className="w-5 h-5" />
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
                  {/* "Go to Check Out" CTA at the top of the DONE tab —
                      the natural finish-line moment. Same handler as the
                      all-found empty state on TO-PICK. Copy mirrors the
                      physical action the shopper is about to take, not
                      the system action ("wrap up"). */}
                  <div className="px-4 py-3 border-b border-border">
                    <button
                      type="button"
                      onClick={handleEndPressed}
                      className="w-full px-6 py-3 bg-success text-white rounded-lg font-semibold active:bg-success-hover"
                    >
                      Go to Check Out ({orderedSessionRows.found.length}{' '}
                      {orderedSessionRows.found.length === 1 ? 'item' : 'items'})
                    </button>
                  </div>
                  <ul className="divide-y divide-border">
                    {orderedSessionRows.found.map((item) => (
                    <li
                      key={item.id}
                      className="px-4 py-3 flex items-center gap-3"
                    >
                      <div className="w-20 h-20 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0 opacity-60">
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
                      <div className="flex-1 min-w-0 opacity-60">
                        <p className="font-medium text-foreground truncate line-through">
                          <span className="font-bold">{item.quantity || 1} ×</span>{' '}
                          {item.productName}
                        </p>
                      </div>
                      <span className="text-success opacity-60">✓</span>
                      {/* Trash — drop the item from the list entirely (e.g.
                          "I scanned this but decided to put it back"). Full
                          opacity so the destructive affordance reads cleanly
                          even when the rest of the row is dimmed. */}
                      <button
                        type="button"
                        onClick={(e) => requestRemoveItem(item, e)}
                        className="min-h-[44px] min-w-[44px] p-2 text-muted-foreground hover:text-error active:bg-muted rounded-lg transition-colors"
                        aria-label={`Remove ${item.productName} from list`}
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </li>
                  ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Receipt capture (Phase A of OCR feature) — fullscreen camera +
          multi-shot stack. Done returns base64 image data URLs; Phase B
          will pipe those to /api/ocr/receipt + show a results review.
          Two entry modes (see receiptCaptureMode state above): 'mid-trip'
          dismisses back to the trip view, 'post-checkout' fires
          onClose() to exit the active session. */}
      <ReceiptCaptureSurface
        isOpen={receiptCaptureOpen}
        onClose={() => {
          const wasPostCheckout = receiptCaptureMode === 'post-checkout'
          setReceiptCaptureMode('closed')
          // Post-checkout exit path — the trip is over regardless of
          // whether the user captured anything. Mid-trip just dismisses.
          if (wasPostCheckout) onClose()
        }}
        onComplete={async (images) => {
          logger.info('[Receipt OCR] Sending captures to server', {
            count: images.length,
            mode: receiptCaptureMode,
          })
          const wasPostCheckout = receiptCaptureMode === 'post-checkout'
          // Close the camera first so the processing overlay is the only
          // surface visible while Gemini runs.
          setReceiptCaptureMode('closed')
          setReceiptOcrProcessing(true)
          let reviewOpened = false
          try {
            const result = await extractReceiptFromImages(images)
            logger.info('[Receipt OCR] Extraction complete', {
              store: result.store,
              itemCount: result.items.length,
              totalCents: result.totalCents,
              confidence: result.confidence,
            })
            // v1 only opens the review modal post-checkout. Mid-trip
            // captures (rare — user keeps shopping after a quick run)
            // still hit OCR but skip the review/apply step; the trip
            // itself is still in progress so applying prices then
            // would race with the post-checkout markItemAsPurchased
            // sequence. Mid-trip just acknowledges with a toast.
            if (wasPostCheckout) {
              setReceiptOcrResult(result)
              reviewOpened = true
            } else {
              const itemCount = result.items.length
              toast.success(
                `Receipt saved · ${itemCount} item${itemCount === 1 ? '' : 's'}`,
                { duration: 4000 },
              )
            }
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Receipt OCR failed.'
            logger.warn('[Receipt OCR] Extraction failed', { message })
            toast.error(message)
          } finally {
            setReceiptOcrProcessing(false)
            // Post-checkout exit only fires when there's no review modal
            // to wait on. If the review opened, its own close handler
            // calls onClose() — we don't want to unmount this component
            // while the modal still lives inside its tree.
            if (wasPostCheckout && !reviewOpened) onClose()
          }
        }}
      />

      {/* Receipt OCR processing overlay — fullscreen + same z-index family
          as the capture surface so it visually replaces it as Gemini
          runs. Gemini-2.5-flash on multi-shot Costco-length receipts
          can take 15–30s; a toast wouldn't be enough feedback and the
          user might double-tap "Snap receipt" thinking nothing
          happened. Phase C will swap the post-success path for a
          review modal; for now a summary toast already fired in
          onComplete. */}
      {receiptOcrProcessing && (
        <div className="fixed inset-0 z-[71] bg-black/85 flex items-center justify-center px-6">
          <div className="bg-card text-foreground rounded-2xl p-6 max-w-sm w-full text-center shadow-xl">
            <div className="mx-auto mb-4 h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            <p className="text-base font-semibold">Reading receipt…</p>
            <p className="text-sm text-muted-foreground mt-1">
              Long receipts can take up to 30 seconds. Hang tight.
            </p>
          </div>
        </div>
      )}

      {/* Phase C — Receipt review + match-and-apply. Opens automatically
          on a successful post-checkout OCR. The modal is responsible
          for calling onClose() (the parent's exit handler) when the
          user is done so we don't unmount this component while the
          modal still lives inside its tree. */}
      <ReceiptReviewModal
        isOpen={receiptOcrResult !== null}
        ocrResult={receiptOcrResult}
        tripItems={orderedSessionRows.found}
        onClose={() => {
          setReceiptOcrResult(null)
          // Post-checkout review is the trip's exit point — closing the
          // modal exits the active shopping session.
          onClose()
        }}
      />

      {/* Trip overflow menu — bottom sheet on mobile, mid-screen modal on
          desktop. Pre-populated with semantic options; placeholders toast
          for features not yet wired. The structure declares the IA so
          features land in known slots later (receipt OCR → "Snap receipt",
          in-app chat → "Message family", etc.). */}
      {tripMenuOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setTripMenuOpen(false)
          }}
        >
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col">
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="px-5 pt-3 pb-2">
              <h2 className="text-base font-semibold text-foreground">Trip options</h2>
            </div>
            <div className="flex flex-col">
              {/* Go to Check Out — quick access from anywhere in the trip
                  (also available at the all-found empty state + DONE tab). */}
              <button
                type="button"
                onClick={() => {
                  setTripMenuOpen(false)
                  handleEndPressed()
                }}
                disabled={foundCount === 0}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted disabled:opacity-50"
              >
                <CheckCircleIcon className="h-5 w-5 text-success flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  Go to Check Out
                </span>
                {foundCount > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {foundCount} found
                  </span>
                )}
              </button>

              {/* Snap receipt — Phase A live. Opens the camera surface;
                  Done returns captured image data URLs. Phase B will
                  send those to /api/ocr/receipt for parsing; Phase C
                  will surface a results-review screen that applies
                  prices to inventory. For now we just acknowledge the
                  capture so users can validate the flow. */}
              <button
                type="button"
                onClick={() => {
                  setTripMenuOpen(false)
                  setReceiptCaptureMode('mid-trip')
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted"
              >
                <CameraIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  Snap receipt
                </span>
              </button>

              {/* Message family — placeholder for in-app chat (PRD-in-app-
                  chat.md). Surfaces when family coordination is needed mid-
                  trip ("we ran out of bread, do you want me to substitute"). */}
              <button
                type="button"
                onClick={() => {
                  setTripMenuOpen(false)
                  toast('Family chat coming soon', { icon: '💬' })
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted"
              >
                <ChatBubbleOvalLeftIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  Message family
                </span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </button>

              {/* Export / share list — placeholder for sharing the list
                  (text someone, print, save PDF). Common ask for caregivers
                  who hand off the list to a sitter or relative. */}
              <button
                type="button"
                onClick={() => {
                  setTripMenuOpen(false)
                  toast('Share list — coming soon', { icon: '📤' })
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted"
              >
                <ShareIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-foreground">
                  Share list
                </span>
                <span className="text-xs text-muted-foreground">Coming soon</span>
              </button>

              {/* Cancel trip — destructive, separated below by visual
                  weight (red icon + label). Bails out without writing
                  anything to inventory (like the same-named option on
                  the empty-trip prompt). */}
              <button
                type="button"
                onClick={() => {
                  setTripMenuOpen(false)
                  setShowCancelTripPrompt(true)
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted"
              >
                <XCircleIcon className="h-5 w-5 text-error flex-shrink-0" />
                <span className="flex-1 text-sm font-medium text-error">Cancel trip</span>
              </button>

              {/* Cancel button (closes menu without action) */}
              <button
                type="button"
                onClick={() => setTripMenuOpen(false)}
                className="w-full px-5 py-4 text-sm font-medium text-muted-foreground border-t border-border active:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel-trip prompt — surfaces when the user just removed the last
          item from the session. Empty trip is useless; this prompt lets
          them bail out cleanly OR stay in to re-build via the + Add
          button. */}
      {showCancelTripPrompt && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCancelTripPrompt(false)
          }}
        >
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 flex flex-col gap-4">
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Your list is empty
            </h2>
            <p className="text-sm text-muted-foreground">
              You&apos;ve removed every item from this trip. Want to end the trip,
              or keep it open and add items as you go?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCancelTripPrompt(false)}
                className="flex-1 h-12 rounded-lg border border-border text-foreground hover:bg-muted active:bg-muted/80 transition-colors font-medium"
              >
                Keep shopping
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCancelTripPrompt(false)
                  // Exit active shopping. Same handler the X close in the
                  // header uses — no inventory writes (nothing was found).
                  onClose()
                }}
                className="flex-1 h-12 rounded-lg bg-error hover:bg-red-700 text-white font-semibold transition-colors"
              >
                End trip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove-from-list confirmation modal — opens when the user taps a
          trash icon on TO-PICK or DONE rows. Uses real UI confirm (not
          window.confirm) so the design language is consistent and mobile
          rendering is clean. Destructive button red, neutral default
          focuses on Cancel. */}
      {removeConfirmTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !removeSubmitting)
              setRemoveConfirmTarget(null)
          }}
        >
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 flex flex-col gap-4">
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg bg-error/10 flex items-center justify-center flex-shrink-0">
                <TrashIcon className="h-6 w-6 text-error" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-foreground">
                  Remove from list?
                </h2>
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {removeConfirmTarget.productName}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will remove the item from your shopping list. You can always
              add it again later.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setRemoveConfirmTarget(null)}
                disabled={removeSubmitting}
                className="flex-1 h-12 rounded-lg border border-border text-foreground hover:bg-muted active:bg-muted/80 transition-colors font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmRemoveItem}
                disabled={removeSubmitting}
                className="flex-1 h-12 rounded-lg bg-error hover:bg-red-700 text-white font-semibold transition-colors disabled:opacity-60"
              >
                {removeSubmitting ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Qty-adjust modal — opens ONLY when the user taps "Adjust" on a
          successful-scan toast. Friction-minimum design: the common case
          (shopper grabbed the listed qty) skips this entirely; partial /
          stock-up cases get an explicit, clear modal with semantic framing
          (needed N · got M) instead of a sparse stepper. */}
      {adjustQtyTarget && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAdjustQtyTarget(null)
          }}
        >
          <div className="bg-card w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl p-5 sm:p-6 flex flex-col gap-4">
            <div className="sm:hidden flex justify-center -mt-2 mb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">
                How many did you actually find?
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5 truncate">
                {adjustQtyTarget.productName}
              </p>
            </div>

            {(() => {
              // Live snapshot of the row so quantity reflects any prior
              // adjust (in case the user opens-adjusts-cancels-reopens).
              const live = liveItemsById.get(adjustQtyTarget.itemId)
              const currentQty = live?.quantity ?? adjustQtyTarget.appliedQty
              const needed = adjustQtyTarget.listedQty
              const tone =
                currentQty === 0
                  ? 'text-red-700'
                  : currentQty < needed
                    ? 'text-amber-700'
                    : 'text-green-700'
              const statusLabel =
                currentQty === 0
                  ? 'None found'
                  : currentQty < needed
                    ? `Partial — ${currentQty} of ${needed}`
                    : currentQty === needed
                      ? `All ${needed} found`
                      : `Got ${currentQty} (more than needed)`
              return (
                <>
                  <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Listed qty</span>
                    <span className="text-sm font-semibold text-foreground">{needed}</span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.max(0, currentQty - 1)
                        if (next === currentQty) return
                        void updateShoppingItem(adjustQtyTarget.itemId, { quantity: next })
                      }}
                      disabled={submitting || currentQty <= 0}
                      className="h-12 w-12 rounded-full border-2 border-border bg-card flex items-center justify-center text-2xl font-bold text-foreground active:bg-muted disabled:opacity-40"
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      inputMode="numeric"
                      value={currentQty}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10)
                        if (Number.isFinite(n) && n >= 0) {
                          void updateShoppingItem(adjustQtyTarget.itemId, { quantity: n })
                        }
                      }}
                      className="h-12 w-20 text-center text-2xl font-bold text-foreground border-2 border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      aria-label="Quantity"
                      min={0}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void updateShoppingItem(adjustQtyTarget.itemId, {
                          quantity: currentQty + 1,
                        })
                      }}
                      disabled={submitting}
                      className="h-12 w-12 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary active:bg-primary/20"
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>

                  <p className={`text-center text-sm font-medium ${tone}`}>
                    {statusLabel}
                  </p>

                  <button
                    type="button"
                    onClick={() => setAdjustQtyTarget(null)}
                    className="w-full h-12 rounded-lg bg-primary text-white font-semibold active:bg-primary-dark"
                  >
                    Done
                  </button>
                </>
              )
            })()}
          </div>
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

      {/* Barcode scanner overlay. context="purchase" so the modal
          title and instructions read for in-store shopping ("Scan
          Item" + "Position the barcode within the frame…") rather
          than the default meal-log copy ("Scan Food Barcode" + "log
          it as a meal"). */}
      <BarcodeScanner
        isOpen={scannerOpen}
        onScan={handleScan}
        onClose={() => setScannerOpen(false)}
        context="purchase"
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
                  autoFulfillFromScan(scanned)
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
