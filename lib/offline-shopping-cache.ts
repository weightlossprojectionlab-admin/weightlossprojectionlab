/**
 * Offline Shopping Cache
 *
 * Enables in-store shopping without internet:
 * - Shopping list caching
 * - Barcode → product lookup caching
 * - Queue purchase actions for later sync
 *
 * Critical for users who lose signal in grocery stores
 */

import { logger } from '@/lib/logger'
import type { ShoppingItem } from '@/types/shopping'

const DB_NAME = 'wlpl-shopping-offline'
const DB_VERSION = 1

const SHOPPING_LIST_STORE = 'shopping-list'
const PRODUCT_CACHE_STORE = 'product-cache'
const PURCHASE_QUEUE_STORE = 'purchase-queue'

interface CachedShoppingList {
  userId: string
  items: ShoppingItem[]
  cachedAt: number
  expiresAt: number
}

interface CachedProduct {
  barcode: string
  productName: string
  brand?: string
  imageUrl?: string
  category?: string
  nutrition?: any
  cachedAt: number
}

interface QueuedPurchase {
  id: string
  itemId: string
  barcode?: string
  productName: string
  userId: string
  queuedAt: number
  synced: boolean
  syncAttempts: number
}

/**
 * Initialize IndexedDB for shopping data
 */
function openShoppingDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open shopping offline database'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Shopping list cache
      if (!db.objectStoreNames.contains(SHOPPING_LIST_STORE)) {
        const listStore = db.createObjectStore(SHOPPING_LIST_STORE, { keyPath: 'userId' })
        listStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Product lookup cache (barcode → product info)
      if (!db.objectStoreNames.contains(PRODUCT_CACHE_STORE)) {
        const productStore = db.createObjectStore(PRODUCT_CACHE_STORE, { keyPath: 'barcode' })
        productStore.createIndex('cachedAt', 'cachedAt', { unique: false })
      }

      // Purchase queue (offline purchases to sync later)
      if (!db.objectStoreNames.contains(PURCHASE_QUEUE_STORE)) {
        const queueStore = db.createObjectStore(PURCHASE_QUEUE_STORE, { keyPath: 'id' })
        queueStore.createIndex('synced', 'synced', { unique: false })
        queueStore.createIndex('queuedAt', 'queuedAt', { unique: false })
      }
    }
  })
}

// ==================== SHOPPING LIST ====================

/**
 * Cache shopping list for offline access
 */
export async function cacheShoppingList(
  userId: string,
  items: ShoppingItem[]
): Promise<void> {
  const db = await openShoppingDB()
  const transaction = db.transaction([SHOPPING_LIST_STORE], 'readwrite')
  const store = transaction.objectStore(SHOPPING_LIST_STORE)

  const cachedList: CachedShoppingList = {
    userId,
    items,
    cachedAt: Date.now(),
    expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  }

  return new Promise((resolve, reject) => {
    const request = store.put(cachedList)

    request.onsuccess = () => {
      logger.info('[OfflineShopping] Cached shopping list', {
        userId,
        itemCount: items.length
      })
      resolve()
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to cache shopping list', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Get cached shopping list
 */
export async function getCachedShoppingList(userId: string): Promise<ShoppingItem[]> {
  const db = await openShoppingDB()
  const transaction = db.transaction([SHOPPING_LIST_STORE], 'readonly')
  const store = transaction.objectStore(SHOPPING_LIST_STORE)

  return new Promise((resolve, reject) => {
    const request = store.get(userId)

    request.onsuccess = () => {
      const cached = request.result as CachedShoppingList | undefined

      if (!cached) {
        logger.debug('[OfflineShopping] No cached shopping list found')
        resolve([])
        return
      }

      // Check if expired
      if (Date.now() > cached.expiresAt) {
        logger.debug('[OfflineShopping] Cached shopping list expired')
        resolve([])
        return
      }

      logger.debug('[OfflineShopping] Retrieved cached shopping list', {
        itemCount: cached.items.length,
        ageMinutes: Math.floor((Date.now() - cached.cachedAt) / 60000)
      })
      resolve(cached.items)
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to get cached shopping list', request.error as Error)
      reject(request.error)
    }
  })
}

// ==================== PRODUCT CACHE ====================

/**
 * Cache product lookup result (for offline barcode scanning)
 */
export async function cacheProduct(
  barcode: string,
  product: Partial<CachedProduct>
): Promise<void> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PRODUCT_CACHE_STORE], 'readwrite')
  const store = transaction.objectStore(PRODUCT_CACHE_STORE)

  const cachedProduct: CachedProduct = {
    barcode,
    productName: product.productName || 'Unknown Product',
    brand: product.brand,
    imageUrl: product.imageUrl,
    category: product.category,
    nutrition: product.nutrition,
    cachedAt: Date.now()
  }

  return new Promise((resolve, reject) => {
    const request = store.put(cachedProduct)

    request.onsuccess = () => {
      logger.debug('[OfflineShopping] Cached product', { barcode, productName: cachedProduct.productName })
      resolve()
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to cache product', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Get cached product by barcode
 */
export async function getCachedProduct(barcode: string): Promise<CachedProduct | null> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PRODUCT_CACHE_STORE], 'readonly')
  const store = transaction.objectStore(PRODUCT_CACHE_STORE)

  return new Promise((resolve, reject) => {
    const request = store.get(barcode)

    request.onsuccess = () => {
      const product = request.result as CachedProduct | undefined

      if (product) {
        logger.debug('[OfflineShopping] Cache hit for barcode', { barcode, productName: product.productName })
        resolve(product)
      } else {
        logger.debug('[OfflineShopping] Cache miss for barcode', { barcode })
        resolve(null)
      }
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to get cached product', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Prune old product cache entries (keep last 100)
 */
export async function pruneProductCache(maxEntries: number = 100): Promise<number> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PRODUCT_CACHE_STORE], 'readwrite')
  const store = transaction.objectStore(PRODUCT_CACHE_STORE)
  const index = store.index('cachedAt')

  return new Promise((resolve, reject) => {
    const countRequest = store.count()

    countRequest.onsuccess = () => {
      const totalCount = countRequest.result

      if (totalCount <= maxEntries) {
        resolve(0)
        return
      }

      const toDelete = totalCount - maxEntries
      let deleted = 0

      // Get oldest entries
      const cursorRequest = index.openCursor()

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result

        if (cursor && deleted < toDelete) {
          cursor.delete()
          deleted++
          cursor.continue()
        } else {
          logger.info('[OfflineShopping] Pruned product cache', { deleted })
          resolve(deleted)
        }
      }

      cursorRequest.onerror = () => reject(cursorRequest.error)
    }

    countRequest.onerror = () => reject(countRequest.error)
  })
}

// ==================== PURCHASE QUEUE ====================

/**
 * Queue a purchase action (mark item as purchased offline)
 */
export async function queuePurchase(
  itemId: string,
  productName: string,
  userId: string,
  barcode?: string
): Promise<string> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PURCHASE_QUEUE_STORE], 'readwrite')
  const store = transaction.objectStore(PURCHASE_QUEUE_STORE)

  const queuedPurchase: QueuedPurchase = {
    id: crypto.randomUUID(),
    itemId,
    barcode,
    productName,
    userId,
    queuedAt: Date.now(),
    synced: false,
    syncAttempts: 0
  }

  return new Promise((resolve, reject) => {
    const request = store.add(queuedPurchase)

    request.onsuccess = () => {
      logger.info('[OfflineShopping] Queued purchase', {
        itemId,
        productName,
        queueId: queuedPurchase.id
      })
      resolve(queuedPurchase.id)
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to queue purchase', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Get all unsynced purchases
 */
export async function getUnsyncedPurchases(): Promise<QueuedPurchase[]> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PURCHASE_QUEUE_STORE], 'readonly')
  const store = transaction.objectStore(PURCHASE_QUEUE_STORE)

  return new Promise((resolve, reject) => {
    const request = store.getAll()

    request.onsuccess = () => {
      const allPurchases = request.result as QueuedPurchase[]
      const unsynced = allPurchases.filter(p => !p.synced)

      logger.debug('[OfflineShopping] Retrieved unsynced purchases', { count: unsynced.length })
      resolve(unsynced)
    }

    request.onerror = () => {
      logger.error('[OfflineShopping] Failed to get unsynced purchases', request.error as Error)
      reject(request.error)
    }
  })
}

/**
 * Mark purchase as synced
 */
export async function markPurchaseSynced(purchaseId: string): Promise<void> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PURCHASE_QUEUE_STORE], 'readwrite')
  const store = transaction.objectStore(PURCHASE_QUEUE_STORE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(purchaseId)

    getRequest.onsuccess = () => {
      const purchase = getRequest.result as QueuedPurchase | undefined

      if (purchase) {
        purchase.synced = true
        const updateRequest = store.put(purchase)

        updateRequest.onsuccess = () => {
          logger.debug('[OfflineShopping] Marked purchase as synced', { purchaseId })
          resolve()
        }

        updateRequest.onerror = () => reject(updateRequest.error)
      } else {
        reject(new Error(`Purchase not found: ${purchaseId}`))
      }
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Increment sync attempt count
 */
export async function incrementPurchaseSyncAttempt(purchaseId: string): Promise<void> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PURCHASE_QUEUE_STORE], 'readwrite')
  const store = transaction.objectStore(PURCHASE_QUEUE_STORE)

  return new Promise((resolve, reject) => {
    const getRequest = store.get(purchaseId)

    getRequest.onsuccess = () => {
      const purchase = getRequest.result as QueuedPurchase | undefined

      if (purchase) {
        purchase.syncAttempts += 1
        const updateRequest = store.put(purchase)

        updateRequest.onsuccess = () => {
          logger.debug('[OfflineShopping] Incremented sync attempt', {
            purchaseId,
            attempts: purchase.syncAttempts
          })
          resolve()
        }

        updateRequest.onerror = () => reject(updateRequest.error)
      } else {
        reject(new Error(`Purchase not found: ${purchaseId}`))
      }
    }

    getRequest.onerror = () => reject(getRequest.error)
  })
}

/**
 * Delete synced purchases
 */
export async function clearSyncedPurchases(): Promise<number> {
  const db = await openShoppingDB()
  const transaction = db.transaction([PURCHASE_QUEUE_STORE], 'readwrite')
  const store = transaction.objectStore(PURCHASE_QUEUE_STORE)

  return new Promise((resolve, reject) => {
    const request = store.getAll()

    request.onsuccess = () => {
      const allPurchases = request.result as QueuedPurchase[]
      const synced = allPurchases.filter(p => p.synced)

      let deleted = 0
      synced.forEach(purchase => {
        store.delete(purchase.id)
        deleted++
      })

      transaction.oncomplete = () => {
        logger.info('[OfflineShopping] Cleared synced purchases', { count: deleted })
        resolve(deleted)
      }

      transaction.onerror = () => reject(transaction.error)
    }

    request.onerror = () => reject(request.error)
  })
}

/**
 * Get shopping cache statistics
 */
export async function getShoppingCacheStats(): Promise<{
  listItems: number
  cachedProducts: number
  queuedPurchases: number
}> {
  const db = await openShoppingDB()
  const transaction = db.transaction(
    [SHOPPING_LIST_STORE, PRODUCT_CACHE_STORE, PURCHASE_QUEUE_STORE],
    'readonly'
  )

  const listRequest = transaction.objectStore(SHOPPING_LIST_STORE).count()
  const productRequest = transaction.objectStore(PRODUCT_CACHE_STORE).count()
  const queueRequest = transaction.objectStore(PURCHASE_QUEUE_STORE).count()

  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve({
        listItems: listRequest.result,
        cachedProducts: productRequest.result,
        queuedPurchases: queueRequest.result
      })
    }

    transaction.onerror = () => reject(transaction.error)
  })
}
