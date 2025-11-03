'use client'

/**
 * Shopping List Page
 *
 * Displays user's shopping list with items they need to purchase
 * Features:
 * - Store location detection
 * - Barcode scanning to check off items
 * - Priority sorting
 * - Expiring items alerts
 */

import { useState, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useShopping } from '@/hooks/useShopping'
import { lookupBarcode, simplifyProduct } from '@/lib/openfoodfacts-api'
import { getCategoryMetadata, detectCategory, formatQuantityDisplay } from '@/lib/product-categories'
import { ExpirationPicker } from '@/components/shopping/ExpirationPicker'
import { SwipeableShoppingItem } from '@/components/shopping/SwipeableShoppingItem'
import { ShareListButton } from '@/components/shopping/ShareListButton'
import { SearchFilter } from '@/components/shopping/SearchFilter'
import { StorePicker } from '@/components/shopping/StorePicker'
import { SmartSuggestions } from '@/components/shopping/SmartSuggestions'
import { SequentialShoppingFlow } from '@/components/shopping/SequentialShoppingFlow'
import { RecipeLinks } from '@/components/shopping/RecipeLinks'
import type { ProductCategory, ShoppingItem } from '@/types/shopping'
import type { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'
import { Spinner } from '@/components/ui/Spinner'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { addManualShoppingItem } from '@/lib/shopping-operations'

// Dynamic imports
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

function ShoppingListContent() {
  const router = useRouter()
  const {
    neededItems,
    items: allItems,
    stores,
    loading,
    purchaseItem,
    toggleNeeded,
    removeItem,
    addItem,
    updateItem,
    getSummary,
    smartSort,
    addStore
  } = useShopping()

  const [showScanner, setShowScanner] = useState(false)
  const [showExpirationPicker, setShowExpirationPicker] = useState(false)
  const [showDebugMode, setShowDebugMode] = useState(false)
  const [showImpulseConfirm, setShowImpulseConfirm] = useState(false)
  const [scannedProduct, setScannedProduct] = useState<{
    product: OpenFoodFactsProduct
    itemId?: string
    category: ProductCategory
  } | null>(null)

  // Sequential shopping flow state
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null)
  const [showSequentialFlow, setShowSequentialFlow] = useState(false)

  const summary = getSummary()

  // Get display items based on debug mode
  const displayItems = showDebugMode ? allItems : neededItems

  // Identify orphaned items (not in stock, not needed, quantity 0)
  const orphanedItems = allItems.filter(item =>
    !item.inStock && !item.needed && item.quantity === 0
  )

  /**
   * Fix orphaned item by adding it to shopping list
   */
  const handleFixOrphanedItem = async (itemId: string, itemName: string) => {
    try {
      await updateItem(itemId, {
        needed: true,
        priority: 'high',
        updatedAt: new Date()
      })
      toast.success(`✓ Added ${itemName} to shopping list`)
    } catch (error: any) {
      console.error('[Shopping] Error fixing orphaned item:', error)
      toast.error(`Failed to fix item: ${error?.message || 'Unknown error'}`)
    }
  }

  /**
   * Handle barcode scan - mark as purchased
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      setShowScanner(false)
      toast.loading('Looking up product...', { id: 'barcode-lookup' })

      const response = await lookupBarcode(barcode)
      const product = simplifyProduct(response)

      if (!product.found) {
        toast.error(
          `Product not found in database (barcode: ${barcode}). This product may need to be added manually.`,
          {
            id: 'barcode-lookup',
            duration: 5000
          }
        )
        return
      }

      toast.success(`Found: ${product.name}`, { id: 'barcode-lookup' })

      // Check if this product is on the shopping list
      const existingItem = neededItems.find(item => item.barcode === barcode)

      if (existingItem) {
        // Item was on list - show expiration picker
        const categoryMeta = getCategoryMetadata(existingItem.category)
        setScannedProduct({
          product: response.product!,
          itemId: existingItem.id,
          category: existingItem.category
        })

        if (categoryMeta.isPerishable) {
          setShowExpirationPicker(true)
        } else {
          // Non-perishable - mark as purchased immediately
          await purchaseItem(existingItem.id, { quantity: 1 })
          toast.success(`✓ Checked off: ${product.name}`)
        }
      } else {
        // Item NOT on list - show impulse purchase confirmation
        const category = detectCategory(response.product!)
        setScannedProduct({
          product: response.product!,
          itemId: undefined, // New item, no existing ID
          category
        })
        setShowImpulseConfirm(true)
      }
    } catch (error: any) {
      console.error('[Shopping] Barcode scan error details:', {
        name: error?.name,
        message: error?.message,
        code: error?.code,
        stack: error?.stack,
        barcode,
        fullError: error
      })
      logger.error('Barcode scan error', error as Error, { barcode })
      toast.error(`Failed to process barcode: ${error?.message || 'Unknown error'}`, { id: 'barcode-lookup' })
    }
  }

  /**
   * Handle expiration date selection
   * Works for both items on list (itemId exists) and impulse purchases (itemId is undefined)
   */
  const handleExpirationSelected = async (date: Date, quantity?: number, unit?: import('@/types/shopping').QuantityUnit) => {
    if (!scannedProduct) return

    try {
      if (scannedProduct.itemId) {
        // Item was on shopping list - mark as purchased
        await purchaseItem(scannedProduct.itemId, {
          quantity: quantity ?? 1,
          unit,
          expiresAt: date
        })
        toast.success(`✓ Checked off: ${scannedProduct.product.product_name || 'Item'}`)
      } else {
        // Impulse purchase - add new item to inventory
        await addItem(scannedProduct.product, {
          inStock: true,
          needed: false,
          quantity: quantity ?? 1,
          unit,
          expiresAt: date
        })
        toast.success(`✓ Added ${scannedProduct.product.product_name || 'Item'} to inventory`)
      }

      setShowExpirationPicker(false)
      setScannedProduct(null)
    } catch (error) {
      logger.error('Error processing expiration date', error as Error)
      toast.error('Failed to complete purchase')
    }
  }

  /**
   * Skip expiration date
   * Works for both items on list and impulse purchases
   */
  const handleSkipExpiration = async (quantity?: number, unit?: import('@/types/shopping').QuantityUnit) => {
    if (!scannedProduct) return

    try {
      if (scannedProduct.itemId) {
        // Item was on shopping list - mark as purchased
        await purchaseItem(scannedProduct.itemId, {
          quantity: quantity ?? 1,
          unit
        })
        toast.success(`✓ Checked off: ${scannedProduct.product.product_name || 'Item'}`)
      } else {
        // Impulse purchase - add to inventory without expiration
        await addItem(scannedProduct.product, {
          inStock: true,
          needed: false,
          quantity: quantity ?? 1,
          unit
        })
        toast.success(`✓ Added ${scannedProduct.product.product_name || 'Item'} to inventory`)
      }

      setShowExpirationPicker(false)
      setScannedProduct(null)
    } catch (error) {
      logger.error('Error processing purchase', error as Error)
      toast.error('Failed to complete purchase')
    }
  }

  /**
   * Handle impulse purchase confirmation
   */
  const handleImpulsePurchaseConfirm = async () => {
    if (!scannedProduct) return

    try {
      const categoryMeta = getCategoryMetadata(scannedProduct.category)
      setShowImpulseConfirm(false)

      if (categoryMeta.isPerishable) {
        // Show expiration picker for perishables
        setShowExpirationPicker(true)
      } else {
        // Add directly to inventory for non-perishables
        await addItem(scannedProduct.product, {
          inStock: true,
          needed: false,
          quantity: 1
        })
        const productName = scannedProduct.product.product_name || 'Item'
        toast.success(`✓ Added ${productName} to inventory`)
        setScannedProduct(null)
      }
    } catch (error) {
      logger.error('Error adding impulse purchase', error as Error)
      toast.error('Failed to add item')
    }
  }

  /**
   * Cancel impulse purchase
   */
  const handleImpulsePurchaseCancel = () => {
    setShowImpulseConfirm(false)
    setScannedProduct(null)
    toast('Scan cancelled', { icon: '↩️' })
  }

  /**
   * Toggle item needed status
   */
  const handleToggleNeeded = async (itemId: string, currentStatus: boolean) => {
    try {
      await toggleNeeded(itemId, !currentStatus)
      toast.success(currentStatus ? 'Removed from list' : 'Added to list')
    } catch (error) {
      toast.error('Failed to update item')
    }
  }

  /**
   * Delete item
   */
  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Remove this item from your shopping list?')) return

    try {
      await removeItem(itemId)
      toast.success('Item removed')
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  /**
   * Handle item click - open sequential shopping flow
   * This opens the scanner immediately and guides user through purchase
   */
  const handleItemClick = (item: ShoppingItem) => {
    setSelectedItem(item)
    setShowSequentialFlow(true)
  }

  /**
   * Handle sequential flow completion
   * Called when user finishes the entire purchase flow
   */
  const handleSequentialFlowComplete = async (result: {
    quantity: number
    unit?: import('@/types/shopping').QuantityUnit
    expirationDate?: Date
    category: ProductCategory
    scannedProduct: OpenFoodFactsProduct
    isReplacement: boolean
  }) => {
    if (!selectedItem) return

    try {
      // Update item category if it changed
      if (result.category !== selectedItem.category) {
        await updateItem(selectedItem.id, {
          category: result.category,
          updatedAt: new Date()
        })
      }

      // Mark as purchased with all collected data
      await purchaseItem(selectedItem.id, {
        quantity: result.quantity,
        unit: result.unit,
        expiresAt: result.expirationDate
      })

      const productName = result.scannedProduct.product_name || selectedItem.productName
      if (result.isReplacement) {
        toast.success(`✓ Purchased substitution: ${productName}`)
      } else {
        toast.success(`✓ Purchased: ${productName}`)
      }
    } catch (error) {
      logger.error('Error completing purchase', error as Error)
      toast.error('Failed to complete purchase')
      throw error // Re-throw so SequentialShoppingFlow doesn't auto-close
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <PageHeader
          title="Shopping List"
          subtitle={`${summary.neededItems} item${summary.neededItems !== 1 ? 's' : ''} to buy`}
        />

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-primary">{summary.neededItems}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Items Needed</div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-orange-500">{summary.highPriorityItems}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">High Priority</div>
            </div>
          </div>

          {/* Actions */}
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex-1 bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Scan Item
            </button>
            <button
              type="button"
              onClick={() => router.push('/inventory')}
              className="px-4 py-3 border-2 border-gray-300 dark:border-gray-700 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              📦 Inventory
            </button>
          </div>

          {/* Debug Mode Toggle & Orphaned Items Warning */}
          {orphanedItems.length > 0 && (
            <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                    <h3 className="font-semibold text-yellow-900 dark:text-yellow-100">
                      {orphanedItems.length} Orphaned Item{orphanedItems.length !== 1 ? 's' : ''} Found
                    </h3>
                  </div>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    These items were marked as "Used Up" but aren't on your shopping list due to a previous error.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugMode(!showDebugMode)}
                  className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                >
                  {showDebugMode ? '✓ Debug On' : '🔧 Fix Them'}
                </button>
              </div>
            </div>
          )}

          {/* Debug Mode Info */}
          {showDebugMode && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    🔧 Debug Mode Active
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Showing all {allItems.length} items (including orphaned). Click "Fix" on any orphaned item to add it to your shopping list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugMode(false)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                >
                  Exit Debug
                </button>
              </div>
            </div>
          )}

          {/* Shopping List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : !showDebugMode && neededItems.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                All Set!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your shopping list is empty. Scan items you run out of to add them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Orphaned Items (Debug Mode Only) */}
              {showDebugMode && orphanedItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                    <span>🔧</span>
                    ORPHANED ITEMS (Need Fixing)
                  </h3>
                  <div className="space-y-3">
                    {orphanedItems.map(item => (
                      <ShoppingItemCard
                        key={item.id}
                        item={item}
                        onToggle={handleToggleNeeded}
                        onDelete={handleDeleteItem}
                        onClick={handleItemClick}
                        showDebugInfo={true}
                        onFixOrphaned={handleFixOrphanedItem}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* High Priority Items */}
              {displayItems.filter(item => item.priority === 'high' && item.needed).length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-orange-600 dark:text-orange-400 mb-3 flex items-center gap-2">
                    <span>⚠️</span>
                    HIGH PRIORITY
                  </h3>
                  <div className="space-y-3">
                    {displayItems
                      .filter(item => item.priority === 'high' && item.needed)
                      .map(item => (
                        <ShoppingItemCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggleNeeded}
                          onDelete={handleDeleteItem}
                          onClick={handleItemClick}
                          showDebugInfo={showDebugMode}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Regular Items */}
              {displayItems.filter(item => item.priority !== 'high' && item.needed).length > 0 && (
                <div>
                  {displayItems.filter(item => item.priority === 'high' && item.needed).length > 0 && (
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-3">
                      OTHER ITEMS
                    </h3>
                  )}
                  <div className="space-y-3">
                    {displayItems
                      .filter(item => item.priority !== 'high' && item.needed)
                      .map(item => (
                        <ShoppingItemCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggleNeeded}
                          onDelete={handleDeleteItem}
                          onClick={handleItemClick}
                          showDebugInfo={showDebugMode}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>

        {/* Barcode Scanner */}
        <BarcodeScanner
          isOpen={showScanner}
          onScan={handleBarcodeScan}
          onClose={() => setShowScanner(false)}
          context="purchase"
        />

        {/* Expiration Picker */}
        {scannedProduct && (
          <ExpirationPicker
            isOpen={showExpirationPicker}
            category={scannedProduct.category}
            productName={scannedProduct.product.product_name || 'Product'}
            onClose={() => {
              setShowExpirationPicker(false)
              setScannedProduct(null)
            }}
            onSelectDate={handleExpirationSelected}
            onSkip={handleSkipExpiration}
          />
        )}

        {/* Impulse Purchase Confirmation Modal */}
        {showImpulseConfirm && scannedProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🛒</div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Not on Your List
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  <span className="font-semibold">{scannedProduct.product.product_name}</span> isn't on your shopping list.
                </p>
                <p className="text-gray-700 dark:text-gray-300">
                  Buy it anyway and add to your inventory?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleImpulsePurchaseCancel}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleImpulsePurchaseConfirm}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark transition-colors"
                >
                  Yes, Buy It
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sequential Shopping Flow - All-in-One Guided Purchase */}
        {selectedItem && (
          <SequentialShoppingFlow
            isOpen={showSequentialFlow}
            item={selectedItem}
            onComplete={handleSequentialFlowComplete}
            onCancel={() => {
              setShowSequentialFlow(false)
              setSelectedItem(null)
            }}
          />
        )}
      </div>
    </AuthGuard>
  )
}

/**
 * Shopping Item Card Component
 */
function ShoppingItemCard({
  item,
  onToggle,
  onDelete,
  onClick,
  showDebugInfo,
  onFixOrphaned
}: {
  item: ShoppingItem
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onClick?: (item: ShoppingItem) => void
  showDebugInfo?: boolean
  onFixOrphaned?: (itemId: string, itemName: string) => void
}) {
  const categoryMeta = getCategoryMetadata(item.category)
  const isOrphaned = !item.inStock && !item.needed && item.quantity === 0

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-lg shadow p-4 flex items-center gap-4 ${isOrphaned ? 'border-2 border-red-200 dark:border-red-800' : ''} ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors' : ''}`}
      onClick={() => onClick?.(item)}
    >
      {/* Product Image */}
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.productName}
          className="w-16 h-16 object-cover rounded-lg"
        />
      ) : (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-3xl">
          {categoryMeta.icon}
        </div>
      )}

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
          {item.productName}
        </h3>
        {item.brand && (
          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
            {item.brand}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded">
            {categoryMeta.displayName}
          </span>
          {(item.quantity > 0 || item.unit) && (
            <span className="text-xs px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded">
              {item.displayQuantity || formatQuantityDisplay(item.quantity, item.unit)}
            </span>
          )}
          {item.lastPurchased && (
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Last: {new Date(item.lastPurchased).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>

        {/* Recipe Links - Show which recipes use this ingredient */}
        {item.recipeIds && item.recipeIds.length > 0 && (
          <div className="mt-2">
            <RecipeLinks
              recipeIds={item.recipeIds}
              primaryRecipeId={item.primaryRecipeId}
              onRecipeClick={(recipeId, recipeName) => {
                toast(`Recipe: ${recipeName}`, { icon: '🍳' })
                // TODO: Open recipe modal with this recipe
              }}
            />
          </div>
        )}

        {/* Debug Info */}
        {showDebugInfo && (
          <div className="mt-2 text-xs font-mono text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex gap-3">
              <span className={item.inStock ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                InStock: {item.inStock ? '✓' : '✗'}
              </span>
              <span className={item.needed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                Needed: {item.needed ? '✓' : '✗'}
              </span>
              <span>Priority: {item.priority}</span>
              <span>Qty: {item.displayQuantity || formatQuantityDisplay(item.quantity, item.unit)}</span>
            </div>
            {isOrphaned && (
              <div className="text-red-600 dark:text-red-400 font-semibold">
                ⚠️ ORPHANED - Not in inventory, not on list
              </div>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onToggle(item.id, item.needed)
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Remove from list"
        >
          <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          title="Delete item"
        >
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        {/* Fix button for orphaned items */}
        {isOrphaned && onFixOrphaned && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onFixOrphaned(item.id, item.productName)
            }}
            className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            title="Add to shopping list"
          >
            🔧 Fix
          </button>
        )}
      </div>
    </div>
  )
}

export default function ShoppingPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <ShoppingListContent />
    </Suspense>
  )
}
