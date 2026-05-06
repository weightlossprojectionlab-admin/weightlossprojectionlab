'use client'

/**
 * Kitchen Inventory Page
 *
 * Shows all items user currently has in their kitchen
 * Organized by storage location (fridge, freezer, pantry, counter)
 * Highlights expiring items
 */

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArchiveBoxIcon, QrCodeIcon, PhotoIcon, ListBulletIcon, ClockIcon, ShoppingCartIcon, ChartBarIcon } from '@heroicons/react/24/outline'
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
import type { ShoppingItem, ProductCategory, QuantityUnit } from '@/types/shopping'
import { simplifyProduct } from '@/lib/openfoodfacts-api'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import { addManualShoppingItem } from '@/lib/shopping-operations'
import type { ScanContext } from '@/types/shopping'
import type { PatientProfile } from '@/types/medical'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { patientOperations } from '@/lib/medical-operations'

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

function KitchenInventoryContent() {
  // Real-time inventory hook
  const {
    fridgeItems,
    freezerItems,
    pantryItems,
    counterItems,
    loading: inventoryLoading,
    getSummary
  } = useRealtimeInventory()

  // Real-time expired items hook
  const {
    totalExpired,
    criticalItems,
    highRiskItems,
    loading: expiredLoading
  } = useRealtimeExpiredItems()

  const { consumeItem, addItem, updateItem, removeItem } = useShopping()

  // Page-level tabs (Phase A scaffolding — Item Details / UPC / Image).
  // State persisted in URL (?tab=...) so deep-links and refreshes stick.
  // UPC + Image tabs are stubs today; Phase B/C/D will fill them in
  // with product-database lookup, scan flow, and image gallery.
  const router = useRouter()
  const searchParams = useSearchParams()
  type InventoryTab = 'list' | 'details' | 'history' | 'reorder' | 'report' | 'upc' | 'image'
  const tabParam = searchParams.get('tab')
  const activeTab: InventoryTab =
    tabParam === 'details' || tabParam === 'history' || tabParam === 'reorder' ||
      tabParam === 'report' || tabParam === 'upc' || tabParam === 'image'
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
  const [showScanner, setShowScanner] = useState(false)
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
  const [showHistory, setShowHistory] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
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
      setShowHistory(false)
    }
  }, [selectedItem?.id])

  const handleSaveDetails = async () => {
    if (!selectedItem) return
    setSavingDetails(true)
    try {
      const updates: Partial<ShoppingItem> = {}
      if (editCategory !== selectedItem.category) updates.category = editCategory
      if (editQuantity !== selectedItem.quantity) updates.quantity = editQuantity
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
      if (Object.keys(updates).length > 0) {
        await updateItem(selectedItem.id, updates)
        toast.success('Item updated')
      }
    } catch (error: any) {
      logger.error('[Inventory] Item edit failed', error as Error, { itemId: selectedItem.id })
      toast.error(`Failed: ${error?.message || 'Unknown error'}`)
    } finally {
      setSavingDetails(false)
    }
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
   * Get items for selected location
   */
  const getItemsForLocation = () => {
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

    try {
      toast.loading('Looking up product...', { id: 'barcode' })

      // Use the cached server endpoint (not OFF directly) so the response
      // carries product_database fields like container_size that
      // addOrUpdateShoppingItem reads to seed Phase 2b's amount tracking.
      const response = await lookupBarcodeWithCache(barcode)
      const product = simplifyProduct(response)

      if (!product.found) {
        toast.error(
          `Product not found in database (barcode: ${barcode}). This product may need to be added manually.`,
          {
            id: 'barcode',
            duration: 5000
          }
        )
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
        // Add or update inventory via the shared addOrUpdateShoppingItem
        // path so existing rows pick up Phase 2b's containerSize +
        // remainingAmount seeding (and any future lookup-side fields)
        // without us re-implementing the dedup + update logic here.
        // addOrUpdateShoppingItem finds the row by barcode, increments
        // its quantity by 1, and copies container metadata across.
        const existing = allInventoryItems.find((item) => item.barcode === barcode)
        await addItem(response.product!, {
          inStock: true,
          needed: false,
        })
        toast.success(
          existing
            ? `Updated ${product.name} in inventory`
            : `➕ Added ${product.name} to inventory`
        )
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
          {/* Page-level tabs (Phase A scaffolding) */}
          <div role="tablist" className="flex border-b border-border mb-6 -mx-1 overflow-x-auto">
            {/* Tab order: most-used on the left (daily flows), planning /
                analytics tabs (Suggested Reorder, Restocking Report) at the
                right since they're occasional. UPC + Image are catalog-
                identity tabs — middle position. */}
            {([
              { id: 'list' as const, label: 'Inventory List', icon: ListBulletIcon },
              { id: 'details' as const, label: 'Item Details', icon: ArchiveBoxIcon },
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
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap min-h-[44px] ${
                  activeTab === id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
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
                  {selectedItem.imageUrl ? (
                    <img
                      src={selectedItem.imageUrl}
                      alt=""
                      aria-hidden="true"
                      className="h-12 w-12 object-cover rounded border border-border flex-shrink-0"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                      <ArchiveBoxIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
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
                    {(() => {
                      const q = selectedItem.quantity ?? 0
                      const enabled = q <= 1
                      return (
                        <button
                          type="button"
                          onClick={openBuyAgainModal}
                          disabled={!enabled}
                          className={`inline-flex items-center gap-1.5 px-4 py-2 min-h-[44px] rounded-lg transition-colors text-sm font-medium ${
                            enabled
                              ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                              : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                          }`}
                          title={enabled ? 'Add to shopping list for restocking' : 'Item is stocked — only enabled when low or out'}
                        >
                          <span aria-hidden="true">🛒</span> Buy Again
                        </button>
                      )
                    })()}
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

                {/* Stock — editable per-item inventory state */}
                <div className="px-5 pt-5 space-y-5">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Stock
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Category</label>
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

                  {/* On-hand quantity */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">On-hand quantity</label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditQuantity(Math.max(0, editQuantity - 1))}
                        aria-label="Decrease quantity"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-muted hover:bg-gray-200 dark:hover:bg-gray-700 text-foreground text-xl font-bold transition-colors"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="form-input w-24 text-center"
                      />
                      <button
                        type="button"
                        onClick={() => setEditQuantity(editQuantity + 1)}
                        aria-label="Increase quantity"
                        className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-full bg-primary text-white hover:bg-primary-hover text-xl font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Unit of measure */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Unit of measure</label>
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

                  {/* Storage location */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Storage location</label>
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

                  {/* Expiration date */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Expiration date <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                    </label>
                    <input
                      type="date"
                      value={editExpiresAt}
                      onChange={(e) => setEditExpiresAt(e.target.value)}
                      className="form-input w-full"
                    />
                  </div>

                  {/* Remaining % pill (read-only) — only shows when the item
                      is amount-aware (Phase 2b). Driven by container size +
                      remainingAmount on the underlying item. */}
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
                        <label className="block text-sm font-medium text-foreground mb-1">Remaining</label>
                        <span className={`inline-block text-sm px-3 py-1 rounded font-medium ${cls}`}>
                          {label} <span className="text-xs opacity-70 ml-1">({ra.toFixed(1)} of {cs} {selectedItem.containerUnit})</span>
                        </span>
                      </div>
                    )
                  })()}
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

                <div className="pb-5" />
                {/* Spacer above footer */}

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-muted/30">
                  <button
                    onClick={() => {
                      setSelectedItem(null)
                      setActiveTab('list')
                    }}
                    className="btn btn-ghost"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDetails}
                    disabled={savingDetails}
                    className="btn btn-primary"
                  >
                    {savingDetails ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-card rounded-lg p-8 text-center border border-border">
                <ArchiveBoxIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Pick an item to edit</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Click any item on the Inventory List to open it here. You'll be able to
                  edit its category, on-hand quantity, and unit of measure — and (Phase B)
                  search the product catalog to add new items.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Switch to <button onClick={() => setActiveTab('list')} className="text-primary hover:underline font-medium">Inventory List</button> to pick an item.
                </p>
              </div>
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
          {activeTab === 'history' && (
            !selectedItem ? (
              <div className="bg-card rounded-lg p-8 text-center border border-border">
                <ClockIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <h2 className="text-lg font-semibold text-foreground mb-2">Pick an item to see its history</h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Click any item on the Inventory List to see when you bought it,
                  where, what you paid, and a prediction of when you'll likely
                  need it again.
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  Switch to <button onClick={() => setActiveTab('list')} className="text-primary hover:underline font-medium">Inventory List</button> to pick an item.
                </p>
              </div>
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
                    {selectedItem.imageUrl ? (
                      <img
                        src={selectedItem.imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="h-12 w-12 object-cover rounded border border-border flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
                        <ClockIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
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
            const allItems = [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems]
            type ReorderRow = {
              item: typeof allItems[number]
              predictedDaysAhead: number | null
              reason: 'due-now' | 'due-soon' | 'low-stock' | 'no-prediction'
            }
            const rows: ReorderRow[] = allItems
              .map((item) => {
                const avgDays = item.averageDaysBetweenPurchases
                const last = item.lastPurchased ? new Date(item.lastPurchased).getTime() : null
                if (avgDays !== undefined && last !== null) {
                  const daysSince = Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24))
                  const ahead = Math.round(avgDays - daysSince)
                  if (ahead <= 0) return { item, predictedDaysAhead: ahead, reason: 'due-now' as const }
                  if (ahead <= 3) return { item, predictedDaysAhead: ahead, reason: 'due-soon' as const }
                  return null // on-schedule, hide from suggestions
                }
                // Cold-start: no avg cadence; fall back to stock-level signal
                if ((item.quantity ?? 0) <= 1) {
                  return { item, predictedDaysAhead: null, reason: 'low-stock' as const }
                }
                return null
              })
              .filter((r): r is ReorderRow => r !== null)
              .sort((a, b) => {
                // Due-now first, then due-soon by days, then low-stock
                const order = { 'due-now': 0, 'due-soon': 1, 'low-stock': 2, 'no-prediction': 3 }
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
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" aria-hidden="true" className="h-10 w-10 object-cover rounded border border-border flex-shrink-0" />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <ArchiveBoxIcon className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
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
            const allItems = [...fridgeItems, ...freezerItems, ...pantryItems, ...counterItems]
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
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt="" aria-hidden="true" className="h-8 w-8 object-cover rounded border border-border flex-shrink-0" />
                          ) : (
                            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <ArchiveBoxIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
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

          {/* UPC tab — stub for Phase A. Phase C will add scan + product
              lookup + items-missing-UPC list. */}
          {activeTab === 'upc' && (
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <QrCodeIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">UPC lookup is coming</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Soon you'll be able to scan or enter a UPC here, look it up against the global
                product catalog (456k+ products), and add it to your inventory. You'll also see
                items in your inventory that are missing UPCs so they're easy to link.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                For now, switch back to <button onClick={() => setActiveTab('details')} className="text-primary hover:underline font-medium">Item Details</button> to use the existing scan flow.
              </p>
            </div>
          )}

          {/* Image tab — stub for Phase A. Phase D will add gallery view +
              find-image action against product_database. */}
          {activeTab === 'image' && (
            <div className="bg-card rounded-lg p-8 text-center border border-border">
              <PhotoIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <h2 className="text-lg font-semibold text-foreground mb-2">Image gallery is coming</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Soon you'll see your inventory as a visual grid. Items missing images will surface
                first with a "Find image" button that searches the product catalog by name and lets
                you pick a match.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                For now, switch back to <button onClick={() => setActiveTab('details')} className="text-primary hover:underline font-medium">Item Details</button> to manage your inventory.
              </p>
            </div>
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
              onClick={() => setShowScanContext(true)}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Scan Item
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
                      {/* Product Image */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="w-16 h-16 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-3xl">
                          {categoryMeta.icon}
                        </div>
                      )}

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
                          <span className="text-xs px-2 py-1 bg-muted rounded">
                            {item.displayQuantity || formatQuantityDisplay(item.quantity, item.unit)}
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
