'use client'

/**
 * useShopping Hook
 *
 * React hook for managing shopping list and store visits
 */

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import type { ShoppingItem, ShoppingListSummary } from '@/types/shopping'
import { logger } from '@/lib/logger'
import {
  getAllShoppingItems,
  getNeededItems,
  addOrUpdateShoppingItem,
  updateShoppingItem,
  markItemAsConsumed,
  markItemAsPurchased,
  deleteShoppingItem,
  getStoreVisits,
  addManualShoppingItem
} from '@/lib/shopping-operations'
import {
  getAllStores,
  saveStore,
  updateStoreVisit,
  recordPrice,
  getAveragePrice
} from '@/lib/store-operations'
import type { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'
import { mergeIngredients } from '@/lib/shopping-diff'
import type { RecipeIngredient } from '@/lib/shopping-diff'
import type { Store, ProductCategory } from '@/types/shopping'

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [neededItems, setNeededItems] = useState<ShoppingItem[]>([])
  const [stores, setStores] = useState<Store[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = auth.currentUser?.uid

  /**
   * Fetch all shopping items and stores
   */
  const fetchItems = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [allItems, needed, userStores] = await Promise.all([
        getAllShoppingItems(userId),
        getNeededItems(userId),
        getAllStores(userId, 5) // Get 5 most recent stores
      ])

      setItems(allItems)
      setNeededItems(needed)
      setStores(userStores)
    } catch (err: any) {
      logger.error('Error fetching shopping items:', err)
      setError(err.message || 'Failed to load shopping items')
    } finally {
      setLoading(false)
    }
  }, [userId])

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

    const newItem = await addOrUpdateShoppingItem(userId, product, options)
    await fetchItems() // Refresh list
    return newItem
  }, [userId, fetchItems])

  /**
   * Mark item as consumed/used up
   */
  const consumeItem = useCallback(async (itemId: string) => {
    await markItemAsConsumed(itemId)
    await fetchItems()
  }, [fetchItems])

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
    await fetchItems()
  }, [fetchItems])

  /**
   * Update item
   */
  const updateItem = useCallback(async (
    itemId: string,
    updates: Partial<ShoppingItem>
  ) => {
    await updateShoppingItem(itemId, updates)
    await fetchItems()
  }, [fetchItems])

  /**
   * Delete item
   */
  const removeItem = useCallback(async (itemId: string) => {
    await deleteShoppingItem(itemId)
    await fetchItems()
  }, [fetchItems])

  /**
   * Toggle item needed status
   */
  const toggleNeeded = useCallback(async (itemId: string, needed: boolean) => {
    await updateShoppingItem(itemId, { needed })
    await fetchItems()
  }, [fetchItems])

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
      // Merge duplicate ingredients
      const mergedIngredients = mergeIngredients(ingredients)

      // Add each ingredient to shopping list
      const addPromises = mergedIngredients.map(ingredient =>
        addManualShoppingItem(userId, ingredient.name, {
          recipeId,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          priority: 'medium'
        })
      )

      await Promise.all(addPromises)
      await fetchItems()

      return { success: true, itemsAdded: mergedIngredients.length }
    } catch (error) {
      logger.error('Error adding recipe to shopping list:', error as Error)
      throw error
    }
  }, [userId, fetchItems])

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
      // Default sort: priority desc, then category
      return [...itemsToSort].sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority]
        if (priorityDiff !== 0) return priorityDiff
        return a.category.localeCompare(b.category)
      })
    }

    // Sort by store's aisle order
    return [...itemsToSort].sort((a, b) => {
      const aIndex = store.aisleOrder!.indexOf(a.category)
      const bIndex = store.aisleOrder!.indexOf(b.category)

      // Handle categories not in aisle order (put at end)
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

    await fetchItems() // Refresh to get updated stores list
    return newStore
  }, [userId, fetchItems])

  /**
   * Update store visit timestamp
   */
  const visitStore = useCallback(async (storeId: string) => {
    if (!userId) throw new Error('User not authenticated')

    await updateStoreVisit(userId, storeId)
    await fetchItems()
  }, [userId, fetchItems])

  // Load items on mount
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

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
    refresh: fetchItems
  }
}
