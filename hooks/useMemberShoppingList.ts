'use client'

/**
 * useMemberShoppingList Hook
 *
 * React hook for managing a family member's personal shopping list
 * within a household that shares a common inventory.
 */

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import type {
  MemberShoppingListItem,
  MemberShoppingListSummary,
  ShoppingItem,
  ProductCategory,
  QuantityUnit,
  ItemSource
} from '@/types/shopping'
import { logger } from '@/lib/logger'
import {
  getMemberShoppingList,
  addToMemberShoppingList,
  updateMemberShoppingListItem,
  removeFromMemberShoppingList,
  markMemberItemPurchased,
  getMemberShoppingListSummary,
  clearPurchasedItems
} from '@/lib/member-shopping-operations'
import {
  getHouseholdInventory,
  markHouseholdItemPurchased
} from '@/lib/household-shopping-operations'

interface UseMemberShoppingListOptions {
  householdId: string // Account owner's userId
  memberId?: string // If not provided, uses current user
  autoFetch?: boolean // Auto-fetch on mount (default: true)
}

export function useMemberShoppingList(options: UseMemberShoppingListOptions) {
  const { householdId, memberId: providedMemberId, autoFetch = true } = options

  const [memberItems, setMemberItems] = useState<MemberShoppingListItem[]>([])
  const [householdInventory, setHouseholdInventory] = useState<ShoppingItem[]>([])
  const [summary, setSummary] = useState<MemberShoppingListSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUserId = auth.currentUser?.uid
  const memberId = providedMemberId || currentUserId || ''

  /**
   * Fetch member's shopping list and household inventory
   */
  const fetchData = useCallback(async () => {
    if (!householdId || !memberId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [memberList, household, summaryData] = await Promise.all([
        getMemberShoppingList(householdId, memberId),
        getHouseholdInventory(householdId),
        getMemberShoppingListSummary(householdId, memberId)
      ])

      setMemberItems(memberList)
      setHouseholdInventory(household)
      setSummary(summaryData)
    } catch (err: any) {
      logger.error('[useMemberShoppingList] Error fetching data:', err)
      setError(err.message || 'Failed to load shopping list')
    } finally {
      setLoading(false)
    }
  }, [householdId, memberId])

  /**
   * Add item to member's list
   */
  const addItem = useCallback(
    async (itemData: {
      productKey?: string
      barcode?: string
      productName: string
      brand?: string
      imageUrl?: string
      category: ProductCategory
      quantity: number
      unit?: QuantityUnit
      priority?: 'low' | 'medium' | 'high'
      reason?: string
      recipeIds?: string[]
      source?: ItemSource
    }) => {
      try {
        await addToMemberShoppingList(householdId, memberId, itemData)
        await fetchData()
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error adding item:', err)
        throw err
      }
    },
    [householdId, memberId, fetchData]
  )

  /**
   * Update item in member's list
   */
  const updateItem = useCallback(
    async (
      itemId: string,
      updates: Partial<Omit<MemberShoppingListItem, 'id' | 'memberId' | 'householdId' | 'addedAt'>>
    ) => {
      try {
        await updateMemberShoppingListItem(householdId, memberId, itemId, updates)
        await fetchData()
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error updating item:', err)
        throw err
      }
    },
    [householdId, memberId, fetchData]
  )

  /**
   * Remove item from member's list
   */
  const removeItem = useCallback(
    async (itemId: string, productKey: string) => {
      try {
        await removeFromMemberShoppingList(householdId, memberId, itemId, productKey)
        await fetchData()
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error removing item:', err)
        throw err
      }
    },
    [householdId, memberId, fetchData]
  )

  /**
   * Mark item as purchased
   * Updates both member list and household inventory
   */
  const purchaseItem = useCallback(
    async (
      memberItemId: string,
      householdItemId: string,
      options?: {
        quantity?: number
        unit?: QuantityUnit
        expiresAt?: Date
        store?: string
      }
    ) => {
      try {
        // Mark as purchased in household inventory
        await markHouseholdItemPurchased(householdItemId, memberId, options)

        // Mark in member's list
        await markMemberItemPurchased(householdId, memberId, memberItemId, householdItemId)

        await fetchData()
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error purchasing item:', err)
        throw err
      }
    },
    [householdId, memberId, fetchData]
  )

  /**
   * Clear all purchased items from member's list
   */
  const clearPurchased = useCallback(async () => {
    try {
      const count = await clearPurchasedItems(householdId, memberId)
      await fetchData()
      return count
    } catch (err: any) {
      logger.error('[useMemberShoppingList] Error clearing purchased items:', err)
      throw err
    }
  }, [householdId, memberId, fetchData])

  /**
   * Get items that are needed (not yet purchased)
   */
  const getNeededItems = useCallback((): MemberShoppingListItem[] => {
    return memberItems.filter(item => item.needed)
  }, [memberItems])

  /**
   * Get items that have been purchased
   */
  const getPurchasedItems = useCallback((): MemberShoppingListItem[] => {
    return memberItems.filter(item => !item.needed && item.purchasedBy)
  }, [memberItems])

  /**
   * Find household inventory item by product key
   */
  const findInHouseholdInventory = useCallback(
    (productKey: string): ShoppingItem | undefined => {
      return householdInventory.find(item => item.productKey === productKey)
    },
    [householdInventory]
  )

  /**
   * Check if item is already in stock in household
   */
  const isInHouseholdStock = useCallback(
    (productKey: string): boolean => {
      const item = findInHouseholdInventory(productKey)
      return item ? item.inStock : false
    },
    [findInHouseholdInventory]
  )

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchData()
    }
  }, [autoFetch, fetchData])

  return {
    // Data
    memberItems,
    householdInventory,
    summary,
    loading,
    error,

    // Actions
    addItem,
    updateItem,
    removeItem,
    purchaseItem,
    clearPurchased,
    refresh: fetchData,

    // Computed values
    getNeededItems,
    getPurchasedItems,
    findInHouseholdInventory,
    isInHouseholdStock,

    // Metadata
    householdId,
    memberId
  }
}
