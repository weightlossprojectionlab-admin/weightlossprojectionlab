'use client'

/**
 * Household Shopping Operations
 *
 * Manages deduplication and household-level shopping operations
 * for family plans where multiple members share a common inventory.
 */

import { logger } from '@/lib/logger'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  writeBatch
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  ShoppingItem,
  MemberShoppingListItem,
  ProductCategory,
  QuantityUnit
} from '@/types/shopping'
import { COLLECTIONS, SUBCOLLECTIONS } from '@/constants/firestore'

/**
 * Generate a normalized product key for deduplication
 * Uses barcode if available, otherwise normalizes product name
 */
export function generateProductKey(
  barcode: string | undefined,
  productName: string,
  brand: string = ''
): string {
  if (barcode) {
    return `barcode:${barcode}`
  }

  // Normalize product name + brand for matching
  const normalized = `${productName} ${brand}`
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  return `name:${normalized}`
}

/**
 * Find existing household inventory item by product key
 * This checks the shared household inventory for duplicates
 */
export async function findHouseholdItemByProductKey(
  householdId: string,
  productKey: string
): Promise<ShoppingItem | null> {
  try {
    const q = query(
      collection(db, COLLECTIONS.SHOPPING_ITEMS),
      where('householdId', '==', householdId),
      where('productKey', '==', productKey)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return { id: doc.id, ...doc.data() } as ShoppingItem
  } catch (error) {
    logger.error('[HouseholdOps] Error finding item by product key', error as Error, {
      householdId,
      productKey
    })
    return null
  }
}

/**
 * Add or update a household inventory item
 * Tracks which members requested this item
 */
export async function addOrUpdateHouseholdItem(
  householdId: string,
  memberId: string,
  itemData: {
    productKey: string
    barcode?: string
    productName: string
    brand: string
    imageUrl?: string
    category: ProductCategory
    quantity: number
    unit?: QuantityUnit
    inStock?: boolean
    needed?: boolean
  }
): Promise<ShoppingItem> {
  try {
    // Check if item already exists in household
    const existingItem = await findHouseholdItemByProductKey(
      householdId,
      itemData.productKey
    )

    if (existingItem) {
      // Item exists - update requestedBy array and quantity
      const requestedBy = existingItem.requestedBy || []
      if (!requestedBy.includes(memberId)) {
        requestedBy.push(memberId)
      }

      const addedBy = existingItem.addedBy || []
      if (!addedBy.includes(memberId)) {
        addedBy.push(memberId)
      }

      // If any member needs it, mark as needed
      const needed = itemData.needed || existingItem.needed

      // Increase quantity if needed
      const totalQuantity = existingItem.quantity + (itemData.quantity || 0)

      const itemRef = doc(db, COLLECTIONS.SHOPPING_ITEMS, existingItem.id)
      await setDoc(
        itemRef,
        {
          requestedBy,
          addedBy,
          needed,
          quantity: totalQuantity,
          lastModifiedBy: memberId,
          updatedAt: Timestamp.now()
        },
        { merge: true }
      )

      return {
        ...existingItem,
        requestedBy,
        addedBy,
        needed,
        quantity: totalQuantity,
        lastModifiedBy: memberId,
        updatedAt: new Date()
      }
    }

    // Item doesn't exist - create new household item
    const newItem: Omit<ShoppingItem, 'id'> = {
      userId: householdId, // Legacy compatibility
      householdId,
      productKey: itemData.productKey,
      barcode: itemData.barcode,
      productName: itemData.productName,
      brand: itemData.brand,
      imageUrl: itemData.imageUrl || '',
      category: itemData.category,
      isManual: !itemData.barcode,
      inStock: itemData.inStock || false,
      quantity: itemData.quantity,
      unit: itemData.unit,
      location: 'pantry', // Default, can be updated later
      isPerishable: false, // Will be determined by category
      needed: itemData.needed !== undefined ? itemData.needed : true,
      priority: 'medium',
      addedBy: [memberId],
      requestedBy: itemData.needed !== undefined && itemData.needed ? [memberId] : [],
      lastModifiedBy: memberId,
      purchaseHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = doc(collection(db, COLLECTIONS.SHOPPING_ITEMS))
    await setDoc(docRef, {
      ...newItem,
      createdAt: Timestamp.fromDate(newItem.createdAt),
      updatedAt: Timestamp.fromDate(newItem.updatedAt)
    })

    return { ...newItem, id: docRef.id }
  } catch (error) {
    logger.error('[HouseholdOps] Error adding/updating household item', error as Error, {
      householdId,
      memberId
    })
    throw error
  }
}

/**
 * Mark item as purchased by a household member
 * Updates household inventory and marks all member lists satisfied
 */
export async function markHouseholdItemPurchased(
  itemId: string,
  purchasedBy: string,
  options: {
    quantity?: number
    unit?: QuantityUnit
    expiresAt?: Date
    store?: string
  } = {}
): Promise<void> {
  try {
    const itemRef = doc(db, COLLECTIONS.SHOPPING_ITEMS, itemId)
    const itemDoc = await getDoc(itemRef)

    if (!itemDoc.exists()) {
      throw new Error('Household item not found')
    }

    const item = itemDoc.data() as ShoppingItem

    await setDoc(
      itemRef,
      {
        inStock: true,
        quantity: options.quantity || item.quantity,
        unit: options.unit || item.unit,
        needed: false,
        requestedBy: [], // Clear requested by when purchased
        purchasedBy,
        lastPurchased: Timestamp.now(),
        expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : null,
        preferredStore: options.store || item.preferredStore,
        purchaseHistory: [
          ...(item.purchaseHistory || []),
          {
            date: Timestamp.now(),
            expiresAt: options.expiresAt ? Timestamp.fromDate(options.expiresAt) : null,
            store: options.store
          }
        ],
        lastModifiedBy: purchasedBy,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    )

    logger.info('[HouseholdOps] Item marked as purchased', {
      itemId,
      purchasedBy,
      householdId: item.householdId
    })
  } catch (error) {
    logger.error('[HouseholdOps] Error marking item as purchased', error as Error, {
      itemId,
      purchasedBy
    })
    throw error
  }
}

/**
 * Get all household inventory items
 */
export async function getHouseholdInventory(
  householdId: string,
  filters?: {
    inStock?: boolean
    needed?: boolean
  }
): Promise<ShoppingItem[]> {
  try {
    // Query items where either householdId matches OR userId matches
    // (userId is used for individual user items, householdId for shared household items)
    const queries: Promise<ShoppingItem[]>[] = []

    // Query 1: Items with householdId
    let q1 = query(
      collection(db, COLLECTIONS.SHOPPING_ITEMS),
      where('householdId', '==', householdId)
    )
    if (filters?.inStock !== undefined) {
      q1 = query(q1, where('inStock', '==', filters.inStock))
    }
    if (filters?.needed !== undefined) {
      q1 = query(q1, where('needed', '==', filters.needed))
    }

    // Query 2: Items with userId (for backwards compatibility)
    let q2 = query(
      collection(db, COLLECTIONS.SHOPPING_ITEMS),
      where('userId', '==', householdId)
    )
    if (filters?.inStock !== undefined) {
      q2 = query(q2, where('inStock', '==', filters.inStock))
    }
    if (filters?.needed !== undefined) {
      q2 = query(q2, where('needed', '==', filters.needed))
    }

    // Execute both queries in parallel
    const [snapshot1, snapshot2] = await Promise.all([
      getDocs(q1),
      getDocs(q2)
    ])

    // Combine results and deduplicate by ID
    const itemsMap = new Map<string, ShoppingItem>()

    snapshot1.docs.forEach(doc => {
      itemsMap.set(doc.id, { id: doc.id, ...doc.data() } as ShoppingItem)
    })

    snapshot2.docs.forEach(doc => {
      if (!itemsMap.has(doc.id)) {
        itemsMap.set(doc.id, { id: doc.id, ...doc.data() } as ShoppingItem)
      }
    })

    return Array.from(itemsMap.values())
  } catch (error) {
    logger.error('[HouseholdOps] Error getting household inventory', error as Error, {
      householdId
    })
    return []
  }
}

/**
 * Remove a member from item's requestedBy list
 * Useful when member removes item from their personal list
 */
export async function removeMemberFromItemRequest(
  itemId: string,
  memberId: string
): Promise<void> {
  try {
    const itemRef = doc(db, COLLECTIONS.SHOPPING_ITEMS, itemId)
    const itemDoc = await getDoc(itemRef)

    if (!itemDoc.exists()) return

    const item = itemDoc.data() as ShoppingItem
    const requestedBy = (item.requestedBy || []).filter(id => id !== memberId)

    // If no one needs it anymore, mark as not needed
    const needed = requestedBy.length > 0

    await setDoc(
      itemRef,
      {
        requestedBy,
        needed,
        lastModifiedBy: memberId,
        updatedAt: Timestamp.now()
      },
      { merge: true }
    )
  } catch (error) {
    logger.error('[HouseholdOps] Error removing member from item request', error as Error, {
      itemId,
      memberId
    })
    throw error
  }
}

/**
 * Enrich shopping items with nutrition data from product_database
 * Fetches nutrition data from Firestore for items that have barcodes
 */
export async function enrichInventoryWithNutrition(
  items: ShoppingItem[]
): Promise<ShoppingItem[]> {
  try {
    // Get all items with barcodes that don't already have nutrition data
    const itemsNeedingNutrition = items.filter(item => item.barcode && !item.nutrition)

    if (itemsNeedingNutrition.length === 0) {
      return items
    }

    // Fetch nutrition data for each barcode from product_database
    const nutritionPromises = itemsNeedingNutrition.map(async (item) => {
      try {
        const productRef = doc(db, COLLECTIONS.PRODUCT_DATABASE, item.barcode!)
        const productDoc = await getDoc(productRef)

        if (productDoc.exists()) {
          const productData = productDoc.data()
          return {
            barcode: item.barcode!,
            nutrition: productData.nutrition
          }
        }
        return null
      } catch (error) {
        logger.warn('[HouseholdOps] Failed to fetch nutrition for barcode', {
          barcode: item.barcode,
          error: (error as Error).message
        })
        return null
      }
    })

    const nutritionData = await Promise.all(nutritionPromises)

    // Create a map of barcode -> nutrition
    const nutritionMap = new Map<string, any>()
    nutritionData.forEach(data => {
      if (data && data.nutrition) {
        nutritionMap.set(data.barcode, data.nutrition)
      }
    })

    // Enrich items with nutrition data
    return items.map(item => {
      if (item.barcode && nutritionMap.has(item.barcode)) {
        return {
          ...item,
          nutrition: nutritionMap.get(item.barcode)
        }
      }
      return item
    })
  } catch (error) {
    logger.error('[HouseholdOps] Error enriching inventory with nutrition', error as Error)
    return items // Return original items if enrichment fails
  }
}
