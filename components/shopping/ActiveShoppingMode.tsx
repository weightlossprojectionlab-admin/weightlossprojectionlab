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
  addOrUpdateShoppingItem,
} from '@/lib/shopping-operations'
import { addProductImage } from '@/lib/product-image-upload'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import { simplifyProduct } from '@/lib/openfoodfacts-api'
import { barcodeVariants } from '@/lib/barcode-variants'
import { playStepDoneChime } from '@/lib/cook-chime'
import { shoppingSessionManager } from '@/lib/shopping-session-manager'
import {
  comparePerishability,
  compareWaitCounter,
  compareFragility,
} from '@/lib/perishability-tiers'
import type { ShoppingItem } from '@/types/shopping'
import { ScanItemCard } from './ScanItemCard'
import { ReceiptCaptureSurface } from './ReceiptCaptureSurface'
import { ReceiptReviewModal } from './ReceiptReviewModal'
import { extractReceiptFromImages, type ReceiptOCRResponse } from '@/lib/ocr-receipt'
import { useLockedAction } from '@/hooks/useLockedAction'
import { LockClosedIcon } from '@heroicons/react/24/solid'

const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then((mod) => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

interface ActiveShoppingModeProps {
  isOpen: boolean
  onClose: () => void
  items: ShoppingItem[]
  /**
   * Optional duty this shopping trip is fulfilling. When set, completing
   * the trip (Confirm Purchase) auto-fires the duty-complete endpoint so
   * the caregiver doesn't have to mark the duty done as a second step.
   * Threaded through from /shopping/active?dutyId=<id>. Best-effort —
   * the failure is logged, but the trip exit still proceeds.
   */
  dutyId?: string
  /**
   * Active shopping_sessions doc id. Set by the page wrapper after
   * shoppingSessionManager.startSession resolves. Drives:
   *   • the announce-done bell fan-out (carries the sessionId in
   *     ShoppingDoneMetadata for the family's notification)
   *   • the endSession call after Confirm Purchase, which flips the
   *     session status to 'completed' and stamps endedAt
   * Null while the session is still being created OR if the caller
   * didn't wire one — in either case the fan-out / endSession steps
   * skip gracefully.
   */
  sessionId?: string | null
  /**
   * Owner uid this trip is FOR. Distinct from the actor: when a
   * caregiver shops on the owner's behalf, ownerId is the owner's uid
   * while auth.currentUser.uid is the caregiver's. Used to target the
   * /api/owners/[ownerId]/shopping/done endpoint. When unset, the trip
   * is solo-owner and no fan-out fires.
   */
  ownerId?: string
  /**
   * Display name of the store the caregiver picked on Start Shopping
   * (Phase 0b). When set, the header reads "Shopping at Walmart"
   * instead of just "Shopping" — gives the caregiver a visual reminder
   * of where they are. Passed through from the picker; falls back to
   * session.storeLocation.name when receipt OCR overrides post-trip.
   */
  storeName?: string
}

interface PendingConfirm {
  kind: 'manual-link' | 'mismatch'
  scannedBarcode: string
  itemBarcode?: string
}

export function ActiveShoppingMode({ isOpen, onClose, items, dutyId, sessionId, ownerId, storeName }: ActiveShoppingModeProps) {
  // Feature-access gates — terminated subscribers can view the trip
  // but can't scan, snap a receipt, or invoke AI features.
  const scanBarcodeLock = useLockedAction()
  const receiptOcrLock = useLockedAction()

  // The list of items relevant to the active session — frozen on
  // open so newly-added rows mid-session don't shuffle the user's
  // place. Refreshed on every session open.
  const [sessionItems, setSessionItems] = useState<ShoppingItem[]>([])

  const [activeItemId, setActiveItemId] = useState<string | null>(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const [photoCaptureOpen, setPhotoCaptureOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [submitting, setSubmitting] = useState(false)
  // "+ Add" header button → opens this dialog so the caregiver can add
  // a non-list item to the cart on the fly. The new item is created in
  // the caller's shopping list (assignedStoreId = current store, if
  // known) as already-purchased so it counts in the "X of Y found"
  // header AND lands in the inventory after the trip ends — same
  // outcome path as a scanned non-list item.
  const [addOnFlyOpen, setAddOnFlyOpen] = useState(false)
  const [addOnFlyName, setAddOnFlyName] = useState('')
  const [addOnFlyUpc, setAddOnFlyUpc] = useState('')
  const [addOnFlySubmitting, setAddOnFlySubmitting] = useState(false)
  // Tap-to-enlarge for the product thumbnails on TO-PICK and DONE.
  // Caregiver at the shelf needs to compare what's in front of them
  // to what's on the list — the 80×80 row thumb is too small to be
  // a reliable visual match. Tap pops a fullscreen overlay with the
  // big image; tap anywhere to close.
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; alt: string } | null>(null)
  // Scanner is reused for two flows: (a) confirming the active item's
  // barcode mid-trip (default), and (b) "Add on the fly" scan-to-add
  // from the dialog. handleScan branches on this flag so the existing
  // confirm logic stays unchanged for the active-item path.
  const [scannerMode, setScannerMode] = useState<'confirm' | 'add-on-fly'>('confirm')
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
  // section by section instead of zig-zagging across aisles. Section
  // order comes from the centralized rule chain in
  // lib/perishability-tiers.ts — same rules the owner-side smartSort
  // applies on /shopping:
  //
  //   1) Perishability tier — frozen LAST (universal cold-chain floor)
  //   2) Wait-counter — deli + seafood EARLIER within their tier
  //      (place the order first, retrieve near checkout)
  //   3) Fragility — bakery + eggs LATER within their tier
  //      (top-of-cart, less likely to crush)
  //   4) Category name — deterministic alphabetical tie-break
  //
  // Within a section, items keep their original session order (avoids
  // reshuffling under the user's finger mid-trip).
  const pendingByCategory = useMemo(() => {
    const groups = new Map<string, ShoppingItem[]>()
    for (const it of orderedSessionRows.pending) {
      const cat = it.category || 'other'
      if (!groups.has(cat)) groups.set(cat, [])
      groups.get(cat)!.push(it)
    }
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const pa = { category: a as ShoppingItem['category'] }
      const pb = { category: b as ShoppingItem['category'] }
      const tier = comparePerishability(pa, pb)
      if (tier !== 0) return tier
      const wc = compareWaitCounter(pa, pb)
      if (wc !== 0) return wc
      const fg = compareFragility(pa, pb)
      if (fg !== 0) return fg
      return a.localeCompare(b)
    })
  }, [orderedSessionRows.pending])

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

      // Record the scan event on the session — bumps itemsScanned
      // (drives the active-shoppers strip's "N items picked" line on
      // /family/dashboard) AND appends to scanSequence (Phase C ML
      // substrate: per-(caregiver, store) aisle-visit order). Best-
      // effort: failure logs but doesn't block the trip.
      try {
        await shoppingSessionManager.incrementItemsScanned({
          itemId: activeItem.id,
          category: activeItem.category,
        })
      } catch (err) {
        logger.warn('[ActiveShopping] scan-event capture failed', {
          itemId: activeItem.id,
          error: (err as Error).message,
        })
      }

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
    // "Add on the fly" scan path — opened from the dialog rather than
    // the active-item card. Route to the dedicated handler and bail
    // out of the confirm-active-item logic entirely.
    if (scannerMode === 'add-on-fly') {
      void handleAddOnFlyBarcode(rawBarcode)
      return
    }
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
  /**
   * Add-on-fly via barcode — shared by the scanner-driven path
   * (scannerMode === 'add-on-fly') and the typed-UPC path in the
   * dialog. DRY with /shopping/page.tsx's handleBarcodeScan: same
   * lookupBarcodeWithCache → simplifyProduct → addOrUpdateShoppingItem
   * pipeline, just dispatched from the active-mode dialog.
   *
   * Success path: known barcode → product fetched → row created at
   * needed:true / inStock:false → immediately markItemAsPurchased so
   * it counts as "found" in the trip header → appended to sessionItems
   * with the post-purchase shape → dialog closes.
   *
   * Not-found path: surface a hint that the barcode wasn't recognized
   * and clear the UPC field. The user can either re-scan, try a
   * different UPC, or fall through to the name-only path in the same
   * dialog (which attaches no barcode).
   */
  const handleAddOnFlyBarcode = async (rawBarcode: string) => {
    const cleaned = (rawBarcode || '').replace(/\D/g, '').trim()
    if (!cleaned) {
      toast.error('Could not read that barcode')
      return
    }
    if (addOnFlySubmitting) return
    setAddOnFlySubmitting(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not signed in')
      const actorUid = user.uid
      const householdUid = ownerId || actorUid

      const response = await lookupBarcodeWithCache(cleaned)
      const product = simplifyProduct(response)

      if (!product.found || !response.product) {
        toast.error('Couldn’t find that UPC — try the name instead')
        setAddOnFlyUpc('')
        return
      }

      const created = await addOrUpdateShoppingItem(
        householdUid,
        response.product,
        {
          inStock: false,
          needed: true,
          quantity: 1,
          householdId: householdUid,
          memberId: actorUid,
        },
      )
      // Mark foundInStore (NOT purchased) — purchase finalizes at the
      // trip's Confirm Purchase step, same path as items scanned off
      // the existing list. Marking purchased here would flip needed
      // to false and the parent's neededItems filter would strip the
      // row before it reached the UI.
      await markItemAsFoundInStore(created.id, {
        quantity: 1,
        purchasedBy: actorUid,
      })

      setSessionItems((prev) => [
        ...prev,
        {
          ...created,
          needed: true,
          foundInStore: true,
        },
      ])

      toast.success(`Added "${product.name}" to the cart`)
      setAddOnFlyUpc('')
      setAddOnFlyName('')
      setAddOnFlyOpen(false)
    } catch (err) {
      logger.error('[ActiveShoppingMode] add-on-fly barcode failed', err as Error)
      toast.error('Lookup failed — please try again')
    } finally {
      setAddOnFlySubmitting(false)
      // Always reset scanner mode after a barcode-driven add so the
      // next active-item scan goes through the confirm path.
      setScannerMode('confirm')
    }
  }

  /**
   * "+ Add" header button — create a non-list item on the fly during
   * an active shopping trip, then immediately mark it found. Same
   * end-state as scanning a non-list barcode (impulse purchase), but
   * driven by name entry for items without barcodes.
   *
   * Semantics:
   *   • New item belongs to the OWNER's shopping list (userId =
   *     ownerId in caregiver mode; auth uid in solo mode).
   *   • Created with needed:true, inStock:false so it goes through the
   *     markItemAsPurchased path that stamps lastPurchased + appends
   *     to purchaseHistory — same audit trail as a scanned non-list
   *     item.
   *   • Appended to sessionItems so the new row appears immediately,
   *     not on the next session re-open.
   *
   * Category auto-detect happens server-side via addOrUpdateShoppingItem's
   * pickCategory (uses CATEGORY_KEYWORDS on product_name). Future
   * iteration can surface that picker in the dialog if auto-detect
   * misclassifies; for v1 the trust-the-default behavior is fine.
   */
  const handleSubmitAddOnFly = async () => {
    const trimmed = addOnFlyName.trim()
    if (!trimmed || addOnFlySubmitting) return
    setAddOnFlySubmitting(true)
    try {
      const user = auth.currentUser
      if (!user) throw new Error('Not signed in')
      const actorUid = user.uid
      const householdUid = ownerId || actorUid

      const product = {
        code: '',
        product_name: trimmed,
        brands: '',
      } as any

      const created = await addOrUpdateShoppingItem(householdUid, product, {
        inStock: false,
        needed: true,
        quantity: 1,
        householdId: householdUid,
        memberId: actorUid,
      })

      // Mark foundInStore (NOT purchased) — same reasoning as the
      // barcode path: purchase finalizes at Confirm Purchase, and a
      // purchased item would have needed=false and get stripped by
      // the parent's neededItems filter before reaching the UI.
      await markItemAsFoundInStore(created.id, {
        quantity: 1,
        purchasedBy: actorUid,
      })

      // Append to sessionItems with the found-but-still-needed shape
      // so the row renders in the "found" bucket immediately, without
      // waiting for the snapshot listener round-trip.
      setSessionItems((prev) => [
        ...prev,
        {
          ...created,
          needed: true,
          foundInStore: true,
        },
      ])

      toast.success(`Added "${trimmed}" to the cart`)
      setAddOnFlyName('')
      setAddOnFlyOpen(false)
    } catch (err) {
      logger.error('[ActiveShoppingMode] add-on-fly failed', err as Error)
      toast.error('Could not add the item — please try again')
    } finally {
      setAddOnFlySubmitting(false)
    }
  }

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

      // 4) Fan out a 'shopping_done' bell notification to the owner +
      //    other household members. Only fires when ownerId is set
      //    (caregiver-on-behalf-of-owner trips); solo-owner trips don't
      //    need a self-announcement. Best-effort: any failure is logged
      //    but never blocks the trip exit.
      if (ownerId && sessionId && userId) {
        try {
          const user = auth.currentUser
          if (user) {
            const token = await user.getIdToken()
            const skippedCount = orderedSessionRows.pending.filter(
              (it) => it.needed && !it.foundInStore,
            ).length
            await fetch(`/api/owners/${ownerId}/shopping/done`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                sessionId,
                itemsFound: foundCount,
                ...(skippedCount > 0 ? { itemsSkipped: skippedCount } : {}),
                ...(summaryStoreName.trim()
                  ? { storeName: summaryStoreName.trim() }
                  : {}),
                ...(dutyId ? { fromDutyId: dutyId } : {}),
              }),
            }).catch((err) => {
              logger.warn('[ActiveShopping] announce-done failed', {
                sessionId,
                error: (err as Error).message,
              })
            })
          }
        } catch (err) {
          logger.warn('[ActiveShopping] announce-done threw', {
            sessionId,
            error: (err as Error).message,
          })
        }
      }

      // 5) End the shopping_sessions doc — flips status to 'completed'
      //    and stamps endedAt. Done AFTER the announce-done fetch so
      //    the server can still read the session for duration calc.
      //    Best-effort: failures are logged; the session manager has
      //    its own timeout-based safety net (2-hour absolute max).
      if (sessionId) {
        try {
          await shoppingSessionManager.endSession()
        } catch (err) {
          logger.warn('[ActiveShopping] endSession failed', {
            sessionId,
            error: (err as Error).message,
          })
        }
      }

      // 6) If this trip was tied to a household duty (caregiver tapped a
      //    grocery / errand / med-pickup card on the Today view, which
      //    routes here with ?dutyId=…), close that duty automatically.
      //    The shopping session IS how a shopping duty completes — no
      //    second tap. Best-effort: failure is logged + a soft toast so
      //    the caregiver can manually mark it from the worklist if
      //    needed, but the trip still exits cleanly.
      if (dutyId && userId) {
        try {
          const user = auth.currentUser
          if (user) {
            const token = await user.getIdToken()
            const res = await fetch(`/api/household-duties/${dutyId}/complete`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                feedback: `Completed via in-store shopping (${foundCount} item${foundCount === 1 ? '' : 's'})`,
              }),
            })
            if (!res.ok) {
              const body = await res.json().catch(() => ({}))
              logger.warn('[ActiveShopping] auto duty-complete failed', {
                dutyId,
                status: res.status,
                error: body?.error,
              })
              toast.error("Couldn't auto-close the duty — mark it done from your Today list.")
            }
          }
        } catch (err) {
          logger.warn('[ActiveShopping] auto duty-complete threw', {
            dutyId,
            error: (err as Error).message,
          })
        }
      }
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
          <h1 className="text-base font-bold text-foreground" data-testid="active-shopping-title">
            {summaryOpen
              ? 'Trip summary'
              : storeName
                ? `Shopping at ${storeName}`
                : 'Shopping'}
          </h1>
          <p className="text-xs text-muted-foreground">
            {foundCount} of {totalCount} found
          </p>
        </div>
        {!summaryOpen && (
          /* Header utility action: "⋮ menu" — overflow for the trip's
             auxiliary actions (Snap receipt, Message family, Export
             list, Cancel trip). Bottom sheet surfaces those without
             crowding the header. The primary "+ Add item" action
             moved to a fixed bottom bar (thumb-reachable, anchored
             above the iOS home indicator).
          */
          <button
            type="button"
            onClick={() => setTripMenuOpen(true)}
            className="min-h-[44px] min-w-[44px] p-2 bg-muted text-foreground rounded-lg active:bg-muted/80"
            aria-label="More trip options"
          >
            <EllipsisVerticalIcon className="w-5 h-5" />
          </button>
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
            onScanRequested={
              scanBarcodeLock.isLocked
                ? scanBarcodeLock.onLockedClick
                : () => setScannerOpen(true)
            }
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
                        <li
                          className="px-4 py-2 bg-muted/30"
                          data-testid={`category-section-${cat}`}
                        >
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
                              {/* Inner clickable area that intercepts the
                                  tap and opens the enlarged image overlay
                                  instead of bubbling up to openItem.
                                  Rendered as a div + role=button so the
                                  outer <button> doesn't nest a button
                                  (invalid HTML / a11y warning). */}
                              <div
                                role="button"
                                tabIndex={0}
                                aria-label={`Enlarge image of ${item.productName}`}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (item.imageUrl) {
                                    setEnlargedImage({
                                      url: item.imageUrl,
                                      alt: item.productName,
                                    })
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.stopPropagation()
                                    e.preventDefault()
                                    if (item.imageUrl) {
                                      setEnlargedImage({
                                        url: item.imageUrl,
                                        alt: item.productName,
                                      })
                                    }
                                  }
                                }}
                                className="w-20 h-20 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0 cursor-zoom-in"
                              >
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="w-full h-full object-contain pointer-events-none"
                                  />
                                ) : (
                                  <span className="text-3xl pointer-events-none">📦</span>
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
                      <button
                        type="button"
                        aria-label={`Enlarge image of ${item.productName}`}
                        onClick={() => {
                          if (item.imageUrl) {
                            setEnlargedImage({
                              url: item.imageUrl,
                              alt: item.productName,
                            })
                          }
                        }}
                        className="w-20 h-20 bg-muted rounded flex items-center justify-center overflow-hidden flex-shrink-0 opacity-60 cursor-zoom-in"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-contain pointer-events-none"
                          />
                        ) : (
                          <span className="text-3xl pointer-events-none">📦</span>
                        )}
                      </button>
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

      {/* Fixed bottom action bar — "Add item" anchored to the bottom
          of the viewport so it's thumb-reachable while the caregiver
          scrolls through the list. Sits as the last flex child of the
          fixed-inset-0 flex-col container, so it doesn't need its
          own `fixed` positioning. Safe-area inset keeps it above the
          iOS home indicator. Hidden on the summary screen — once the
          caregiver is checking out, the action menu changes context.
          z-index keeps it above the list but below modals (z-50 to
          z-60+ range). */}
      {!summaryOpen && (
        <div
          className="border-t border-border bg-card/95 backdrop-blur-sm px-4 pt-3"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            data-testid="active-add-on-fly"
            onClick={() => setAddOnFlyOpen(true)}
            className="w-full min-h-[52px] px-4 py-3 flex items-center justify-center gap-2 bg-primary text-white rounded-2xl font-semibold text-base active:bg-primary-dark active:scale-[0.99] transition-transform shadow-md"
            aria-label="Add item to cart"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add item</span>
          </button>
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
                  if (receiptOcrLock.isLocked) {
                    receiptOcrLock.onLockedClick()
                    return
                  }
                  setReceiptCaptureMode('mid-trip')
                }}
                className="w-full px-5 py-4 flex items-center gap-4 text-left border-t border-border active:bg-muted"
              >
                {receiptOcrLock.isLocked ? (
                  <LockClosedIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                ) : (
                  <CameraIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <span className="flex-1 text-sm font-medium text-foreground">
                  {receiptOcrLock.isLocked ? 'Snap receipt (locked)' : 'Snap receipt'}
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

      {/* Enlarged image overlay — fullscreen-ish viewer for product
          thumbnails. Tap anywhere (image or backdrop) to close. Pinch-
          zoom on the image itself works natively via the browser's
          touch gestures since we use a plain <img> without explicit
          touch-action restrictions. */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Enlarged product image"
          onClick={() => setEnlargedImage(null)}
          data-testid="active-enlarged-image"
        >
          <img
            src={enlargedImage.url}
            alt={enlargedImage.alt}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
          <button
            type="button"
            aria-label="Close enlarged image"
            onClick={(e) => {
              e.stopPropagation()
              setEnlargedImage(null)
            }}
            className="absolute top-4 right-4 w-11 h-11 flex items-center justify-center bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full text-white text-2xl"
            style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
          >
            ×
          </button>
          <p
            className="absolute left-4 right-4 text-center text-white text-sm font-medium"
            style={{ bottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            {enlargedImage.alt}
          </p>
        </div>
      )}

      {/* "+ Add" on-the-fly dialog — bottom sheet on mobile, centered
          modal on sm+. One required field (item name); category is
          auto-detected server-side from the name via CATEGORY_KEYWORDS,
          and assignedStoreId can be backfilled after the receipt-OCR
          step. Pinned high z-index so it lands above the active-mode
          summary screen if both are visible. */}
      {addOnFlyOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-on-fly-title"
          data-testid="active-add-on-fly-dialog"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => {
              if (!addOnFlySubmitting) {
                setAddOnFlyOpen(false)
                setAddOnFlyName('')
                setAddOnFlyUpc('')
              }
            }}
            aria-hidden
          />
          {/* Bottom sheet on phones, centered card on tablet+. Safe-
              area inset keeps the bottom of the sheet above iOS home
              indicator. max-h-[90vh] + overflow-y-auto guarantees the
              whole sheet is reachable on short screens (e.g. small
              Androids with the keyboard open). */}
          <div
            className="relative w-full sm:max-w-md bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl px-5 pt-5 pb-6 sm:px-6 sm:pt-6 sm:pb-8 max-h-[90vh] overflow-y-auto"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            {/* Mobile pull-handle hint — visual cue that the sheet
                came up from the bottom. Hidden on tablet+ where the
                dialog is centered. */}
            <div className="sm:hidden w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" aria-hidden />

            <h2
              id="add-on-fly-title"
              className="text-xl font-bold text-foreground mb-1"
            >
              Add to cart
            </h2>
            <p className="text-sm text-muted-foreground mb-5 leading-snug">
              Grabbed something that wasn&apos;t on the list?
            </p>

            {/* Path 1 — DRY scan path. Reuses the same BarcodeScanner
                already mounted on this page; scannerMode steers
                handleScan into handleAddOnFlyBarcode. Visually
                dominant on mobile so a thumb can hit it without
                aiming. */}
            <button
              type="button"
              data-testid="active-add-on-fly-scan"
              disabled={addOnFlySubmitting}
              onClick={() => {
                setScannerMode('add-on-fly')
                setScannerOpen(true)
                setAddOnFlyOpen(false)
              }}
              className="w-full mb-5 px-4 py-4 flex items-center justify-center gap-3 bg-primary text-white rounded-2xl font-semibold text-base active:bg-primary-dark active:scale-[0.98] transition-transform disabled:opacity-50 min-h-[56px] shadow-md"
            >
              <CameraIcon className="w-6 h-6" />
              <span>Scan barcode</span>
            </button>

            {/* Divider — visible hairline + label. Easier to scan
                than tiny all-caps text on small screens. */}
            <div className="flex items-center gap-3 mb-3" aria-hidden>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                or enter UPC
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Path 2 — typed UPC. Stacked vertically on mobile so the
                input is full-width (easier to type) and the action
                button is a full-width target underneath. */}
            <input
              data-testid="active-add-on-fly-upc"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={addOnFlyUpc}
              onChange={(e) => setAddOnFlyUpc(e.target.value.replace(/\D/g, ''))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !addOnFlySubmitting && addOnFlyUpc.trim().length > 0) {
                  e.preventDefault()
                  void handleAddOnFlyBarcode(addOnFlyUpc)
                }
              }}
              placeholder="0 12345 67890 12"
              maxLength={14}
              className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none min-h-[52px] font-mono text-base tracking-wider"
            />
            <button
              type="button"
              data-testid="active-add-on-fly-upc-submit"
              onClick={() => void handleAddOnFlyBarcode(addOnFlyUpc)}
              disabled={addOnFlySubmitting || addOnFlyUpc.trim().length === 0}
              className="w-full mt-2 mb-5 px-4 py-3 text-sm font-semibold rounded-2xl bg-background border-2 border-primary text-primary active:bg-primary/10 active:scale-[0.98] transition-transform disabled:opacity-40 disabled:border-border min-h-[48px]"
            >
              Look up UPC
            </button>

            {/* Divider for path 3. */}
            <div className="flex items-center gap-3 mb-3" aria-hidden>
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-medium text-muted-foreground">
                or no barcode — just the name
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Path 3 — no-barcode fallback. Bulk produce, deli, in-
                store baked goods. Same stacked layout. */}
            <input
              data-testid="active-add-on-fly-name"
              type="text"
              value={addOnFlyName}
              onChange={(e) => setAddOnFlyName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !addOnFlySubmitting && addOnFlyName.trim().length > 0) {
                  e.preventDefault()
                  void handleSubmitAddOnFly()
                }
              }}
              placeholder="e.g. Bananas"
              maxLength={120}
              className="w-full px-4 py-3.5 bg-background border-2 border-border rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none min-h-[52px] text-base"
            />
            <button
              type="button"
              data-testid="active-add-on-fly-submit"
              onClick={() => void handleSubmitAddOnFly()}
              disabled={addOnFlySubmitting || addOnFlyName.trim().length === 0}
              className="w-full mt-2 px-4 py-3 text-sm font-semibold rounded-2xl bg-primary text-white active:bg-primary-dark active:scale-[0.98] transition-transform disabled:opacity-40 min-h-[48px]"
            >
              {addOnFlySubmitting ? 'Adding…' : 'Add to cart'}
            </button>

            {/* Cancel — bottom of the sheet, generous tap target,
                muted styling so it doesn't compete with the primary
                actions above. */}
            <button
              type="button"
              onClick={() => {
                setAddOnFlyOpen(false)
                setAddOnFlyName('')
                setAddOnFlyUpc('')
              }}
              disabled={addOnFlySubmitting}
              className="w-full mt-4 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 min-h-[48px]"
            >
              Cancel
            </button>
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
