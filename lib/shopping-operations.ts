'use client'

/**
 * Shopping and Inventory Firestore Operations
 *
 * Handles CRUD operations for:
 * - Shopping items and inventory tracking
 * - Store visits and location history
 * - Expiration management
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
  addDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  ShoppingItem,
  QuantityUnit,
  StoreVisit,
  ProductCategory,
  StorageLocation,
  PurchaseHistoryEntry
} from '@/types/shopping'
import { detectCategory, calculateDefaultExpiration, suggestStorageLocation, suggestDefaultUnit, formatQuantityDisplay } from './product-categories'
import type { OpenFoodFactsProduct } from './openfoodfacts-api'
import { FirebaseTimestamp, toDate } from '@/types/common'

const SHOPPING_ITEMS_COLLECTION = 'shopping_items'
const STORE_VISITS_COLLECTION = 'store_visits'

/**
 * Remove undefined fields recursively from an object
 * Firestore doesn't allow undefined values
 */
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedFields)
  }
  if (typeof obj === 'object') {
    const cleaned: any = {}
    Object.keys(obj).forEach(key => {
      if (obj[key] !== undefined) {
        cleaned[key] = removeUndefinedFields(obj[key])
      }
    })
    return cleaned
  }
  return obj
}

interface FirestoreData {
  expiresAt?: FirebaseTimestamp
  lastPurchased?: FirebaseTimestamp
  createdAt?: FirebaseTimestamp
  updatedAt?: FirebaseTimestamp
  visitedAt?: FirebaseTimestamp
  purchaseHistory?: Array<{
    date: FirebaseTimestamp
    expiresAt?: FirebaseTimestamp
    store?: string
    price?: number
  }>
  [key: string]: unknown
}

/**
 * Convert Firestore timestamps to Date objects
 */
function convertTimestamps<T extends FirestoreData>(data: T): T {
  const converted = { ...data }

  if (converted.expiresAt) converted.expiresAt = toDate(converted.expiresAt)
  if (converted.lastPurchased) converted.lastPurchased = toDate(converted.lastPurchased)
  if (converted.createdAt) converted.createdAt = toDate(converted.createdAt)
  if (converted.updatedAt) converted.updatedAt = toDate(converted.updatedAt)
  if (converted.visitedAt) converted.visitedAt = toDate(converted.visitedAt)

  if (converted.purchaseHistory) {
    converted.purchaseHistory = converted.purchaseHistory.map((entry) => ({
      ...entry,
      date: toDate(entry.date),
      expiresAt: entry.expiresAt ? toDate(entry.expiresAt) : undefined
    }))
  }

  return converted
}

/**
 * Create or update a shopping item from barcode scan
 */
export async function addOrUpdateShoppingItem(
  userId: string,
  product: OpenFoodFactsProduct,
  options: {
    inStock?: boolean
    quantity?: number
    unit?: QuantityUnit
    expiresAt?: Date
    location?: StorageLocation
    needed?: boolean
    store?: string
  } = {}
): Promise<ShoppingItem> {
  try {
    // Check if item already exists
    const existingItem = await getShoppingItemByBarcode(userId, product.code)

    if (existingItem) {
      // Update existing item
      const updates: Partial<ShoppingItem> = {
        inStock: options.inStock ?? existingItem.inStock,
        quantity: options.quantity ?? (existingItem.quantity + 1),
        expiresAt: options.expiresAt ?? existingItem.expiresAt,
        location: options.location ?? existingItem.location,
        needed: options.needed ?? false,
        lastPurchased: options.inStock ? new Date() : existingItem.lastPurchased,
        updatedAt: new Date()
      }

      return await updateShoppingItem(existingItem.id, updates)
    }

    // Create new item
    const category = detectCategory(product)
    const isPerishable = ['produce', 'meat', 'seafood', 'dairy', 'bakery', 'deli', 'eggs', 'herbs'].includes(category)
    const quantity = options.quantity ?? 1
    const unit = options.unit ?? suggestDefaultUnit(category)
    const displayQuantity = formatQuantityDisplay(quantity, unit)

    const newItem: Omit<ShoppingItem, 'id'> = {
      userId,
      barcode: product.code,
      productName: product.product_name || 'Unknown Product',
      brand: product.brands || '',
      imageUrl: product.image_front_url || product.image_url || '',
      category,
      isManual: false, // Scanned items are not manual
      manualIngredientName: undefined,
      recipeIds: [], // Scanned items start with empty recipe array
      primaryRecipeId: undefined, // No primary recipe for scanned items initially
      inStock: options.inStock ?? true,
      quantity,
      unit,
      displayQuantity,
      location: options.location ?? suggestStorageLocation(category),
      expiresAt: options.expiresAt ?? (isPerishable ? calculateDefaultExpiration(category) : undefined),
      isPerishable,
      typicalShelfLife: undefined,
      needed: options.needed ?? false,
      priority: 'medium',
      lastPurchased: options.inStock ? new Date() : undefined,
      preferredStore: options.store,
      purchaseHistory: options.inStock
        ? [{
            date: new Date(),
            expiresAt: options.expiresAt,
            store: options.store
          }]
        : [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = doc(collection(db, SHOPPING_ITEMS_COLLECTION))

    // Prepare data for Firestore (remove undefined values)
    const firestoreData: any = {
      ...newItem,
      expiresAt: newItem.expiresAt ? Timestamp.fromDate(newItem.expiresAt) : null,
      lastPurchased: newItem.lastPurchased ? Timestamp.fromDate(newItem.lastPurchased) : null,
      recipeIds: newItem.recipeIds ?? [], // Array of recipe IDs
      primaryRecipeId: newItem.primaryRecipeId ?? null, // Primary recipe
      createdAt: Timestamp.fromDate(newItem.createdAt),
      updatedAt: Timestamp.fromDate(newItem.updatedAt),
      purchaseHistory: newItem.purchaseHistory.map(entry => {
        const historyEntry: any = {
          date: Timestamp.fromDate(entry.date),
          expiresAt: entry.expiresAt ? Timestamp.fromDate(entry.expiresAt) : null
        }
        // Only include store if it's defined
        if (entry.store !== undefined) {
          historyEntry.store = entry.store
        }
        return historyEntry
      })
    }

    // Remove undefined fields recursively (Firestore doesn't allow undefined)
    const cleanedData = removeUndefinedFields(firestoreData)

    await setDoc(docRef, cleanedData)

    return { ...newItem, id: docRef.id }
  } catch (error: any) {
    console.error('[ShoppingOps] Detailed error:', {
      name: error?.name,
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
      fullError: error
    })
    logger.error('[ShoppingOps] Error adding/updating shopping item', error as Error)
    throw error
  }
}

/**
 * Add manual shopping item from recipe ingredient (no barcode)
 */
export async function addManualShoppingItem(
  userId: string,
  ingredientName: string,
  options: {
    recipeId?: string
    quantity?: number
    unit?: QuantityUnit
    priority?: 'low' | 'medium' | 'high'
  } = {}
): Promise<ShoppingItem> {
  try {
    // Try to extract category from ingredient name
    const category = detectCategoryFromText(ingredientName)
    const isPerishable = ['produce', 'meat', 'seafood', 'dairy', 'bakery', 'deli', 'eggs', 'herbs'].includes(category)
    const quantity = options.quantity ?? 1
    const unit = options.unit ?? suggestDefaultUnit(category)
    const displayQuantity = formatQuantityDisplay(quantity, unit)

    const newItem: Omit<ShoppingItem, 'id'> = {
      userId,
      barcode: undefined, // No barcode for manual entries
      productName: ingredientName,
      brand: '',
      imageUrl: '',
      category,
      isManual: true,
      manualIngredientName: ingredientName,
      recipeIds: options.recipeId ? [options.recipeId] : [], // Multi-recipe support
      primaryRecipeId: options.recipeId, // First recipe that added this
      inStock: false,
      quantity,
      unit,
      displayQuantity,
      location: suggestStorageLocation(category),
      expiresAt: undefined,
      isPerishable,
      typicalShelfLife: undefined,
      needed: true, // Manual items are always needed
      priority: options.priority ?? 'medium',
      lastPurchased: undefined,
      preferredStore: undefined,
      source: options.recipeId ? 'recipe' : 'manual', // Track source
      purchaseHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const docRef = doc(collection(db, SHOPPING_ITEMS_COLLECTION))

    // Prepare data for Firestore (remove undefined values)
    const firestoreData: any = {
      ...newItem,
      // Convert undefined to null for optional fields that Firestore might need
      barcode: newItem.barcode ?? null,
      expiresAt: newItem.expiresAt ? Timestamp.fromDate(newItem.expiresAt) : null,
      lastPurchased: newItem.lastPurchased ? Timestamp.fromDate(newItem.lastPurchased) : null,
      typicalShelfLife: newItem.typicalShelfLife ?? null,
      preferredStore: newItem.preferredStore ?? null,
      recipeIds: newItem.recipeIds ?? [], // Array of recipe IDs
      primaryRecipeId: newItem.primaryRecipeId ?? null, // First recipe
      manualIngredientName: newItem.manualIngredientName ?? null,
      source: newItem.source ?? null,
      createdAt: Timestamp.fromDate(newItem.createdAt),
      updatedAt: Timestamp.fromDate(newItem.updatedAt),
      purchaseHistory: []
    }

    // Remove undefined fields recursively (Firestore doesn't allow undefined)
    const cleanedData = removeUndefinedFields(firestoreData)

    await setDoc(docRef, cleanedData)

    return { ...newItem, id: docRef.id }
  } catch (error: any) {
    logger.error('[ShoppingOps] Error adding manual shopping item', error as Error)
    throw error
  }
}

/**
 * Detect category from ingredient text
 */
function detectCategoryFromText(ingredientName: string): ProductCategory {
  const lower = ingredientName.toLowerCase()

  // Produce
  if (/(apple|banana|orange|lettuce|tomato|carrot|onion|potato|spinach|broccoli|pepper|cucumber)/i.test(lower)) {
    return 'produce'
  }

  // Dairy
  if (/(milk|cheese|yogurt|butter|cream)/i.test(lower)) {
    return 'dairy'
  }

  // Meat
  if (/(chicken|beef|pork|turkey|lamb|steak)/i.test(lower)) {
    return 'meat'
  }

  // Seafood
  if (/(fish|salmon|tuna|shrimp|crab)/i.test(lower)) {
    return 'seafood'
  }

  // Eggs
  if (/egg/i.test(lower)) {
    return 'eggs'
  }

  // Bakery
  if (/(bread|roll|baguette|bagel|croissant)/i.test(lower)) {
    return 'bakery'
  }

  // Pantry staples
  if (/(flour|sugar|rice|pasta|oil|vinegar|salt|pepper|spice)/i.test(lower)) {
    return 'pantry'
  }

  // Beverages
  if (/(juice|soda|water|coffee|tea)/i.test(lower)) {
    return 'beverages'
  }

  return 'other'
}

/**
 * Get shopping item by barcode
 */
export async function getShoppingItemByBarcode(
  userId: string,
  barcode: string
): Promise<ShoppingItem | null> {
  try {
    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('barcode', '==', barcode),
      firestoreLimit(1)
    )

    const snapshot = await getDocs(q)
    if (snapshot.empty) return null

    const doc = snapshot.docs[0]
    return convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
  } catch (error) {
    logger.error('[ShoppingOps] Error getting shopping item by barcode', error as Error)
    return null
  }
}

/**
 * Update shopping item
 */
export async function updateShoppingItem(
  itemId: string,
  updates: Partial<Omit<ShoppingItem, 'id' | 'userId' | 'createdAt'>>
): Promise<ShoppingItem> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    }

    // If quantity or unit is being updated, regenerate displayQuantity
    if (updates.quantity !== undefined || updates.unit !== undefined) {
      // Get current item to access current values
      const currentDoc = await getDoc(itemRef)
      const currentItem = currentDoc.data() as ShoppingItem

      const newQuantity = updates.quantity ?? currentItem.quantity
      const newUnit = updates.unit ?? currentItem.unit ?? suggestDefaultUnit(currentItem.category)

      updateData.displayQuantity = formatQuantityDisplay(newQuantity, newUnit)

      // Ensure unit is set if not already present
      if (!updates.unit && !currentItem.unit) {
        updateData.unit = suggestDefaultUnit(currentItem.category)
      }
    }

    if (updates.expiresAt) {
      updateData.expiresAt = Timestamp.fromDate(updates.expiresAt)
    }
    if (updates.lastPurchased) {
      updateData.lastPurchased = Timestamp.fromDate(updates.lastPurchased)
    }
    if (updates.purchaseHistory) {
      updateData.purchaseHistory = updates.purchaseHistory.map(entry => ({
        date: Timestamp.fromDate(entry.date),
        expiresAt: entry.expiresAt ? Timestamp.fromDate(entry.expiresAt) : null,
        store: entry.store ?? null,
        price: entry.price ?? null
      }))
    }

    // Remove undefined fields recursively (Firestore doesn't allow undefined)
    const cleanedData = removeUndefinedFields(updateData)

    await updateDoc(itemRef, cleanedData)

    const updatedDoc = await getDoc(itemRef)
    return convertTimestamps({ id: updatedDoc.id, ...updatedDoc.data() }) as ShoppingItem
  } catch (error: any) {
    logger.error('[ShoppingOps] Error updating shopping item', error as Error, { itemId })
    throw error
  }
}

/**
 * Mark item as consumed/thrown away
 */
export async function markItemAsConsumed(itemId: string): Promise<void> {
  try {
    await updateShoppingItem(itemId, {
      inStock: false,
      quantity: 0,
      needed: true,
      priority: 'high',
      updatedAt: new Date()
    })
  } catch (error: any) {
    logger.error('[ShoppingOps] Error marking item as consumed', error as Error, {
      itemId
    })
    throw error
  }
}

/**
 * Mark item as purchased
 */
export async function markItemAsPurchased(
  itemId: string,
  options: {
    quantity?: number
    unit?: QuantityUnit
    expiresAt?: Date
    store?: string
  } = {}
): Promise<void> {
  try {
    const item = await getShoppingItem(itemId)
    if (!item) throw new Error('Item not found')

    const newPurchase: PurchaseHistoryEntry = {
      date: new Date(),
      expiresAt: options.expiresAt,
      store: options.store
    }

    await updateShoppingItem(itemId, {
      inStock: true,
      quantity: options.quantity ?? 1,
      unit: options.unit,
      needed: false,
      lastPurchased: new Date(),
      expiresAt: options.expiresAt,
      preferredStore: options.store ?? item.preferredStore,
      purchaseHistory: [...(item.purchaseHistory || []), newPurchase],
      updatedAt: new Date()
    })
  } catch (error: any) {
    logger.error('[ShoppingOps] Error marking item as purchased', error as Error, { itemId })
    throw error
  }
}

/**
 * Get single shopping item
 */
export async function getShoppingItem(itemId: string): Promise<ShoppingItem | null> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)
    const itemDoc = await getDoc(itemRef)

    if (!itemDoc.exists()) return null

    return convertTimestamps({ id: itemDoc.id, ...itemDoc.data() }) as ShoppingItem
  } catch (error) {
    logger.error('[ShoppingOps] Error getting shopping item', error as Error)
    return null
  }
}

/**
 * Get all shopping items for user
 */
export async function getAllShoppingItems(userId: string): Promise<ShoppingItem[]> {
  try {
    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
    )
  } catch (error) {
    logger.error('[ShoppingOps] Error getting all shopping items', error as Error)
    return []
  }
}

/**
 * Get items that need to be purchased
 */
export async function getNeededItems(userId: string): Promise<ShoppingItem[]> {
  try {
    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('needed', '==', true),
      orderBy('priority', 'desc'),
      orderBy('updatedAt', 'desc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
    )
  } catch (error) {
    logger.error('[ShoppingOps] Error getting needed items', error as Error)
    return []
  }
}

/**
 * Get items in stock (inventory)
 */
export async function getInventoryItems(
  userId: string,
  location?: StorageLocation
): Promise<ShoppingItem[]> {
  try {
    let q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('inStock', '==', true)
    )

    if (location) {
      q = query(q, where('location', '==', location))
    }

    q = query(q, orderBy('expiresAt', 'asc'))

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
    )
  } catch (error) {
    logger.error('[ShoppingOps] Error getting inventory items', error as Error)
    return []
  }
}

/**
 * Get expiring items
 */
export async function getExpiringItems(
  userId: string,
  daysAhead: number = 7
): Promise<ShoppingItem[]> {
  try {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + daysAhead)

    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('inStock', '==', true),
      where('expiresAt', '<=', Timestamp.fromDate(futureDate)),
      orderBy('expiresAt', 'asc')
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
    )
  } catch (error) {
    logger.error('[ShoppingOps] Error getting expiring items', error as Error)
    return []
  }
}

/**
 * Delete shopping item
 */
export async function deleteShoppingItem(itemId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, SHOPPING_ITEMS_COLLECTION, itemId))
  } catch (error) {
    logger.error('[ShoppingOps] Error deleting shopping item', error as Error)
    throw error
  }
}

/**
 * Log a store visit
 */
export async function logStoreVisit(
  userId: string,
  storeName: string,
  location: { latitude: number; longitude: number },
  itemsScanned: string[] = []
): Promise<StoreVisit> {
  try {
    const visit: Omit<StoreVisit, 'id'> = {
      userId,
      storeName,
      storeChain: extractStoreChain(storeName),
      location,
      visitedAt: new Date(),
      itemsScanned,
      itemsPurchased: itemsScanned.length
    }

    const docRef = await addDoc(collection(db, STORE_VISITS_COLLECTION), {
      ...visit,
      visitedAt: Timestamp.fromDate(visit.visitedAt)
    })

    return { ...visit, id: docRef.id }
  } catch (error) {
    logger.error('[ShoppingOps] Error logging store visit', error as Error)
    throw error
  }
}

/**
 * Extract store chain from store name
 */
function extractStoreChain(storeName: string): string | undefined {
  const chains = ['Walmart', 'Target', 'Kroger', 'Safeway', 'Whole Foods', 'Trader Joe\'s', 'Costco', 'Sam\'s Club']
  const lowerName = storeName.toLowerCase()

  for (const chain of chains) {
    if (lowerName.includes(chain.toLowerCase())) {
      return chain
    }
  }

  return undefined
}

/**
 * Get store visit history
 */
export async function getStoreVisits(
  userId: string,
  limitCount: number = 10
): Promise<StoreVisit[]> {
  try {
    const q = query(
      collection(db, STORE_VISITS_COLLECTION),
      where('userId', '==', userId),
      orderBy('visitedAt', 'desc'),
      firestoreLimit(limitCount)
    )

    const snapshot = await getDocs(q)
    return snapshot.docs.map(doc =>
      convertTimestamps({ id: doc.id, ...doc.data() }) as StoreVisit
    )
  } catch (error) {
    logger.error('[ShoppingOps] Error getting store visits', error as Error)
    return []
  }
}

/**
 * Find existing ingredient by name (for multi-recipe linking)
 * Matches by normalized ingredient name or manual ingredient name
 */
export async function findExistingIngredientByName(
  userId: string,
  ingredientName: string
): Promise<ShoppingItem | null> {
  try {
    const normalizedName = ingredientName.toLowerCase().trim()

    // Query by manualIngredientName first (exact match for recipe ingredients)
    const manualNameQuery = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('manualIngredientName', '==', ingredientName),
      where('needed', '==', true), // Only check shopping list items
      firestoreLimit(1)
    )

    const manualSnapshot = await getDocs(manualNameQuery)
    if (!manualSnapshot.empty) {
      const doc = manualSnapshot.docs[0]
      return convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
    }

    // Fallback: query all user's shopping list items and match by normalized name
    const allItemsQuery = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', userId),
      where('needed', '==', true)
    )

    const allSnapshot = await getDocs(allItemsQuery)
    for (const doc of allSnapshot.docs) {
      const itemData = doc.data()
      const itemName = (itemData.productName || '').toLowerCase().trim()
      const manualName = (itemData.manualIngredientName || '').toLowerCase().trim()

      if (itemName === normalizedName || manualName === normalizedName) {
        return convertTimestamps({ id: doc.id, ...itemData }) as ShoppingItem
      }
    }

    return null
  } catch (error) {
    logger.error('[ShoppingOps] Error finding ingredient by name', error as Error)
    return null
  }
}

/**
 * Append recipe ID to existing shopping item's recipeIds array
 * Deduplicates to prevent duplicate recipe links
 */
export async function appendRecipeToIngredient(
  itemId: string,
  recipeId: string
): Promise<ShoppingItem> {
  try {
    const item = await getShoppingItem(itemId)
    if (!item) throw new Error('Item not found')

    // Get current recipeIds array (or empty array if not set)
    const currentRecipeIds = item.recipeIds || []

    // Deduplicate - only add if not already present
    if (!currentRecipeIds.includes(recipeId)) {
      const updatedRecipeIds = [...currentRecipeIds, recipeId]

      // If no primary recipe set, set this as primary
      const updates: Partial<ShoppingItem> = {
        recipeIds: updatedRecipeIds,
        updatedAt: new Date()
      }

      if (!item.primaryRecipeId) {
        updates.primaryRecipeId = recipeId
      }

      return await updateShoppingItem(itemId, updates)
    }

    // Recipe already linked, return unchanged item
    return item
  } catch (error) {
    logger.error('[ShoppingOps] Error appending recipe to ingredient', error as Error, { itemId, recipeId })
    throw error
  }
}
