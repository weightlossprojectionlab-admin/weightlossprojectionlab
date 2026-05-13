'use client'

/**
 * useShopping Hook
 *
 * Real-time hook for managing shopping list and store visits.
 * Subscribes to `shopping_items` via Firestore onSnapshot so the list stays
 * in sync with /inventory and across devices/tabs.
 *
 * Multi-account scope:
 *   useShopping()                — defaults to the signed-in user's own
 *                                  bucket. Owner-context behavior, unchanged.
 *   useShopping(targetUserId)    — reads the bucket of `targetUserId`.
 *                                  Used when a caregiver opens
 *                                  /shopping/active?ownerId=<owner> to
 *                                  shop on behalf of an owner they have
 *                                  household access to. The Firestore
 *                                  rule's userId-as-owner branch (see
 *                                  firestore.rules) gates the read.
 *
 * Audit chain stays correct: the bucket userId identifies WHICH list
 * this item lives on; callers (ActiveShoppingMode etc.) still pass
 * `purchasedBy: auth.currentUser.uid` as a separate field to record the
 * actor. ShoppingItem.userId is the bucket, not the actor.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import type { ShoppingItem, ShoppingListSummary } from '@/types/shopping'
import { logger } from '@/lib/logger'
import {
  addOrUpdateShoppingItem,
  updateShoppingItem,
  markItemAsConsumed,
  markItemAsPurchased,
  deleteShoppingItem,
  addManualShoppingItem,
  convertTimestamps
} from '@/lib/shopping-operations'
import {
  getAllStores,
  saveStore,
  updateStoreVisit
} from '@/lib/store-operations'
import type { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'
import { mergeIngredients } from '@/lib/shopping-diff'
import type { RecipeIngredient } from '@/lib/shopping-diff'
import type { Store } from '@/types/shopping'
import { COLLECTIONS } from '@/constants/firestore'

const SHOPPING_ITEMS_COLLECTION = COLLECTIONS.SHOPPING_ITEMS

export function useShopping(targetUserId?: string) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bucket scope: the userId whose shopping_items we read/write. Defaults
  // to the signed-in user (own list); overridden when a caregiver passes
  // an ownerId to shop on someone else's behalf.
  const userId = targetUserId ?? auth.currentUser?.uid

  // Derive needed items from the live `items` snapshot — single source of truth.
  const neededItems = useMemo(
    () => items.filter(item => item.needed),
    [items]
  )

  // Real-time subscription to the user's shopping items.
  // Replaces what used to be two one-shot fetches (getAllShoppingItems +
  // getNeededItems). One listener, derived state for `needed`.
  //
  // Filtered on `householdId` (not `userId`) so the same query works for
  // both owner-self and caregiver-on-behalf paths:
  //   • For owners, householdId == auth.uid (single-user) or owner uid.
  //   • For caregivers (passing targetUserId), householdId == owner uid.
  // The shopping_items firestore.rules permit a caregiver familyMember
  // when the query filter matches `resource.data.householdId` — Firestore's
  // static query analyzer can prove that branch from the query alone,
  // unlike a userId-filtered query which combines a value-mismatch on
  // resource.data.userId with a cross-doc isHouseholdMember() check that
  // the analyzer refuses to prove statically. See
  // scripts/migrate-backfill-shopping-householdid.ts which normalized
  // every existing item to set householdId == userId.
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    // No orderBy — that would need a composite index on
    // (householdId asc, updatedAt desc) which doesn't exist. Items are
    // small in scale (≤ a few hundred per household) and every consumer
    // sorts client-side anyway (smartSort by aisle order, /shopping/active
    // segments by needed/found, etc.), so we sort here by updatedAt desc
    // after the snapshot lands. Same end result, no new index, no deploy.
    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('householdId', '==', userId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const all = snapshot.docs
          .map(doc =>
            convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
          )
          .sort((a, b) => {
            const aTs = (a.updatedAt instanceof Date ? a.updatedAt.getTime() : 0)
            const bTs = (b.updatedAt instanceof Date ? b.updatedAt.getTime() : 0)
            return bTs - aTs
          })
        setItems(all)
        setLoading(false)
        setError(null)
      },
      (err) => {
        logger.error('[useShopping] Snapshot error', err)
        setError(err.message || 'Failed to load shopping items')
        setLoading(false)
      }
    )

    return unsubscribe
  }, [userId])

  // Stores stay one-shot — they change rarely and aren't part of the
  // realtime sync requirement. Kept as a separate fetch so addStore can
  // refresh them locally without needing a second listener.
  const refreshStores = useCallback(async () => {
    if (!userId) return
    try {
      const userStores = await getAllStores(userId, 5)
      setStores(userStores)
    } catch (err) {
      logger.error('[useShopping] Error fetching stores', err as Error)
    }
  }, [userId])

  useEffect(() => {
    refreshStores()
  }, [refreshStores])

  /**
   * Add or update item from barcode scan
   */
  const addItem = useCallback(async (
    product: OpenFoodFactsProduct,
    options?: {
      inStock?: boolean
      quantity?: number
      unit?: import('@/types/shopping').QuantityUnit
      expiresAt?: Date
      location?: any
      needed?: boolean
      store?: string
    }
  ) => {
    if (!userId) throw new Error('User not authenticated')
    return addOrUpdateShoppingItem(userId, product, options)
  }, [userId])

  /**
   * Mark item as consumed/used up.
   *
   *   consumeItem(id)                     → consume entire item
   *   consumeItem(id, 1)                  → count-based, decrement quantity by 1
   *   consumeItem(id, { useAmount: 2.5 }) → amount-based (Phase 2b), decrement
   *                                         remainingAmount by 2.5 in containerUnit
   */
  const consumeItem = useCallback(async (
    itemId: string,
    useQuantityOrOptions?: number | { useAmount: number }
  ) => {
    await markItemAsConsumed(itemId, useQuantityOrOptions)
  }, [])

  /**
   * Mark item as purchased
   */
  const purchaseItem = useCallback(async (
    itemId: string,
    options?: {
      quantity?: number
      unit?: import('@/types/shopping').QuantityUnit
      expiresAt?: Date
      store?: string
    }
  ) => {
    await markItemAsPurchased(itemId, options)
  }, [])

  /**
   * Update item
   */
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<ShoppingItem>
  ) => {
    await updateShoppingItem(itemId, updates)
  }, [])

  /**
   * Delete item
   */
  const removeItem = useCallback(async (itemId: string) => {
    await deleteShoppingItem(itemId)
  }, [])

  /**
   * Toggle item needed status
   */
  const toggleNeeded = useCallback(async (itemId: string, needed: boolean) => {
    await updateShoppingItem(itemId, { needed })
  }, [])

  /**
   * Add ingredients from recipe to shopping list
   * Merges quantities for duplicate items
   */
  const addFromRecipe = useCallback(async (
    recipeId: string,
    ingredients: RecipeIngredient[]
  ) => {
    if (!userId) throw new Error('User not authenticated')

    try {
      const mergedIngredients = mergeIngredients(ingredients)

      const addPromises = mergedIngredients.map(ingredient =>
        addManualShoppingItem(userId, ingredient.name, {
          recipeId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          priority: 'medium'
        })
      )

      await Promise.all(addPromises)

      return { success: true, itemsAdded: mergedIngredients.length }
    } catch (error) {
      logger.error('Error adding recipe to shopping list:', error as Error)
      throw error
    }
  }, [userId])

  /**
   * Get shopping list summary
   */
  const getSummary = useCallback((): ShoppingListSummary => {
    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

    const expiringItems = items.filter(item =>
      item.inStock &&
      item.expiresAt &&
      item.expiresAt <= threeDaysFromNow
    )

    const highPriorityItems = neededItems.filter(item =>
      item.priority === 'high'
    )

    return {
      totalItems: items.length,
      neededItems: neededItems.length,
      highPriorityItems: highPriorityItems.length,
      expiringItems: expiringItems.length,
      lastUpdated: now
    }
  }, [items, neededItems])

  /**
   * Smart sort shopping items by store aisle order
   */
  const smartSort = useCallback((
    itemsToSort: ShoppingItem[],
    storeId?: string
  ): ShoppingItem[] => {
    const store = stores.find(s => s.id === storeId)

    if (!store || !store.aisleOrder) {
      return [...itemsToSort].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.category.localeCompare(b.category)
      })
    }

    return [...itemsToSort].sort((a, b) => {
      const aIndex = store.aisleOrder!.indexOf(a.category)
      const bIndex = store.aisleOrder!.indexOf(b.category)

      if (aIndex === -1 && bIndex === -1) return 0
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1

      return aIndex - bIndex
    })
  }, [stores])

  /**
   * Add or update a store
   */
  const addStore = useCallback(async (
    storeName: string,
    options?: {
      latitude?: number
      longitude?: number
      placeId?: string
    }
  ) => {
    if (!userId) throw new Error('User not authenticated')

    const newStore = await saveStore(userId, {
      name: storeName,
      latitude: options?.latitude,
      longitude: options?.longitude,
      placeId: options?.placeId,
      lastVisitedAt: new Date()
    })

    await refreshStores()
    return newStore
  }, [userId, refreshStores])

  /**
   * Update store visit timestamp
   */
  const visitStore = useCallback(async (storeId: string) => {
    if (!userId) throw new Error('User not authenticated')

    await updateStoreVisit(userId, storeId)
    await refreshStores()
  }, [userId, refreshStores])

  return {
    items,
    neededItems,
    stores,
    loading,
    error,
    addItem,
    addFromRecipe,
    consumeItem,
    purchaseItem,
    updateItem,
    removeItem,
    toggleNeeded,
    getSummary,
    smartSort,
    addStore,
    visitStore,
    // No-op kept for callers (RecipeModal, shopping page) that still
    // explicitly request a refresh after mutations. The snapshot listener
    // delivers item changes automatically; this just refreshes the
    // one-shot stores list in case a store was added externally.
    refresh: refreshStores
  }
}
