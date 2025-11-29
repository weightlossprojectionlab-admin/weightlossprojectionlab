'use client'

/**
 * Member Shopping List Operations
 *
 * Manages individual family member's shopping lists within a household.
 * Each member can maintain their own list while sharing a common inventory.
 */

import { logger } from '@/lib/logger'
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  MemberShoppingListItem,
  MemberShoppingListSummary,
  ProductCategory,
  QuantityUnit,
  ItemSource
} from '@/types/shopping'
import { SUBCOLLECTIONS } from '@/constants/firestore'
import { generateProductKey, findHouseholdItemByProductKey, addOrUpdateHouseholdItem, removeMemberFromItemRequest } from './household-shopping-operations'
import { suggestDefaultUnit, formatQuantityDisplay } from './product-categories'

/**
 * Get the path to a member's shopping list
 */
function getMemberShoppingListPath(householdId: string, memberId: string): string {
  return `users/${householdId}/${SUBCOLLECTIONS.USERS.MEMBER_SHOPPING_LISTS}/${memberId}/items`
}

/**
 * Add item to member's personal shopping list
 */
export async function addToMemberShoppingList(
  householdId: string,
  memberId: string,
  itemData: {
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
  }
): Promise<MemberShoppingListItem> {
  try {
    const productKey = itemData.productKey || generateProductKey(
      itemData.barcode,
      itemData.productName,
      itemData.brand || ''
    )

    const unit = itemData.unit || suggestDefaultUnit(itemData.category)
    const displayQuantity = formatQuantityDisplay(itemData.quantity, unit)

    const newItem: Omit<MemberShoppingListItem, 'id'> = {
      memberId,
      householdId,
      productKey,
      barcode: itemData.barcode,
      productName: itemData.productName,
      brand: itemData.brand || '',
      imageUrl: itemData.imageUrl,
      category: itemData.category,
      quantity: itemData.quantity,
      unit,
      displayQuantity,
      priority: itemData.priority || 'medium',
      needed: true,
      reason: itemData.reason,
      recipeIds: itemData.recipeIds || [],
      source: itemData.source,
      addedAt: new Date(),
      updatedAt: new Date()
    }

    const memberListPath = getMemberShoppingListPath(householdId, memberId)
    const docRef = doc(collection(db, memberListPath))

    await setDoc(docRef, {
      ...newItem,
      addedAt: Timestamp.fromDate(newItem.addedAt),
      updatedAt: Timestamp.fromDate(newItem.updatedAt)
    })

    // Also add/update in household inventory
    await addOrUpdateHouseholdItem(householdId, memberId, {
      productKey,
      barcode: itemData.barcode,
      productName: itemData.productName,
      brand: itemData.brand || '',
      imageUrl: itemData.imageUrl,
      category: itemData.category,
      quantity: itemData.quantity,
      unit,
      inStock: false,
      needed: true
    })

    logger.info('[MemberShoppingOps] Added item to member list', {
      householdId,
      memberId,
      productName: itemData.productName
    })

    return { ...newItem, id: docRef.id }
  } catch (error) {
    logger.error('[MemberShoppingOps] Error adding item to member list', error as Error, {
      householdId,
      memberId
    })
    throw error
  }
}

/**
 * Get all items in a member's shopping list
 */
export async function getMemberShoppingList(
  householdId: string,
  memberId: string,
  filters?: {
    needed?: boolean
  }
): Promise<MemberShoppingListItem[]> {
  try {
    const memberListPath = getMemberShoppingListPath(householdId, memberId)

    let q = query(
      collection(db, memberListPath),
      orderBy('addedAt', 'desc')
    )

    if (filters?.needed !== undefined) {
      q = query(q, where('needed', '==', filters.needed))
    }

    const snapshot = await getDocs(q)

    return snapshot.docs.map(doc => {
      const data = doc.data()
      return {
        id: doc.id,
        ...data,
        addedAt: data.addedAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        purchasedAt: data.purchasedAt?.toDate()
      } as MemberShoppingListItem
    })
  } catch (error) {
    logger.error('[MemberShoppingOps] Error getting member shopping list', error as Error, {
      householdId,
      memberId
    })
    return []
  }
}

/**
 * Update a member shopping list item
 */
export async function updateMemberShoppingListItem(
  householdId: string,
  memberId: string,
  itemId: string,
  updates: Partial<Omit<MemberShoppingListItem, 'id' | 'memberId' | 'householdId' | 'addedAt'>>
): Promise<MemberShoppingListItem> {
  try {
    const memberListPath = getMemberShoppingListPath(householdId, memberId)
    const itemRef = doc(db, memberListPath, itemId)

    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    }

    // If quantity or unit is being updated, regenerate displayQuantity
    if (updates.quantity !== undefined || updates.unit !== undefined) {
      const currentDoc = await getDoc(itemRef)
      const currentItem = currentDoc.data() as MemberShoppingListItem

      const newQuantity = updates.quantity ?? currentItem.quantity
      const newUnit = updates.unit ?? currentItem.unit

      updateData.displayQuantity = formatQuantityDisplay(newQuantity, newUnit as QuantityUnit)
    }

    await setDoc(itemRef, updateData, { merge: true })

    const updatedDoc = await getDoc(itemRef)
    const data = updatedDoc.data()!

    return {
      id: updatedDoc.id,
      ...data,
      addedAt: data.addedAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      purchasedAt: data.purchasedAt?.toDate()
    } as MemberShoppingListItem
  } catch (error) {
    logger.error('[MemberShoppingOps] Error updating member list item', error as Error, {
      householdId,
      memberId,
      itemId
    })
    throw error
  }
}

/**
 * Mark member's item as purchased
 * This marks it in their personal list and updates household inventory
 */
export async function markMemberItemPurchased(
  householdId: string,
  memberId: string,
  itemId: string,
  householdItemId?: string
): Promise<void> {
  try {
    // Update member's list
    await updateMemberShoppingListItem(householdId, memberId, itemId, {
      needed: false,
      purchasedBy: memberId,
      purchasedAt: new Date(),
      householdItemId
    })

    logger.info('[MemberShoppingOps] Marked item as purchased', {
      householdId,
      memberId,
      itemId
    })
  } catch (error) {
    logger.error('[MemberShoppingOps] Error marking item as purchased', error as Error, {
      householdId,
      memberId,
      itemId
    })
    throw error
  }
}

/**
 * Remove item from member's shopping list
 */
export async function removeFromMemberShoppingList(
  householdId: string,
  memberId: string,
  itemId: string,
  productKey: string
): Promise<void> {
  try {
    const memberListPath = getMemberShoppingListPath(householdId, memberId)
    const itemRef = doc(db, memberListPath, itemId)

    await deleteDoc(itemRef)

    // Check if this was in household inventory and remove member from requestedBy
    const householdItem = await findHouseholdItemByProductKey(householdId, productKey)
    if (householdItem) {
      await removeMemberFromItemRequest(householdItem.id, memberId)
    }

    logger.info('[MemberShoppingOps] Removed item from member list', {
      householdId,
      memberId,
      itemId
    })
  } catch (error) {
    logger.error('[MemberShoppingOps] Error removing item from member list', error as Error, {
      householdId,
      memberId,
      itemId
    })
    throw error
  }
}

/**
 * Get summary of member's shopping list
 */
export async function getMemberShoppingListSummary(
  householdId: string,
  memberId: string
): Promise<MemberShoppingListSummary> {
  try {
    const items = await getMemberShoppingList(householdId, memberId)

    const neededItems = items.filter(item => item.needed)
    const purchasedItems = items.filter(item => !item.needed && item.purchasedBy)
    const highPriorityItems = items.filter(item => item.needed && item.priority === 'high')

    return {
      memberId,
      totalItems: items.length,
      neededItems: neededItems.length,
      purchasedItems: purchasedItems.length,
      highPriorityItems: highPriorityItems.length,
      lastUpdated: new Date()
    }
  } catch (error) {
    logger.error('[MemberShoppingOps] Error getting member list summary', error as Error, {
      householdId,
      memberId
    })
    throw error
  }
}

/**
 * Clear purchased items from member's list
 */
export async function clearPurchasedItems(
  householdId: string,
  memberId: string
): Promise<number> {
  try {
    const items = await getMemberShoppingList(householdId, memberId, { needed: false })
    const memberListPath = getMemberShoppingListPath(householdId, memberId)

    let clearedCount = 0
    for (const item of items) {
      if (!item.needed && item.purchasedBy) {
        const itemRef = doc(db, memberListPath, item.id)
        await deleteDoc(itemRef)
        clearedCount++
      }
    }

    logger.info('[MemberShoppingOps] Cleared purchased items', {
      householdId,
      memberId,
      count: clearedCount
    })

    return clearedCount
  } catch (error) {
    logger.error('[MemberShoppingOps] Error clearing purchased items', error as Error, {
      householdId,
      memberId
    })
    throw error
  }
}
