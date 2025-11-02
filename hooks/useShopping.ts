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
  getStoreVisits
} from '@/lib/shopping-operations'
import type { OpenFoodFactsProduct } from '@/lib/openfoodfacts-api'

export function useShopping() {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [neededItems, setNeededItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = auth.currentUser?.uid

  /**
   * Fetch all shopping items
   */
  const fetchItems = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [allItems, needed] = await Promise.all([
        getAllShoppingItems(userId),
        getNeededItems(userId)
      ])

      setItems(allItems)
      setNeededItems(needed)
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

  // Load items on mount
  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  return {
    items,
    neededItems,
    loading,
    error,
    addItem,
    consumeItem,
    purchaseItem,
    updateItem,
    removeItem,
    toggleNeeded,
    getSummary,
    refresh: fetchItems
  }
}
