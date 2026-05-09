'use client'

/**
 * useMemberShoppingList Hook
 *
 * Real-time hook for managing a family member's personal shopping list
 * within a household that shares a common inventory. Subscribes to both
 * the member's items subcollection and the household's shared inventory
 * via Firestore onSnapshot so changes from /inventory and other devices
 * are reflected immediately.
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
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
  addToMemberShoppingList,
  updateMemberShoppingListItem,
  removeFromMemberShoppingList,
  markMemberItemPurchased,
  clearPurchasedItems,
  getMemberShoppingListPath
} from '@/lib/member-shopping-operations'
import {
  markHouseholdItemPurchased
} from '@/lib/household-shopping-operations'
import { convertTimestamps } from '@/lib/shopping-operations'
import { COLLECTIONS } from '@/constants/firestore'

const SHOPPING_ITEMS_COLLECTION = COLLECTIONS.SHOPPING_ITEMS

interface UseMemberShoppingListOptions {
  householdId: string
  memberId?: string
  /** Reserved for opting out of subscriptions; currently always-on. */
  autoFetch?: boolean
}

export function useMemberShoppingList(options: UseMemberShoppingListOptions) {
  const { householdId, memberId: providedMemberId } = options

  const [memberItems, setMemberItems] = useState<MemberShoppingListItem[]>([])
  // Household inventory is the union of two queries (householdId and userId
  // for backwards compat — mirrors getHouseholdInventory's dual fetch). We
  // keep them in separate state slices and merge in useMemo so each
  // snapshot can update independently.
  const [inventoryByHousehold, setInventoryByHousehold] = useState<ShoppingItem[]>([])
  const [inventoryByUser, setInventoryByUser] = useState<ShoppingItem[]>([])
  const [memberLoading, setMemberLoading] = useState(true)
  const [householdLoading, setHouseholdLoading] = useState(true)
  const [userLoading, setUserLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUserId = auth.currentUser?.uid
  const memberId = providedMemberId || currentUserId || ''
  const loading = memberLoading || householdLoading || userLoading

  // Subscribe to the member's personal shopping subcollection.
  useEffect(() => {
    if (!householdId || !memberId) {
      setMemberLoading(false)
      return
    }

    const memberListPath = getMemberShoppingListPath(householdId, memberId)
    const q = query(
      collection(db, memberListPath),
      orderBy('addedAt', 'desc')
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc => {
          const data = doc.data()
          return {
            id: doc.id,
            ...data,
            addedAt: data.addedAt?.toDate?.() || new Date(),
            updatedAt: data.updatedAt?.toDate?.() || new Date(),
            purchasedAt: data.purchasedAt?.toDate?.()
          } as MemberShoppingListItem
        })
        setMemberItems(items)
        setMemberLoading(false)
        setError(null)
      },
      (err) => {
        logger.error('[useMemberShoppingList] Member list snapshot error', err, {
          householdId,
          memberId
        })
        setError(err.message || 'Failed to load member shopping list')
        setMemberLoading(false)
      }
    )

    return unsubscribe
  }, [householdId, memberId])

  // Subscribe to household inventory by householdId.
  useEffect(() => {
    if (!householdId) {
      setHouseholdLoading(false)
      return
    }

    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('householdId', '==', householdId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc =>
          convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
        )
        setInventoryByHousehold(items)
        setHouseholdLoading(false)
      },
      (err) => {
        logger.error('[useMemberShoppingList] Household snapshot error', err, { householdId })
        setHouseholdLoading(false)
      }
    )

    return unsubscribe
  }, [householdId])

  // Subscribe to household inventory by userId (backwards-compat path —
  // mirrors getHouseholdInventory's second query). Items written before
  // the householdId field existed only carry userId.
  useEffect(() => {
    if (!householdId) {
      setUserLoading(false)
      return
    }

    const q = query(
      collection(db, SHOPPING_ITEMS_COLLECTION),
      where('userId', '==', householdId)
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map(doc =>
          convertTimestamps({ id: doc.id, ...doc.data() }) as ShoppingItem
        )
        setInventoryByUser(items)
        setUserLoading(false)
      },
      (err) => {
        logger.error('[useMemberShoppingList] User snapshot error', err, { householdId })
        setUserLoading(false)
      }
    )

    return unsubscribe
  }, [householdId])

  // Merge the two inventory streams, deduplicating by document id (same
  // dedup behavior as getHouseholdInventory).
  const householdInventory = useMemo(() => {
    const map = new Map<string, ShoppingItem>()
    inventoryByHousehold.forEach(item => map.set(item.id, item))
    inventoryByUser.forEach(item => {
      if (!map.has(item.id)) map.set(item.id, item)
    })
    return Array.from(map.values())
  }, [inventoryByHousehold, inventoryByUser])

  // Summary derived from the live member list — same shape as the old
  // getMemberShoppingListSummary one-shot.
  const summary = useMemo<MemberShoppingListSummary>(() => {
    const needed = memberItems.filter(item => item.needed)
    const purchased = memberItems.filter(item => !item.needed && item.purchasedBy)
    const highPriority = memberItems.filter(item => item.needed && item.priority === 'high')
    return {
      memberId,
      totalItems: memberItems.length,
      neededItems: needed.length,
      purchasedItems: purchased.length,
      highPriorityItems: highPriority.length,
      lastUpdated: new Date()
    }
  }, [memberItems, memberId])

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
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error adding item:', err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [householdId, memberId]
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
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error updating item:', err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [householdId, memberId]
  )

  /**
   * Remove item from member's list
   */
  const removeItem = useCallback(
    async (itemId: string, productKey: string) => {
      try {
        await removeFromMemberShoppingList(householdId, memberId, itemId, productKey)
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error removing item:', err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [householdId, memberId]
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
        await markHouseholdItemPurchased(householdItemId, memberId, options)
        await markMemberItemPurchased(householdId, memberId, memberItemId, householdItemId)
      } catch (err: any) {
        logger.error('[useMemberShoppingList] Error purchasing item:', err instanceof Error ? err : new Error(String(err)))
        throw err
      }
    },
    [householdId, memberId]
  )

  /**
   * Clear all purchased items from member's list
   */
  const clearPurchased = useCallback(async () => {
    try {
      return await clearPurchasedItems(householdId, memberId)
    } catch (err: any) {
      logger.error('[useMemberShoppingList] Error clearing purchased items:', err instanceof Error ? err : new Error(String(err)))
      throw err
    }
  }, [householdId, memberId])

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

  // No-op kept for callers that still explicitly request a refresh.
  // The snapshot listeners deliver changes automatically.
  const refresh = useCallback(async () => {
    return Promise.resolve()
  }, [])

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
    refresh,

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
