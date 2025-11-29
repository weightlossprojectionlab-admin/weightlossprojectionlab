'use client'

import { useState, useEffect } from 'react'
import { useOnlineStatus } from './useOnlineStatus'
import {
  cacheShoppingList,
  getCachedShoppingList,
  cacheProduct,
  getCachedProduct,
  queuePurchase,
  getUnsyncedPurchases,
  markPurchaseSynced,
  clearSyncedPurchases
} from '@/lib/offline-shopping-cache'
import type { ShoppingItem } from '@/types/shopping'
import toast from 'react-hot-toast'
import { logger } from '@/lib/logger'

/**
 * Hook for offline shopping functionality
 *
 * Handles:
 * - Shopping list caching
 * - Offline barcode scanning
 * - Purchase queue syncing
 */
export function useOfflineShopping(userId: string) {
  const { isOnline } = useOnlineStatus()
  const [cachedItems, setCachedItems] = useState<ShoppingItem[]>([])
  const [isLoadingCache, setIsLoadingCache] = useState(false)

  // Load cached shopping list
  useEffect(() => {
    if (!userId) return

    const loadCached = async () => {
      try {
        const items = await getCachedShoppingList(userId)
        setCachedItems(items)
        logger.debug('[OfflineShopping] Loaded cached shopping list', { count: items.length })
      } catch (error) {
        logger.error('[OfflineShopping] Failed to load cached list', error as Error)
      }
    }

    loadCached()
  }, [userId])

  /**
   * Cache shopping list for offline use
   */
  const cacheList = async (items: ShoppingItem[]) => {
    if (!userId) return

    setIsLoadingCache(true)
    try {
      await cacheShoppingList(userId, items)
      setCachedItems(items)

      // Also cache product lookups for items with barcodes
      const itemsWithBarcodes = items.filter(item => item.barcode)
      for (const item of itemsWithBarcodes) {
        await cacheProduct(item.barcode!, {
          productName: item.productName,
          brand: item.brand,
          imageUrl: item.imageUrl,
          category: item.category
        })
      }

      logger.info('[OfflineShopping] Cached shopping list', {
        totalItems: items.length,
        withBarcodes: itemsWithBarcodes.length
      })

      toast.success(`Shopping list cached for offline use (${items.length} items)`)
    } catch (error) {
      logger.error('[OfflineShopping] Failed to cache shopping list', error as Error)
      toast.error('Failed to cache shopping list')
    } finally {
      setIsLoadingCache(false)
    }
  }

  /**
   * Handle barcode scan (works offline)
   */
  const handleBarcodeScan = async (barcode: string): Promise<{
    success: boolean
    product?: any
    matchedItem?: ShoppingItem
    isOffline: boolean
  }> => {
    logger.debug('[OfflineShopping] Barcode scanned', { barcode, isOnline })

    // Try online lookup first if connected
    if (isOnline) {
      try {
        const response = await fetch(`/api/products/lookup?barcode=${barcode}`)
        if (response.ok) {
          const product = await response.json()

          // Cache for offline use
          await cacheProduct(barcode, product)

          // Find matching shopping item
          const matchedItem = cachedItems.find(item => item.barcode === barcode)

          if (matchedItem) {
            // Queue purchase (will sync immediately since online)
            await queuePurchase(matchedItem.id, product.productName, userId, barcode)
            toast.success(`✓ ${product.productName} added to cart`)
          }

          return { success: true, product, matchedItem, isOffline: false }
        }
      } catch (error) {
        logger.debug('[OfflineShopping] Online lookup failed, falling back to cache', {
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        // Fall through to offline mode
      }
    }

    // Offline or online lookup failed - use cache
    const cachedProduct = await getCachedProduct(barcode)

    if (cachedProduct) {
      // Find matching shopping item
      const matchedItem = cachedItems.find(item =>
        item.barcode === barcode ||
        item.productName.toLowerCase() === cachedProduct.productName.toLowerCase()
      )

      if (matchedItem) {
        // Queue purchase for later sync
        await queuePurchase(matchedItem.id, cachedProduct.productName, userId, barcode)
        toast.success(`✓ ${cachedProduct.productName} - will sync when online`, {
          icon: '📡',
          duration: 3000
        })

        return { success: true, product: cachedProduct, matchedItem, isOffline: true }
      }

      // Product found but not on shopping list
      toast.warn(`${cachedProduct.productName} is not on your shopping list`)
      return { success: false, product: cachedProduct, isOffline: true }
    }

    // Product not cached
    if (isOnline) {
      toast.error('Product not found')
    } else {
      toast.warn(`Product ${barcode} not cached. Will look up when online.`, {
        duration: 5000
      })
    }

    return { success: false, isOffline: !isOnline }
  }

  /**
   * Sync queued purchases
   */
  const syncQueuedPurchases = async () => {
    if (!isOnline) {
      logger.debug('[OfflineShopping] Cannot sync - offline')
      return { syncedCount: 0, failedCount: 0 }
    }

    try {
      const unsynced = await getUnsyncedPurchases()

      if (unsynced.length === 0) {
        return { syncedCount: 0, failedCount: 0 }
      }

      logger.info('[OfflineShopping] Syncing queued purchases', { count: unsynced.length })

      let syncedCount = 0
      let failedCount = 0

      for (const purchase of unsynced) {
        try {
          // Call purchase confirmation API
          const response = await fetch('/api/shopping/confirm-purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              itemIds: [purchase.itemId],
              barcode: purchase.barcode
            })
          })

          if (response.ok) {
            await markPurchaseSynced(purchase.id)
            syncedCount++
            logger.debug('[OfflineShopping] Purchase synced', { purchaseId: purchase.id })
          } else {
            failedCount++
            logger.warn('[OfflineShopping] Purchase sync failed', { purchaseId: purchase.id })
          }
        } catch (error) {
          failedCount++
          logger.error('[OfflineShopping] Purchase sync error', error as Error, { purchaseId: purchase.id })
        }
      }

      // Clean up synced purchases
      await clearSyncedPurchases()

      if (syncedCount > 0) {
        toast.success(`Synced ${syncedCount} purchase${syncedCount > 1 ? 's' : ''}`)
      }
      if (failedCount > 0) {
        toast.error(`Failed to sync ${failedCount} purchase${failedCount > 1 ? 's' : ''}`)
      }

      return { syncedCount, failedCount }
    } catch (error) {
      logger.error('[OfflineShopping] Failed to sync purchases', error as Error)
      return { syncedCount: 0, failedCount: 0 }
    }
  }

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueuedPurchases()
    }
  }, [isOnline])

  return {
    cachedItems,
    isLoadingCache,
    cacheList,
    handleBarcodeScan,
    syncQueuedPurchases
  }
}
