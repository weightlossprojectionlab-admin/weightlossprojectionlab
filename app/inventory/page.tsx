'use client'

/**
 * Kitchen Inventory Page
 *
 * Shows all items user currently has in their kitchen
 * Organized by storage location (fridge, freezer, pantry, counter)
 * Highlights expiring items
 */

import { useState, Suspense, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArchiveBoxIcon, QrCodeIcon, PhotoIcon, ListBulletIcon, ClockIcon, ShoppingCartIcon, ChartBarIcon, PlusIcon, XMarkIcon, ViewfinderCircleIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useRealtimeInventory } from '@/hooks/useRealtimeInventory'
import { useRealtimeExpiredItems } from '@/hooks/useRealtimeExpiredItems'
import { useShopping } from '@/hooks/useShopping'
import { getCategoryMetadata, formatQuantityDisplay } from '@/lib/product-categories'
import { formatExpirationDate } from '@/lib/product-categories'
import { getExpirationColor } from '@/lib/expiration-tracker'
import type { StorageLocation } from '@/types/shopping'
import { Spinner } from '@/components/ui/Spinner'
import { ScanContextModal } from '@/components/shopping/ScanContextModal'
import { ExpirationPicker } from '@/components/shopping/ExpirationPicker'
import { RecipeLinks } from '@/components/shopping/RecipeLinks'
import { QuantityAdjustModal } from '@/components/shopping/QuantityAdjustModal'
import { RenameProductModal } from '@/components/shopping/RenameProductModal'
import { SearchFilter } from '@/components/shopping/SearchFilter'
import type { ShoppingItem, ProductCategory, QuantityUnit, PackTier, AlternateUpc, AdjustmentEntry, AdjustmentReason } from '@/types/shopping'
import { simplifyProduct } from '@/lib/openfoodfacts-api'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import { addProductImage } from '@/lib/product-image-upload'
import { addManualShoppingItem } from '@/lib/shopping-operations'
import type { ScanContext } from '@/types/shopping'
import type { PatientProfile } from '@/types/medical'
import { logger } from '@/lib/logger'
import { auth, db } from '@/lib/firebase'
import { doc, onSnapshot } from 'firebase/firestore'
import { patientOperations } from '@/lib/medical-operations'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useAddSheet } from '@/hooks/useAddSheet'
import { formatOnHandText } from '@/lib/format-on-hand'
import { ReceiptCaptureSurface } from '@/components/shopping/ReceiptCaptureSurface'
import { OrderReceiptFeed } from '@/components/inventory/OrderReceiptFeed'
import { OrderReceiptDetail } from '@/components/inventory/OrderReceiptDetail'
import { extractReceiptFromImages } from '@/lib/ocr-receipt'
import { saveOrderReceipt } from '@/lib/order-receipts'
import { useRealtimeOrderReceipts } from '@/hooks/useRealtimeOrderReceipts'
import { useLockedAction } from '@/hooks/useLockedAction'
import { LockClosedIcon } from '@heroicons/react/24/solid'

// Dynamic imports
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

// Display options for the Details tab editor. Same lists used by the
// (now-unused) InventoryItemEditModal — kept inline here so the page
// has no dependency on that component.
const CATEGORY_OPTIONS: { value: ProductCategory; label: string; emoji: string }[] = [
  { value: 'produce', label: 'Produce', emoji: '🥬' },
  { value: 'meat', label: 'Meat', emoji: '🥩' },
  { value: 'dairy', label: 'Dairy', emoji: '🥛' },
  { value: 'bakery', label: 'Bakery', emoji: '🥖' },
  { value: 'deli', label: 'Deli', emoji: '🧀' },
  { value: 'eggs', label: 'Eggs', emoji: '🥚' },
  { value: 'herbs', label: 'Herbs', emoji: '🌿' },
  { value: 'spices', label: 'Spices', emoji: '🧂' },
  { value: 'seafood', label: 'Seafood', emoji: '🐟' },
  { value: 'frozen', label: 'Frozen', emoji: '🧊' },
  { value: 'pantry', label: 'Pantry', emoji: '🥫' },
  { value: 'beverages', label: 'Beverages', emoji: '🥤' },
  { value: 'condiments', label: 'Condiments', emoji: '🍯' },
  { value: 'baby', label: 'Baby', emoji: '🍼' },
  { value: 'pet-food', label: 'Pet Food', emoji: '🐾' },
  { value: 'pet-supplies', label: 'Pet Supplies', emoji: '🦴' },
  { value: 'other', label: 'Other', emoji: '📦' },
]

const UNIT_OPTIONS: { value: QuantityUnit; group: string; label?: string }[] = [
  { value: 'count', group: 'Count' },
  { value: 'each', group: 'Count', label: 'ea' },
  { value: 'bunch', group: 'Count' },
  { value: 'head', group: 'Count' },
  { value: 'bag', group: 'Count' },
  { value: 'package', group: 'Count' },
  { value: 'can', group: 'Count' },
  { value: 'bottle', group: 'Count' },
  { value: 'container', group: 'Count' },
  { value: 'lbs', group: 'Weight' },
  { value: 'oz', group: 'Weight' },
  { value: 'g', group: 'Weight' },
  { value: 'kg', group: 'Weight' },
  { value: 'fl oz', group: 'Volume' },
  { value: 'cup', group: 'Volume' },
  { value: 'tbsp', group: 'Volume' },
  { value: 'tsp', group: 'Volume' },
  { value: 'ml', group: 'Volume' },
  { value: 'l', group: 'Volume' },
  { value: 'gal', group: 'Volume' },
  { value: 'qt', group: 'Volume' },
  { value: 'pt', group: 'Volume' },
]

/**
 * Category-aware pack/case-size defaults — pulled from typical US retail
 * packaging so the Item Details fields prefill sensibly without forcing
 * the user to think about it. Categories that aren't typically sold in
 * multi-packs (produce, meat, bakery, etc.) get null so we don't push
 * meaningless 6/24 values onto rows where the concept doesn't apply.
 *
 * Drivers when something disagrees: the user can always edit the value;
 * persist on Save just like any other Item Details field.
 */
const PACK_CASE_DEFAULTS: Partial<
  Record<ProductCategory, { pack: number; case: number }>
> = {
  beverages: { pack: 6, case: 24 }, // 6-pack bottles, 24-pack cans
  dairy: { pack: 6, case: 12 }, // yogurt 4/6-packs, milk 12-case
  eggs: { pack: 12, case: 30 }, // dozen eggs, 30-egg flat
  pantry: { pack: 6, case: 12 }, // canned goods
  frozen: { pack: 6, case: 12 },
  baby: { pack: 6, case: 24 }, // pouches/jars in 6, cases of 24
  'pet-food': { pack: 6, case: 12 }, // wet food cans
  condiments: { pack: 6, case: 12 },
}

function defaultPackSizeForCategory(c: ProductCategory): string | null {
  return PACK_CASE_DEFAULTS[c] ? String(PACK_CASE_DEFAULTS[c]!.pack) : null
}
function defaultCaseSizeForCategory(c: ProductCategory): string | null {
  return PACK_CASE_DEFAULTS[c] ? String(PACK_CASE_DEFAULTS[c]!.case) : null
}

function KitchenInventoryContent() {
  // Feature-access gates — terminated subscribers can view but not
  // snap receipts, scan barcodes, or apply inventory adjustments.
  const receiptOcrLock = useLockedAction()
  const adjustInventoryLock = useLockedAction()
  // Inventory writes that aren't tab-specific: Scan Item, search-bar
  // camera, and the empty-state scan CTA. Same lock state for all
  // three; they're three faces of one action ("scan + add to
  // inventory"). One hook, applied at every entry point.
  const scanItemLock = useLockedAction()

  // Real-time inventory hook
  const {
    fridgeItems,
    freezerItems,
    pantryItems,
    counterItems,
    loading: inventoryLoading,
    getSummary
  } = useRealtimeInventory()

  // Real-time Order Receipts feed — drives the Purchase History no-item state.
  const { receipts: orderReceipts, error: orderReceiptsError } = useRealtimeOrderReceipts()

  // Real-time expired items hook
  const {
    totalExpired,
    criticalItems,
    highRiskItems,
    loading: expiredLoading
  } = useRealtimeExpiredItems()

  const { consumeItem, addItem, updateItem, removeItem } = useShopping()

  // Admin gate — used to conditionally render deep-links to the platform
  // admin/barcodes catalog editor. Regular users shouldn't see those links;
  // their catalog-edit path is the inline catalog-write actions on the
  // Image tab and the rename modal on the inventory list.
  const { isAdmin: isPlatformAdmin } = useAdminAuth()

  // Add-to-inventory sheet — same primitive /shopping uses for its add
  // flows (qty + on-hand prompt). Surface-specific labels supplied per
  // openSheet call. The rendered <sheet/> goes at the end of the JSX.
  const { openSheet: openAddSheet, sheet: addSheetNode } = useAddSheet()

  // Page-level tabs (Phase A scaffolding — Item Details / UPC / Image).
  // State persisted in URL (?tab=...) so deep-links and refreshes stick.
  // UPC + Image tabs are stubs today; Phase B/C/D will fill them in
  // with product-database lookup, scan flow, and image gallery.
  const router = useRouter()
  const searchParams = useSearchParams()
  type InventoryTab = 'list' | 'details' | 'history' | 'reorder' | 'report' | 'upc' | 'image' | 'adjust'
  const tabParam = searchParams.get('tab')
  const activeTab: InventoryTab =
    tabParam === 'details' || tabParam === 'history' || tabParam === 'reorder' ||
      tabParam === 'report' || tabParam === 'upc' || tabParam === 'image' ||
      tabParam === 'adjust'
      ? tabParam
      : 'list'
  const setActiveTab = (tab: InventoryTab) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'list') {
      // Default tab — keep URL clean
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.replace(qs ? `/inventory?${qs}` : '/inventory')
  }

  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | 'all'>('all')
  // Page-wide item lookup — applies across every tab (Inventory List,
  // Suggested Reorder, Restocking Report all consume the filtered set).
  // Mirrors the SearchFilter pattern from /shopping for DRY: same query +
  // category filter UX users already know from the shopping list.
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<ProductCategory | 'all'>('all')
  // Hybrid search — when the user types, ALSO query the global product_database
  // catalog. Results that aren't already in the user's inventory are surfaced
  // as a "From catalog" section in the Inventory List tab so the user can add
  // them. Skips fetch for queries < 2 chars to avoid noise.
  type CatalogNutrition = {
    calories?: number
    protein?: number
    carbs?: number
    fat?: number
    fiber?: number
    sodium?: number
    servingSize?: string
  }
  type CatalogResult = {
    barcode: string
    productName: string
    brand: string
    category: ProductCategory | null
    imageUrl: string
    containerSize: number | null
    containerUnit: QuantityUnit | null
    nutrition?: CatalogNutrition | null
  }
  const [catalogResults, setCatalogResults] = useState<CatalogResult[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogAddingBarcode, setCatalogAddingBarcode] = useState<string | null>(null)
  // Create-on-miss state: when a UPC search returns zero catalog hits, the
  // matches card surfaces a "Create new product" CTA. Click expands an
  // inline form (reuses newProductName/Brand/Category/ImageFile state from
  // the UPC tab — same shape, separate submit path).
  const [searchCreateExpanded, setSearchCreateExpanded] = useState(false)
  const [searchCreateSubmitting, setSearchCreateSubmitting] = useState(false)
  // Live catalog enrichment for the Item Details tab. When a row is selected
  // and has a barcode, we fetch the canonical product_database entry so the
  // read-only Product facts + Nutrition panels reflect the latest catalog
  // data (USDA backfills, admin edits, other users' enrichments) instead of
  // the snapshot stored on the row at scan time. The local row remains the
  // source of truth for inventory state (qty, location, expires, notes).
  const [catalogEnrichment, setCatalogEnrichment] = useState<CatalogResult | null>(null)
  // Catalog image map keyed by barcode. Source of truth for ANY image render
  // in the inventory page — list rows, reorder/report rows, the Image tab's
  // per-tier slots. Beats the row's stored imageUrl when the catalog has
  // been enriched after the row was added (admin migration / OFF / USDA).
  // Populated by a page-level useEffect that batch-fetches every barcode in
  // the inventory (primary + alternates) on mount/items-change. Empty
  // entries (catalog miss) aren't stored — render falls back to the row.
  const [catalogImagesByBarcode, setCatalogImagesByBarcode] = useState<Record<string, string>>({})

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setCatalogResults([])
      setCatalogLoading(false)
      return
    }
    let cancelled = false
    setCatalogLoading(true)
    const timer = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const params = new URLSearchParams({ q })
        if (filterCategory !== 'all') params.set('category', filterCategory)
        const res = await fetch(`/api/products/search?${params}`, { headers })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as { results?: CatalogResult[] }
        if (!cancelled) setCatalogResults(data.results ?? [])
      } catch (err) {
        if (!cancelled) {
          logger.warn('[Inventory] Catalog search failed', { error: (err as Error).message })
          setCatalogResults([])
        }
      } finally {
        if (!cancelled) setCatalogLoading(false)
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [searchQuery, filterCategory])

  // Add a catalog hit to either inventory or shopping list. Same lookup +
  // addItem path; only the {inStock, needed} flags differ. Inventory =
  // "I have this on hand"; shopping = "I want to buy this." They're peer
  // intents — search at the top of /inventory is product-lookup, and a
  // matched product can be routed to either bucket.
  type CatalogAddTarget = 'inventory' | 'shopping'
  const handleAddCatalogItem = async (result: CatalogResult, target: CatalogAddTarget) => {
    setCatalogAddingBarcode(result.barcode)
    try {
      const response = await lookupBarcodeWithCache(result.barcode)
      if (response.status !== 1 || !response.product) {
        toast.error('Failed to load product details')
        return
      }
      await addItem(response.product, {
        inStock: target === 'inventory',
        needed: target === 'shopping',
      })
      toast.success(
        target === 'inventory'
          ? `Added ${result.productName} to inventory`
          : `Added ${result.productName} to shopping list`,
      )
      // Collapse the catalog matches block — the user just acted on a result,
      // keeping the dropdown open is visual noise.
      setSearchQuery('')
    } catch (err) {
      logger.error('[Inventory] Catalog add failed', err as Error, {
        barcode: result.barcode,
        target,
      })
      toast.error(`Failed to add to ${target === 'inventory' ? 'inventory' : 'shopping list'}`)
    } finally {
      setCatalogAddingBarcode(null)
    }
  }
  const handleAddFromCatalog = (result: CatalogResult) =>
    handleAddCatalogItem(result, 'inventory')

  // Create-on-miss handler. Used when the user searches a UPC that isn't in
  // the catalog (or in USDA/OFF) and decides to create the product themself.
  // Flow: optional image upload → POST /api/products/[barcode]/create →
  // lookupBarcodeWithCache (now returns a hit since /create wrote the doc) →
  // addItem to inventory as a fresh row. Differs from the UPC tab's create
  // flow which adds as an alternate UPC of the selected item.
  const handleCreateFromSearch = async () => {
    const barcode = searchQuery.trim()
    if (!isValidUpc(barcode)) {
      toast.error('UPC must be 8–14 digits')
      return
    }
    if (!newProductName.trim()) {
      toast.error('Product name is required')
      return
    }
    setSearchCreateSubmitting(true)
    try {
      let imageUrl = ''
      if (newProductImageFile) {
        imageUrl = await addProductImage(barcode, newProductImageFile)
      }
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`/api/products/${encodeURIComponent(barcode)}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          productName: newProductName.trim(),
          brand: newProductBrand.trim(),
          category: newProductCategory,
          imageUrl,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || `Catalog create failed (${res.status})`)
      }
      // Now that the catalog has the doc, lookup + addItem to bring it into
      // local inventory as a fresh row.
      try {
        const response = await lookupBarcodeWithCache(barcode)
        if (response.status === 1 && response.product) {
          await addItem(response.product, { inStock: true, needed: false })
          toast.success(`Created ${newProductName.trim()} and added to inventory`)
        } else {
          toast.success(`Created ${newProductName.trim()} in catalog`)
        }
      } catch (err) {
        logger.warn('[Inventory] Catalog created but inventory add failed', {
          error: (err as Error).message,
          barcode,
        })
        toast.success(`Created ${newProductName.trim()} in catalog`)
      }
      // Reset form + clear search so the user sees their new item
      setNewProductName('')
      setNewProductBrand('')
      setNewProductCategory('other')
      setNewProductImageFile(null)
      setNewProductImagePreview(null)
      setSearchCreateExpanded(false)
      setSearchQuery('')
    } catch (err) {
      logger.error('[Inventory] Create-from-search failed', err as Error, { barcode })
      toast.error(`Failed: ${(err as Error).message}`)
    } finally {
      setSearchCreateSubmitting(false)
    }
  }

  // Inventory list filter — category only. The search query at the top
  // targets the global product_database catalog (see catalogResults), NOT
  // the local list. This separates two distinct user intents: "filter what
  // I already have" (category filter) vs. "find a product to add" (search
  // box → catalog API). Mixing them muddied which scope each control owned.
  const filterItems = <T extends ShoppingItem>(items: T[]): T[] => {
    if (filterCategory === 'all') return items
    return items.filter((it) => it.category === filterCategory)
  }
  const [showScanner, setShowScanner] = useState(false)
  // 'add' = traditional scan-flow (lookup → add/update inventory). 'search' =
  // scan-to-locate (barcode populates searchQuery; the hybrid lookup surfaces
  // the item). 'add-alt-upc' = UPC tab's scan-to-fill (barcode populates the
  // add-row's UPC input + auto-fills unit size from catalog when unset).
  // 'pick-for-tab' = empty-state scan-trigger on per-item tabs (scan → find
  // existing inventory item by barcode → setSelectedItem, stay on tab).
  const [scanMode, setScanMode] = useState<'add' | 'search' | 'add-alt-upc' | 'pick-for-tab'>('add')
  const [showScanContext, setShowScanContext] = useState(false)
  const [scanContext, setScanContext] = useState<ScanContext>('inventory')
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, PatientProfile>>({})

  // Quantity prompt for "Used Up" / "Buy Again" actions. We capture which
  // mode is active alongside the row context so the same modal serves
  // both flows with different titles, defaults, and confirm actions.
  const [qtyModal, setQtyModal] = useState<{
    mode: 'used-up' | 'buy-again'
    itemId: string
    productName: string
    brand?: string
    imageUrl?: string
    barcode?: string
    category: import('@/types/shopping').ProductCategory
    currentQty: number
    unit?: import('@/types/shopping').QuantityUnit
    /**
     * Phase 2b: amount-aware tracking. When set, the Used Up modal asks
     * for an amount in `containerUnit` and dispatches `consumeItem` with
     * `useAmount` instead of `useQuantity`. Absent → count-based modal.
     */
    containerSize?: number
    containerUnit?: import('@/types/shopping').QuantityUnit
    remainingAmount?: number
  } | null>(null)

  // Selected item for the Item Details tab. Click any item row in the
  // Inventory List to set this; the page tabs (Details / UPC / Image)
  // become that item's editor.
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null)

  // Details-tab form state — synced from selectedItem on change. Keeping
  // local state lets the user edit without immediately mutating the item
  // until Save is clicked.
  const [editCategory, setEditCategory] = useState<ProductCategory>('other')
  const [editQuantity, setEditQuantity] = useState<number>(1)
  const [editUnit, setEditUnit] = useState<QuantityUnit | undefined>(undefined)
  const [editLocation, setEditLocation] = useState<StorageLocation>('pantry')
  const [editExpiresAt, setEditExpiresAt] = useState<string>('') // YYYY-MM-DD or ''
  const [editNotes, setEditNotes] = useState<string>('')
  // Pack + Case size — informational fields surfaced on Item Details.
  // Empty string means "not set" so the user can clear a previously-set
  // value without leaving a stale 0 in the schema.
  const [editPackSize, setEditPackSize] = useState<string>('')
  const [editCaseSize, setEditCaseSize] = useState<string>('')
  const [showHistory, setShowHistory] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)

  // Order Receipt intake — surfaced on the Purchase History tab when no
  // item is selected. The user snaps a receipt; OCR runs; we persist a
  // DRAFT OrderReceipt (no inventory writes yet); the user reviews it
  // in the detail view and explicitly applies. Draft-first design
  // protects against duplicate apply when two household members snap
  // the same physical receipt.
  const [poCaptureOpen, setPoCaptureOpen] = useState(false)
  const [poProcessing, setPoProcessing] = useState(false)
  // Selected receipt id — when set, the no-item state mounts the
  // detail view instead of the CTA + feed.
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null)
  useEffect(() => {
    if (selectedItem) {
      setEditCategory(selectedItem.category)
      setEditQuantity(selectedItem.quantity ?? 1)
      setEditUnit(selectedItem.unit)
      setEditLocation(selectedItem.location || 'pantry')
      setEditExpiresAt(
        selectedItem.expiresAt
          ? new Date(selectedItem.expiresAt).toISOString().slice(0, 10)
          : ''
      )
      setEditNotes(selectedItem.notes || '')
      // Pack + case size: ONLY prefill from saved values. Category-aware
      // defaults render as placeholder text in the inputs (see JSX below)
      // so they're visible suggestions without silently persisting on Save.
      // The user's intent must be explicit — type or pick a value to mean
      // "yes, this is the size." Empty input means "not set" and stays
      // not-set on Save, even if a category default exists.
      setEditPackSize(
        typeof selectedItem.packSize === 'number' ? String(selectedItem.packSize) : '',
      )
      setEditCaseSize(
        typeof selectedItem.caseSize === 'number' ? String(selectedItem.caseSize) : '',
      )
      setShowHistory(false)
    }
  }, [selectedItem?.id])

  // Dirty check — true when any draft field differs from the saved record.
  // Used to disable the Save button when there's nothing to save, which
  // gives the user immediate feedback that their save took effect (button
  // grays out the moment changes land).
  const detailsIsDirty = (() => {
    if (!selectedItem) return false
    if (editCategory !== selectedItem.category) return true
    if (editUnit !== selectedItem.unit) return true
    const savedLocation = selectedItem.location || 'pantry'
    if (editLocation !== savedLocation) return true
    const newExpiresMs = editExpiresAt ? new Date(editExpiresAt).getTime() : undefined
    const oldExpiresMs = selectedItem.expiresAt
      ? new Date(selectedItem.expiresAt).getTime()
      : undefined
    if (newExpiresMs !== oldExpiresMs) return true
    if (editNotes !== (selectedItem.notes || '')) return true
    // Pack + case size — empty string means "not set"; compare numerically.
    const parsePackish = (s: string): number | undefined => {
      const n = parseInt(s, 10)
      return Number.isFinite(n) && n >= 1 ? n : undefined
    }
    if (parsePackish(editPackSize) !== selectedItem.packSize) return true
    if (parsePackish(editCaseSize) !== selectedItem.caseSize) return true
    return false
  })()

  const handleSaveDetails = async () => {
    if (!selectedItem) return
    if (isSyntheticCatalogItem(selectedItem)) {
      toast.error('Add to inventory first to edit details')
      return
    }
    setSavingDetails(true)
    try {
      const updates: Partial<ShoppingItem> = {}
      if (editCategory !== selectedItem.category) updates.category = editCategory
      // quantity is now read-only on Item Details — adjustments go through
      // the Adjust tab so every change is audit-logged. Don't write it here.
      if (editUnit !== selectedItem.unit) updates.unit = editUnit
      if (editLocation !== selectedItem.location) updates.location = editLocation
      const newExpiresMs = editExpiresAt ? new Date(editExpiresAt).getTime() : undefined
      const oldExpiresMs = selectedItem.expiresAt
        ? new Date(selectedItem.expiresAt).getTime()
        : undefined
      if (newExpiresMs !== oldExpiresMs) {
        updates.expiresAt = editExpiresAt ? new Date(editExpiresAt) : undefined
      }
      if (editNotes !== (selectedItem.notes || '')) updates.notes = editNotes
      // Pack + case size: only persist when changed (parse blank → undefined
      // so users can clear the value).
      const parsePackish = (s: string): number | undefined => {
        const n = parseInt(s, 10)
        return Number.isFinite(n) && n >= 1 ? n : undefined
      }
      const nextPackSize = parsePackish(editPackSize)
      if (nextPackSize !== selectedItem.packSize) updates.packSize = nextPackSize
      const nextCaseSize = parsePackish(editCaseSize)
      if (nextCaseSize !== selectedItem.caseSize) updates.caseSize = nextCaseSize
      if (Object.keys(updates).length > 0) {
        await updateItem(selectedItem.id, updates)
        // Merge the updates into the local selectedItem so the dirty check
        // immediately re-evaluates to clean (Save button greys out, form
        // reflects the saved state). The realtime listener will reconcile
        // any divergence on its next snapshot.
        setSelectedItem({ ...selectedItem, ...updates })
        toast.success('Item updated')
      }
    } catch (error: any) {
      logger.error('[Inventory] Item edit failed', error as Error, { itemId: selectedItem.id })
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingDetails(false)
    }
  }

  // Split on-hand into "X containers + Y units" using the primary's
  // packQuantity. A 24-case product with quantity=26 displays as
  // "1 case + 2 bottles". Falls back to a single number when no pack
  // tier is set (single-unit products with packQuantity ≤ 1).
  // Pluralization is naive English (-s) — "case/cases", "bottle/bottles".
  // The user can still adjust on-hand via the single-delta input on the
  // Inventory Adjustment tab; this is a display-only breakdown.
  const formatOnHand = (
    item: ShoppingItem,
  ): { mode: 'flat'; total: number; unit: string } | {
    mode: 'split'
    cases: number
    loose: number
    tierLabel: string
    unitLabel: string
  } => {
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

  // Empty-state card shared across every per-item tab (Item Details,
  // Inventory Adjustment, Purchase History, UPC). The whole card is the
  // primary scan-trigger — tap → scanner in 'pick-for-tab' mode → finds
  // the item by barcode and selects it without leaving the current tab.
  // Description is per-tab; everything else is constant.
  const renderScanPickEmpty = (description: string) => (
    <div>
      <button
        type="button"
        onClick={scanItemLock.isLocked ? scanItemLock.onLockedClick : () => {
          setScanMode('pick-for-tab')
          setShowScanner(true)
        }}
        className="block w-full bg-card rounded-lg p-8 text-center border-2 border-dashed border-border hover:border-primary hover:bg-muted/30 transition-colors"
      >
        <ViewfinderCircleIcon className="h-12 w-12 mx-auto text-primary mb-3" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Tap to scan an item</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      </button>
      <p className="text-xs text-center text-muted-foreground mt-3">
        Or switch to{' '}
        <button
          type="button"
          onClick={() => setActiveTab('list')}
          className="text-primary hover:underline font-medium"
        >
          Inventory List
        </button>{' '}
        to pick by name.
      </p>
    </div>
  )

  // Adjustment tab — the canonical place to change on-hand quantity. Each
  // Apply appends an AdjustmentEntry to selectedItem.quantityAdjustments
  // (audit trail) AND updates selectedItem.quantity in a single updateItem
  // call. Item Details shows quantity as read-only — this tab is the only
  // way to change it, so the audit trail is complete.
  // Per-tier delta drafts (Unit / Pack / Case). Show only the rows whose
  // tier is actually represented on the row (primary + alternates). Total
  // delta at submit = Σ tierDeltas[T] × packQuantityFor(T). Unit always
  // shows since "loose units" is meaningful even when no U-tier UPC exists.
  const [adjustUnitDeltaDraft, setAdjustUnitDeltaDraft] = useState('')
  const [adjustPackDeltaDraft, setAdjustPackDeltaDraft] = useState('')
  const [adjustCaseDeltaDraft, setAdjustCaseDeltaDraft] = useState('')
  const [adjustReasonDraft, setAdjustReasonDraft] = useState<AdjustmentReason>('purchased')
  const [adjustNoteDraft, setAdjustNoteDraft] = useState('')
  const [savingAdjustment, setSavingAdjustment] = useState(false)

  /**
   * Multiplier for a given tier on this item. The tier's UPC (primary or
   * alternate) supplies the packQuantity. Returns null when the tier isn't
   * represented — UI uses that to hide the corresponding input row.
   * Unit (U) is always 1.
   */
  const getTierMultiplier = (item: ShoppingItem, tier: PackTier): number | null => {
    if (tier === 'U') return 1
    if (item.packTier === tier) return item.packQuantity ?? 1
    for (const alt of item.alternateUpcs ?? []) {
      if (alt.packTier === tier) return alt.packQuantity ?? 1
    }
    return null
  }

  const handleSubmitAdjustment = async () => {
    if (!selectedItem) return
    if (isSyntheticCatalogItem(selectedItem)) {
      toast.error('Add to inventory first to adjust quantity')
      return
    }

    // Parse each tier's draft. Empty input = 0 (no change at that tier).
    const parseTierDraft = (s: string): number | null => {
      const t = s.trim()
      if (t === '') return 0
      const n = parseInt(t, 10)
      return Number.isFinite(n) ? n : null
    }
    const u = parseTierDraft(adjustUnitDeltaDraft)
    const p = parseTierDraft(adjustPackDeltaDraft)
    const c = parseTierDraft(adjustCaseDeltaDraft)
    if (u === null || p === null || c === null) {
      toast.error('Deltas must be whole numbers')
      return
    }

    // Build tierDeltas + total. Skip tiers that aren't represented on
    // the row (their multiplier is null) — those drafts are ignored.
    const tierDeltas: Partial<Record<PackTier, number>> = {}
    let delta = 0
    for (const [tier, draftValue] of [
      ['U', u],
      ['P', p],
      ['C', c],
    ] as const) {
      if (draftValue === 0) continue
      const mult = getTierMultiplier(selectedItem, tier)
      if (mult === null) continue
      tierDeltas[tier] = draftValue
      delta += draftValue * mult
    }

    if (delta === 0) {
      toast.error('Net delta is zero — nothing to apply')
      return
    }

    const prev = selectedItem.quantity ?? 0
    const next = prev + delta
    if (next < 0) {
      toast.error(`Can't go below 0 (current: ${prev})`)
      return
    }

    const entry: AdjustmentEntry = {
      date: new Date(),
      delta,
      ...(Object.keys(tierDeltas).length > 1 ||
      (Object.keys(tierDeltas).length === 1 && !tierDeltas.U)
        ? { tierDeltas }
        : {}),
      reason: adjustReasonDraft,
      note: adjustNoteDraft.trim() || undefined,
      resultQuantity: next,
      userId: auth.currentUser?.uid,
    }
    const adjustments: AdjustmentEntry[] = [
      ...(selectedItem.quantityAdjustments ?? []),
      entry,
    ]
    setSavingAdjustment(true)
    try {
      await updateItem(selectedItem.id, {
        quantity: next,
        quantityAdjustments: adjustments,
      })
      setSelectedItem({
        ...selectedItem,
        quantity: next,
        quantityAdjustments: adjustments,
      })
      setAdjustUnitDeltaDraft('')
      setAdjustPackDeltaDraft('')
      setAdjustCaseDeltaDraft('')
      setAdjustNoteDraft('')
      // Toast summary matches the audit-trail format — read in the user's
      // input units, not just the unit-level total.
      const tierWord = (t: PackTier, n: number): string => {
        const base =
          t === 'C'
            ? selectedItem.packTier === 'C' || selectedItem.alternateUpcs?.some((a) => a.packTier === 'C')
              ? 'case'
              : 'case'
            : t === 'P'
              ? 'pack'
              : selectedItem.unit ?? 'unit'
        return `${base}${Math.abs(n) === 1 ? '' : 's'}`
      }
      const parts: string[] = []
      for (const t of ['C', 'P', 'U'] as const) {
        const v = tierDeltas[t]
        if (v !== undefined && v !== 0) {
          parts.push(`${v > 0 ? '+' : ''}${v} ${tierWord(t, v)}`)
        }
      }
      const summary = parts.length > 0 ? parts.join(', ') : `${delta > 0 ? '+' : ''}${delta}`
      toast.success(`${summary} · on-hand now ${next}`)
    } catch (error: any) {
      logger.error('[Inventory] Adjustment failed', error as Error, { itemId: selectedItem.id })
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingAdjustment(false)
    }
  }

  // UPC tab — primary-tier dropdown + add-alternate form. Saves are
  // immediate (no draft/Save flow): a tier change or alternate add/remove
  // writes through updateItem and merges the change back into selectedItem
  // so the UI reflects it without waiting for the next collection refetch.
  // Numeric inputs (size, packQuantity) use draft state synced from
  // selectedItem and persist on blur — that lets users type "16" without
  // firing a save for "1" → "16" mid-typing.
  const [addAltBarcode, setAddAltBarcode] = useState('')
  const [addAltTier, setAddAltTier] = useState<PackTier>('P')
  const [addAltQuantity, setAddAltQuantity] = useState('')
  const [savingUpc, setSavingUpc] = useState(false)
  // Catalog status for the barcode currently being added on the UPC tab.
  // 'unchecked' until the user types a valid-length UPC; debounced lookup
  // moves it to 'checking' → 'found' / 'not-found'. When 'not-found', the
  // add-row expands with name + brand + category + image inputs so the
  // user can create a new catalog entry inline.
  type AddCatalogStatus = 'unchecked' | 'checking' | 'found' | 'not-found'
  const [addAltCatalogStatus, setAddAltCatalogStatus] = useState<AddCatalogStatus>('unchecked')
  const [newProductName, setNewProductName] = useState('')
  const [newProductBrand, setNewProductBrand] = useState('')
  const [newProductCategory, setNewProductCategory] = useState<ProductCategory>('other')
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null)
  const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null)
  const newProductImageInputRef = useRef<HTMLInputElement>(null)
  // Whether the inline add-UPC row is visible. Hidden by default — most
  // products only have a single UPC, so persistent add UI was visual noise.
  // Toggles on via the "+ Add UPC for pack or case" affordance.
  const [showAddRow, setShowAddRow] = useState(false)
  // Whether the product-level size widget is in custom-entry mode. False
  // when the size matches a preset; true when the user picks "Custom..."
  // or when the existing size doesn't match any preset.
  const [customSizeMode, setCustomSizeMode] = useState(false)
  // Draft state for the primary's editable size + packQuantity (unit is a
  // dropdown so it persists on change, no draft needed).
  const [primarySizeDraft, setPrimarySizeDraft] = useState('')
  const [primaryPackQuantityDraft, setPrimaryPackQuantityDraft] = useState('')
  // Per-alternate draft state, keyed by barcode. Each entry mirrors the
  // alternate's editable numeric fields. Blur on a field reads its draft
  // and persists if it diverged from the source.
  const [altDrafts, setAltDrafts] = useState<
    Record<string, { size: string; packQuantity: string }>
  >({})

  // Image tab state — per-tier upload tracking. A single file input ref
  // is shared across all tier rows; pendingImageTier captures which tier
  // initiated the upload so onChange knows where to mirror the URL.
  // Why per-tier images: the same product family carries multiple barcodes
  // (single bottle / 6-pack carton / case), and each presents differently
  // — the bottle photo isn't the case photo. addProductImage writes to
  // product_database/{barcode} (catalog of record); we then mirror the
  // returned URL to the inventory row's imageUrl (primary) or
  // alternateUpcs[i].imageUrl (alternates) so list/gallery render without
  // a per-tier catalog fetch.
  const tierImageInputRef = useRef<HTMLInputElement>(null)
  const [pendingImageTier, setPendingImageTier] = useState<{
    barcode: string
    isPrimary: boolean
  } | null>(null)
  const [imageUploadingFor, setImageUploadingFor] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedItem) {
      setPrimarySizeDraft('')
      setPrimaryPackQuantityDraft('')
      setAltDrafts({})
      return
    }
    setPrimarySizeDraft(
      selectedItem.containerSize !== undefined ? String(selectedItem.containerSize) : ''
    )
    setPrimaryPackQuantityDraft(
      selectedItem.packQuantity !== undefined ? String(selectedItem.packQuantity) : ''
    )
    const map: Record<string, { size: string; packQuantity: string }> = {}
    for (const alt of selectedItem.alternateUpcs ?? []) {
      map[alt.barcode] = {
        size: alt.size !== undefined ? String(alt.size) : '',
        packQuantity: alt.packQuantity !== undefined ? String(alt.packQuantity) : '',
      }
    }
    setAltDrafts(map)
  }, [selectedItem?.id])

  // Live-pull catalog enrichment for the SELECTED item only. Drives the Item
  // Details / Nutrition panels (which need the full catalog row, not just an
  // image). /api/products/search canonicalizes UPC variants so equivalent
  // forms land on the same doc; failure is silent — UI falls back to the
  // row snapshot.
  useEffect(() => {
    const barcode = selectedItem?.barcode
    if (!barcode) {
      setCatalogEnrichment(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const res = await fetch(
          `/api/products/search?q=${encodeURIComponent(barcode)}`,
          { headers },
        )
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as { results?: CatalogResult[] }
        if (cancelled) return
        setCatalogEnrichment(
          (data.results ?? []).find((r) => r.barcode === barcode) ?? null,
        )
      } catch (err) {
        if (!cancelled) {
          logger.warn('[Inventory] Catalog enrichment fetch failed', {
            error: (err as Error).message,
            barcode,
          })
          setCatalogEnrichment(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedItem?.id, selectedItem?.barcode])

  // Derive the relevant size "phase" from the product category. Beverages
  // are liquids (volume); meats / produce / deli are solids (weight); eggs
  // are counted. Categories that span phases (dairy, pantry, condiments)
  // return 'all' so the dropdown shows everything. This is intentional —
  // the user shouldn't have to pick a phase manually when the product's
  // nature already implies it.
  const getCategoryPhase = (
    category: ProductCategory,
  ): 'volume' | 'weight' | 'count' | 'all' => {
    if (category === 'beverages') return 'volume'
    if (category === 'eggs') return 'count'
    if (
      category === 'meat' ||
      category === 'seafood' ||
      category === 'produce' ||
      category === 'deli' ||
      category === 'frozen' ||
      category === 'bakery'
    ) {
      return 'weight'
    }
    return 'all'
  }

  // 8–14 digits covers UPC-E (8), UPC-A (12), EAN-13 (13), and ITF-14 (14)
  // — i.e. anything a household scanner is likely to produce.
  const isValidUpc = (s: string) => /^\d{8,14}$/.test(s.trim())

  // Debounced catalog-status check for the barcode being added on the UPC
  // tab. Drives the inline "create new product" form: when the entered/scanned
  // UPC isn't in the catalog, the form expands so the user can supply name +
  // brand + category + image. Reset to 'unchecked' when the input is cleared
  // or below 8 digits.
  useEffect(() => {
    const q = addAltBarcode.trim()
    if (!isValidUpc(q)) {
      setAddAltCatalogStatus('unchecked')
      return
    }
    let cancelled = false
    setAddAltCatalogStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const token = await auth.currentUser?.getIdToken()
        const headers: Record<string, string> = {}
        if (token) headers.Authorization = `Bearer ${token}`
        const res = await fetch(`/api/products/search?q=${encodeURIComponent(q)}`, { headers })
        if (!res.ok) throw new Error(`status ${res.status}`)
        const data = (await res.json()) as { results?: Array<{ barcode: string }> }
        if (cancelled) return
        const hit = (data.results ?? []).find((r) => r.barcode === q)
        setAddAltCatalogStatus(hit ? 'found' : 'not-found')
      } catch {
        if (!cancelled) setAddAltCatalogStatus('unchecked')
      }
    }, 300)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [addAltBarcode])

  const persistUpcChange = async (updates: Partial<ShoppingItem>) => {
    if (!selectedItem) return
    if (isSyntheticCatalogItem(selectedItem)) {
      toast.error('Add to inventory first to manage UPCs')
      return
    }
    setSavingUpc(true)
    try {
      await updateItem(selectedItem.id, updates)
      setSelectedItem({ ...selectedItem, ...updates })
    } catch (error: any) {
      logger.error('[Inventory] UPC update failed', error as Error, { itemId: selectedItem.id })
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingUpc(false)
    }
  }

  // Image tab — open the native file picker for a specific tier. Stashes
  // which tier was clicked so onChange knows where to write the result.
  const triggerTierImageUpload = (barcode: string, isPrimary: boolean) => {
    if (!barcode) {
      toast.error('No UPC for this tier — link one on the UPC tab first')
      return
    }
    setPendingImageTier({ barcode, isPrimary })
    // Reset the input value so re-selecting the same file still fires onChange.
    if (tierImageInputRef.current) tierImageInputRef.current.value = ''
    tierImageInputRef.current?.click()
  }

  // After a file is picked, upload to product_database/{barcode} via the
  // shared catalog helper, then mirror the URL onto the inventory row's
  // imageUrl slot for the right tier.
  const handleTierImageFileSelected = async (file: File | null) => {
    if (!file || !pendingImageTier || !selectedItem) {
      setPendingImageTier(null)
      return
    }
    const { barcode, isPrimary } = pendingImageTier
    setImageUploadingFor(barcode)
    try {
      // replace:true — Image tab is the explicit-intent surface for catalog
      // imagery. The user picked this photo for THIS barcode; force the
      // catalog write even if a previous image existed (admin-migrated, OFF,
      // or another caregiver's earlier upload). Without replace:true the
      // gentle-write default in addProductImage skips the Firestore write
      // and admin/barcodes/[barcode]/edit keeps showing the old image.
      const url = await addProductImage(barcode, file, { replace: true })
      // Optimistically update the catalog map so the row reflects the new
      // image immediately; the onSnapshot listener will reconcile shortly.
      setCatalogImagesByBarcode((prev) => ({ ...prev, [barcode]: url }))
      // For synthetic preview rows (catalog: prefix), the catalog write IS
      // the meaningful operation — there's no inventory row to mirror to.
      // Skip the inventory updateItem call but still reflect the change in
      // local state so the UI shows the new image immediately.
      const synthetic = isSyntheticCatalogItem(selectedItem)
      if (isPrimary) {
        if (!synthetic) {
          await updateItem(selectedItem.id, { imageUrl: url })
        }
        setSelectedItem({ ...selectedItem, imageUrl: url })
      } else {
        const next = (selectedItem.alternateUpcs ?? []).map((alt) =>
          alt.barcode === barcode ? { ...alt, imageUrl: url } : alt,
        )
        if (!synthetic) {
          await updateItem(selectedItem.id, { alternateUpcs: next })
        }
        setSelectedItem({ ...selectedItem, alternateUpcs: next })
      }
      toast.success(synthetic ? 'Photo saved to catalog' : 'Photo uploaded')
    } catch (err) {
      logger.error('[Inventory Image] Upload failed', err as Error, { barcode })
      toast.error(`Upload failed: ${(err as Error).message}`)
    } finally {
      setImageUploadingFor(null)
      setPendingImageTier(null)
    }
  }

  const handleSetPrimaryTier = (tier: PackTier | undefined) => {
    if (!selectedItem) return
    if (selectedItem.packTier === tier) return
    const updates: Partial<ShoppingItem> = { packTier: tier }
    // Auto-fill unit size when it's empty and we have a recommendation for
    // this (category, tier). The user can still override via the dropdown
    // (which surfaces all recommendations at the top so they're easy to
    // pick from). Only auto-fills when no size is set — never overwrites
    // an existing value.
    if (selectedItem.containerSize === undefined && tier) {
      const recIndices = getRecommendedIndices(selectedItem.category, tier)
      if (recIndices.length > 0) {
        const top = COMMON_SIZES[recIndices[0]]
        updates.containerSize = top.size
        updates.containerUnit = top.unit
        setPrimarySizeDraft(String(top.size))
      }
    }
    void persistUpcChange(updates)
  }

  // Parse a draft string into a number | undefined for storage. Empty / NaN
  // both mean "not set" so the user can clear a value by emptying the input.
  const parseNumOrUndef = (s: string): number | undefined => {
    const trimmed = s.trim()
    if (trimmed === '') return undefined
    const n = Number(trimmed)
    return Number.isFinite(n) && n >= 0 ? n : undefined
  }

  const handlePrimarySizeBlur = () => {
    if (!selectedItem) return
    const n = parseNumOrUndef(primarySizeDraft)
    if (n === selectedItem.containerSize) return
    void persistUpcChange({ containerSize: n })
  }

  const handlePrimarySizeUnitChange = (u: QuantityUnit | '') => {
    if (!selectedItem) return
    const newUnit = u === '' ? undefined : u
    if (newUnit === selectedItem.containerUnit) return
    void persistUpcChange({ containerUnit: newUnit })
  }

  const handlePrimaryPackQuantityBlur = () => {
    if (!selectedItem) return
    const n = parseNumOrUndef(primaryPackQuantityDraft)
    if (n === selectedItem.packQuantity) return
    void persistUpcChange({ packQuantity: n })
  }

  const updateAltDraft = (
    barcode: string,
    field: 'size' | 'packQuantity',
    value: string,
  ) => {
    setAltDrafts((prev) => ({
      ...prev,
      [barcode]: {
        size: prev[barcode]?.size ?? '',
        packQuantity: prev[barcode]?.packQuantity ?? '',
        [field]: value,
      },
    }))
  }

  const handleAlternateNumericBlur = (
    barcode: string,
    field: 'size' | 'packQuantity',
  ) => {
    if (!selectedItem) return
    const draft = altDrafts[barcode]
    if (!draft) return
    const n = parseNumOrUndef(draft[field])
    const current = (selectedItem.alternateUpcs ?? []).find((a) => a.barcode === barcode)
    if (!current) return
    if (n === current[field]) return
    const next = (selectedItem.alternateUpcs ?? []).map((alt) =>
      alt.barcode === barcode ? { ...alt, [field]: n } : alt
    )
    void persistUpcChange({ alternateUpcs: next })
  }

  const handleAlternateUnitChange = (barcode: string, u: QuantityUnit | '') => {
    if (!selectedItem) return
    const newUnit = u === '' ? undefined : u
    const next = (selectedItem.alternateUpcs ?? []).map((alt) =>
      alt.barcode === barcode ? { ...alt, sizeUnit: newUnit } : alt
    )
    void persistUpcChange({ alternateUpcs: next })
  }

  const handleAddAlternate = async () => {
    if (!selectedItem) return
    const barcode = addAltBarcode.trim()
    if (!isValidUpc(barcode)) {
      toast.error('UPC must be 8–14 digits')
      return
    }
    if (selectedItem.barcode === barcode) {
      toast.error('That UPC is already the primary')
      return
    }
    if ((selectedItem.alternateUpcs ?? []).some((alt) => alt.barcode === barcode)) {
      toast.error('That UPC is already added')
      return
    }
    const newEntry: AlternateUpc = {
      barcode,
      packTier: addAltTier,
      packQuantity: parseNumOrUndef(addAltQuantity),
      // size + sizeUnit live at the product level (containerSize / containerUnit)
      // and are shared across all UPCs of the same product, so we don't
      // populate them per-row anymore.
    }

    // If the UPC isn't in the catalog yet, create a global product_database
    // entry first using the user-supplied name/brand/category/image. The
    // image (when present) goes through addProductImage which uploads to
    // Storage and creates a sparse catalog stub; the /create endpoint then
    // upgrades that stub with the curated fields. Catalog create failures
    // don't block the local alternate-UPC add — the user's inventory row
    // still gets the barcode, just without enriching the global catalog.
    const shouldCreate = addAltCatalogStatus === 'not-found' && newProductName.trim() !== ''
    if (shouldCreate) {
      try {
        let imageUrl = ''
        if (newProductImageFile) {
          imageUrl = await addProductImage(barcode, newProductImageFile)
        }
        const token = await auth.currentUser?.getIdToken()
        const res = await fetch(`/api/products/${encodeURIComponent(barcode)}/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            productName: newProductName.trim(),
            brand: newProductBrand.trim(),
            category: newProductCategory,
            imageUrl,
          }),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data?.error || `Catalog create failed (${res.status})`)
        }
        toast.success(`Added ${newProductName.trim()} to global catalog`)
      } catch (err) {
        logger.error('[Inventory] Catalog create failed', err as Error, { barcode })
        toast.error(`Catalog create failed — alternate UPC still added. ${(err as Error).message}`)
      }
    }

    const next: AlternateUpc[] = [...(selectedItem.alternateUpcs ?? []), newEntry]
    void persistUpcChange({ alternateUpcs: next }).then(() => {
      setAddAltBarcode('')
      setAddAltQuantity('')
      setShowAddRow(false)
      setNewProductName('')
      setNewProductBrand('')
      setNewProductCategory('other')
      setNewProductImageFile(null)
      setNewProductImagePreview(null)
      setAddAltCatalogStatus('unchecked')
      setAltDrafts((prev) => ({
        ...prev,
        [barcode]: {
          size: '',
          packQuantity: addAltQuantity.trim(),
        },
      }))
      // Leave tier as-is so adding multiple alternates of the same tier is fast
    })
  }

  const handleRemoveAlternate = (barcode: string) => {
    if (!selectedItem) return
    const next = (selectedItem.alternateUpcs ?? []).filter((alt) => alt.barcode !== barcode)
    void persistUpcChange({ alternateUpcs: next }).then(() => {
      setAltDrafts((prev) => {
        const { [barcode]: _, ...rest } = prev
        return rest
      })
    })
  }

  const handleChangeAlternateTier = (barcode: string, tier: PackTier) => {
    if (!selectedItem) return
    const next = (selectedItem.alternateUpcs ?? []).map((alt) =>
      alt.barcode === barcode ? { ...alt, packTier: tier } : alt
    )
    void persistUpcChange({ alternateUpcs: next })
  }

  // Scan-to-add-UPC button — used identically on every UPC tab row that
  // has a scan affordance (saved-alt rows, add-row). Click opens the
  // scanner in add-alt-upc mode; the scanned barcode flows into the
  // inline add-row. Primary row uses its own variant that wraps the
  // barcode text inside the same button, so it's not parameterized here.
  const renderScanToAddUpcButton = (size: 'sm' | 'md' = 'sm') => {
    const dim = size === 'md' ? 'h-8 w-8' : 'h-6 w-6'
    return (
      <button
        type="button"
        onClick={() => {
          setScanMode('add-alt-upc')
          setShowScanner(true)
        }}
        disabled={savingUpc}
        className={`inline-flex items-center justify-center ${dim} rounded hover:bg-muted/50 transition-colors disabled:opacity-50 flex-shrink-0`}
        title="Scan a UPC"
        aria-label="Scan a UPC"
      >
        <ViewfinderCircleIcon className="h-5 w-5 text-muted-foreground" />
      </button>
    )
  }

  // Shared create-new-product fields (name + brand + category + image
  // picker). Used by:
  //   - UPC tab's add-alternate-UPC row when the entered UPC isn't in
  //     catalog (the row's existing Add button is the submit; no buttons
  //     here)
  //   - Catalog search results "no match" card (wrapped by
  //     renderCreateProductForm below, which adds submit + cancel buttons)
  // Both surfaces share the same newProduct* state.
  const renderCreateProductFields = (disabled: boolean) => (
    <>
      <input
        type="text"
        value={newProductName}
        onChange={(e) => setNewProductName(e.target.value)}
        disabled={disabled}
        placeholder="Product name (required)"
        aria-label="New product name"
        className="w-full min-h-[44px] px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
      <input
        type="text"
        value={newProductBrand}
        onChange={(e) => setNewProductBrand(e.target.value)}
        disabled={disabled}
        placeholder="Brand (optional)"
        aria-label="New product brand"
        className="w-full min-h-[44px] px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      />
      <select
        value={newProductCategory}
        onChange={(e) => setNewProductCategory(e.target.value as ProductCategory)}
        disabled={disabled}
        aria-label="New product category"
        className="w-full min-h-[44px] px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
      >
        <option value="other">Other</option>
        <option value="produce">Produce</option>
        <option value="meat">Meat</option>
        <option value="dairy">Dairy</option>
        <option value="bakery">Bakery</option>
        <option value="deli">Deli</option>
        <option value="eggs">Eggs</option>
        <option value="herbs">Herbs</option>
        <option value="spices">Spices</option>
        <option value="seafood">Seafood</option>
        <option value="frozen">Frozen</option>
        <option value="pantry">Pantry</option>
        <option value="beverages">Beverages</option>
        <option value="condiments">Condiments</option>
        <option value="baby">Baby</option>
        <option value="pet-food">Pet food</option>
        <option value="pet-supplies">Pet supplies</option>
      </select>
      <input
        ref={newProductImageInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (!f) return
          setNewProductImageFile(f)
          setNewProductImagePreview(URL.createObjectURL(f))
        }}
        className="hidden"
      />
      <div className="flex items-center gap-3">
        {newProductImagePreview ? (
          <img
            src={newProductImagePreview}
            alt="New product preview"
            className="h-16 w-16 object-cover rounded border border-border flex-shrink-0"
          />
        ) : (
          <div className="h-16 w-16 rounded bg-muted flex items-center justify-center flex-shrink-0 border border-dashed border-border">
            <PhotoIcon className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
        <button
          type="button"
          onClick={() => newProductImageInputRef.current?.click()}
          disabled={disabled}
          className="btn btn-ghost text-xs"
        >
          {newProductImageFile ? 'Replace photo' : 'Add photo'}
        </button>
        {newProductImageFile && (
          <button
            type="button"
            onClick={() => {
              setNewProductImageFile(null)
              setNewProductImagePreview(null)
            }}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-red-600"
          >
            remove
          </button>
        )}
      </div>
    </>
  )

  // Wrapper that adds submit + cancel buttons + an optional note. Used by
  // the search-results "no match" card; the UPC tab's add-row uses the
  // fields-only helper above (its existing Add button is the submit).
  const renderCreateProductForm = (opts: {
    submitting: boolean
    submitLabel: string
    onSubmit: () => void
    onCancel: () => void
    submitDisabled?: boolean
    note?: string
  }) => (
    <div className="space-y-3">
      {renderCreateProductFields(opts.submitting)}
      {opts.note && (
        <p className="text-[11px] text-muted-foreground italic">{opts.note}</p>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={opts.onSubmit}
          disabled={opts.submitting || opts.submitDisabled || !newProductName.trim()}
          className="btn btn-primary text-sm"
        >
          {opts.submitting ? 'Working…' : opts.submitLabel}
        </button>
        <button
          type="button"
          onClick={opts.onCancel}
          disabled={opts.submitting}
          className="btn btn-ghost text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  )

  // Item thumbnail — single source of truth for inventory image rendering.
  // Reads the catalog map first (live via onSnapshot on product_database)
  // so admin/OFF/USDA-enriched images flow through automatically; falls
  // back to the row's stored imageUrl, then to the placeholder icon.
  // Used by the 4 per-tab selected-item headers, list rows, reorder/report
  // rows. Sizes: 'sm' (h-8) / 'md' (h-10) / 'lg' (h-12).
  const renderItemThumb = (item: ShoppingItem, size: 'sm' | 'md' | 'lg' = 'lg') => {
    const sizeCls = {
      sm: { box: 'h-8 w-8', icon: 'h-4 w-4' },
      md: { box: 'h-10 w-10', icon: 'h-5 w-5' },
      lg: { box: 'h-12 w-12', icon: 'h-6 w-6' },
    }[size]
    const src = resolveItemImage(item)
    if (src) {
      return (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className={`${sizeCls.box} object-cover rounded border border-border flex-shrink-0`}
        />
      )
    }
    return (
      <div
        className={`${sizeCls.box} rounded bg-muted flex items-center justify-center flex-shrink-0`}
      >
        <ArchiveBoxIcon className={`${sizeCls.icon} text-muted-foreground`} />
      </div>
    )
  }

  // True when selectedItem is a synthetic preview built from a CatalogResult
  // (id prefix 'catalog:'). These rows aren't in Firestore — any updateItem
  // call against their id fails. Per-item handlers branch on this to skip
  // the inventory write (or refuse the action entirely with a toast).
  const isSyntheticCatalogItem = (item: ShoppingItem | null | undefined): boolean =>
    !!item && item.id.startsWith('catalog:')

  // Build a synthetic ShoppingItem from a CatalogResult so the per-item tabs
  // (Item Details / UPC / Image) can render against a catalog row that isn't
  // in the user's inventory yet. The id is prefixed `catalog:` so per-item
  // handlers can detect preview mode and degrade gracefully (e.g. Adjustment
  // and Purchase History should show an empty state rather than try to
  // updateItem against a doc that doesn't exist).
  const syntheticFromCatalog = (r: CatalogResult): ShoppingItem => ({
    id: `catalog:${r.barcode}`,
    userId: '',
    barcode: r.barcode,
    productName: r.productName || '',
    brand: r.brand || '',
    imageUrl: r.imageUrl || '',
    category: (r.category ?? 'other') as ProductCategory,
    containerSize: r.containerSize ?? undefined,
    containerUnit: r.containerUnit ?? undefined,
    nutrition: r.nutrition
      ? {
          calories: r.nutrition.calories ?? 0,
          protein: r.nutrition.protein ?? 0,
          carbs: r.nutrition.carbs ?? 0,
          fat: r.nutrition.fat ?? 0,
          fiber: r.nutrition.fiber ?? 0,
          servingSize: r.nutrition.servingSize ?? '',
        }
      : undefined,
    isManual: false,
    inStock: false,
    quantity: 0,
    location: 'pantry' as StorageLocation,
    isPerishable: false,
    needed: false,
    priority: 'medium',
    purchaseHistory: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  })

  // Open a catalog row inside the current tab — either an existing inventory
  // ShoppingItem (when the catalog match is already in inventory) or a
  // synthetic preview built from the CatalogResult. Stays on whatever tab
  // the user is currently viewing (Item Details / UPC / Image / etc.) so
  // they can drill in without losing context. List-view tabs (list /
  // reorder / report) don't visibly use selectedItem, so we drill into
  // 'details' from there as a sensible default.
  const openCatalogResult = (r: CatalogResult, existing: ShoppingItem | undefined) => {
    setSelectedItem(existing ?? syntheticFromCatalog(r))
    if (activeTab === 'list' || activeTab === 'reorder' || activeTab === 'report') {
      setActiveTab('details')
    }
    // Collapse the catalog matches block — the fetch effect clears
    // catalogResults when searchQuery goes empty, so this single setter
    // closes the dropdown.
    setSearchQuery('')
  }

  // Catalog match row actions — Open / + Inventory / + Shopping. Mobile-first:
  // buttons sit on their own row below the product info and stretch full-width
  // (flex-1) so 360px screens get equal-share buttons that meet the 44px tap
  // target. .btn supplies min-h-[44px] + text-sm; whitespace-nowrap keeps
  // "+ Inventory" / "+ Shopping" on one line. On sm+ buttons collapse to
  // natural width.
  // "Open" stays on the current tab and sets the catalog row as selectedItem
  // — for items not in inventory, that's a synthetic preview (see
  // syntheticFromCatalog). Admin-editor deep-link is reachable via the Item
  // Details tab's footer instead, where it's contextually appropriate.
  const renderCatalogRowActions = (r: CatalogResult, existing: ShoppingItem | undefined) => (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => openCatalogResult(r, existing)}
        className="btn btn-secondary flex-1 sm:flex-none whitespace-nowrap"
        title={
          existing
            ? 'Open this inventory item on the current tab'
            : 'Preview this catalog row on the current tab'
        }
      >
        {existing ? 'Open in inventory' : 'Open'}
      </button>
      {!existing && (
        <button
          type="button"
          onClick={() => handleAddCatalogItem(r, 'inventory')}
          disabled={catalogAddingBarcode === r.barcode}
          className="btn btn-primary flex-1 sm:flex-none whitespace-nowrap"
          title="Add to inventory (I have this on hand)"
        >
          {catalogAddingBarcode === r.barcode ? 'Adding…' : '+ Inventory'}
        </button>
      )}
      <button
        type="button"
        onClick={() => handleAddCatalogItem(r, 'shopping')}
        disabled={catalogAddingBarcode === r.barcode}
        className="btn btn-secondary flex-1 sm:flex-none whitespace-nowrap"
        title="Add to shopping list (I want to buy this)"
      >
        + Shopping
      </button>
    </div>
  )

  // Unit dropdown — used by the custom-entry fallback and the per-UPC row's
  // unit picker if/when sizes ever diverge. Grouped by Volume / Weight / Count.
  const renderUpcUnitDropdown = (
    value: QuantityUnit | '',
    onChange: (u: QuantityUnit | '') => void,
    ariaLabel: string,
    extraClass = '',
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as QuantityUnit | '')}
      disabled={savingUpc}
      aria-label={ariaLabel}
      className={`min-h-[44px] px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 ${extraClass}`}
    >
      <option value="">unit</option>
      <optgroup label="Volume">
        <option value="fl oz">fl oz</option>
        <option value="ml">ml</option>
        <option value="l">l</option>
        <option value="gal">gal</option>
        <option value="qt">qt</option>
        <option value="pt">pt</option>
      </optgroup>
      <optgroup label="Weight">
        <option value="oz">oz</option>
        <option value="lbs">lbs</option>
        <option value="g">g</option>
        <option value="kg">kg</option>
      </optgroup>
      <optgroup label="Count">
        <option value="count">count</option>
        <option value="each">each</option>
        <option value="bottle">bottle</option>
        <option value="can">can</option>
        <option value="package">package</option>
        <option value="bag">bag</option>
      </optgroup>
    </select>
  )

  // Common retail sizes for the product-level size dropdown. Curated to the
  // values that actually appear on consumer packaging — drinks (8 / 12 /
  // 16.9 / 20 fl oz, 1 L, 1.5 L, 1 gal), shelf staples (4 / 8 / 16 oz, 2 / 5 lb),
  // and counted goods (12 / 18 / 24 ct). "Custom" falls back to free entry
  // for the long tail. Source: typical US grocery + warehouse club packaging.
  const COMMON_SIZES: { label: string; size: number; unit: QuantityUnit; group: string }[] = [
    { group: 'Drink volume', label: '8 fl oz', size: 8, unit: 'fl oz' },
    { group: 'Drink volume', label: '12 fl oz', size: 12, unit: 'fl oz' },
    { group: 'Drink volume', label: '16 fl oz', size: 16, unit: 'fl oz' },
    { group: 'Drink volume', label: '16.9 fl oz (500 ml)', size: 16.9, unit: 'fl oz' },
    { group: 'Drink volume', label: '20 fl oz', size: 20, unit: 'fl oz' },
    { group: 'Drink volume', label: '24 fl oz', size: 24, unit: 'fl oz' },
    { group: 'Drink volume', label: '32 fl oz (1 qt)', size: 32, unit: 'fl oz' },
    { group: 'Drink volume', label: '1 L', size: 1, unit: 'l' },
    { group: 'Drink volume', label: '1.5 L', size: 1.5, unit: 'l' },
    { group: 'Drink volume', label: '2 L', size: 2, unit: 'l' },
    { group: 'Drink volume', label: '1 gallon', size: 1, unit: 'gal' },
    { group: 'Weight', label: '4 oz', size: 4, unit: 'oz' },
    { group: 'Weight', label: '6 oz', size: 6, unit: 'oz' },
    { group: 'Weight', label: '8 oz', size: 8, unit: 'oz' },
    { group: 'Weight', label: '12 oz', size: 12, unit: 'oz' },
    { group: 'Weight', label: '16 oz (1 lb)', size: 16, unit: 'oz' },
    { group: 'Weight', label: '2 lb', size: 2, unit: 'lbs' },
    { group: 'Weight', label: '5 lb', size: 5, unit: 'lbs' },
    { group: 'Count', label: '6 count', size: 6, unit: 'count' },
    { group: 'Count', label: '12 count', size: 12, unit: 'count' },
    { group: 'Count', label: '18 count', size: 18, unit: 'count' },
    { group: 'Count', label: '24 count', size: 24, unit: 'count' },
    { group: 'Count', label: '36 count', size: 36, unit: 'count' },
  ]

  const findPresetIndex = (size?: number, unit?: QuantityUnit): number => {
    if (size === undefined || unit === undefined) return -1
    return COMMON_SIZES.findIndex((s) => s.size === size && s.unit === unit)
  }

  // Per-(category, tier) recommendation table. Ranks the most likely unit
  // sizes given what the user is buying and which tier they're tagging.
  // Tier matters because retail conventions differ — single-bottle beverages
  // skew larger (16.9 fl oz / 1 L / 1 gal), packs and cases skew smaller per
  // unit (12 fl oz cans, 8 fl oz juice boxes). The first entry becomes the
  // auto-fill default when the user picks a tier and size is unset.
  const RECOMMENDED_SIZES: Partial<
    Record<ProductCategory, Partial<Record<PackTier, Array<{ size: number; unit: QuantityUnit }>>>>
  > = {
    beverages: {
      U: [
        { size: 16.9, unit: 'fl oz' },
        { size: 20, unit: 'fl oz' },
        { size: 32, unit: 'fl oz' },
        { size: 1, unit: 'l' },
        { size: 1.5, unit: 'l' },
        { size: 1, unit: 'gal' },
      ],
      P: [
        { size: 12, unit: 'fl oz' },
        { size: 16.9, unit: 'fl oz' },
        { size: 8, unit: 'fl oz' },
      ],
      C: [
        { size: 16.9, unit: 'fl oz' },
        { size: 12, unit: 'fl oz' },
        { size: 8, unit: 'fl oz' },
      ],
    },
    eggs: {
      U: [
        { size: 12, unit: 'count' },
        { size: 18, unit: 'count' },
        { size: 24, unit: 'count' },
      ],
    },
    dairy: {
      U: [
        { size: 8, unit: 'oz' },
        { size: 32, unit: 'fl oz' },
        { size: 1, unit: 'gal' },
      ],
    },
    pantry: {
      U: [
        { size: 16, unit: 'oz' },
        { size: 12, unit: 'oz' },
        { size: 2, unit: 'lbs' },
        { size: 5, unit: 'lbs' },
      ],
    },
  }

  const getRecommendedIndices = (category: ProductCategory, tier?: PackTier): number[] => {
    if (!tier) return []
    const recs = RECOMMENDED_SIZES[category]?.[tier]
    if (!recs) return []
    const out: number[] = []
    for (const r of recs) {
      const idx = COMMON_SIZES.findIndex((s) => s.size === r.size && s.unit === r.unit)
      if (idx !== -1) out.push(idx)
    }
    return out
  }

  // Auto-flip into custom mode if the existing size doesn't match a preset.
  useEffect(() => {
    if (!selectedItem) {
      setCustomSizeMode(false)
      return
    }
    const idx = findPresetIndex(selectedItem.containerSize, selectedItem.containerUnit)
    const hasValue =
      selectedItem.containerSize !== undefined || selectedItem.containerUnit !== undefined
    setCustomSizeMode(idx === -1 && hasValue)
  }, [selectedItem?.id])

  const handlePresetSizeChange = (value: string) => {
    if (value === 'custom') {
      setCustomSizeMode(true)
      return
    }
    if (value === '') {
      setCustomSizeMode(false)
      void persistUpcChange({ containerSize: undefined, containerUnit: undefined })
      return
    }
    const idx = parseInt(value, 10)
    const preset = COMMON_SIZES[idx]
    if (!preset) return
    setCustomSizeMode(false)
    setPrimarySizeDraft(String(preset.size))
    void persistUpcChange({ containerSize: preset.size, containerUnit: preset.unit })
  }

  const handleDelete = async () => {
    if (!selectedItem) return
    if (!confirm(`Delete "${selectedItem.productName}" from inventory? This cannot be undone.`)) {
      return
    }
    try {
      await removeItem(selectedItem.id)
      toast.success('Item deleted')
      setSelectedItem(null)
      setActiveTab('list')
    } catch (error: any) {
      logger.error('[Inventory] Delete failed', error as Error, { itemId: selectedItem.id })
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    }
  }

  const openUsedUpModal = () => {
    if (!selectedItem) return
    setQtyModal({
      mode: 'used-up',
      itemId: selectedItem.id,
      productName: selectedItem.productName,
      brand: selectedItem.brand,
      imageUrl: selectedItem.imageUrl,
      barcode: selectedItem.barcode,
      category: selectedItem.category,
      currentQty: selectedItem.quantity ?? 1,
      unit: selectedItem.unit,
      containerSize: selectedItem.containerSize,
      containerUnit: selectedItem.containerUnit,
      remainingAmount: selectedItem.remainingAmount,
    })
  }

  const openBuyAgainModal = () => {
    if (!selectedItem) return
    if (!auth.currentUser?.uid) {
      toast.error('You must be logged in')
      return
    }
    setQtyModal({
      mode: 'buy-again',
      itemId: selectedItem.id,
      productName: selectedItem.productName,
      brand: selectedItem.brand,
      imageUrl: selectedItem.imageUrl,
      barcode: selectedItem.barcode,
      category: selectedItem.category,
      currentQty: 1,
      unit: selectedItem.unit,
    })
  }

  /**
   * Rename modal state — used both by the inline pencil on existing rows
   * with placeholder names, and by the scan-time auto-prompt for newly
   * scanned products that came back without a real name.
   *
   * `itemId` is set for inline edits (we update the local row's name on
   * success). It's undefined for scan-time renames where the local row
   * hasn't been created yet.
   */
  const [renameModal, setRenameModal] = useState<{
    itemId?: string
    barcode: string
    productName: string
    imageUrl?: string
    /**
     * When set, the modal was triggered by an in-flight scan and the
     * product needs to be added to inventory after the rename completes.
     * The full OFF/USDA-shaped product object is captured so we can call
     * addItem with the user-supplied name patched in.
     */
    pendingScanProduct?: import('@/lib/openfoodfacts-api').OpenFoodFactsProduct
  } | null>(null)

  const summary = getSummary()
  const loading = inventoryLoading || expiredLoading
  const needsCleanup = criticalItems.length + highRiskItems.length
  const allInventoryItems = [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems]

  // Page-level catalog image map — onSnapshot per unique barcode so catalog
  // updates (admin uploads, OFF migrations, another caregiver's photo capture)
  // push live into list / reorder / report rows without a refetch. List uses
  // resolveItemImage(item) which prefers this map over the row's snapshot.
  //
  // Listener lifecycle: when inventory shape changes (item add / remove / new
  // alternate UPC), diff the wanted vs. live set, subscribe new barcodes,
  // unsubscribe gone ones. The activeUnsubs ref is the live registry.
  //
  // Cost: one Firestore listener per unique barcode in inventory. For typical
  // households (~50–200 items) this is fine. If inventory ever grows past
  // ~500 unique barcodes we'd batch via chunked `where('__name__', 'in', …)`
  // queries (limit 30 per query) instead of per-doc listeners.
  const activeImageUnsubsRef = useRef<Map<string, () => void>>(new Map())
  useEffect(() => {
    const wanted = new Set<string>()
    for (const item of allInventoryItems) {
      if (item.barcode) wanted.add(item.barcode)
      for (const alt of item.alternateUpcs ?? []) {
        if (alt.barcode) wanted.add(alt.barcode)
      }
    }
    const live = activeImageUnsubsRef.current
    // Unsubscribe barcodes we no longer care about (item removed).
    for (const [bc, unsub] of live) {
      if (!wanted.has(bc)) {
        unsub()
        live.delete(bc)
        setCatalogImagesByBarcode((prev) => {
          if (!(bc in prev)) return prev
          const next = { ...prev }
          delete next[bc]
          return next
        })
      }
    }
    // Subscribe newly-wanted barcodes.
    for (const bc of wanted) {
      if (live.has(bc)) continue
      const ref = doc(db, 'product_database', bc)
      const unsub = onSnapshot(
        ref,
        (snap) => {
          const data = snap.data() as { imageUrl?: string } | undefined
          const url = data?.imageUrl
          setCatalogImagesByBarcode((prev) => {
            if (url) {
              if (prev[bc] === url) return prev
              return { ...prev, [bc]: url }
            }
            // Catalog has the doc but no image — drop any stale entry.
            if (!(bc in prev)) return prev
            const next = { ...prev }
            delete next[bc]
            return next
          })
        },
        (err) => {
          logger.warn('[Inventory] Catalog snapshot error', {
            barcode: bc,
            error: err.message,
          })
        },
      )
      live.set(bc, unsub)
    }
  }, [
    allInventoryItems
      .flatMap((i) => [i.barcode ?? '', ...(i.alternateUpcs ?? []).map((a) => a.barcode)])
      .filter(Boolean)
      .sort()
      .join('|'),
  ])

  // Tear down all listeners on page unmount.
  useEffect(() => {
    return () => {
      for (const unsub of activeImageUnsubsRef.current.values()) unsub()
      activeImageUnsubsRef.current.clear()
    }
  }, [])

  // Single resolver used everywhere images render. Catalog wins, row snapshot
  // is fallback, undefined means "no image — render the placeholder."
  // Image resolver — ROW FIRST, catalog as fallback. Original design was
  // catalog-first ("catalog is authoritative"), but if catalog images are
  // stale (expired download tokens, blocked by CSP, or 503-ing externally
  // like OFF outages), catalog-first overrides working row URLs with broken
  // ones — hence the "appear and disappear" symptom users hit in prod.
  // Row's URL is the user's already-validated state; only fall back to
  // catalog when the row genuinely has nothing.
  const resolveItemImage = (item: ShoppingItem): string | undefined =>
    item.imageUrl || (item.barcode && catalogImagesByBarcode[item.barcode]) || undefined

  /**
   * Fetch household members for display
   */
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const patients = await patientOperations.getPatients()
        const memberMap: Record<string, PatientProfile> = {}
        patients.forEach(p => {
          memberMap[p.id] = p
        })
        setMembers(memberMap)
      } catch (error) {
        logger.error('Error fetching household members', error as Error)
      }
    }
    fetchMembers()
  }, [])

  /**
   * Get member display name
   */
  const getMemberName = (userId?: string): string => {
    if (!userId) return ''
    const member = members[userId]
    if (member) {
      return member.name || 'Member'
    }
    return auth.currentUser?.uid === userId ? 'You' : 'Member'
  }

  /**
   * Get items for selected location, then apply the page-wide search +
   * category filter so every tab sees the same filtered set.
   */
  const getItemsForLocation = () => {
    const byLocation = (() => {
      switch (selectedLocation) {
        case 'fridge':
          return fridgeItems
        case 'freezer':
          return freezerItems
        case 'pantry':
          return pantryItems
        case 'counter':
          return counterItems
        case 'all':
          return [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems]
        default:
          return []
      }
    })()
    // Newest-added first — sort by createdAt desc so a freshly scanned /
    // catalog-added item appears at the top of the list. Falls back to
    // updatedAt for legacy rows missing createdAt. Updating an existing
    // item (consume / adjust) does NOT bump it under this rule.
    const sorted = [...byLocation].sort((a, b) => {
      const aTs = a.createdAt
        ? new Date(a.createdAt).getTime()
        : a.updatedAt
          ? new Date(a.updatedAt).getTime()
          : 0
      const bTs = b.createdAt
        ? new Date(b.createdAt).getTime()
        : b.updatedAt
          ? new Date(b.updatedAt).getTime()
          : 0
      return bTs - aTs
    })
    return filterItems(sorted)
  }

  const items = getItemsForLocation()

  /**
   * Handle scan context selection
   */
  const handleScanContextSelect = (context: ScanContext) => {
    setScanContext(context)
    setShowScanContext(false)
    setShowScanner(true)
  }

  /**
   * Handle barcode scan
   */
  const handleBarcodeScan = async (barcode: string) => {
    setScannedBarcode(barcode)
    setShowScanner(false)

    // Scan-to-search short-circuit — drop the barcode into the page-wide
    // search box and let the existing hybrid lookup (inventory + catalog)
    // surface the result. No add-flow, no ScanContextModal.
    if (scanMode === 'search') {
      setSearchQuery(barcode)
      setActiveTab('list')
      setScanMode('add')
      toast.success(`Searching for ${barcode}`)
      return
    }

    // Scan-to-pick — fired from the empty-state cards on per-item tabs
    // (Item Details / Inventory Adjustment / Purchase History / UPC). Looks
    // up the barcode in the user's inventory, sets it as the selected item,
    // and keeps the user on whatever tab they came from.
    if (scanMode === 'pick-for-tab') {
      setScanMode('add')
      const existing = allInventoryItems.find((item) => item.barcode === barcode)
      if (existing) {
        setSelectedItem(existing)
        toast.success(`Picked ${existing.productName}`)
        return
      }
      toast.error(
        `${barcode} isn't in your inventory yet. Switch to Inventory List to scan and add it.`,
      )
      return
    }

    // Scan-to-fill-alt-UPC — used from the UPC tab's "Add another UPC" form.
    // Drops the barcode into the add-row, opens the form if not already open,
    // and best-effort queries the catalog to auto-set the product's unit size
    // when it's not already set. The user still picks tier + quantity.
    if (scanMode === 'add-alt-upc') {
      setAddAltBarcode(barcode)
      setShowAddRow(true)
      setScanMode('add')

      if (selectedItem && selectedItem.containerSize === undefined) {
        try {
          const token = await auth.currentUser?.getIdToken()
          const headers: Record<string, string> = {}
          if (token) headers.Authorization = `Bearer ${token}`
          const res = await fetch(
            `/api/products/search?q=${encodeURIComponent(barcode)}`,
            { headers },
          )
          if (res.ok) {
            const data = (await res.json()) as {
              results?: Array<{
                containerSize?: number | null
                containerUnit?: QuantityUnit | null
              }>
            }
            const hit = data.results?.[0]
            if (hit?.containerSize && hit?.containerUnit) {
              await persistUpcChange({
                containerSize: hit.containerSize,
                containerUnit: hit.containerUnit,
              })
              toast.success(
                `Scanned ${barcode} · set unit size to ${hit.containerSize} ${hit.containerUnit}`,
              )
              return
            }
          }
        } catch (err) {
          logger.warn('[Inventory] Catalog auto-fill on alt-UPC scan failed', {
            error: (err as Error).message,
          })
        }
      }

      toast.success(`Scanned ${barcode} — set qty + tier, then Add`)
      return
    }

    try {
      toast.loading('Looking up product...', { id: 'barcode' })

      // Use the cached server endpoint (not OFF directly) so the response
      // carries product_database fields like container_size that
      // addOrUpdateShoppingItem reads to seed Phase 2b's amount tracking.
      const response = await lookupBarcodeWithCache(barcode)
      const product = simplifyProduct(response)

      if (!product.found) {
        // Not in catalog or any external source. Replace the dead-end error
        // toast with the actionable add-this sheet — user types the name,
        // picks the qty, and the row lands in inventory with the barcode
        // attached so future scans match. Same UX as /shopping's not-found
        // path (DRY via useAddSheet).
        toast.dismiss('barcode')
        if (scanContext === 'purchase' || scanContext === 'inventory') {
          openAddSheet({
            productName: '',
            editableName: true,
            barcode,
            inventoryMatch: null,
            qtyQuestion: 'How many are you adding?',
            submitLabel: 'Add to inventory',
            onConfirm: async (qty, nameOverride) => {
              const finalName = (nameOverride || '').trim()
              if (!finalName) return
              // Synthesize a minimal OFF-shaped product so addItem's
              // existing add-or-update flow takes over. barcode + name
              // are the only fields we have; everything else fills in
              // when the catalog later enriches it.
              await addItem(
                {
                  code: barcode,
                  product_name: finalName,
                } as any,
                {
                  inStock: true,
                  needed: false,
                  quantity: qty,
                },
              )
              toast.success(`Added ${qty} ${finalName} to inventory`)
            },
          })
        } else {
          // Non-add contexts (e.g. 'meal' info-only): keep the original
          // error since there's no add path to offer.
          toast.error(
            `Product not found in database (barcode: ${barcode}).`,
            { id: 'barcode', duration: 4000 },
          )
        }
        return
      }

      toast.success(`Found: ${product.name}`, { id: 'barcode' })

      // Scan-time rename: if the lookup returned a product with no real
      // name, prompt the user to supply one BEFORE the row gets created.
      // The modal POSTs to the rename endpoint, then we re-enter the add
      // flow with the product's product_name mutated to the user's input
      // so the inventory row inherits the correct name from the start.
      const isPlaceholderName =
        !product.name || product.name.toLowerCase() === 'unknown product'
      if (isPlaceholderName && response.product && (scanContext === 'purchase' || scanContext === 'inventory')) {
        setRenameModal({
          barcode,
          productName: product.name,
          imageUrl: response.product.image_url || response.product.image_front_url,
          pendingScanProduct: response.product,
        })
        toast.dismiss('barcode')
        return
      }

      // Handle based on scan context
      if (scanContext === 'consume') {
        // Mark as consumed (out of stock, add to shopping list)
        const existing = items.find(item => item.barcode === barcode)
        if (existing) {
          await consumeItem(existing.id)
          toast.success(`Marked as used. Added ${product.name} to shopping list`)
        } else {
          toast.error('Item not found in inventory')
        }
      } else if (scanContext === 'purchase' || scanContext === 'inventory') {
        // Open the add sheet with the existing inventory row (if any) as
        // context so the user sees current on-hand AND can dial in how
        // many they're adding right now. Replaces the silent qty=1
        // increment — every inventory event becomes an explicit decision
        // (also gives a clean record for later "where did my count come
        // from" hindsight). addItem internally finds-by-barcode and
        // increments by the supplied quantity (Phase 2b containerSize
        // seeding still applies on first add).
        const existing = allInventoryItems.find((item) => item.barcode === barcode)
        toast.dismiss('barcode')
        openAddSheet({
          productName: product.name,
          brand: response.product?.brands || existing?.brand,
          imageUrl: response.product?.image_url || existing?.imageUrl || undefined,
          inventoryMatch: existing ?? null,
          qtyQuestion: 'How many are you adding?',
          submitLabel: existing ? 'Add to inventory' : 'Add to inventory',
          onConfirm: async (qty) => {
            await addItem(response.product!, {
              inStock: true,
              needed: false,
              quantity: qty,
            })
            const total = (existing?.quantity ?? 0) + qty
            toast.success(
              existing
                ? `Added ${qty} · ${total} on hand now`
                : `Added ${qty} ${product.name} to inventory`,
            )
          },
        })
      } else {
        // Just show info (meal context)
        toast(`${product.name} - ${product.calories} cal`)
      }

      setScannedBarcode(null)
    } catch (error: any) {
      console.error('[Inventory] Barcode scan error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        barcode,
        scanContext,
        fullError: error
      })
      logger.error('Barcode error', error as Error, {
        barcode,
        scanContext
      })
      toast.error(error?.message || 'Failed to process barcode', { id: 'barcode' })
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Kitchen Inventory"
          subtitle={`${summary.inStockItems} items in stock`}
        />

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Page-wide item lookup — same SearchFilter as /shopping. Filters
              every list-driven tab (Inventory List, Suggested Reorder,
              Restocking Report) by name / brand / barcode + category. The
              barcode-scan button next to it triggers the same scanner the
              add-flow uses, but in 'search' mode — the scanned UPC populates
              the search query rather than going through the add flow. */}
          <div className="mb-4 flex gap-2 items-start">
            <div className="flex-1 min-w-0">
              <SearchFilter
                onSearch={setSearchQuery}
                onFilterCategory={setFilterCategory}
                selectedCategory={filterCategory}
                searchValue={searchQuery}
                placeholder="Search catalog by name or UPC…"
              />
            </div>
            <button
              type="button"
              onClick={scanItemLock.isLocked ? scanItemLock.onLockedClick : () => {
                setScanMode('search')
                setShowScanner(true)
              }}
              aria-label={scanItemLock.isLocked ? 'Paused — Scan to search catalog' : 'Scan a barcode to search'}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors flex-shrink-0"
              title={scanItemLock.isLocked ? 'Paused — Scan to search catalog' : 'Scan a barcode to search'}
            >
              {/* Camera icon — represents the action (open camera to scan), not
                  the symbology. Prevents the QR-vs-UPC confusion. */}
              <ViewfinderCircleIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Catalog item-lookup results — page-level. Shows whenever the
              search query is non-trivial, regardless of which tab is active.
              Items already in inventory are NOT filtered out — they render
              with an "Open" action that jumps to Item Details, so a search
              that hits an item the user already owns still surfaces it. */}
          {searchQuery.trim().length >= 2 && (() => {
            const inventoryByBarcode = new Map<string, ShoppingItem>(
              [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems]
                .filter((it): it is ShoppingItem & { barcode: string } => !!it.barcode)
                .map((it) => [it.barcode, it]),
            )
            const isBarcodeQuery = isValidUpc(searchQuery.trim())
            // No hits AND query looks like a UPC → render "create new product"
            // CTA card. This closes the loop on UPCs USDA + OFF both miss.
            if (!catalogLoading && catalogResults.length === 0 && isBarcodeQuery) {
              return (
                <div className="mb-6 bg-card rounded-lg shadow border border-border overflow-hidden">
                  <div className="px-5 py-3 border-b border-border bg-muted/30">
                    <h3 className="text-sm font-semibold text-foreground">
                      No catalog match for{' '}
                      <span className="font-mono">{searchQuery}</span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Neither our catalog nor USDA / OpenFoodFacts has this UPC. You can create it.
                    </p>
                  </div>
                  {!searchCreateExpanded ? (
                    <div className="px-5 py-4">
                      <button
                        type="button"
                        onClick={() => setSearchCreateExpanded(true)}
                        className="btn btn-primary text-sm"
                      >
                        + Create new product
                      </button>
                    </div>
                  ) : (
                    <div className="px-5 py-4">
                      {renderCreateProductForm({
                        submitting: searchCreateSubmitting,
                        submitLabel: 'Create + add to inventory',
                        onSubmit: handleCreateFromSearch,
                        onCancel: () => {
                          setSearchCreateExpanded(false)
                          setNewProductName('')
                          setNewProductBrand('')
                          setNewProductCategory('other')
                          setNewProductImageFile(null)
                          setNewProductImagePreview(null)
                        },
                        note: 'Creates a global catalog entry that other users will see when they scan this UPC, and adds it to your inventory.',
                      })}
                    </div>
                  )}
                </div>
              )
            }
            if (!catalogLoading && catalogResults.length === 0) return null
            return (
              <div className="mb-6 bg-card rounded-lg shadow border border-border overflow-hidden">
                <div className="px-5 py-3 border-b border-border bg-muted/30">
                  <h3 className="text-sm font-semibold text-foreground">
                    Catalog matches
                    {!catalogLoading && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        · {catalogResults.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Products from the global catalog matching <strong>{searchQuery}</strong>.{' '}
                    <strong>Open</strong> = edit catalog details (fix name, upload image).{' '}
                    <strong>+ Inventory</strong> = I have this on hand.{' '}
                    <strong>+ Shopping</strong> = I want to buy this.
                  </p>
                </div>
                {catalogLoading ? (
                  <div className="px-5 py-6 text-center text-xs text-muted-foreground">
                    Searching catalog…
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {catalogResults.map((r) => {
                      const existing = inventoryByBarcode.get(r.barcode)
                      return (
                        // Mobile-first: stack product info above actions so 360px
                        // phones never cramp. Buttons go full-width via flex-1
                        // on the wrap row; on sm+ they collapse to natural width.
                        <li key={r.barcode} className="px-4 py-3 flex flex-col gap-3">
                          <div className="flex items-center gap-3">
                            {r.imageUrl ? (
                              <img
                                src={r.imageUrl}
                                alt=""
                                aria-hidden="true"
                                className="h-12 w-12 object-cover rounded border border-border flex-shrink-0"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-foreground truncate">
                                {r.productName || '(no name)'}
                                {existing && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium text-primary bg-primary/10 rounded">
                                    in inventory
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {[r.brand, r.barcode].filter(Boolean).join(' · ')}
                              </div>
                            </div>
                          </div>
                          {renderCatalogRowActions(r, existing)}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })()}

          {/* Page-level tabs. Mobile-first: 8 tabs at icon+label width sum
              to ~700px which overflows phone viewports and forces horizontal
              scrolling — users couldn't see what was past the right edge.
              Strategy: icon-only on mobile (each tab ≥44px square, fits 8
              across roughly any phone screen), icon+label at md+. The
              aria-label keeps accessibility intact when the visual label
              hides. overflow-x-auto remains as a safety net for very narrow
              viewports / locales with longer labels. */}
          <div role="tablist" className="flex border-b border-border mb-6 -mx-1 overflow-x-auto">
            {/* Tab order: most-used on the left (daily flows), planning /
                analytics tabs (Suggested Reorder, Restocking Report) at the
                right since they're occasional. UPC + Image are catalog-
                identity tabs — middle position. */}
            {([
              { id: 'list' as const, label: 'Inventory List', icon: ListBulletIcon },
              { id: 'details' as const, label: 'Item Details', icon: ArchiveBoxIcon },
              { id: 'adjust' as const, label: 'Inventory Adjustment', icon: AdjustmentsHorizontalIcon },
              { id: 'history' as const, label: 'Purchase History', icon: ClockIcon },
              { id: 'upc' as const, label: 'UPC', icon: QrCodeIcon },
              { id: 'image' as const, label: 'Image', icon: PhotoIcon },
              { id: 'reorder' as const, label: 'Suggested Reorder', icon: ShoppingCartIcon },
              { id: 'report' as const, label: 'Restocking Report', icon: ChartBarIcon },
            ]).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={activeTab === id}
                aria-label={label}
                title={label}
                onClick={() => setActiveTab(id)}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-2 md:px-4 py-2.5 md:py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap min-h-[48px] ${
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-5 w-5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>

          {/* Item Details tab. When an item is selected (clicked from
              Inventory List), shows the inline editor for category /
              quantity / unit. When nothing is selected, shows the
              empty-state pointing back to Inventory List. Phase B will
              add a product-lookup search at the top of this tab so admins
              can find a catalog item and link it without going through
              the list first. */}
          {activeTab === 'details' && (
            selectedItem ? (
              <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                  {renderItemThumb(selectedItem, 'lg')}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {selectedItem.productName}
                    </h2>
                    {(selectedItem.brand || selectedItem.barcode) && (
                      <p className="text-xs text-muted-foreground truncate">
                        {[selectedItem.brand, selectedItem.barcode].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null)
                      setActiveTab('list')
                    }}
                    className="text-sm text-primary hover:underline font-medium flex-shrink-0"
                  >
                    ← Back to list
                  </button>
                </div>

                {/* Quick Actions — per-item workflows that used to be on each
                    list row. Replaces the Edit/Used Up/Buy Again buttons,
                    adds Delete which was previously inaccessible. */}
                <div className="px-5 pt-5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Quick Actions
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={openUsedUpModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors text-sm font-medium"
                      title="Log how much you used"
                    >
                      <span aria-hidden="true">📉</span> Used Up
                    </button>
                    {/* Buy Again — always enabled. The previous quantity-≤1
                        gate fought real shopper intent (stock-up runs, sale-
                        driven buying, prep for guests). Adding to a shopping
                        list is non-destructive; trust the user to decide
                        when they want more. */}
                    <button
                      type="button"
                      onClick={openBuyAgainModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg transition-colors text-sm font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30"
                      title="Add to shopping list"
                    >
                      <span aria-hidden="true">🛒</span> Buy Again
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors text-sm font-medium ml-auto"
                      title="Remove this item from your inventory"
                    >
                      <span aria-hidden="true">🗑️</span> Delete
                    </button>
                  </div>
                </div>

                {/* Detail panels grid — 4-col on desktop, 2 on tablet, 1 on
                    mobile. Live state (On hand, Storage) on top row; broader
                    classification + catalog facts spanning wider panels on
                    the second row; nutrition facts as its own wide panel.
                    Notes + History sit full-width below. */}
                <div className="px-5 pt-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* On hand — readonly stat with link to Inventory Adjustment */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        On hand
                      </div>
                      {(() => {
                        const f = formatOnHand(selectedItem)
                        return (
                          <>
                            {f.mode === 'flat' ? (
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-semibold text-foreground tabular-nums">{f.total}</span>
                                <span className="text-sm text-muted-foreground">{f.unit}</span>
                              </div>
                            ) : (
                              <div>
                                <div className="text-2xl font-semibold text-foreground tabular-nums">
                                  {f.cases} <span className="text-muted-foreground font-normal">+</span> {f.loose}
                                </div>
                                <div className="text-xs text-muted-foreground">{f.tierLabel} + {f.unitLabel}</div>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => setActiveTab('adjust')}
                              className="mt-3 text-xs text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <AdjustmentsHorizontalIcon className="h-3.5 w-3.5" />
                              Adjust
                            </button>
                          </>
                        )
                      })()}
                    </div>

                    {/* Storage — location + expiration + remaining */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Storage
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Location</label>
                          <select
                            value={editLocation}
                            onChange={(e) => setEditLocation(e.target.value as StorageLocation)}
                            className="form-input w-full"
                          >
                            <option value="fridge">🥶 Fridge</option>
                            <option value="freezer">🧊 Freezer</option>
                            <option value="pantry">🥫 Pantry</option>
                            <option value="counter">🍌 Counter</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Expires</label>
                          <input
                            type="date"
                            value={editExpiresAt}
                            onChange={(e) => setEditExpiresAt(e.target.value)}
                            className="form-input w-full"
                          />
                        </div>
                        {(() => {
                          const cs = selectedItem.containerSize
                          const ra = selectedItem.remainingAmount
                          if (typeof cs !== 'number' || cs <= 0 || typeof ra !== 'number') return null
                          const pct = ra / cs
                          const cls =
                            pct >= 1
                              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                              : pct >= 0.25
                                ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                                : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                          const displayPct = Math.min(100, Math.round((pct * 100) / 5) * 5)
                          const label = pct > 0 ? `${displayPct}% left` : 'Out'
                          return (
                            <div>
                              <div className="text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Remaining</div>
                              <span className={`inline-block text-xs px-2 py-1 rounded font-medium ${cls}`}>{label}</span>
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Pricing — three read-only tier slots populated by the
                        receipt-OCR apply flow (lib/apply-receipt-prices.ts
                        for trip-flow, lib/apply-purchase-order.ts for the
                        Purchase History bulk intake). The highlighted row
                        matches the item's packTier — the others sit
                        em-dashed until a price is captured at that tier. */}
                    <div className="rounded-lg border border-border bg-card p-4">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Pricing
                      </div>
                      <div className="rounded-md border border-border divide-y divide-border overflow-hidden">
                        {([
                          { label: 'Unit', value: selectedItem.unitPriceCents, tier: 'U' as const },
                          { label: 'Pack', value: selectedItem.packPriceCents, tier: 'P' as const },
                          { label: 'Case', value: selectedItem.casePriceCents, tier: 'C' as const },
                        ]).map((row) => {
                          const has = typeof row.value === 'number' && row.value > 0
                          const isCurrent = (selectedItem.packTier ?? 'U') === row.tier
                          return (
                            <div
                              key={row.tier}
                              className={`flex items-center justify-between px-3 py-2 ${isCurrent ? 'bg-primary/5' : 'bg-card'}`}
                            >
                              <span className="text-sm text-foreground">
                                {row.label}
                                {isCurrent && (
                                  <span className="ml-1.5 text-[9px] font-semibold text-primary uppercase tracking-wide">
                                    current
                                  </span>
                                )}
                              </span>
                              <span className={`text-sm font-semibold tabular-nums ${has ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {has ? `$${((row.value as number) / 100).toFixed(2)}` : '—'}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1.5">
                        Captured from receipt scans
                      </p>
                    </div>

                    {/* Classification — category + unit of measure + unit size */}
                    <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-2">
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Classification
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as ProductCategory)}
                            className="form-input w-full"
                          >
                            {CATEGORY_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.emoji} {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Unit of measure</label>
                          <select
                            value={editUnit || ''}
                            onChange={(e) => setEditUnit((e.target.value || undefined) as QuantityUnit | undefined)}
                            className="form-input w-full"
                          >
                            <option value="">— Not set —</option>
                            {(['Count', 'Weight', 'Volume'] as const).map((group) => (
                              <optgroup key={group} label={group}>
                                {UNIT_OPTIONS.filter((u) => u.group === group).map((u) => (
                                  <option key={u.value} value={u.value}>{u.label || u.value}</option>
                                ))}
                              </optgroup>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">Unit size</label>
                          {(() => {
                      const recIndices = getRecommendedIndices(
                        selectedItem.category,
                        selectedItem.packTier,
                      )
                      const recSet = new Set(recIndices)
                      const tierLabel = selectedItem.packTier
                        ? selectedItem.packTier === 'U'
                          ? 'single'
                          : selectedItem.packTier === 'P'
                            ? 'pack'
                            : 'case'
                        : ''
                      const phase = getCategoryPhase(selectedItem.category)
                      const groupAllowed = (group: string): boolean => {
                        if (phase === 'all') return true
                        if (phase === 'volume') return group === 'Drink volume'
                        if (phase === 'weight') return group === 'Weight'
                        if (phase === 'count') return group === 'Count'
                        return true
                      }
                      if (customSizeMode) {
                        return (
                          <div className="flex gap-2">
                            <input
                              type="number"
                              inputMode="decimal"
                              min="0"
                              step="any"
                              value={primarySizeDraft}
                              onChange={(e) => setPrimarySizeDraft(e.target.value)}
                              onBlur={handlePrimarySizeBlur}
                              disabled={savingUpc}
                              placeholder="size"
                              aria-label="Custom unit size"
                              className="flex-1 min-w-0 form-input"
                            />
                            {renderUpcUnitDropdown(
                              selectedItem.containerUnit ?? '',
                              handlePrimarySizeUnitChange,
                              'Custom unit',
                              'flex-shrink-0',
                            )}
                            <button
                              type="button"
                              onClick={() => setCustomSizeMode(false)}
                              disabled={savingUpc}
                              className="text-xs text-primary hover:underline flex-shrink-0 px-1"
                              title="Back to preset list"
                            >
                              ⤺
                            </button>
                          </div>
                        )
                      }
                      return (
                        <select
                          value={(() => {
                            const idx = findPresetIndex(
                              selectedItem.containerSize,
                              selectedItem.containerUnit,
                            )
                            return idx === -1 ? '' : String(idx)
                          })()}
                          onChange={(e) => handlePresetSizeChange(e.target.value)}
                          disabled={savingUpc}
                          aria-label="Unit size (shared across all UPCs)"
                          className="form-input w-full"
                        >
                          <option value="">— select size —</option>
                          {recIndices.length > 0 && (
                            <optgroup
                              label={`Recommended for ${selectedItem.category}${tierLabel ? ` · ${tierLabel}` : ''}`}
                            >
                              {recIndices.map((i) => (
                                <option key={`rec-${i}`} value={String(i)}>
                                  {COMMON_SIZES[i].label}
                                </option>
                              ))}
                            </optgroup>
                          )}
                          {(['Drink volume', 'Weight', 'Count'] as const).map((group) => {
                            if (!groupAllowed(group)) return null
                            const items = COMMON_SIZES.map((s, i) => ({ s, i })).filter(
                              ({ s, i }) => s.group === group && !recSet.has(i),
                            )
                            if (items.length === 0) return null
                            return (
                              <optgroup key={group} label={group}>
                                {items.map(({ s, i }) => (
                                  <option key={i} value={String(i)}>
                                    {s.label}
                                  </option>
                                ))}
                              </optgroup>
                            )
                          })}
                          <option value="custom">Custom…</option>
                        </select>
                      )
                    })()}
                        </div>

                        {/* Pack + Case size — informational, product-family
                            level (independent of the primary UPC's tier).
                            Each input uses an HTML datalist for common
                            values pulled from real US grocery retail
                            packaging:
                              Pack: 2/3/4/6/8/10/12/15/18/20/24 (typical
                                multi-pack counts — 6-packs of beverages,
                                12-packs of soda/cans, etc.)
                              Case: 12/18/24/30/36/48/60/72 (warehouse-
                                club + retail-display case counts)
                            User can pick from suggestions or type any
                            value (datalist is non-restrictive). Leave
                            blank if unknown. */}
                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">
                            Pack size
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            list="inventory-pack-size-suggestions"
                            value={editPackSize}
                            onChange={(e) => setEditPackSize(e.target.value)}
                            placeholder={
                              defaultPackSizeForCategory(selectedItem.category)
                                ? `e.g. ${defaultPackSizeForCategory(selectedItem.category)} (units in a pack)`
                                : 'e.g. 6 (units in a pack)'
                            }
                            className="form-input w-full"
                            aria-label="Number of units in a pack"
                          />
                          <datalist id="inventory-pack-size-suggestions">
                            <option value="2" />
                            <option value="3" />
                            <option value="4" />
                            <option value="6" />
                            <option value="8" />
                            <option value="10" />
                            <option value="12" />
                            <option value="15" />
                            <option value="18" />
                            <option value="20" />
                            <option value="24" />
                          </datalist>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase text-muted-foreground tracking-wider mb-1">
                            Case size
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min="1"
                            list="inventory-case-size-suggestions"
                            value={editCaseSize}
                            onChange={(e) => setEditCaseSize(e.target.value)}
                            placeholder={
                              defaultCaseSizeForCategory(selectedItem.category)
                                ? `e.g. ${defaultCaseSizeForCategory(selectedItem.category)} (units in a case)`
                                : 'e.g. 24 (units in a case)'
                            }
                            className="form-input w-full"
                            aria-label="Number of units in a case"
                          />
                          <datalist id="inventory-case-size-suggestions">
                            <option value="12" />
                            <option value="18" />
                            <option value="24" />
                            <option value="30" />
                            <option value="36" />
                            <option value="48" />
                            <option value="60" />
                            <option value="72" />
                          </datalist>
                        </div>
                      </div>
                    </div>

                    {/* Product facts — read-only catalog metadata. Prefers
                        live catalog data (catalogEnrichment) over the row's
                        snapshot, so USDA backfills / admin edits / other
                        users' enrichments flow in automatically. Falls back
                        to the snapshot when the catalog fetch fails. */}
                    {(() => {
                      const e = catalogEnrichment
                      const brand = (e?.brand && e.brand.trim()) || selectedItem.brand || ''
                      const containerSize =
                        e?.containerSize ?? selectedItem.containerSize
                      const containerUnit = e?.containerUnit ?? selectedItem.containerUnit
                      const packQuantity = selectedItem.packQuantity
                      const packTier = selectedItem.packTier
                      const servingSize =
                        e?.nutrition?.servingSize || selectedItem.nutrition?.servingSize || ''
                      const hasAny =
                        !!brand ||
                        containerSize !== undefined ||
                        packQuantity !== undefined ||
                        !!packTier ||
                        !!servingSize ||
                        !!selectedItem.barcode
                      if (!hasAny) return null
                      return (
                        <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-baseline">
                            <span>Product facts</span>
                            <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                              {e ? 'live · catalog' : 'snapshot'}
                            </span>
                          </div>
                          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3 text-sm">
                            {brand && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">Brand</dt>
                                <dd className="font-medium text-foreground truncate">{brand}</dd>
                              </div>
                            )}
                            {containerSize !== undefined && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">Package size</dt>
                                <dd className="font-medium text-foreground">
                                  {containerSize} {containerUnit ?? ''}
                                </dd>
                              </div>
                            )}
                            {packQuantity !== undefined && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">Units per pack</dt>
                                <dd className="font-medium text-foreground">{packQuantity}</dd>
                              </div>
                            )}
                            {packTier && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">Pack tier</dt>
                                <dd className="font-medium text-foreground">
                                  {packTier === 'U'
                                    ? 'U · Unit'
                                    : packTier === 'P'
                                      ? 'P · Pack'
                                      : 'C · Case'}
                                </dd>
                              </div>
                            )}
                            {servingSize && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">Serving size</dt>
                                <dd className="font-medium text-foreground">{servingSize}</dd>
                              </div>
                            )}
                            {selectedItem.barcode && (
                              <div>
                                <dt className="text-[11px] uppercase text-muted-foreground tracking-wider">UPC</dt>
                                <dd className="font-mono text-xs text-foreground truncate">{selectedItem.barcode}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      )
                    })()}

                    {/* Nutrition facts — per-serving values from the USDA /
                        OFF catalog. READ-ONLY: this panel just surfaces what
                        the global catalog has on file. Always renders so the
                        layout is consistent; falls back to a "no data on
                        file" message when the row's nutrition is missing or
                        all-zero. Edits to nutrition belong on admin tooling
                        (the global catalog), not here. */}
                    {(() => {
                      // Prefer live catalog nutrition over the row snapshot.
                      // The catalog (product_database) is the source of truth;
                      // the row's nutrition was just snapshotted at scan time.
                      const e = catalogEnrichment
                      const catN = e?.nutrition || null
                      const rowN = selectedItem.nutrition || null
                      const n = catN ?? rowN
                      const source = catN ? 'live · catalog' : rowN ? 'snapshot' : 'no data'
                      const hasAny =
                        !!n &&
                        ((n.calories ?? 0) > 0 ||
                          (n.protein ?? 0) > 0 ||
                          (n.carbs ?? 0) > 0 ||
                          (n.fat ?? 0) > 0 ||
                          (n.fiber ?? 0) > 0)
                      return (
                        <div className="rounded-lg border border-border bg-card p-4 sm:col-span-2 lg:col-span-2">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-baseline gap-2">
                            <span>Nutrition facts</span>
                            {/* Per-unit label: honor `per` flag from the catalog
                                — '100g' when OFF only had per-100g data and we
                                couldn't convert (no serving_quantity). 'serving'
                                otherwise (or when `per` is missing — legacy). */}
                            {(n as { per?: 'serving' | '100g' })?.per === '100g' ? (
                              <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
                                per 100 g
                              </span>
                            ) : n?.servingSize ? (
                              <span className="font-normal normal-case tracking-normal text-muted-foreground/80">
                                per {n.servingSize}
                              </span>
                            ) : null}
                            <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-muted-foreground/60">
                              {source} · read-only
                            </span>
                          </div>
                          {!hasAny ? (
                            <div className="rounded-md border border-dashed border-border px-4 py-6 text-center text-xs text-muted-foreground italic">
                              No nutrition data on file for this product.
                            </div>
                          ) : (
                          <div className="rounded-md border border-border overflow-hidden">
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-baseline justify-between">
                              <span className="text-sm font-medium text-foreground">Calories</span>
                              <span className="text-2xl font-bold text-foreground tabular-nums">
                                {Math.round(n?.calories ?? 0)}
                              </span>
                            </div>
                            <dl className="divide-y divide-border">
                          {(
                            [
                              ['Total fat', n?.fat, 'g'],
                              ['Total carbohydrates', n?.carbs, 'g'],
                              ['Dietary fiber', n?.fiber, 'g'],
                              ['Protein', n?.protein, 'g'],
                            ] as const
                          ).map(([label, value, unit]) => {
                            // Macros: round to 1 decimal. "<0.1" for nonzero
                            // sub-tenth values so trace amounts don't read as
                            // empty; "0" for true zero so the column doesn't
                            // turn into "0.0" noise.
                            const v = value ?? 0
                            const display =
                              v === 0
                                ? '0'
                                : Math.abs(v) < 0.1
                                  ? '<0.1'
                                  : (Math.round(v * 10) / 10).toString()
                            return (
                              <div
                                key={label}
                                className="px-4 py-2 flex items-baseline justify-between"
                              >
                                <dt className="text-sm text-foreground">{label}</dt>
                                <dd className="text-sm font-medium text-foreground tabular-nums">
                                  {display} {unit}
                                </dd>
                              </div>
                            )
                          })}
                            </dl>
                          </div>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* Notes — free-text, persists to ShoppingItem.notes */}
                <div className="px-5 pt-5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Notes
                  </div>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g., received as gift, expires earlier than label"
                    className="form-input w-full resize-none"
                  />
                </div>

                {/* History — collapsible read-only metadata */}
                {(selectedItem.lastPurchased || (selectedItem.addedBy && selectedItem.addedBy.length > 0) || (selectedItem.recipeIds && selectedItem.recipeIds.length > 0)) && (
                  <div className="px-5 pt-5">
                    <button
                      type="button"
                      onClick={() => setShowHistory(!showHistory)}
                      aria-expanded={showHistory}
                      className="w-full text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1 hover:text-foreground"
                    >
                      <span>{showHistory ? '▼' : '▶'}</span> History
                    </button>
                    {showHistory && (
                      <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                        {selectedItem.lastPurchased && (
                          <div>
                            Last purchased: {new Date(selectedItem.lastPurchased).toLocaleDateString()}
                            {selectedItem.purchasedBy && ` by ${getMemberName(selectedItem.purchasedBy)}`}
                          </div>
                        )}
                        {selectedItem.addedBy && selectedItem.addedBy.length > 0 && (
                          <div>
                            Added by: {selectedItem.addedBy.map(id => getMemberName(id)).filter(Boolean).join(', ')}
                          </div>
                        )}
                        {selectedItem.recipeIds && selectedItem.recipeIds.length > 0 && (
                          <div>
                            Used in {selectedItem.recipeIds.length} recipe{selectedItem.recipeIds.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Spacer below content — extra room when the sticky save
                    bar is visible so the last panel content isn't hidden
                    behind it on mobile. */}
                <div className={detailsIsDirty ? 'pb-24 sm:pb-20' : 'pb-5'} />

                {/* Sticky save bar — appears ONLY when there are unsaved
                    edits. Mobile-first: pinned to bottom of viewport so the
                    user doesn't have to scroll past every panel to confirm.
                    Hides on clean state — no "Saved" copy needed because
                    the absence of the bar IS the confirmation that nothing
                    needs saving. */}
                {detailsIsDirty && (
                  <div className="sticky bottom-0 left-0 right-0 z-10 flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-card shadow-[0_-2px_8px_rgba(0,0,0,0.05)]">
                    <button
                      onClick={() => {
                        // Reset draft state to saved values so the user
                        // can abandon edits without leaving the item.
                        if (selectedItem) {
                          setEditCategory(selectedItem.category)
                          setEditQuantity(selectedItem.quantity ?? 1)
                          setEditUnit(selectedItem.unit)
                          setEditLocation(selectedItem.location || 'pantry')
                          setEditExpiresAt(
                            selectedItem.expiresAt
                              ? new Date(selectedItem.expiresAt).toISOString().slice(0, 10)
                              : '',
                          )
                          setEditNotes(selectedItem.notes || '')
                          setEditPackSize(
                            typeof selectedItem.packSize === 'number'
                              ? String(selectedItem.packSize)
                              : '',
                          )
                          setEditCaseSize(
                            typeof selectedItem.caseSize === 'number'
                              ? String(selectedItem.caseSize)
                              : '',
                          )
                        }
                      }}
                      disabled={savingDetails}
                      className="btn btn-ghost"
                    >
                      Discard
                    </button>
                    <button
                      onClick={handleSaveDetails}
                      disabled={savingDetails}
                      className="btn btn-primary"
                    >
                      {savingDetails ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              renderScanPickEmpty(
                "Edit a product's category, location, expiration, and notes. On-hand quantity changes happen on the Inventory Adjustment tab so they're audit-tracked.",
              )
            )
          )}

          {/* Purchase History tab — semantic intent: answer the user's
              questions about how they buy this item. The shape of the data
              (purchase events with timestamps, stores, prices) is exactly
              the substrate for ML personalization. The naive baselines
              below (last + averageDaysBetweenPurchases = next predicted)
              are placeholders that future ML can replace.
              ML opportunities (deferred):
                - Restock prediction (current: naive avg-cadence; future:
                  per-household ML model accounting for season, day-of-week,
                  meal-plan correlation, household-size shifts)
                - Price anomaly detection (current: none; future: flag
                  "today's price is high vs your typical")
                - Best-store recommendation (current: list of stores used;
                  future: which store gave you the best price for this item)
                - Bulk-buy optimization (future: "buying 2 saves 18% based
                  on your buy-discard ratio")
                - Brand-loyalty + substitution graph (future: switching
                  patterns across price points)
              The MealLog × purchaseHistory join is also a richer training
              corpus — see project_eater_recommender_ml.md for the parallel
              recommender concept. */}
          {/* Adjustment tab — the canonical surface for changing on-hand
              quantity. Each Apply records an entry on the item's
              quantityAdjustments array (audit trail) AND updates the
              running quantity. Item Details shows quantity read-only with
              a "Adjust" link that lands here, so all changes are logged. */}
          {activeTab === 'adjust' && (
            !selectedItem ? (
              renderScanPickEmpty(
                'Log an on-hand change with reason, delta, and timestamp. Every inventory adjustment is audit-tracked.',
              )
            ) : (() => {
              const trail = (selectedItem.quantityAdjustments ?? [])
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
              return (
                <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                  {/* Header — same identity strip as the other per-item tabs */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                    {renderItemThumb(selectedItem, 'lg')}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-foreground truncate">
                        {selectedItem.productName}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        On hand: {(() => {
                          const f = formatOnHand(selectedItem)
                          if (f.mode === 'flat') {
                            return (
                              <>
                                <strong className="text-foreground">{f.total}</strong>
                                {f.unit ? ` ${f.unit}` : ''}
                              </>
                            )
                          }
                          return (
                            <>
                              <strong className="text-foreground">
                                {f.cases} + {f.loose}
                              </strong>{' '}
                              {f.tierLabel} + {f.unitLabel}
                            </>
                          )
                        })()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItem(null)
                        setActiveTab('list')
                      }}
                      className="text-sm text-primary hover:underline font-medium flex-shrink-0"
                    >
                      ← Back to list
                    </button>
                  </div>

                  {/* Apply form — one row per tier (Unit / Pack / Case) that
                      this product carries. Unit always shows. Pack/Case appear
                      when the product has a UPC at that tier. The mental model
                      matches restocking: "+1 case" + "−2 bottles" reads how
                      a person actually thinks about inventory motion. */}
                  <div className="p-5 space-y-4 border-b border-border">
                    <h3 className="text-sm font-semibold text-foreground">New adjustment</h3>
                    {(() => {
                      const tierRows: Array<{
                        tier: PackTier
                        label: string
                        hint: string
                        value: string
                        setValue: (v: string) => void
                      }> = []
                      const unitName = selectedItem.unit ?? 'unit'
                      // Case row (only when a C-tier UPC exists)
                      const caseMult = getTierMultiplier(selectedItem, 'C')
                      if (caseMult !== null) {
                        tierRows.push({
                          tier: 'C',
                          label: 'Cases',
                          hint: `${caseMult} ${unitName}${caseMult === 1 ? '' : 's'} per case`,
                          value: adjustCaseDeltaDraft,
                          setValue: setAdjustCaseDeltaDraft,
                        })
                      }
                      // Pack row (only when a P-tier UPC exists)
                      const packMult = getTierMultiplier(selectedItem, 'P')
                      if (packMult !== null) {
                        tierRows.push({
                          tier: 'P',
                          label: 'Packs',
                          hint: `${packMult} ${unitName}${packMult === 1 ? '' : 's'} per pack`,
                          value: adjustPackDeltaDraft,
                          setValue: setAdjustPackDeltaDraft,
                        })
                      }
                      // Unit row (always shown — represents loose individual units)
                      tierRows.push({
                        tier: 'U',
                        label: `${unitName.charAt(0).toUpperCase()}${unitName.slice(1)}s`,
                        hint: 'individual / loose',
                        value: adjustUnitDeltaDraft,
                        setValue: setAdjustUnitDeltaDraft,
                      })

                      return (
                        <div className="space-y-3">
                          {tierRows.map((row) => (
                            <div key={row.tier}>
                              <label className="flex items-baseline justify-between text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                                <span>{row.label}</span>
                                <span className="text-[10px] normal-case tracking-normal text-muted-foreground/70">
                                  {row.hint}
                                </span>
                              </label>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => row.setValue('-1')}
                                  disabled={savingAdjustment}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border border-input bg-background text-sm font-medium hover:bg-muted disabled:opacity-50"
                                  aria-label={`Set ${row.label} delta to -1`}
                                >
                                  −1
                                </button>
                                <input
                                  type="number"
                                  inputMode="numeric"
                                  step="1"
                                  value={row.value}
                                  onChange={(e) => row.setValue(e.target.value)}
                                  disabled={savingAdjustment}
                                  placeholder={`Δ ${row.label.toLowerCase()}`}
                                  aria-label={`${row.label} delta`}
                                  className="flex-1 min-w-0 min-h-[44px] px-3 rounded-md border border-input bg-background text-sm text-center font-mono focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                />
                                <button
                                  type="button"
                                  onClick={() => row.setValue('+1')}
                                  disabled={savingAdjustment}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md border border-input bg-background text-sm font-medium hover:bg-muted disabled:opacity-50"
                                  aria-label={`Set ${row.label} delta to +1`}
                                >
                                  +1
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )
                    })()}
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        Reason
                      </label>
                      <select
                        value={adjustReasonDraft}
                        onChange={(e) => setAdjustReasonDraft(e.target.value as AdjustmentReason)}
                        disabled={savingAdjustment}
                        className="w-full min-h-[44px] px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      >
                        <option value="purchased">Purchased</option>
                        <option value="used">Used / consumed</option>
                        <option value="expired">Expired</option>
                        <option value="discarded">Discarded</option>
                        <option value="count">Physical recount</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                        Note <span className="text-muted-foreground font-normal lowercase">(optional)</span>
                      </label>
                      <textarea
                        value={adjustNoteDraft}
                        onChange={(e) => setAdjustNoteDraft(e.target.value)}
                        disabled={savingAdjustment}
                        placeholder="Why this adjustment? (e.g. 'opened a new pack', 'gave one to neighbor')"
                        rows={2}
                        className="w-full min-h-[44px] px-3 py-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={adjustInventoryLock.isLocked ? adjustInventoryLock.onLockedClick : handleSubmitAdjustment}
                      disabled={
                        !adjustInventoryLock.isLocked && (
                          savingAdjustment ||
                          (!adjustUnitDeltaDraft.trim() &&
                            !adjustPackDeltaDraft.trim() &&
                            !adjustCaseDeltaDraft.trim())
                        )
                      }
                      className="btn btn-primary w-full inline-flex items-center justify-center gap-2"
                    >
                      {adjustInventoryLock.isLocked && <LockClosedIcon className="w-4 h-4" />}
                      {adjustInventoryLock.isLocked
                        ? 'Paused — Apply'
                        : savingAdjustment
                          ? 'Applying…'
                          : 'Apply'}
                    </button>
                  </div>

                  {/* Audit trail — every adjustment ever applied, newest first. */}
                  <div className="p-5">
                    <h3 className="text-sm font-semibold text-foreground mb-3">
                      Audit trail
                      {trail.length > 0 && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          · {trail.length}
                        </span>
                      )}
                    </h3>
                    {trail.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        No adjustments yet. Apply your first one above.
                      </p>
                    ) : (
                      <ul className="divide-y divide-border border border-border rounded-md overflow-hidden">
                        {trail.map((adj, i) => {
                          // Build a tier-aware delta label. When tierDeltas
                          // is set, show the breakdown ("+1 case, −2 bottles");
                          // otherwise fall back to the unit-level total.
                          const tierLabels: string[] = []
                          if (adj.tierDeltas) {
                            const unitName = selectedItem.unit ?? 'unit'
                            for (const t of ['C', 'P', 'U'] as const) {
                              const v = adj.tierDeltas[t]
                              if (v === undefined || v === 0) continue
                              const word =
                                t === 'C' ? 'case' : t === 'P' ? 'pack' : unitName
                              const plural = Math.abs(v) === 1 ? '' : 's'
                              tierLabels.push(`${v > 0 ? '+' : ''}${v} ${word}${plural}`)
                            }
                          }
                          return (
                            <li key={i} className="px-3 py-2 flex items-start gap-3">
                              <div
                                className={`font-mono text-sm font-semibold flex-shrink-0 w-12 text-center ${adj.delta > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                              >
                                {adj.delta > 0 ? `+${adj.delta}` : adj.delta}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-sm text-foreground">
                                  {tierLabels.length > 0 && (
                                    <span className="font-medium">{tierLabels.join(', ')} · </span>
                                  )}
                                  <span className="font-medium capitalize">{adj.reason}</span>
                                  <span className="text-muted-foreground"> → {adj.resultQuantity} on hand</span>
                                </div>
                                {adj.note && (
                                  <div className="text-xs text-muted-foreground mt-0.5 italic">
                                    "{adj.note}"
                                  </div>
                                )}
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                  {new Date(adj.date).toLocaleString()}
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )
            })()
          )}

          {activeTab === 'history' && (
            !selectedItem ? (
              // No-item state on Purchase History — repurposed as the
              // bulk Purchase Order intake CTA. A receipt IS a purchase
              // event; this is exactly where it belongs. When the user
              // taps an item from the list, this slot swaps to the rich
              // per-item history view below.
              selectedReceiptId ? (
                // Detail view — editable line list + lock + apply/void.
                // Mounts when the user taps a receipt from the feed below.
                <OrderReceiptDetail
                  receiptId={selectedReceiptId}
                  inventory={allInventoryItems}
                  onClose={() => setSelectedReceiptId(null)}
                />
              ) : (
                // No-item state — CTA on top, feed of receipts below.
                // Tap any feed row to drill into its detail view.
                <div className="space-y-4">
                  <div className="bg-card rounded-lg p-6 sm:p-8 text-center border border-border">
                    <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                      Add an order receipt
                    </h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
                      Snap a receipt to capture every line — we&apos;ll match each
                      one against your inventory and price out the order. Review
                      and apply when you&apos;re ready. Or pick an item from the
                      list to see its history.
                    </p>
                    <button
                      type="button"
                      onClick={
                        receiptOcrLock.isLocked
                          ? receiptOcrLock.onLockedClick
                          : () => setPoCaptureOpen(true)
                      }
                      disabled={poProcessing && !receiptOcrLock.isLocked}
                      className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-primary text-white rounded-lg font-medium text-sm active:bg-primary-dark disabled:opacity-40"
                    >
                      {receiptOcrLock.isLocked ? (
                        <LockClosedIcon className="w-5 h-5" />
                      ) : (
                        <ViewfinderCircleIcon className="w-5 h-5" />
                      )}
                      {receiptOcrLock.isLocked
                        ? 'Paused — Snap receipt'
                        : poProcessing
                          ? 'Reading receipt…'
                          : 'Snap receipt'}
                    </button>
                  </div>
                  <OrderReceiptFeed
                    receipts={orderReceipts}
                    onSelect={(rc) => setSelectedReceiptId(rc.id)}
                    error={orderReceiptsError}
                  />
                </div>
              )
            ) : (() => {
              const history = (selectedItem.purchaseHistory ?? [])
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

              if (history.length === 0) {
                return (
                  <div className="bg-card rounded-lg p-8 text-center border border-border">
                    <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">No purchase history yet</h2>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">
                      Once you scan or log purchases of <strong className="text-foreground">{selectedItem.productName}</strong>,
                      they'll appear here with date, store, and price — and the app will start
                      predicting when you'll need to buy it again.
                    </p>
                  </div>
                )
              }

              // Naive stats. ML can replace any of these with smarter models.
              const count = history.length
              const lastPurchaseDate = new Date(history[0].date)
              const daysSinceLast = Math.floor(
                (Date.now() - lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24),
              )
              const avgDays = selectedItem.averageDaysBetweenPurchases
              const predictedDaysAhead = avgDays !== undefined
                ? Math.max(0, Math.round(avgDays - daysSinceLast))
                : undefined
              const stores = Array.from(
                new Set(history.map((h) => h.store).filter((s): s is string => !!s)),
              )
              const pricedEntries = history.filter((h) => typeof h.price === 'number')
              const avgPrice = pricedEntries.length > 0
                ? pricedEntries.reduce((sum, h) => sum + (h.price as number), 0) / pricedEntries.length
                : undefined
              const minPrice = pricedEntries.length > 0
                ? Math.min(...pricedEntries.map((h) => h.price as number))
                : undefined
              const maxPrice = pricedEntries.length > 0
                ? Math.max(...pricedEntries.map((h) => h.price as number))
                : undefined

              return (
                <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                  {/* Header with item context */}
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                    {(() => {
                      const src = resolveItemImage(selectedItem)
                      return src ? (
                        <img
                          src={src}
                          alt=""
                          aria-hidden="true"
                          className="h-12 w-12 object-cover rounded border border-border flex-shrink-0"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                          <ClockIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )
                    })()}
                    <div className="min-w-0 flex-1">
                      <h2 className="text-base font-semibold text-foreground truncate">
                        Purchase History · {selectedItem.productName}
                      </h2>
                      <p className="text-xs text-muted-foreground truncate">
                        {count} purchase{count !== 1 ? 's' : ''}
                        {avgDays !== undefined && ` · avg every ${Math.round(avgDays)} days`}
                      </p>
                    </div>
                  </div>

                  {/* Stats summary — answers "how often / where / what cost" */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border">
                    <div className="bg-card p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last bought</div>
                      <div className="text-sm font-semibold text-foreground">
                        {lastPurchaseDate.toLocaleDateString()}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {daysSinceLast === 0 ? 'today' : `${daysSinceLast} day${daysSinceLast !== 1 ? 's' : ''} ago`}
                      </div>
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Cadence</div>
                      <div className="text-sm font-semibold text-foreground">
                        {avgDays !== undefined ? `Every ${Math.round(avgDays)} days` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {count >= 2 ? `${count} purchases` : 'need 2+ purchases'}
                      </div>
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Avg price</div>
                      <div className="text-sm font-semibold text-foreground">
                        {avgPrice !== undefined ? `$${avgPrice.toFixed(2)}` : '—'}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {minPrice !== undefined && maxPrice !== undefined && minPrice !== maxPrice
                          ? `$${minPrice.toFixed(2)}–$${maxPrice.toFixed(2)}`
                          : pricedEntries.length === 0 ? 'no prices logged' : ''}
                      </div>
                    </div>
                    <div className="bg-card p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Stores</div>
                      <div className="text-sm font-semibold text-foreground truncate" title={stores.join(', ')}>
                        {stores.length === 0 ? '—' : stores.length === 1 ? stores[0] : `${stores.length} stores`}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 truncate">
                        {stores.length > 1 ? stores.join(', ') : ''}
                      </div>
                    </div>
                  </div>

                  {/* Prediction strip — semantic intent: "should I buy soon?"
                      ML hook: replace this naive math with a model when ready. */}
                  {avgDays !== undefined && predictedDaysAhead !== undefined && (
                    <div className={`px-5 py-3 border-t border-border ${
                      predictedDaysAhead <= 0
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
                        : predictedDaysAhead <= 3
                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100'
                          : 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100'
                    }`}>
                      <div className="flex items-start gap-2">
                        <ClockIcon className="h-5 w-5 flex-shrink-0 mt-0.5" />
                        <div className="text-sm flex-1">
                          <div className="font-semibold mb-0.5">
                            {predictedDaysAhead <= 0
                              ? 'Probably due to buy now'
                              : predictedDaysAhead === 1
                                ? 'Likely to buy tomorrow'
                                : `Likely to buy in ~${predictedDaysAhead} days`}
                          </div>
                          <div className="text-xs opacity-80">
                            Based on your average cadence of {Math.round(avgDays)} days. Prediction will
                            improve as more purchases get logged.
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline / entries list */}
                  <div className="px-5 py-4 border-t border-border">
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Purchases (most recent first)
                    </div>
                    <ul className="divide-y divide-border">
                      {history.map((entry, i) => {
                        const d = new Date(entry.date)
                        const priceClass =
                          typeof entry.price === 'number' && avgPrice !== undefined
                            ? entry.price > avgPrice * 1.15
                              ? 'text-red-700 dark:text-red-300'
                              : entry.price < avgPrice * 0.85
                                ? 'text-green-700 dark:text-green-300'
                                : 'text-foreground'
                            : 'text-foreground'
                        return (
                          <li key={i} className="py-3 flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-foreground">
                                {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {entry.store || 'Store unknown'}
                                {entry.expiresAt && ` · expires ${new Date(entry.expiresAt).toLocaleDateString()}`}
                              </div>
                            </div>
                            <div className={`text-sm font-semibold ${priceClass}`}>
                              {typeof entry.price === 'number' ? `$${entry.price.toFixed(2)}` : '—'}
                            </div>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                </div>
              )
            })()
          )}

          {/* Suggested Reorder — household-wide view of items predicted to
              need restocking. Naive baseline: per-item cadence threshold.
              See project_reorder_restocking_ml memory for the full
              upgrade path (seasonal + DOW + per-household model + cross-
              household collaborative). Items click through to Item Details. */}
          {activeTab === 'reorder' && (() => {
            const allItems = filterItems([...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems])
            type ReorderRow = {
              item: typeof allItems[number]
              predictedDaysAhead: number | null
              reason: 'due-now' | 'due-soon' | 'low-stock'
            }
            const rows: ReorderRow[] = allItems
              .map((item): ReorderRow | null => {
                const avgDays = item.averageDaysBetweenPurchases
                const last = item.lastPurchased ? new Date(item.lastPurchased).getTime() : null
                if (avgDays !== undefined && last !== null) {
                  const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
                  const ahead = Math.round(avgDays - daysSince)
                  if (ahead <= 0) return { item, predictedDaysAhead: ahead, reason: 'due-now' }
                  if (ahead <= 3) return { item, predictedDaysAhead: ahead, reason: 'due-soon' }
                  return null // on-schedule, hide from suggestions
                }
                // Cold-start: no avg cadence; fall back to stock-level signal
                if ((item.quantity ?? 0) <= 1) {
                  return { item, predictedDaysAhead: null, reason: 'low-stock' }
                }
                return null
              })
              .filter((r): r is ReorderRow => r !== null)
              .sort((a, b) => {
                // Due-now first, then due-soon by days, then low-stock
                const order = { 'due-now': 0, 'due-soon': 1, 'low-stock': 2 }
                if (order[a.reason] !== order[b.reason]) return order[a.reason] - order[b.reason]
                return (a.predictedDaysAhead ?? 99) - (b.predictedDaysAhead ?? 99)
              })

            return (
              <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                <div className="px-5 py-4 border-b border-border bg-muted/30">
                  <h2 className="text-base font-semibold text-foreground">
                    Suggested Reorder · {rows.length} item{rows.length !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Items predicted due based on your buying cadence, plus low-stock items without
                    a cadence yet. Click any item to open it on Item Details.
                  </p>
                </div>
                {rows.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingCartIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">Nothing to reorder right now</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      As you scan and use up items, predictions improve and this list populates.
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {rows.map(({ item, predictedDaysAhead, reason }) => {
                      const cls =
                        reason === 'due-now'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : reason === 'due-soon'
                            ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      const label =
                        reason === 'due-now'
                          ? predictedDaysAhead !== null && predictedDaysAhead < 0
                            ? `Overdue ${Math.abs(predictedDaysAhead)}d`
                            : 'Due now'
                          : reason === 'due-soon'
                            ? `Due in ${predictedDaysAhead}d`
                            : `Low stock (${item.quantity ?? 0} on hand)`
                      return (
                        <li
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedItem(item)
                            setActiveTab('details')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedItem(item)
                              setActiveTab('details')
                            }
                          }}
                          className="px-5 py-3 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          {(() => {
                            const src = resolveItemImage(item)
                            return src ? (
                              <img src={src} alt="" aria-hidden="true" className="h-10 w-10 object-cover rounded border border-border flex-shrink-0" />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )
                          })()}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{item.productName}</div>
                            {item.brand && <div className="text-xs text-muted-foreground truncate">{item.brand}</div>}
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${cls}`}>
                            {label}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })()}

          {/* Restocking Report — household-wide breakdown across the whole
              inventory. Bucketed by urgency. Click any item to drill into
              its Item Details tab. ML hook: same naive math as the Reorder
              tab. */}
          {activeTab === 'report' && (() => {
            const allItems = filterItems([...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems])
            type Bucket = 'overdue' | 'soon' | 'onSchedule' | 'noPrediction'
            const buckets: Record<Bucket, typeof allItems> = {
              overdue: [],
              soon: [],
              onSchedule: [],
              noPrediction: [],
            }
            for (const item of allItems) {
              const avgDays = item.averageDaysBetweenPurchases
              const last = item.lastPurchased ? new Date(item.lastPurchased).getTime() : null
              if (avgDays === undefined || last === null) {
                buckets.noPrediction.push(item)
                continue
              }
              const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
              const ahead = avgDays - daysSince
              if (ahead < 0) buckets.overdue.push(item)
              else if (ahead <= 3) buckets.soon.push(item)
              else buckets.onSchedule.push(item)
            }

            const renderBucket = (
              title: string,
              emoji: string,
              items: typeof allItems,
              tone: 'red' | 'yellow' | 'green' | 'gray',
            ) => {
              if (items.length === 0) return null
              const toneCls = {
                red: 'border-red-200 dark:border-red-800',
                yellow: 'border-yellow-200 dark:border-yellow-800',
                green: 'border-green-200 dark:border-green-800',
                gray: 'border-border',
              }[tone]
              return (
                <div className={`bg-card rounded-lg border ${toneCls} overflow-hidden`}>
                  <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
                    <span aria-hidden="true">{emoji}</span>
                    <h3 className="text-sm font-semibold text-foreground">
                      {title} · {items.length} item{items.length !== 1 ? 's' : ''}
                    </h3>
                  </div>
                  <ul className="divide-y divide-border">
                    {items.map((item) => {
                      const avgDays = item.averageDaysBetweenPurchases
                      const last = item.lastPurchased ? new Date(item.lastPurchased) : null
                      const lastTxt = last ? last.toLocaleDateString() : '—'
                      const cadenceTxt = avgDays !== undefined ? `every ${Math.round(avgDays)}d` : 'no cadence yet'
                      return (
                        <li
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setSelectedItem(item)
                            setActiveTab('details')
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedItem(item)
                              setActiveTab('details')
                            }
                          }}
                          className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 cursor-pointer transition-colors"
                        >
                          {(() => {
                            const src = resolveItemImage(item)
                            return src ? (
                              <img src={src} alt="" aria-hidden="true" className="h-8 w-8 object-cover rounded border border-border flex-shrink-0" />
                            ) : (
                              <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                                <ArchiveBoxIcon className="h-4 w-4 text-muted-foreground" />
                              </div>
                            )
                          })()}
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{item.productName}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              Last {lastTxt} · {cadenceTxt}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            }

            return (
              <div className="space-y-4">
                {/* Top stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {([
                    { label: 'Overdue', count: buckets.overdue.length, cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
                    { label: 'Due soon', count: buckets.soon.length, cls: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' },
                    { label: 'On schedule', count: buckets.onSchedule.length, cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
                    { label: 'No prediction', count: buckets.noPrediction.length, cls: 'bg-muted text-muted-foreground' },
                  ]).map(({ label, count, cls }) => (
                    <div key={label} className={`p-4 rounded-lg ${cls}`}>
                      <div className="text-2xl font-bold">{count}</div>
                      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
                    </div>
                  ))}
                </div>

                {allItems.length === 0 ? (
                  <div className="bg-card rounded-lg p-8 text-center border border-border">
                    <ChartBarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">No inventory yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      Scan or add items to your inventory and the report will populate.
                    </p>
                  </div>
                ) : (
                  <>
                    {renderBucket('Overdue', '🚨', buckets.overdue, 'red')}
                    {renderBucket('Due soon', '⏰', buckets.soon, 'yellow')}
                    {renderBucket('On schedule', '✅', buckets.onSchedule, 'green')}
                    {renderBucket('No prediction yet', '❓', buckets.noPrediction, 'gray')}
                  </>
                )}
              </div>
            )
          })()}

          {/* UPC tab — per-selected-item view. Populates from the item picked
              on Inventory List / Item Details. The C/U/P pack hierarchy (Case >
              Pack > Unit) lives here: the same product family can carry several
              UPCs (e.g. 6-pack vs 12-pack vs 24-case eggs), and we'll surface
              siblings + tier classification in v2 once pack-classification data
              lands on ProductDatabaseEntry. v1 shows the selected item's UPC,
              container size, and a deep-link to the admin barcode editor. */}
          {activeTab === 'upc' && (
            !selectedItem ? (
              renderScanPickEmpty(
                'Manage barcodes for this product — primary UPC, pack tier, alternate UPCs for different pack sizes.',
              )
            ) : (
              <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
                {/* Header — matches Item Details / Purchase History pattern */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-muted/30">
                  {renderItemThumb(selectedItem, 'lg')}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {selectedItem.productName}
                    </h2>
                    {selectedItem.brand && (
                      <p className="text-xs text-muted-foreground truncate">
                        {selectedItem.brand}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null)
                      setActiveTab('list')
                    }}
                    className="text-sm text-primary hover:underline font-medium flex-shrink-0"
                  >
                    ← Back to list
                  </button>
                </div>

                {selectedItem.barcode ? (
                  <div className="p-5 space-y-5">
                    {/* Single hybrid card — pack profile for this product.
                        Top section: the primary UPC (barcode + pack info) —
                        the canonical identifier for this inventory row, given
                        prominence as the "name" of what we're describing.
                        Middle: shared unit size — set once, applies to every
                        UPC in the family.
                        Bottom: alternates list (other pack-size UPCs) plus the
                        "+ Add UPC" affordance. */}
                    <div className="rounded-lg border border-border overflow-hidden">
                      {/* Primary UPC banner — single line containing the row's
                          identity (icon + barcode + Primary badge) and its
                          spec (qty + tier + unit size). Wraps on narrow phones.
                          Size dropdown lives here too because the primary IS
                          where we set the product's shared unit size; the
                          alternates inherit it. */}
                      <div className="px-4 py-3 bg-muted/30 border-b border-border">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          {/* Tap the icon + barcode to open the scanner. The
                              spec input row (qty, tier, size, Primary badge)
                              stays as separate interactive elements so they're
                              still individually editable — only the identity
                              region is the scan-trigger. */}
                          <button
                            type="button"
                            onClick={() => {
                              setScanMode('add-alt-upc')
                              setShowScanner(true)
                            }}
                            disabled={savingUpc}
                            className="flex items-center gap-2 flex-1 min-w-[120px] -ml-1 px-1 py-1 rounded hover:bg-muted/50 transition-colors disabled:opacity-50 text-left"
                            title="Scan a barcode to add as an alternate UPC"
                            aria-label="Scan a barcode to add as an alternate UPC"
                          >
                            <ViewfinderCircleIcon className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                            <span className="font-mono text-base font-semibold text-foreground flex-1 min-w-0 truncate">
                              {selectedItem.barcode}
                            </span>
                          </button>
                          <select
                            value={selectedItem.packTier ?? ''}
                            onChange={(e) =>
                              handleSetPrimaryTier((e.target.value || undefined) as PackTier | undefined)
                            }
                            disabled={savingUpc}
                            aria-label="Pack tier for primary UPC"
                            className="min-h-[44px] px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                          >
                            <option value="">— tier —</option>
                            <option value="U">U · Unit</option>
                            <option value="P">P · Pack</option>
                            <option value="C">C · Case</option>
                          </select>
                          <span
                            className="inline-flex items-center justify-center min-h-[28px] px-2 text-[11px] font-medium text-primary bg-primary/10 rounded flex-shrink-0"
                            title="The barcode currently scanned onto this inventory row"
                          >
                            Primary
                          </span>
                        </div>
                      </div>

                      <ul className="divide-y divide-border">
                        {/* Alternate rows */}
                        {(selectedItem.alternateUpcs ?? []).map((alt) => {
                          return (
                            <li key={alt.barcode} className="px-4 py-3">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                {renderScanToAddUpcButton('sm')}
                                <div className="font-mono text-sm text-foreground flex-1 min-w-[140px] truncate">
                                  {alt.barcode}
                                </div>
                                <select
                                  value={alt.packTier}
                                  onChange={(e) =>
                                    handleChangeAlternateTier(alt.barcode, e.target.value as PackTier)
                                  }
                                  disabled={savingUpc}
                                  aria-label={`Pack tier for ${alt.barcode}`}
                                  className="min-h-[44px] px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                >
                                  <option value="U">U · Unit</option>
                                  <option value="P">P · Pack</option>
                                  <option value="C">C · Case</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAlternate(alt.barcode)}
                                  disabled={savingUpc}
                                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-red-600 disabled:opacity-50"
                                  aria-label={`Remove ${alt.barcode}`}
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          )
                        })}

                        {/* Add row — only when user clicks "+ Add UPC". Same
                            shape as a saved row, but barcode column is an
                            input and the action is "Add" + cancel. */}
                        {showAddRow && (
                          <li className="px-4 py-3 bg-muted/20">
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                              {/* Camera icon = action affordance (tap to open
                                  camera and scan). Distinct from the static QR
                                  icon shown next to saved barcodes elsewhere
                                  on this card, which represents "this is a
                                  barcode" — the action vs identity split keeps
                                  the affordance unambiguous. */}
                              {renderScanToAddUpcButton('md')}
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="\d*"
                                autoFocus
                                placeholder="UPC (8–14 digits)"
                                value={addAltBarcode}
                                onChange={(e) =>
                                  setAddAltBarcode(e.target.value.replace(/[^\d]/g, ''))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && isValidUpc(addAltBarcode)) handleAddAlternate()
                                  if (e.key === 'Escape') {
                                    setShowAddRow(false)
                                    setAddAltBarcode('')
                                    setAddAltQuantity('')
                                  }
                                }}
                                disabled={savingUpc}
                                aria-label="UPC for new entry"
                                className="font-mono text-sm flex-1 min-w-[140px] min-h-[44px] px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                              />
                              <select
                                value={addAltTier}
                                onChange={(e) => setAddAltTier(e.target.value as PackTier)}
                                disabled={savingUpc}
                                aria-label="Pack tier for new UPC"
                                className="min-h-[44px] px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                              >
                                <option value="U">U · Unit</option>
                                <option value="P">P · Pack</option>
                                <option value="C">C · Case</option>
                              </select>
                              <button
                                type="button"
                                onClick={handleAddAlternate}
                                disabled={
                                  savingUpc ||
                                  !isValidUpc(addAltBarcode) ||
                                  (addAltCatalogStatus === 'not-found' && !newProductName.trim())
                                }
                                className="btn btn-primary min-h-[44px] px-4 text-sm"
                              >
                                Add
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowAddRow(false)
                                  setAddAltBarcode('')
                                  setAddAltQuantity('')
                                  setNewProductName('')
                                  setNewProductBrand('')
                                  setNewProductCategory('other')
                                  setNewProductImageFile(null)
                                  setNewProductImagePreview(null)
                                  setAddAltCatalogStatus('unchecked')
                                }}
                                disabled={savingUpc}
                                className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                                aria-label="Cancel add"
                              >
                                <XMarkIcon className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Catalog status hint + create-new-product form.
                                When the entered/scanned UPC isn't in the global
                                catalog, expand inline so the user can create a
                                catalog entry (name + brand + category + image)
                                in one go. Status check fires debounced once the
                                input is a valid UPC length (8–14 digits). */}
                            {addAltCatalogStatus === 'checking' && (
                              <div className="mt-2 pl-8 text-xs text-muted-foreground italic">
                                Checking catalog for {addAltBarcode}…
                              </div>
                            )}
                            {addAltCatalogStatus === 'found' && (
                              <div className="mt-2 pl-8 text-xs text-green-600 dark:text-green-400">
                                ✓ Found in catalog — will be added as an alternate UPC.
                              </div>
                            )}
                            {addAltCatalogStatus === 'not-found' && (
                              <div className="mt-3 pl-8 space-y-3 border-l-2 border-primary/30 ml-2 pl-4">
                                <p className="text-xs text-foreground">
                                  <strong>{addAltBarcode}</strong> isn't in the catalog yet.
                                  Add it for everyone:
                                </p>
                                {renderCreateProductFields(savingUpc)}
                                <p className="text-[11px] text-muted-foreground italic">
                                  This will create a global catalog entry that other users will see when they scan this UPC.
                                </p>
                              </div>
                            )}
                          </li>
                        )}
                      </ul>

                      {/* + Add UPC affordance — only when not already adding.
                          Most products have one UPC; surfacing the add UI on
                          demand keeps the default state quiet. */}
                      {!showAddRow && (
                        <button
                          type="button"
                          onClick={() => setShowAddRow(true)}
                          disabled={savingUpc}
                          className="w-full flex items-center justify-center gap-1.5 py-3 text-sm font-medium text-primary hover:bg-muted/30 border-t border-border transition-colors disabled:opacity-50"
                        >
                          <PlusIcon className="h-4 w-4" />
                          Add UPC for pack or case
                        </button>
                      )}
                    </div>

                    {/* Catalog deep-link — platform admins only. Regular
                        users edit catalog data via the inline affordances
                        on the Image tab and the rename pencil on the list. */}
                    {isPlatformAdmin && (
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/admin/barcodes/${selectedItem.barcode}/edit`}
                          className="btn btn-ghost text-xs"
                        >
                          Open in admin barcode editor →
                        </Link>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <QrCodeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <h3 className="text-sm font-semibold text-foreground mb-1">No UPC linked yet</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                      <strong className="text-foreground">{selectedItem.productName}</strong>{' '}
                      doesn't have a UPC on file. Items added by name (or from a recipe) lack
                      barcodes — scan the package next time you have it in hand to link it.
                    </p>
                  </div>
                )}
              </div>
            )
          )}

          {/* Image tab — pair a product image to each barcode/UPC. Same shape
              as the UPC tab: pick an item, manage per-tier rows. Each row
              represents one barcode (primary + alternates for Unit/Pack/Case).
              Uploads write to product_database/{barcode}.imageUrl (catalog of
              record) AND mirror to the row's imageUrl slot (primary) or
              alternateUpcs[i].imageUrl (alternates) so list/inventory render
              without a per-tier catalog re-fetch. */}
          {activeTab === 'image' && (
            !selectedItem ? (
              renderScanPickEmpty(
                'Pair a product image to each barcode — single bottle, 6-pack carton, full case all photographed differently.',
              )
            ) : (() => {
              type TierEntry = {
                label: string
                barcode: string
                isPrimary: boolean
                imageUrl?: string
                subtitle?: string
              }
              const tierName = (t?: PackTier): string =>
                t === 'C' ? 'Case' : t === 'P' ? 'Pack' : t === 'U' ? 'Unit' : 'Primary'
              const tiers: TierEntry[] = []
              // Resolve image: row first, catalog as fallback. Same
              // priority as resolveItemImage above — catalog images can be
              // stale/blocked/503-ing, so only use them when the row
              // genuinely has nothing of its own.
              const resolveTierImage = (
                barcode: string,
                rowImageUrl: string | undefined,
              ): string | undefined =>
                rowImageUrl || catalogImagesByBarcode[barcode] || undefined
              if (selectedItem.barcode) {
                const subParts: string[] = []
                if (selectedItem.containerSize !== undefined) {
                  subParts.push(`${selectedItem.containerSize}${selectedItem.containerUnit ?? ''}`)
                }
                if ((selectedItem.packQuantity ?? 1) > 1) {
                  subParts.push(`${selectedItem.packQuantity} per pack`)
                }
                tiers.push({
                  label: tierName(selectedItem.packTier),
                  barcode: selectedItem.barcode,
                  isPrimary: true,
                  imageUrl: resolveTierImage(selectedItem.barcode, selectedItem.imageUrl),
                  subtitle: subParts.length > 0 ? subParts.join(' · ') : undefined,
                })
              }
              for (const alt of selectedItem.alternateUpcs ?? []) {
                const subParts: string[] = []
                if (alt.size !== undefined) {
                  subParts.push(`${alt.size}${alt.sizeUnit ?? selectedItem.containerUnit ?? ''}`)
                }
                if ((alt.packQuantity ?? 1) > 1) {
                  subParts.push(`${alt.packQuantity} per pack`)
                }
                tiers.push({
                  label: tierName(alt.packTier),
                  barcode: alt.barcode,
                  isPrimary: false,
                  imageUrl: resolveTierImage(alt.barcode, alt.imageUrl),
                  subtitle: subParts.length > 0 ? subParts.join(' · ') : undefined,
                })
              }

              return (
                <div className="space-y-4">
                  {/* Header — matches UPC tab pattern (product identity, not
                      a navigation widget). The page-level catalog search and
                      Inventory List tab are how users land on a different item. */}
                  <div className="bg-card rounded-lg border border-border p-4">
                    <h2 className="text-lg font-semibold text-foreground truncate">
                      {selectedItem.productName}
                    </h2>
                    {selectedItem.brand && (
                      <p className="text-sm text-muted-foreground truncate">{selectedItem.brand}</p>
                    )}
                  </div>

                  {/* Hidden file input shared across tier rows. */}
                  <input
                    ref={tierImageInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null
                      void handleTierImageFileSelected(f)
                    }}
                  />

                  {tiers.length === 0 ? (
                    <div className="bg-card rounded-lg p-8 text-center border border-border">
                      <QrCodeIcon className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <h3 className="text-sm font-semibold text-foreground mb-1">No UPCs linked</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        This item doesn't have any barcodes on file. Link one on the{' '}
                        <button
                          type="button"
                          onClick={() => setActiveTab('upc')}
                          className="text-primary hover:underline font-medium"
                        >
                          UPC tab
                        </button>{' '}
                        first — photos attach to the catalog by barcode.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-card rounded-lg border border-border divide-y divide-border">
                      {tiers.map((tier) => (
                        <div key={tier.barcode} className="p-4 flex items-start gap-4">
                          {/* Image / placeholder */}
                          <div className="h-32 w-32 flex-shrink-0 rounded border border-border bg-muted overflow-hidden flex items-center justify-center">
                            {tier.imageUrl ? (
                              <img
                                src={tier.imageUrl}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <PhotoIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                          {/* Meta + actions */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                {tier.label}
                              </span>
                              {tier.isPrimary && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded font-medium">
                                  PRIMARY
                                </span>
                              )}
                              {!tier.imageUrl && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 rounded font-medium">
                                  NEEDS PHOTO
                                </span>
                              )}
                            </div>
                            <div className="text-xs font-mono text-muted-foreground mt-0.5 truncate">
                              {tier.barcode}
                            </div>
                            {tier.subtitle && (
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {tier.subtitle}
                              </div>
                            )}
                            <div className="mt-3 flex items-center gap-3 flex-wrap">
                              <button
                                type="button"
                                onClick={() => triggerTierImageUpload(tier.barcode, tier.isPrimary)}
                                disabled={imageUploadingFor !== null}
                                className="btn btn-secondary text-xs"
                              >
                                {imageUploadingFor === tier.barcode
                                  ? 'Uploading…'
                                  : tier.imageUrl
                                    ? 'Replace photo'
                                    : 'Add photo'}
                              </button>
                              {isPlatformAdmin && (
                                <Link
                                  href={`/admin/barcodes/${tier.barcode}/edit`}
                                  className="text-xs text-primary hover:underline"
                                >
                                  Edit in catalog →
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic px-1">
                    Photos write to the global product catalog (admin/barcodes) AND this row's
                    image slot. A single bottle, a 6-pack carton, and a case can each have their
                    own photo.
                  </p>
                </div>
              )
            })()
          )}

          {/* Inventory List tab content — rich grouped list of scanned items
              (Expired Items Alert + Add bar + grouped-by-location rows). This
              IS the daily-use inventory view; Item Details (above) is for
              find-and-edit-one-item via product catalog lookup. */}
          {activeTab === 'list' && (<>
          {/* Expired Items Alert */}
          {totalExpired > 0 && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-700 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2 flex items-center gap-2">
                    <span>🚨</span>
                    {totalExpired} Expired Item{totalExpired !== 1 ? 's' : ''} Found
                  </h3>
                  {needsCleanup > 0 && (
                    <p className="text-sm text-red-800 dark:text-red-300">
                      {needsCleanup} item{needsCleanup !== 1 ? 's need' : ' needs'} immediate attention
                    </p>
                  )}
                </div>
                <Link
                  href="/inventory/cleanup"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Clean Up Now
                </Link>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-primary">{summary.totalItems}</div>
              <div className="text-sm text-muted-foreground">Total Items</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-warning">{summary.expiringWithin7Days}</div>
              <div className="text-sm text-muted-foreground">Expiring Soon</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-destructive">{totalExpired}</div>
              <div className="text-sm text-muted-foreground">Expired</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6">
            <button
              type="button"
              onClick={scanItemLock.isLocked ? scanItemLock.onLockedClick : () => setShowScanContext(true)}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              {scanItemLock.isLocked ? (
                <>
                  <LockClosedIcon className="w-5 h-5" />
                  Paused — Scan Item
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Scan Item
                </>
              )}
            </button>
          </div>

          {/* Location Filter */}
          <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
            {(['all', 'fridge', 'freezer', 'pantry', 'counter'] as const).map(loc => (
              <button
                type="button"
                key={loc}
                onClick={() => setSelectedLocation(loc)}
                className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedLocation === loc
                    ? 'bg-primary text-white'
                    : 'bg-card text-foreground hover:bg-muted'
                }`}
              >
                {loc === 'all' ? '🏠 All' :
                 loc === 'fridge' ? '🧊 Fridge' :
                 loc === 'freezer' ? '❄️ Freezer' :
                 loc === 'pantry' ? '🗄️ Pantry' :
                 '🏺 Counter'}
                {loc !== 'all' && ` (${summary.byLocation[loc]})`}
              </button>
            ))}
          </div>

          {/* Inventory Items */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <div className="bg-card rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                Your Kitchen Inventory
              </h3>
              <p className="text-muted-foreground mb-4">
                Scan everything in your kitchen to track ingredients and find recipes you can make
              </p>
              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground dark:text-muted-foreground">
                <span>🧊 Fridge</span>
                <span>❄️ Freezer</span>
                <span>🗄️ Pantry</span>
                <span>🏺 Counter</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const categoryMeta = getCategoryMetadata(item.category)

                // Calculate expiration severity from item's expiresAt date
                let expirationSeverity: 'expired' | 'critical' | 'warning' | 'normal' = 'normal'
                if (item.expiresAt) {
                  const daysUntil = Math.ceil(
                    (item.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                  )
                  if (daysUntil < 0) expirationSeverity = 'expired'
                  else if (daysUntil <= 1) expirationSeverity = 'critical'
                  else if (daysUntil <= 3) expirationSeverity = 'warning'
                }

                const expirationColors = expirationSeverity !== 'normal' ? getExpirationColor(expirationSeverity) : null

                return (
                  <div
                    key={item.id}
                    className={`bg-card rounded-lg shadow p-4 cursor-pointer hover:shadow-md hover:bg-muted/30 transition-all ${
                      expirationColors ? `border-l-4 ${expirationColors.border}` : ''
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setSelectedItem(item)
                      setActiveTab('details')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setSelectedItem(item)
                        setActiveTab('details')
                      }
                    }}
                  >
                    <div className="flex items-center gap-4">
                      {/* Product Image — catalog (admin/barcodes) wins over the
                          row's snapshot, since admin migrations / OFF / USDA
                          can populate the catalog after a row was first added. */}
                      {(() => {
                        const src = resolveItemImage(item)
                        return src ? (
                          <img
                            src={src}
                            alt={item.productName}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-3xl">
                            {categoryMeta.icon}
                          </div>
                        )
                      })()}

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate flex items-center gap-2">
                          <span className="truncate">{item.productName || 'Unknown Product'}</span>
                          {/* Inline rename pencil — only shown for placeholder
                              names. Curated names are admin-only via the
                              /admin/barcodes edit flow. */}
                          {item.barcode &&
                            (!item.productName ||
                              item.productName.toLowerCase() === 'unknown product') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setRenameModal({
                                    itemId: item.id,
                                    barcode: item.barcode!,
                                    productName: item.productName,
                                    imageUrl: item.imageUrl,
                                  })
                                }}
                                className="text-xs text-primary hover:underline flex-shrink-0"
                                title="Set the real name for this barcode"
                              >
                                ✏️ Name it
                              </button>
                            )}
                        </h3>
                        {item.brand && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.brand}
                          </p>
                        )}
                        {item.barcode && (
                          <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                            {item.barcode}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {/* Stock-level pill.
                              Amount-aware path (Phase 2b): pct = remainingAmount /
                              containerSize. >100% means the user has more than one
                              full container's worth, so green. 25-100% yellow. <25%
                              red. Falls back to count-based pill (Phase 2a) when
                              the item has no containerSize — manual entries,
                              user-renamed products, anything from before backfill. */}
                          {(() => {
                            const cs = item.containerSize
                            const ra = item.remainingAmount
                            const hasAmountData = typeof cs === 'number' && cs > 0 && typeof ra === 'number'

                            if (hasAmountData) {
                              const pct = ra! / cs!
                              const cls =
                                pct >= 1
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : pct >= 0.25
                                    ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                                    : pct > 0
                                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                                      : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                              // Round to nearest 5% to avoid 73.4% noise; clamp display at 100%.
                              const displayPct = Math.min(100, Math.round((pct * 100) / 5) * 5)
                              const label =
                                pct >= 1
                                  ? `${displayPct}%`
                                  : pct > 0
                                    ? `${displayPct}% left`
                                    : 'Out'
                              return (
                                <span
                                  className={`text-xs px-2 py-1 rounded font-medium ${cls}`}
                                  title={`${ra!.toFixed(1)} ${item.containerUnit ?? ''} of ${cs!} ${item.containerUnit ?? ''}`}
                                >
                                  {label}
                                </span>
                              )
                            }

                            // Fallback: count-based pill (Phase 2a)
                            const q = item.quantity ?? 0
                            const cls =
                              q > 1
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                : q === 1
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                            const label = q > 1 ? 'Stocked' : q === 1 ? 'Last one' : 'Out'
                            return (
                              <span className={`text-xs px-2 py-1 rounded font-medium ${cls}`}>
                                {label}
                              </span>
                            )
                          })()}
                          <span className="text-xs px-2 py-1 bg-muted rounded">
                            {categoryMeta.displayName}
                          </span>
                          {/* On-hand display — explicit "On hand:" label so
                              the count reads as on-hand status (not just
                              another category badge). Uses shared
                              formatOnHandText so pack-tier items render
                              as "1 case + 2 bottles" (or "0 + 0" for empty
                              pack-tier rows). Same logic Item Details +
                              Adjustment tab use — single source of truth. */}
                          <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded font-semibold">
                            On hand:{' '}
                            {formatOnHandText(item) ||
                              item.displayQuantity ||
                              formatQuantityDisplay(item.quantity, item.unit)}
                          </span>
                          {item.expiresAt && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
                              {formatExpirationDate(item.expiresAt)}
                            </span>
                          )}
                          {/* Show who purchased this item */}
                          {item.purchasedBy && (
                            <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {getMemberName(item.purchasedBy)}
                            </span>
                          )}
                          {/* Show who added this to the list originally */}
                          {!item.purchasedBy && item.addedBy && item.addedBy.length > 0 && (
                            <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                              {item.addedBy.map(id => getMemberName(id)).filter(Boolean).join(', ') || 'Added'}
                            </span>
                          )}
                        </div>

                        {/* Recipe Links - Show which recipes can be made with this ingredient */}
                        {item.recipeIds && item.recipeIds.length > 0 && (
                          <div className="mt-2">
                            <RecipeLinks
                              recipeIds={item.recipeIds}
                              primaryRecipeId={item.primaryRecipeId}
                              onRecipeClick={(recipeId, recipeName) => {
                                toast(`You can make: ${recipeName}`, { icon: '🍳' })
                                // TODO: Open recipe modal with this recipe
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Per-row action buttons (Edit / Used Up / Buy Again)
                          removed — clicking the row now opens the item on
                          the Item Details tab. Used Up + Buy Again can be
                          re-added there as part of the editor when needed. */}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          </>)}
        </main>

        {/* Scan Context Modal */}
        <ScanContextModal
          isOpen={showScanContext}
          onClose={() => setShowScanContext(false)}
          onSelectContext={handleScanContextSelect}
          excludeContexts={['meal']}
        />

        {/* Barcode Scanner */}
        <BarcodeScanner
          isOpen={showScanner}
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          context={scanContext}
        />

        {/* Rename modal — triggered by inline pencil on existing rows
            with placeholder names. Persists to product_database via the
            /api/products/[barcode]/name endpoint, then updates the local
            inventory row's name to match. */}
        {renameModal && (
          <RenameProductModal
            isOpen={true}
            onClose={() => setRenameModal(null)}
            barcode={renameModal.barcode}
            imageUrl={renameModal.imageUrl}
            currentName={renameModal.productName}
            onConfirmed={async (newName) => {
              if (renameModal.itemId) {
                // Inline rename of an existing inventory row
                try {
                  await updateItem(renameModal.itemId, { productName: newName })
                  toast.success(`✓ Saved name: ${newName}`)
                } catch (e) {
                  logger.error('[Inventory] Failed to update local row after rename', e as Error)
                  toast.error('Saved globally but local row update failed — refresh to see it')
                }
              } else if (renameModal.pendingScanProduct) {
                // Scan-time rename — the user just scanned an item that
                // had no real name. Now that we have one, finish the add
                // flow they started by inserting the row into inventory
                // with the user-supplied name patched in.
                try {
                  const patched = {
                    ...renameModal.pendingScanProduct,
                    product_name: newName,
                  }
                  await addItem(patched, { inStock: true, needed: false, quantity: 1 })
                  toast.success(`✓ Added ${newName} to inventory`)
                } catch (e) {
                  logger.error('[Inventory] Add after scan-rename failed', e as Error)
                  toast.error('Saved name globally, but failed to add to inventory')
                }
              } else {
                toast.success(`✓ Saved name: ${newName}`)
              }
              setRenameModal(null)
            }}
          />
        )}

        {/* Add-to-inventory qty + on-hand sheet (DRY via useAddSheet).
            Surfaces from the barcode-scan path on purchase/inventory
            contexts — both for found and not-found products. */}
        {addSheetNode}

        {/* Quantity prompt — used by both "Used Up" and "Buy Again".
            Same modal, different copy/defaults/onConfirm based on
            qtyModal.mode. Phase 2b: when the row has containerSize, the
            'used-up' branch switches to amount-aware mode (asks for oz/g
            instead of "units" and dispatches consumeItem with useAmount). */}
        {qtyModal && (() => {
          const isAmountAware =
            qtyModal.mode === 'used-up' &&
            typeof qtyModal.containerSize === 'number' &&
            qtyModal.containerSize > 0 &&
            typeof qtyModal.remainingAmount === 'number'

          let title: string
          let subtitle: string
          let defaultQuantity: number
          let maxQuantity: number
          let unitLabel: string | undefined
          let confirmLabel: string

          if (qtyModal.mode === 'used-up') {
            if (isAmountAware) {
              const remainingFloor = Math.max(1, Math.floor(qtyModal.remainingAmount!))
              title = 'How much did you use?'
              subtitle = `${qtyModal.remainingAmount!.toFixed(1)} ${qtyModal.containerUnit} left of ${qtyModal.containerSize} ${qtyModal.containerUnit} per container.`
              defaultQuantity = 1
              maxQuantity = remainingFloor
              unitLabel = qtyModal.containerUnit
              confirmLabel = 'Log usage'
            } else {
              title = 'How much did you use?'
              subtitle = `You have ${qtyModal.currentQty}. Drop the count by however much you used.`
              defaultQuantity = qtyModal.currentQty
              maxQuantity = qtyModal.currentQty
              unitLabel = undefined
              confirmLabel = 'Log usage'
            }
          } else {
            title = 'How many to buy?'
            subtitle = 'Adds to your shopping list as needed.'
            defaultQuantity = 1
            maxQuantity = 99
            unitLabel = undefined
            confirmLabel = 'Add to list'
          }

          return (
          <QuantityAdjustModal
            isOpen={true}
            onClose={() => setQtyModal(null)}
            product={{
              productName: qtyModal.productName,
              brand: qtyModal.brand,
              imageUrl: qtyModal.imageUrl,
              category: qtyModal.category,
            }}
            title={title}
            subtitle={subtitle}
            defaultQuantity={defaultQuantity}
            minQuantity={1}
            maxQuantity={maxQuantity}
            unitLabel={unitLabel}
            confirmLabel={confirmLabel}
            onConfirm={async (qty) => {
              try {
                if (qtyModal.mode === 'used-up') {
                  if (isAmountAware) {
                    await consumeItem(qtyModal.itemId, { useAmount: qty })
                    const remaining = qtyModal.remainingAmount! - qty
                    toast.success(
                      remaining <= 0
                        ? `✓ ${qtyModal.productName} marked out — added to shopping list`
                        : `✓ Logged ${qty} ${qtyModal.containerUnit} used (${remaining.toFixed(1)} ${qtyModal.containerUnit} left)`
                    )
                  } else {
                    await consumeItem(qtyModal.itemId, qty)
                    const remaining = qtyModal.currentQty - qty
                    toast.success(
                      remaining <= 0
                        ? `✓ ${qtyModal.productName} marked out — added to shopping list`
                        : `✓ Logged ${qty} used (${remaining} left)`
                    )
                  }
                } else {
                  if (!auth.currentUser?.uid) {
                    toast.error('You must be logged in')
                    return
                  }
                  // Carry the existing inventory row's curated category +
                  // barcode + brand + image through to the new shopping
                  // list entry so we don't lose context (and so detectCategoryFromText
                  // doesn't misclassify based on the free-text name).
                  await addManualShoppingItem(auth.currentUser.uid, qtyModal.productName, {
                    quantity: qty,
                    unit: qtyModal.unit,
                    priority: 'medium',
                    category: qtyModal.category,
                    barcode: qtyModal.barcode,
                    brand: qtyModal.brand,
                    imageUrl: qtyModal.imageUrl,
                  })
                  toast.success(`✓ Added ${qty} × ${qtyModal.productName} to shopping list`)
                }
              } catch (error: any) {
                logger.error('[Inventory] Quantity action failed', error as Error, {
                  mode: qtyModal.mode,
                  itemId: qtyModal.itemId,
                })
                toast.error(`Failed: ${error?.message || 'Unknown error'}`)
              }
            }}
          />
          )
        })()}

        {/* InventoryItemEditModal removed from this page — the page-level
            tabs (Details / UPC / Image) now ARE the item editor when an
            item is selected from the list. The component itself stays in
            components/inventory/ for potential reuse on other surfaces. */}

        {/* Purchase Order receipt capture — opens from the Purchase History
            tab's no-item state CTA. Reuses the same camera surface as the
            in-trip receipt review (lib/ocr-receipt.ts → /api/ocr/receipt).
            On Done we hand the parsed OCR result to PurchaseOrderReview,
            which renders inline in the Purchase History tab body. */}
        <ReceiptCaptureSurface
          isOpen={poCaptureOpen}
          onClose={() => setPoCaptureOpen(false)}
          onComplete={async (images) => {
            setPoCaptureOpen(false)
            setPoProcessing(true)
            try {
              const ocr = await extractReceiptFromImages(images)
              const userId = auth.currentUser?.uid
              if (!userId) {
                toast.error('Sign-in not loaded yet — try again in a moment.')
                return
              }
              // Save as DRAFT — no inventory writes happen here. The user
              // reviews and applies in the OrderReceiptDetail view.
              const saved = await saveOrderReceipt(ocr, { userId })
              logger.info('[Inventory] Order receipt saved as draft', {
                receiptNumber: saved.receiptNumber,
                isDuplicate: saved.isDuplicate,
              })
              if (saved.isDuplicate) {
                toast(
                  `${saved.receiptNumber} saved · looks like a duplicate of ${saved.duplicateOfReceiptNumber ?? 'an existing receipt'}`,
                  { icon: '⚠️', duration: 6000 },
                )
              } else {
                toast.success(`${saved.receiptNumber} saved · review and apply when ready`, {
                  duration: 4000,
                })
              }
              // Land on Purchase History so the user sees the new draft
              // in the feed and can tap into the detail view.
              setActiveTab('history')
              setSelectedItem(null)
              // Auto-open the new draft for review — the user just
              // captured it, this is the natural next moment.
              setSelectedReceiptId(saved.receiptId)
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Receipt OCR failed.'
              logger.warn('[Inventory] OCR/save failed', { message })
              toast.error(message)
            } finally {
              setPoProcessing(false)
            }
          }}
        />

        {poProcessing && (
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
      </div>
    </AuthGuard>
  )
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <KitchenInventoryContent />
    </Suspense>
  )
}
