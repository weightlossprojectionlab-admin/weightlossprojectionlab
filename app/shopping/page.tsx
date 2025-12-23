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

import { useState, Suspense, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import toast from 'react-hot-toast'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { useShopping } from '@/hooks/useShopping'
import { useMemberShoppingList } from '@/hooks/useMemberShoppingList'
import { simplifyProduct } from '@/lib/openfoodfacts-api'
import { lookupBarcodeWithCache } from '@/lib/cached-product-lookup'
import { getCategoryMetadata, detectCategory, formatQuantityDisplay } from '@/lib/product-categories'
import { ExpirationPicker } from '@/components/shopping/ExpirationPicker'
import { SwipeableShoppingItem } from '@/components/shopping/SwipeableShoppingItem'
import { ShareListButton } from '@/components/shopping/ShareListButton'
import { SearchFilter } from '@/components/shopping/SearchFilter'
import { StorePicker } from '@/components/shopping/StorePicker'
import { SmartSuggestions } from '@/components/shopping/SmartSuggestions'
import { HealthSuggestions } from '@/components/shopping/HealthSuggestions'
import { SequentialShoppingFlow } from '@/components/shopping/SequentialShoppingFlow'
import { RecipeLinks } from '@/components/shopping/RecipeLinks'
import { PurchaseConfirmation } from '@/components/shopping/PurchaseConfirmation'
import { FamilyMemberBadge } from '@/components/shopping/FamilyMemberBadge'
import type { ProductCategory, ShoppingItem } from '@/types/shopping'
import type { PatientProfile } from '@/types/medical'
import type { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'
import { Spinner } from '@/components/ui/Spinner'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import { addManualShoppingItem, clearAllShoppingItems } from '@/lib/shopping-operations'
import { patientOperations } from '@/lib/medical-operations'
import ConfirmModal from '@/components/ui/ConfirmModal'

// Dynamic imports
const BarcodeScanner = dynamic(
  () => import('@/components/BarcodeScanner').then(mod => ({ default: mod.BarcodeScanner })),
  { ssr: false }
)

function ShoppingListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const memberId = searchParams.get('memberId') // Patient/member ID from URL
  const dutyId = searchParams.get('dutyId') // Household duty ID from URL
  const userId = auth.currentUser?.uid || ''

  // Use member-specific hook when viewing from patient page
  const memberShoppingData = useMemberShoppingList({
    householdId: userId, // Current user is the household
    memberId: memberId || userId,
    autoFetch: !!memberId // Only fetch if memberId is present
  })

  // Use household hook for general shopping view
  const householdShoppingData = useShopping()

  // Choose which data source based on memberId presence
  const shoppingData = memberId ? {
    neededItems: memberShoppingData.memberItems.filter(item => item.needed).map(item => ({
      id: item.id,
      userId,
      productName: item.productName,
      brand: item.brand,
      imageUrl: item.imageUrl,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      displayQuantity: item.displayQuantity,
      priority: item.priority,
      needed: item.needed,
      inStock: memberShoppingData.isInHouseholdStock(item.productKey),
      location: 'pantry' as const,
      isPerishable: false,
      purchaseHistory: [],
      createdAt: item.addedAt,
      updatedAt: item.updatedAt,
      isManual: !item.barcode,
      barcode: item.barcode,
      productKey: item.productKey,
      recipeIds: item.recipeIds,
      reason: item.reason
    } as any)),
    items: memberShoppingData.memberItems.map(item => ({
      id: item.id,
      userId,
      productName: item.productName,
      brand: item.brand,
      imageUrl: item.imageUrl,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      displayQuantity: item.displayQuantity,
      priority: item.priority,
      needed: item.needed,
      inStock: memberShoppingData.isInHouseholdStock(item.productKey),
      location: 'pantry' as const,
      isPerishable: false,
      purchaseHistory: [],
      createdAt: item.addedAt,
      updatedAt: item.updatedAt,
      isManual: !item.barcode,
      barcode: item.barcode,
      productKey: item.productKey,
      recipeIds: item.recipeIds
    } as any)),
    stores: [],
    loading: memberShoppingData.loading,
    purchaseItem: async (itemId: string, options: any) => {
      const memberItem = memberShoppingData.memberItems.find(i => i.id === itemId)
      if (memberItem) {
        const householdItem = memberShoppingData.findInHouseholdInventory(memberItem.productKey)
        if (householdItem) {
          await memberShoppingData.purchaseItem(itemId, householdItem.id, options)
        }
      }
    },
    toggleNeeded: async (itemId: string) => {
      await memberShoppingData.updateItem(itemId, { needed: true })
    },
    removeItem: async (itemId: string) => {
      const memberItem = memberShoppingData.memberItems.find(i => i.id === itemId)
      if (memberItem) {
        await memberShoppingData.removeItem(itemId, memberItem.productKey)
      }
    },
    addItem: householdShoppingData.addItem, // Fall back to household for adding
    updateItem: async (itemId: string, updates: any) => {
      await memberShoppingData.updateItem(itemId, updates)
    },
    getSummary: () => ({
      neededItems: memberShoppingData.summary?.neededItems || 0,
      highPriorityItems: memberShoppingData.summary?.highPriorityItems || 0,
      totalItems: memberShoppingData.summary?.totalItems || 0
    }),
    smartSort: householdShoppingData.smartSort,
    addStore: householdShoppingData.addStore,
    refresh: memberShoppingData.refresh
  } : householdShoppingData

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
    addStore,
    refresh
  } = shoppingData

  const [showScanner, setShowScanner] = useState(false)
  const [showExpirationPicker, setShowExpirationPicker] = useState(false)
  const [showDebugMode, setShowDebugMode] = useState(false)
  const [showImpulseConfirm, setShowImpulseConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null)
  const [scannedProduct, setScannedProduct] = useState<{
    product: OpenFoodFactsProduct
    itemId?: string
    category: ProductCategory
  } | null>(null)

  // Sequential shopping flow state
  const [selectedItem, setSelectedItem] = useState<ShoppingItem | null>(null)
  const [showSequentialFlow, setShowSequentialFlow] = useState(false)

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<ProductCategory | 'all'>('all')
  const [members, setMembers] = useState<Record<string, PatientProfile>>({})

  const summary = getSummary()

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

  // Get display items based on debug mode
  const displayItems = showDebugMode ? allItems : neededItems

  // Filter items based on search query and category
  const filteredItems = useMemo(() => {
    let filtered = displayItems

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(item =>
        item.productName.toLowerCase().includes(query) ||
        item.brand?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      )
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.category === filterCategory)
    }

    return filtered
  }, [displayItems, searchQuery, filterCategory])

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
   * Check for duplicate items in the shopping list
   */
  const checkForDuplicates = (productName: string, barcode?: string) => {
    // Check by barcode first (most accurate)
    if (barcode) {
      const barcodeMatch = allItems.find(item => item.barcode === barcode)
      if (barcodeMatch) {
        return {
          found: true,
          item: barcodeMatch,
          matchType: 'exact' as const
        }
      }
    }

    // Check by product name (fuzzy match)
    const nameLower = productName.toLowerCase()
    const nameMatch = allItems.find(item => {
      const itemNameLower = item.productName.toLowerCase()
      return itemNameLower === nameLower ||
             itemNameLower.includes(nameLower) ||
             nameLower.includes(itemNameLower)
    })

    if (nameMatch) {
      return {
        found: true,
        item: nameMatch,
        matchType: 'name' as const
      }
    }

    return { found: false, item: null, matchType: null }
  }

  /**
   * Handle barcode scan - mark as purchased
   */
  const handleBarcodeScan = async (barcode: string) => {
    try {
      setShowScanner(false)
      toast.loading('Looking up product...', { id: 'barcode-lookup' })

      const response = await lookupBarcodeWithCache(barcode)
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
        // Check for duplicates before adding as impulse purchase
        const duplicate = checkForDuplicates(product.name, barcode)

        if (duplicate.found && duplicate.item) {
          // Found duplicate - offer to mark as needed instead of adding new
          if (!duplicate.item.needed) {
            toast((t) => (
              <div className="flex flex-col gap-2">
                <span className="font-semibold">"{duplicate.item.productName}" already in list</span>
                <span className="text-sm">Would you like to mark it as needed?</span>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={async () => {
                      await handleToggleNeeded(duplicate.item.id, false)
                      toast.dismiss(t.id)
                      toast.success('Marked as needed!')
                    }}
                    className="px-3 py-1 bg-primary text-white rounded text-sm"
                  >
                    Mark as Needed
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ), { duration: 6000, id: 'duplicate-check' })
          } else {
            toast.error(`"${duplicate.item.productName}" is already on your shopping list`, { duration: 4000 })
          }
          return
        }

        // Item NOT on list and no duplicates - show impulse purchase confirmation
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
   * Delete item - show confirmation modal
   */
  const handleDeleteItem = (itemId: string, itemName: string) => {
    setItemToDelete({ id: itemId, name: itemName })
    setShowDeleteConfirm(true)
  }

  /**
   * Confirm delete item
   */
  const confirmDeleteItem = async () => {
    if (!itemToDelete) return

    try {
      await removeItem(itemToDelete.id)
      toast.success('Item removed')
      setItemToDelete(null)
    } catch (error) {
      toast.error('Failed to remove item')
    }
  }

  /**
   * Handle delete all items
   */
  const handleDeleteAll = async () => {
    try {
      const loadingToast = toast.loading('Deleting all items...')
      const result = await clearAllShoppingItems(userId)

      toast.dismiss(loadingToast)

      if (result.errors.length > 0) {
        toast.error(`Deleted ${result.deleted} items, but ${result.errors.length} failed`)
      } else {
        toast.success(`Successfully deleted ${result.deleted} item${result.deleted !== 1 ? 's' : ''}`)
      }

      setShowDeleteAllConfirm(false)
      refresh() // Refresh the list
    } catch (error) {
      toast.error('Failed to delete items')
      logger.error('Delete all shopping items failed', error as Error)
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
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Shopping List"
          subtitle={`${summary.neededItems} item${summary.neededItems !== 1 ? 's' : ''} to buy`}
          backHref={memberId ? `/patients/${memberId}` : undefined}
        />

        <main className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Member Context Banner */}
          {memberId && (
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                    Viewing shopping list for this family member
                  </h3>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Items shown are specific to this person's needs. The household shares one inventory.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-primary">{summary.neededItems}</div>
              <div className="text-sm text-muted-foreground">Items Needed</div>
            </div>
            <div className="bg-card rounded-lg shadow p-4">
              <div className="text-2xl font-bold text-warning">{summary.highPriorityItems}</div>
              <div className="text-sm text-muted-foreground">High Priority</div>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="mb-6">
            <SearchFilter
              onSearch={setSearchQuery}
              onFilterCategory={setFilterCategory}
              selectedCategory={filterCategory}
            />
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
              className="px-4 py-3 border-2 border-border rounded-lg font-semibold hover:bg-background transition-colors"
            >
              📦 Inventory
            </button>
          </div>

          {/* Purchase Confirmation Section */}
          <PurchaseConfirmation
            pendingItems={neededItems.filter(item => !item.inStock)}
            onConfirm={refresh}
            memberId={memberId || undefined}
            dutyId={dutyId || undefined}
          />

          {/* Health-Based Suggestions (Member-Specific) */}
          {memberId && (
            <div className="mb-6">
              <HealthSuggestions
                patientId={memberId}
                userId={userId}
                onAddItem={async (productName: string) => {
                  await addManualShoppingItem(userId, productName, { householdId: userId })
                  await refresh()
                }}
              />
            </div>
          )}

          {/* Debug Mode Toggle & Orphaned Items Warning */}
          {orphanedItems.length > 0 && (
            <div className="mb-6 bg-warning-light border border-warning-light rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-warning">⚠️</span>
                    <h3 className="font-semibold text-warning-dark">
                      {orphanedItems.length} Orphaned Item{orphanedItems.length !== 1 ? 's' : ''} Found
                    </h3>
                  </div>
                  <p className="text-sm text-warning-dark">
                    These items were marked as "Used Up" but aren't on your shopping list due to a previous error.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugMode(!showDebugMode)}
                  className="px-4 py-2 bg-warning hover:bg-warning-dark text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
                >
                  {showDebugMode ? '✓ Debug On' : '🔧 Fix Them'}
                </button>
              </div>
            </div>
          )}

          {/* Debug Mode Info */}
          {showDebugMode && (
            <div className="mb-6 bg-secondary-light border border-secondary-light rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-secondary-dark mb-1">
                    🔧 Debug Mode Active
                  </h3>
                  <p className="text-sm text-secondary-dark">
                    Showing all {allItems.length} items (including orphaned). Click "Fix" on any orphaned item to add it to your shopping list.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDebugMode(false)}
                  className="px-4 py-2 bg-secondary hover:bg-secondary-hover text-white rounded-lg text-sm font-medium whitespace-nowrap transition-colors"
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
            <div className="bg-card rounded-lg shadow p-8 text-center">
              <div className="text-6xl mb-4">✓</div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                All Set!
              </h3>
              <p className="text-muted-foreground">
                Your shopping list is empty. Scan items you run out of to add them here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Orphaned Items (Debug Mode Only) */}
              {showDebugMode && orphanedItems.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-error mb-3 flex items-center gap-2">
                    <span>🔧</span>
                    ORPHANED ITEMS (Need Fixing)
                  </h3>
                  <div className="space-y-3">
                    {orphanedItems.map(item => (
                      <ShoppingItemCard
                        key={item.id}
                        item={item}
                        onToggle={handleToggleNeeded}
                        onDelete={(id) => handleDeleteItem(id, item.productName)}
                        onClick={handleItemClick}
                        showDebugInfo={true}
                        onFixOrphaned={handleFixOrphanedItem}
                        searchQuery={searchQuery}
                        getMemberName={getMemberName}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results Info */}
              {(searchQuery || filterCategory !== 'all') && (
                <div className="mb-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-2">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Showing {filteredItems.length} of {displayItems.length} items
                  </span>
                  {(searchQuery || filterCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('')
                        setFilterCategory('all')
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              )}

              {/* High Priority Items */}
              {filteredItems.filter(item => item.priority === 'high' && item.needed).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-warning dark:text-orange-400 flex items-center gap-2">
                      <span>⚠️</span>
                      HIGH PRIORITY
                    </h3>
                    {allItems.length > 0 && (
                      <button
                        onClick={() => setShowDeleteAllConfirm(true)}
                        className="px-3 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        Clear List
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {filteredItems
                      .filter(item => item.priority === 'high' && item.needed)
                      .map(item => (
                        <ShoppingItemCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggleNeeded}
                          onDelete={(id) => handleDeleteItem(id, item.productName)}
                          onClick={handleItemClick}
                          showDebugInfo={showDebugMode}
                          searchQuery={searchQuery}
                          getMemberName={getMemberName}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Regular Items */}
              {filteredItems.filter(item => item.priority !== 'high' && item.needed).length > 0 && (
                <div>
                  {filteredItems.filter(item => item.priority === 'high' && item.needed).length > 0 && (
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      OTHER ITEMS
                    </h3>
                  )}
                  <div className="space-y-3">
                    {filteredItems
                      .filter(item => item.priority !== 'high' && item.needed)
                      .map(item => (
                        <ShoppingItemCard
                          key={item.id}
                          item={item}
                          onToggle={handleToggleNeeded}
                          onDelete={(id) => handleDeleteItem(id, item.productName)}
                          onClick={handleItemClick}
                          showDebugInfo={showDebugMode}
                          searchQuery={searchQuery}
                          getMemberName={getMemberName}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {filteredItems.length === 0 && displayItems.length > 0 && (
                <div className="bg-card rounded-lg shadow p-8 text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    No Items Found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    No items match your search or filter criteria.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setFilterCategory('all')
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                  >
                    Clear Filters
                  </button>
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
            <div className="bg-card rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="text-center mb-6">
                <div className="text-5xl mb-4">🛒</div>
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Not on Your List
                </h2>
                <p className="text-muted-foreground mb-4">
                  <span className="font-semibold">{scannedProduct.product.product_name}</span> isn't on your shopping list.
                </p>
                <p className="text-foreground">
                  Buy it anyway and add to your inventory?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleImpulsePurchaseCancel}
                  className="flex-1 px-4 py-3 border-2 border-border text-foreground rounded-lg font-semibold hover:bg-background transition-colors"
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

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            setShowDeleteConfirm(false)
            setItemToDelete(null)
          }}
          onConfirm={confirmDeleteItem}
          title="Remove Item"
          message={`Remove "${itemToDelete?.name}" from your shopping list?`}
          confirmText="Remove"
          cancelText="Cancel"
          variant="danger"
        />

        {/* Clear List Confirmation Modal */}
        <ConfirmModal
          isOpen={showDeleteAllConfirm}
          onClose={() => setShowDeleteAllConfirm(false)}
          onConfirm={handleDeleteAll}
          title="Clear Shopping List?"
          message={`Are you sure you want to clear all ${allItems.length} item${allItems.length !== 1 ? 's' : ''} from your shopping list? This action cannot be undone.`}
          confirmText="Clear List"
          cancelText="Cancel"
          variant="danger"
        />
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
  onFixOrphaned,
  searchQuery,
  getMemberName
}: {
  item: ShoppingItem
  onToggle: (id: string, current: boolean) => void
  onDelete: (id: string) => void
  onClick?: (item: ShoppingItem) => void
  showDebugInfo?: boolean
  onFixOrphaned?: (itemId: string, itemName: string) => void
  searchQuery?: string
  getMemberName?: (userId?: string) => string
}) {
  const categoryMeta = getCategoryMetadata(item.category)
  const isOrphaned = !item.inStock && !item.needed && item.quantity === 0

  // Highlight matching text in search results
  const highlightText = (text: string) => {
    if (!searchQuery || !searchQuery.trim()) return text

    const query = searchQuery.toLowerCase()
    const lowerText = text.toLowerCase()
    const index = lowerText.indexOf(query)

    if (index === -1) return text

    return (
      <>
        {text.slice(0, index)}
        <mark className="bg-yellow-200 dark:bg-yellow-600/50 font-semibold">
          {text.slice(index, index + query.length)}
        </mark>
        {text.slice(index + query.length)}
      </>
    )
  }

  return (
    <div
      className={`bg-card rounded-lg shadow p-4 flex items-center gap-4 ${isOrphaned ? 'border-2 border-red-200 dark:border-red-800' : ''} ${onClick ? 'cursor-pointer hover:bg-background transition-colors' : ''}`}
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
        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center text-3xl">
          {categoryMeta.icon}
        </div>
      )}

      {/* Product Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground truncate">
          {highlightText(item.productName)}
        </h3>
        {item.brand && (
          <p className="text-sm text-muted-foreground truncate">
            {highlightText(item.brand)}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-xs px-2 py-1 bg-muted rounded">
            {categoryMeta.displayName}
          </span>
          {(item.quantity > 0 || item.unit) && (
            <span className="text-xs px-2 py-1 bg-secondary-light text-blue-700 dark:text-blue-300 rounded">
              {item.displayQuantity || formatQuantityDisplay(item.quantity, item.unit)}
            </span>
          )}
          {item.lastPurchased && (
            <span className="text-xs text-muted-foreground dark:text-muted-foreground">
              Last: {new Date(item.lastPurchased).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
          {/* Family member badge - Shows who requested or added this item */}
          <FamilyMemberBadge
            requestedBy={item.requestedBy}
            addedBy={item.addedBy}
            getMemberName={getMemberName}
          />
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
          <div className="mt-2 text-xs font-mono text-muted-foreground space-y-1">
            <div className="flex gap-3">
              <span className={item.inStock ? 'text-success dark:text-green-400' : 'text-error'}>
                InStock: {item.inStock ? '✓' : '✗'}
              </span>
              <span className={item.needed ? 'text-success dark:text-green-400' : 'text-error'}>
                Needed: {item.needed ? '✓' : '✗'}
              </span>
              <span>Priority: {item.priority}</span>
              <span>Qty: {item.displayQuantity || formatQuantityDisplay(item.quantity, item.unit)}</span>
            </div>
            {isOrphaned && (
              <div className="text-error font-semibold">
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
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Remove from list"
        >
          <svg className="w-5 h-5 text-success dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(item.id)
          }}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          title="Delete item"
        >
          <svg className="w-5 h-5 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            className="px-3 py-1 text-xs bg-error hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
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
