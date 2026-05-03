'use client'

/**
 * Kitchen Inventory Page
 *
 * Shows all items user currently has in their kitchen
 * Organized by storage location (fridge, freezer, pantry, counter)
 * Highlights expiring items
 */

import { useState, Suspense, useEffect } from 'react'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import Link from 'next/link'
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
import { lookupBarcode, simplifyProduct } from '@/lib/openfoodfacts-api'
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

  const { consumeItem, addItem, updateItem } = useShopping()

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

      const response = await lookupBarcode(barcode)
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
        // Add to inventory (they bought it or taking stock at home)
        const existing = allInventoryItems.find(item => item.barcode === barcode)

        if (existing) {
          // Item already exists, increment quantity
          await updateItem(existing.id, {
            inStock: true,
            quantity: existing.quantity + 1,
            needed: false
          })
          toast.success(`Updated ${product.name} in inventory`)
        } else {
          // New item, add to inventory
          await addItem(response.product!, {
            inStock: true,
            needed: false,
            quantity: 1
          })
          toast.success(`➕ Added ${product.name} to inventory`)
        }
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
                    className={`bg-card rounded-lg shadow p-4 ${
                      expirationColors ? `border-l-4 ${expirationColors.border}` : ''
                    }`}
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

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setQtyModal({
                              mode: 'used-up',
                              itemId: item.id,
                              productName: item.productName,
                              brand: item.brand,
                              imageUrl: item.imageUrl,
                              barcode: item.barcode,
                              category: item.category,
                              currentQty: item.quantity ?? 1,
                              unit: item.unit,
                              containerSize: item.containerSize,
                              containerUnit: item.containerUnit,
                              remainingAmount: item.remainingAmount,
                            })
                          }}
                          className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                          title="Log how much you used"
                        >
                          Used Up
                        </button>
                        {/* Buy Again — gated on stock level. Stocked items don't
                            need restocking; last-one and out states enable it. */}
                        {(() => {
                          const q = item.quantity ?? 0
                          const enabled = q <= 1
                          return (
                            <button
                              type="button"
                              disabled={!enabled}
                              onClick={() => {
                                if (!auth.currentUser?.uid) {
                                  toast.error('You must be logged in')
                                  return
                                }
                                setQtyModal({
                                  mode: 'buy-again',
                                  itemId: item.id,
                                  productName: item.productName,
                                  brand: item.brand,
                                  imageUrl: item.imageUrl,
                                  barcode: item.barcode,
                                  category: item.category,
                                  currentQty: 1,
                                  unit: item.unit,
                                })
                              }}
                              className={`px-3 py-1 text-xs rounded transition-colors ${
                                enabled
                                  ? 'bg-blue-100 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/30'
                                  : 'bg-muted text-muted-foreground opacity-50 cursor-not-allowed'
                              }`}
                              title={enabled ? 'Add to shopping list for restocking' : 'Item is stocked — only enabled when low or out'}
                            >
                              Buy Again
                            </button>
                          )
                        })()}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
