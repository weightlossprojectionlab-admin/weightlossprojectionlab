'use client'

/**
 * Real-Time Shopping List Hook
 *
 * Provides live synchronization of shopping list items across all devices
 * using Firestore onSnapshot for multi-user households
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  DocumentChange,
  QuerySnapshot
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import type { ShoppingItem } from '@/types/shopping'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { patientOperations } from '@/lib/medical-operations'
import { useNotificationPreferences } from './useNotificationPreferences'

interface ShoppingListState {
  items: ShoppingItem[]
  activeItems: ShoppingItem[] // needed=true
  purchasedItems: ShoppingItem[] // recently purchased
  loading: boolean
  error: string | null
}

interface UseRealtimeShoppingListOptions {
  householdId?: string // If provided, query by householdId instead of userId
}

export function useRealtimeShoppingList(options?: UseRealtimeShoppingListOptions) {
  const [state, setState] = useState<ShoppingListState>({
    items: [],
    activeItems: [],
    purchasedItems: [],
    loading: true,
    error: null
  })

  const [members, setMembers] = useState<Record<string, { name: string; nickname?: string }>>(
    {}
  )
  const userId = auth.currentUser?.uid
  const householdId = options?.householdId
  const { shouldShowNotification } = useNotificationPreferences()

  // Fetch household members for notifications
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const patients = await patientOperations.getPatients()
        const memberMap: Record<string, { name: string; nickname?: string }> = {}
        patients.forEach(p => {
          memberMap[p.id] = {
            name: p.name,
            nickname: p.nickname
          }
        })
        setMembers(memberMap)
      } catch (error) {
        logger.error('[RealtimeShoppingList] Error fetching members', error as Error)
      }
    }

    if (userId) {
      fetchMembers()
    }
  }, [userId])

  const getMemberName = useCallback(
    (memberId?: string): string => {
      if (!memberId) return 'Someone'
      if (memberId === userId) return 'You'
      const member = members[memberId]
      return member?.nickname || member?.name || 'Someone'
    },
    [members, userId]
  )

  /**
   * Handle real-time shopping list changes
   * Shows notifications when other users make changes
   */
  const handleShoppingListChange = useCallback(
    (change: DocumentChange) => {
      const item = change.doc.data() as ShoppingItem
      const currentUser = userId

      // Don't notify for own changes
      if (
        item.requestedBy === currentUser ||
        item.addedBy === currentUser ||
        item.purchasedBy === currentUser
      ) {
        return
      }

      switch (change.type) {
        case 'added':
          // New item added to shopping list
          const requestedBy = Array.isArray(item.requestedBy) ? item.requestedBy[0] : item.requestedBy
          if (requestedBy && requestedBy !== currentUser) {
            if (shouldShowNotification('shopping', 'addedToList')) {
              toast(
                `${getMemberName(requestedBy)} added ${item.productName} to shopping list`,
                {
                  icon: '📝',
                  duration: 3000
                }
              )
            }
          }
          break

        case 'modified':
          // Item was updated
          if (item.purchasedBy && item.purchasedBy !== currentUser && item.inStock) {
            if (shouldShowNotification('shopping', 'purchased')) {
              toast.success(
                `${getMemberName(item.purchasedBy)} purchased ${item.productName}`,
                {
                  icon: '🛒',
                  duration: 3000
                }
              )
            }
          } else if (!item.needed && item.lastModifiedBy !== currentUser) {
            if (shouldShowNotification('shopping', 'addedToList')) {
              toast(
                `${getMemberName(item.lastModifiedBy)} removed ${item.productName} from list`,
                {
                  icon: '✓',
                  duration: 3000
                }
              )
            }
          } else if (item.foundInStore && item.lastModifiedBy !== currentUser) {
            // New: In-store find alert
            if (shouldShowNotification('shopping', 'inStoreFind')) {
              toast.success(
                `${getMemberName(item.lastModifiedBy)} found ${item.productName} at the store!`,
                {
                  icon: '🛍️',
                  duration: 4000
                }
              )
            }
          }
          break

        case 'removed':
          // Item was deleted from shopping list
          if (item.lastModifiedBy && item.lastModifiedBy !== currentUser) {
            if (shouldShowNotification('shopping', 'addedToList')) {
              toast(
                `${getMemberName(item.lastModifiedBy)} deleted ${item.productName}`,
                {
                  icon: '🗑️',
                  duration: 3000
                }
              )
            }
          }
          break
      }
    },
    [getMemberName, userId, shouldShowNotification]
  )

  /**
   * Organize shopping list items
   */
  const organizeItems = useCallback((items: ShoppingItem[]) => {
    const active = items.filter(item => item.needed && !item.inStock)
    const purchased = items.filter(item => item.inStock)

    return { active, purchased }
  }, [])

  // Real-time listener for shopping list
  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    logger.info('[RealtimeShoppingList] Setting up snapshot listener', {
      userId,
      householdId,
      mode: householdId ? 'household' : 'user'
    })

    // Query for shopping list items (either needed or recently purchased)
    // If householdId is provided, query by household; otherwise fall back to userId (legacy)
    const q = householdId
      ? query(
          collection(db, 'shopping_items'),
          where('householdId', '==', householdId),
          where('needed', '==', true),
          orderBy('createdAt', 'desc')
        )
      : query(
          collection(db, 'shopping_items'),
          where('userId', '==', userId),
          where('needed', '==', true),
          orderBy('createdAt', 'desc')
        )

    let isFirstSnapshot = true

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          updatedAt: doc.data().updatedAt?.toDate?.() || new Date(doc.data().updatedAt),
          expiresAt: doc.data().expiresAt?.toDate?.() ||
            (doc.data().expiresAt ? new Date(doc.data().expiresAt) : undefined)
        })) as ShoppingItem[]

        const organized = organizeItems(items)

        setState({
          items,
          activeItems: organized.active,
          purchasedItems: organized.purchased,
          loading: false,
          error: null
        })

        // Handle changes (but skip initial load)
        if (!isFirstSnapshot) {
          snapshot.docChanges().forEach(change => {
            handleShoppingListChange(change)
          })
        }

        isFirstSnapshot = false

        logger.info('[RealtimeShoppingList] Snapshot received', {
          userId,
          householdId,
          totalItems: items.length,
          active: organized.active.length,
          purchased: organized.purchased.length
        })
      },
      error => {
        logger.error('[RealtimeShoppingList] Snapshot error', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load shopping list'
        }))
        toast.error('Failed to load shopping list. Please refresh.')
      }
    )

    // Cleanup listener on unmount
    return () => {
      logger.info('[RealtimeShoppingList] Cleaning up snapshot listener', { userId, householdId })
      unsubscribe()
    }
  }, [userId, householdId, handleShoppingListChange, organizeItems])

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(() => {
    return {
      totalItems: state.items.length,
      activeItems: state.activeItems.length,
      purchasedItems: state.purchasedItems.length
    }
  }, [state])

  /**
   * Check for duplicates in shopping list
   */
  const checkForDuplicate = useCallback(
    (productName: string, barcode?: string) => {
      // Check by barcode first (exact match)
      if (barcode) {
        const barcodeMatch = state.items.find(item => item.barcode === barcode)
        if (barcodeMatch) {
          return { found: true, item: barcodeMatch, matchType: 'exact' as const }
        }
      }

      // Check by product name (fuzzy match)
      const nameLower = productName.toLowerCase()
      const nameMatch = state.items.find(item => {
        const itemNameLower = item.productName.toLowerCase()
        return (
          itemNameLower === nameLower ||
          itemNameLower.includes(nameLower) ||
          nameLower.includes(itemNameLower)
        )
      })

      if (nameMatch) {
        return { found: true, item: nameMatch, matchType: 'name' as const }
      }

      return { found: false, item: null, matchType: null }
    },
    [state.items]
  )

  return {
    items: state.items,
    activeItems: state.activeItems,
    purchasedItems: state.purchasedItems,
    loading: state.loading,
    error: state.error,
    getSummary,
    checkForDuplicate
  }
}
