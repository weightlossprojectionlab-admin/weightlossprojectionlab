'use client'
// Force dynamic renderingexport const dynamic = 'force-dynamic'

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
    getSummary,
    refresh
  } = useRealtimeInventory()

  // Real-time expired items hook
  const {
    totalExpired,
    criticalItems,
    highRiskItems,
    expirationAlerts,
    loading: expiredLoading
  } = useRealtimeExpiredItems()

  const { consumeItem, addItem, updateItem } = useShopping()

  const [selectedLocation, setSelectedLocation] = useState<StorageLocation | 'all'>('all')
  const [showScanner, setShowScanner] = useState(false)
  const [showScanContext, setShowScanContext] = useState(false)
  const [scanContext, setScanContext] = useState<ScanContext>('inventory')
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null)
  const [members, setMembers] = useState<Record<string, PatientProfile>>({})

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

      // Handle based on scan context
      if (scanContext === 'consume') {
        // Mark as consumed (out of stock, add to shopping list)
        const existing = items.find(item => item.barcode === barcode)
        if (existing) {
          await consumeItem(existing.id)
          toast.success(`Marked as used. Added ${product.name} to shopping list`)
          refresh()
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
        refresh()
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
                const expirationAlert = expirationAlerts?.find((a: any) => a.itemId === item.id)
                const expirationColors = expirationAlert ? getExpirationColor(expirationAlert.severity) : null

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
                        <h3 className="font-semibold text-foreground truncate">
                          {item.productName}
                        </h3>
                        {item.brand && (
                          <p className="text-sm text-muted-foreground truncate">
                            {item.brand}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
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
                          onClick={async () => {
                            try {
                              await consumeItem(item.id)
                              toast.success(`✓ Moved ${item.productName} to shopping list`)
                            } catch (error: any) {
                              console.error('[Inventory] Error marking as consumed:', error)
                              toast.error(`Failed to move item: ${error?.message || 'Unknown error'}`)
                            }
                          }}
                          className="px-3 py-1 text-xs bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded hover:bg-orange-200 dark:hover:bg-orange-900/30 transition-colors"
                          title="Mark as used up"
                        >
                          Used Up
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            if (!auth.currentUser?.uid) {
                              toast.error('You must be logged in')
                              return
                            }

                            try {
                              // Add to shopping list without removing from inventory
                              await addManualShoppingItem(auth.currentUser.uid, item.productName, {
                                quantity: 1,
                                unit: item.unit,
                                priority: 'medium'
                              })
                              toast.success(`✓ Added ${item.productName} to shopping list`)
                            } catch (error: any) {
                              console.error('[Inventory] Error adding to shopping list:', error)
                              toast.error(`Failed to add: ${error?.message || 'Unknown error'}`)
                            }
                          }}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                          title="Add to shopping list for restocking"
                        >
                          Buy Again
                        </button>
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
