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
  addDoc,
  runTransaction,
  writeBatch,
  increment,
  arrayUnion
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
import { generateProductKey, findHouseholdItemByProductKey, addOrUpdateHouseholdItem } from './household-shopping-operations'

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
 * Supports both individual and household (family plan) modes
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
    householdId?: string // NEW: If provided, uses household sharing mode
    memberId?: string // NEW: The actual user adding the item (for family plans)
  } = {}
): Promise<ShoppingItem> {
  try {
    const category = detectCategory(product)
    const productKey = generateProductKey(product.code, product.product_name || 'Unknown Product', product.brands || '')

    // HOUSEHOLD MODE: If householdId is provided, use household deduplication
    if (options.householdId) {
      const actualMemberId = options.memberId || userId

      return await addOrUpdateHouseholdItem(
        options.householdId,
        actualMemberId,
        {
          productKey,
          barcode: product.code,
          productName: product.product_name || 'Unknown Product',
          brand: product.brands || '',
          imageUrl: product.image_front_url || product.image_url || '',
          category,
          quantity: options.quantity ?? 1,
          unit: options.unit ?? suggestDefaultUnit(category),
          inStock: options.inStock ?? true,
          needed: options.needed ?? false
        }
      )
    }

    // INDIVIDUAL MODE: Original behavior for non-family users
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
    const isPerishable = ['produce', 'meat', 'seafood', 'dairy', 'bakery', 'deli', 'eggs', 'herbs'].includes(category)
    const quantity = options.quantity ?? 1
    const unit = options.unit ?? suggestDefaultUnit(category)
    const displayQuantity = formatQuantityDisplay(quantity, unit)

    const newItem: Omit<ShoppingItem, 'id'> = {
      userId,
      productKey, // NEW: Add product key for deduplication
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
    householdId?: string // NEW: If provided, uses household mode
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
      householdId: options.householdId, // NEW: Add household ID if provided
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

/**
 * Update Global Product Database
 *
 * Aggregates product scans across all users to build a shared product database.
 * This reduces API calls to OpenFoodFacts and enables ML/recipe features.
 *
 * Called automatically when a user scans a barcode.
 */
export async function updateGlobalProductDatabase(
  barcode: string,
  productData: OpenFoodFactsProduct,
  userId: string,
  metadata: {
    category: ProductCategory
    store?: string
    priceCents?: number
    region?: string
    purchased: boolean
    context: 'shopping' | 'meal-log' | 'inventory'
  }
): Promise<void> {
  try {
    const productRef = doc(db, 'product_database', barcode)
    const productSnap = await getDoc(productRef)

    const now = new Date()

    // Extract nutrition data from OpenFoodFacts
    const nutrition = {
      calories: productData.nutriments?.['energy-kcal_serving'] ||
                productData.nutriments?.['energy-kcal_100g'] ||
                productData.nutriments?.['energy-kcal'] || 0,
      protein: productData.nutriments?.proteins_serving ||
               productData.nutriments?.proteins_100g ||
               productData.nutriments?.proteins || 0,
      carbs: productData.nutriments?.carbohydrates_serving ||
             productData.nutriments?.carbohydrates_100g ||
             productData.nutriments?.carbohydrates || 0,
      fat: productData.nutriments?.fat_serving ||
           productData.nutriments?.fat_100g ||
           productData.nutriments?.fat || 0,
      fiber: productData.nutriments?.fiber_serving ||
             productData.nutriments?.fiber_100g ||
             productData.nutriments?.fiber || 0,
      servingSize: productData.serving_size || productData.quantity || 'unknown'
    }

    if (productSnap.exists()) {
      // Product exists - update aggregated stats
      const existing = productSnap.data() as any

      // Update stats
      const updates: any = {
        'stats.totalScans': (existing.stats?.totalScans || 0) + 1,
        'stats.lastSeenAt': now,
        updatedAt: now
      }

      // Increment purchase count if purchased
      if (metadata.purchased) {
        updates['stats.totalPurchases'] = (existing.stats?.totalPurchases || 0) + 1
      }

      // Add store to list if not already there
      if (metadata.store && !(existing.regional?.stores || []).includes(metadata.store)) {
        updates['regional.stores'] = [...(existing.regional?.stores || []), metadata.store]
      }

      // Add region to list if not already there
      if (metadata.region && !(existing.regional?.regions || []).includes(metadata.region)) {
        updates['regional.regions'] = [...(existing.regional?.regions || []), metadata.region]
      }

      // Update price data if provided
      if (metadata.priceCents) {
        const currentMin = existing.regional?.priceMin || metadata.priceCents
        const currentMax = existing.regional?.priceMax || metadata.priceCents
        const currentTotal = existing.regional?.avgPriceCents ?
          (existing.regional.avgPriceCents * (existing.stats?.totalPurchases || 1)) : 0
        const newPurchaseCount = (existing.stats?.totalPurchases || 0) + (metadata.purchased ? 1 : 0)

        updates['regional.priceMin'] = Math.min(currentMin, metadata.priceCents)
        updates['regional.priceMax'] = Math.max(currentMax, metadata.priceCents)
        updates['regional.avgPriceCents'] = newPurchaseCount > 0 ?
          Math.round((currentTotal + metadata.priceCents) / newPurchaseCount) : metadata.priceCents
        updates['regional.lastPriceUpdate'] = now
      }

      await updateDoc(productRef, updates)

      logger.debug('[GlobalProduct] Updated existing product', { barcode, totalScans: updates['stats.totalScans'] })
    } else {
      // New product - create entry
      const newProduct = {
        barcode,
        productName: productData.product_name || 'Unknown Product',
        brand: productData.brands || 'Unknown Brand',
        imageUrl: productData.image_url || productData.image_front_url,
        nutrition,
        category: metadata.category,
        categories: productData.categories ? productData.categories.split(',').map(c => c.trim()) : [metadata.category],
        stats: {
          totalScans: 1,
          uniqueUsers: 1, // Will use array union in future for exact count
          totalPurchases: metadata.purchased ? 1 : 0,
          firstSeenAt: now,
          lastSeenAt: now
        },
        regional: {
          stores: metadata.store ? [metadata.store] : [],
          regions: metadata.region ? [metadata.region] : [],
          avgPriceCents: metadata.priceCents || 0,
          priceMin: metadata.priceCents || 0,
          priceMax: metadata.priceCents || 0,
          lastPriceUpdate: metadata.priceCents ? now : null
        },
        usage: {
          linkedRecipes: 0,
          popularityScore: 1 // Initial score
        },
        quality: {
          verified: false,
          verificationCount: 0,
          dataSource: 'openfoodfacts' as const,
          confidence: 70 // Default confidence for OpenFoodFacts
        },
        createdAt: now,
        updatedAt: now
      }

      await setDoc(productRef, removeUndefinedFields(newProduct))

      logger.info('[GlobalProduct] Created new product', { barcode, productName: newProduct.productName })
    }

    // Optionally: Record individual scan event for detailed analytics
    // (Commented out to avoid excessive writes - enable if needed)
    /*
    const scanRef = doc(collection(db, `product_database/${barcode}/scans`))
    await setDoc(scanRef, {
      id: scanRef.id,
      userId,
      scannedAt: now,
      store: metadata.store,
      region: metadata.region,
      priceCents: metadata.priceCents,
      purchased: metadata.purchased,
      context: metadata.context
    })
    */
  } catch (error) {
    logger.error('[GlobalProduct] Error updating global product database', error as Error, { barcode, userId })
    // Don't throw - this is a best-effort aggregation, don't block user flow
  }
}

// ============================================================================
// REAL-TIME MULTI-USER OPERATIONS (Transaction-Based for Safety)
// ============================================================================

/**
 * Discard item from inventory with transaction safety
 * Prevents race conditions when multiple users discard the same item
 */
export async function discardItemSafely(
  itemId: string,
  userId: string,
  options: {
    addToShoppingList?: boolean
    reason?: 'expired' | 'spoiled' | 'moldy' | 'other'
    notes?: string
  } = {}
): Promise<void> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)
    const actionRef = doc(collection(db, 'inventory_actions'))

    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef)

      if (!itemDoc.exists()) {
        throw new Error('Item does not exist')
      }

      const item = itemDoc.data() as ShoppingItem

      // Check if already discarded
      if (!item.inStock) {
        const discardedBy = item.discardedBy || 'another user'
        throw new Error(`Item already discarded by ${discardedBy}`)
      }

      const now = Timestamp.now()

      // Update item - mark as discarded
      transaction.update(itemRef, {
        inStock: false,
        quantity: 0,
        discardedAt: now,
        discardedBy: userId,
        discardReason: options.reason || 'other',
        notes: options.notes || null,
        lastModifiedBy: userId,
        updatedAt: now
      })

      // Log audit trail
      transaction.set(actionRef, {
        id: actionRef.id,
        itemId,
        action: 'discarded',
        reason: options.reason || 'other',
        performedBy: userId,
        timestamp: now,
        notes: options.notes || null,
        productName: item.productName
      })

      // Re-add to shopping list if requested
      if (options.addToShoppingList) {
        transaction.update(itemRef, {
          needed: true,
          priority: 'medium',
          requestedBy: arrayUnion(userId)
        })
      }
    })

    logger.info('[Shopping] Item discarded safely', {
      itemId,
      userId,
      addToShoppingList: options.addToShoppingList
    })
  } catch (error) {
    logger.error('[Shopping] Failed to discard item', error as Error, { itemId, userId })
    throw error
  }
}

/**
 * Remove item from inventory with reason tracking
 * Use for non-discard removals (gave away, returned, etc.)
 */
export async function removeFromInventory(
  itemId: string,
  userId: string,
  reason: 'gave_away' | 'returned' | 'transferred' | 'duplicate' | 'error' | 'other',
  notes?: string
): Promise<void> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)
    const actionRef = doc(collection(db, 'inventory_actions'))

    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef)

      if (!itemDoc.exists()) {
        throw new Error('Item does not exist')
      }

      const item = itemDoc.data() as ShoppingItem

      // Delete from inventory
      transaction.delete(itemRef)

      // Log audit trail
      transaction.set(actionRef, {
        id: actionRef.id,
        itemId,
        action: 'removed',
        reason,
        performedBy: userId,
        timestamp: Timestamp.now(),
        notes: notes || null,
        productName: item.productName
      })
    })

    logger.info('[Shopping] Item removed from inventory', { itemId, reason, userId })
  } catch (error) {
    logger.error('[Shopping] Failed to remove item', error as Error, { itemId, userId })
    throw error
  }
}

/**
 * Remove item from shopping list
 * Use when item is no longer needed
 */
export async function removeFromShoppingList(
  itemId: string,
  userId: string,
  reason?: 'duplicate' | 'changed_mind' | 'already_bought' | 'unavailable' | 'other',
  notes?: string
): Promise<void> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)
    const actionRef = doc(collection(db, 'inventory_actions'))

    await runTransaction(db, async (transaction) => {
      const itemDoc = await transaction.get(itemRef)

      if (!itemDoc.exists()) {
        throw new Error('Item does not exist')
      }

      const item = itemDoc.data() as ShoppingItem

      // Mark as not needed
      transaction.update(itemRef, {
        needed: false,
        lastModifiedBy: userId,
        updatedAt: Timestamp.now()
      })

      // Log audit trail
      transaction.set(actionRef, {
        id: actionRef.id,
        itemId,
        action: 'removed_from_list',
        reason: reason || 'other',
        performedBy: userId,
        timestamp: Timestamp.now(),
        notes: notes || null,
        productName: item.productName
      })
    })

    logger.info('[Shopping] Item removed from shopping list', { itemId, reason, userId })
  } catch (error) {
    logger.error('[Shopping] Failed to remove from shopping list', error as Error, { itemId, userId })
    throw error
  }
}

/**
 * Update item quantity safely with atomic increment
 * Prevents race conditions on quantity updates
 */
export async function updateQuantitySafely(
  itemId: string,
  delta: number,
  userId: string
): Promise<void> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)

    await updateDoc(itemRef, {
      quantity: increment(delta), // Atomic increment/decrement
      lastModifiedBy: userId,
      updatedAt: Timestamp.now()
    })

    logger.info('[Shopping] Quantity updated safely', { itemId, delta, userId })
  } catch (error) {
    logger.error('[Shopping] Failed to update quantity', error as Error, { itemId, delta })
    throw error
  }
}

/**
 * Batch discard multiple items
 * More efficient than calling discardItemSafely multiple times
 */
export async function batchDiscardItems(
  itemIds: string[],
  userId: string,
  options: {
    addToShoppingList?: boolean
    reason?: 'expired' | 'spoiled' | 'moldy' | 'other'
  } = {}
): Promise<{ succeeded: string[]; failed: Array<{ itemId: string; error: string }> }> {
  const results = {
    succeeded: [] as string[],
    failed: [] as Array<{ itemId: string; error: string }>
  }

  // Process in batches of 500 (Firestore limit)
  const batchSize = 500
  for (let i = 0; i < itemIds.length; i += batchSize) {
    const batchItemIds = itemIds.slice(i, i + batchSize)

    try {
      const batch = writeBatch(db)
      const now = Timestamp.now()

      for (const itemId of batchItemIds) {
        const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)
        const actionRef = doc(collection(db, 'inventory_actions'))

        // Note: Batch writes don't support reads, so we can't check if already discarded
        // This is a trade-off for performance
        batch.update(itemRef, {
          inStock: false,
          quantity: 0,
          discardedAt: now,
          discardedBy: userId,
          discardReason: options.reason || 'other',
          lastModifiedBy: userId,
          updatedAt: now
        })

        batch.set(actionRef, {
          id: actionRef.id,
          itemId,
          action: 'discarded',
          reason: options.reason || 'other',
          performedBy: userId,
          timestamp: now
        })

        if (options.addToShoppingList) {
          batch.update(itemRef, {
            needed: true,
            priority: 'medium',
            requestedBy: arrayUnion(userId)
          })
        }
      }

      await batch.commit()
      results.succeeded.push(...batchItemIds)

      logger.info('[Shopping] Batch discard completed', {
        count: batchItemIds.length,
        userId
      })
    } catch (error) {
      logger.error('[Shopping] Batch discard failed', error as Error, {
        batchItemIds,
        userId
      })

      // Record failures
      batchItemIds.forEach(itemId => {
        results.failed.push({
          itemId,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      })
    }
  }

  return results
}

/**
 * Mark item as expired (without discarding yet)
 * Allows users to review before discarding
 */
export async function markItemAsExpired(
  itemId: string,
  userId: string
): Promise<void> {
  try {
    const itemRef = doc(db, SHOPPING_ITEMS_COLLECTION, itemId)

    await updateDoc(itemRef, {
      expiresAt: Timestamp.now(), // Set to now = expired
      priority: 'high', // Raise priority
      lastModifiedBy: userId,
      updatedAt: Timestamp.now()
    })

    logger.info('[Shopping] Item marked as expired', { itemId, userId })
  } catch (error) {
    logger.error('[Shopping] Failed to mark as expired', error as Error, { itemId })
    throw error
  }
}
