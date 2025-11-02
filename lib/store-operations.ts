'use client'

/**
 * Store Management Firestore Operations
 *
 * Handles CRUD operations for:
 * - User stores (save favorite stores, track visits)
 * - Price history tracking
 * - Store-based shopping list organization
 */

import { logger } from '@/lib/logger'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  Store,
  PriceHistory,
  ProductCategory,
} from '@/types/shopping'
import { FirebaseTimestamp, toDate } from '@/types/common'

const STORES_COLLECTION = 'stores'
const PRICE_HISTORY_COLLECTION = 'price_history'

interface FirestoreData {
  lastVisitedAt?: FirebaseTimestamp
  purchasedAt?: FirebaseTimestamp
  createdAt?: FirebaseTimestamp
  updatedAt?: FirebaseTimestamp
  [key: string]: unknown
}

/**
 * Convert Firestore timestamps to Date objects
 */
function convertTimestamps<T extends FirestoreData>(data: T): T {
  const converted = { ...data }

  if (converted.lastVisitedAt) converted.lastVisitedAt = toDate(converted.lastVisitedAt)
  if (converted.purchasedAt) converted.purchasedAt = toDate(converted.purchasedAt)
  if (converted.createdAt) converted.createdAt = toDate(converted.createdAt)
  if (converted.updatedAt) converted.updatedAt = toDate(converted.updatedAt)

  return converted
}

/**
 * Create or update a store
 */
export async function saveStore(
  userId: string,
  storeData: Omit<Store, 'id' | 'userId' | 'createdAt' | 'updatedAt'>
): Promise<Store> {
  try {
    const now = new Date()
    const docRef = doc(collection(db, 'users', userId, STORES_COLLECTION))

    const store: Omit<Store, 'id'> = {
      ...storeData,
      userId,
      createdAt: now,
      updatedAt: now,
    }

    const firestoreData = {
      ...store,
      lastVisitedAt: store.lastVisitedAt ? Timestamp.fromDate(store.lastVisitedAt) : null,
      createdAt: Timestamp.fromDate(store.createdAt),
      updatedAt: Timestamp.fromDate(store.updatedAt),
    }

    await setDoc(docRef, firestoreData)

    return { ...store, id: docRef.id }
  } catch (error) {
    logger.error('[StoreOps] Error saving store', error as Error)
    throw error
  }
}

/**
 * Get a single store
 */
export async function getStore(userId: string, storeId: string): Promise<Store | null> {
  try {
    const storeRef = doc(db, 'users', userId, STORES_COLLECTION, storeId)
    const storeDoc = await getDoc(storeRef)

    if (!storeDoc.exists()) return null

    return convertTimestamps({ id: storeDoc.id, ...storeDoc.data() }) as Store
  } catch (error) {
    logger.error('[StoreOps] Error getting store', error as Error)
    return null
  }
}

/**
 * Get all stores for user, sorted by most recently visited
 */
export async function getAllStores(userId: string, limitCount = 10): Promise<Store[]> {
  try {
    const q = query(
      collection(db, 'users', userId, STORES_COLLECTION),
      orderBy('lastVisitedAt', 'desc'),
      firestoreLimit(limitCount)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as Store
    )
  } catch (error) {
    logger.error('[StoreOps] Error getting all stores', error as Error)
    return []
  }
}

/**
 * Update store's last visited timestamp
 */
export async function updateStoreVisit(userId: string, storeId: string): Promise<void> {
  try {
    const storeRef = doc(db, 'users', userId, STORES_COLLECTION, storeId)
    await updateDoc(storeRef, {
      lastVisitedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    logger.error('[StoreOps] Error updating store visit', error as Error, { storeId })
    throw error
  }
}

/**
 * Update store's aisle order preference
 */
export async function updateAisleOrder(
  userId: string,
  storeId: string,
  aisleOrder: ProductCategory[]
): Promise<void> {
  try {
    const storeRef = doc(db, 'users', userId, STORES_COLLECTION, storeId)
    await updateDoc(storeRef, {
      aisleOrder,
      updatedAt: Timestamp.now(),
    })
  } catch (error) {
    logger.error('[StoreOps] Error updating aisle order', error as Error, { storeId })
    throw error
  }
}

/**
 * Delete a store
 */
export async function deleteStore(userId: string, storeId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'users', userId, STORES_COLLECTION, storeId))
  } catch (error) {
    logger.error('[StoreOps] Error deleting store', error as Error, { storeId })
    throw error
  }
}

// ============================================================================
// Price History Operations
// ============================================================================

/**
 * Record a price for a product
 */
export async function recordPrice(
  userId: string,
  productKey: string,
  priceCents: number,
  options: {
    storeId?: string
    quantity?: number
    unit?: string
  } = {}
): Promise<PriceHistory> {
  try {
    const now = new Date()
    const dateKey = now.toISOString().split('T')[0].replace(/-/g, '')
    const id = `${productKey}_${dateKey}`

    const priceHistory: PriceHistory = {
      id,
      userId,
      productKey,
      storeId: options.storeId,
      priceCents,
      quantity: options.quantity || 1,
      unit: options.unit,
      purchasedAt: now,
      createdAt: now,
    }

    const docRef = doc(db, 'users', userId, PRICE_HISTORY_COLLECTION, id)

    const firestoreData = {
      ...priceHistory,
      storeId: priceHistory.storeId || null,
      unit: priceHistory.unit || null,
      purchasedAt: Timestamp.fromDate(priceHistory.purchasedAt),
      createdAt: Timestamp.fromDate(priceHistory.createdAt),
    }

    await setDoc(docRef, firestoreData)

    return priceHistory
  } catch (error) {
    logger.error('[StoreOps] Error recording price', error as Error)
    throw error
  }
}

/**
 * Get price history for a product
 */
export async function getPriceHistory(
  userId: string,
  productKey: string,
  limitCount = 10
): Promise<PriceHistory[]> {
  try {
    const q = query(
      collection(db, 'users', userId, PRICE_HISTORY_COLLECTION),
      where('productKey', '==', productKey),
      orderBy('purchasedAt', 'desc'),
      firestoreLimit(limitCount)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as PriceHistory
    )
  } catch (error) {
    logger.error('[StoreOps] Error getting price history', error as Error)
    return []
  }
}

/**
 * Calculate average price for a product
 */
export async function getAveragePrice(
  userId: string,
  productKey: string
): Promise<number | null> {
  try {
    const history = await getPriceHistory(userId, productKey, 5)

    if (history.length === 0) return null

    const sum = history.reduce((acc, entry) => acc + entry.priceCents, 0)
    return Math.round(sum / history.length)
  } catch (error) {
    logger.error('[StoreOps] Error calculating average price', error as Error)
    return null
  }
}
