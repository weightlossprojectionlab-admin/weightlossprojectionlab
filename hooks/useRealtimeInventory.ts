'use client'

/**
 * Real-Time Inventory Hook
 *
 * Provides live synchronization of kitchen inventory across all devices
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
import type { ShoppingItem, StorageLocation } from '@/types/shopping'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { patientOperations } from '@/lib/medical-operations'
import { useNotificationPreferences } from './useNotificationPreferences'

interface RealtimeInventoryState {
  allItems: ShoppingItem[]
  fridgeItems: ShoppingItem[]
  freezerItems: ShoppingItem[]
  pantryItems: ShoppingItem[]
  counterItems: ShoppingItem[]
  loading: boolean
  error: string | null
}

interface UseRealtimeInventoryOptions {
  householdId?: string // If provided, query by householdId instead of userId
}

export function useRealtimeInventory(options?: UseRealtimeInventoryOptions) {
  const [state, setState] = useState<RealtimeInventoryState>({
    allItems: [],
    fridgeItems: [],
    freezerItems: [],
    pantryItems: [],
    counterItems: [],
    loading: true,
    error: null
  })

  const [members, setMembers] = useState<Record<string, { name: string; nickname?: string }>>({})
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
        logger.error('[RealtimeInventory] Error fetching members', error as Error)
      }
    }

    if (userId) {
      fetchMembers()
    }
  }, [userId])

  const getMemberName = useCallback((memberId?: string): string => {
    if (!memberId) return 'Someone'
    if (memberId === userId) return 'You'
    const member = members[memberId]
    return member?.nickname || member?.name || 'Someone'
  }, [members, userId])

  /**
   * Handle real-time inventory changes
   * Shows notifications when other users make changes
   */
  const handleInventoryChange = useCallback((change: DocumentChange) => {
    const item = change.doc.data() as ShoppingItem
    const currentUser = userId

    // Don't notify for own changes
    if (item.lastModifiedBy === currentUser || item.discardedBy === currentUser) {
      return
    }

    switch (change.type) {
      case 'removed':
        // Item was discarded or removed
        if (item.discardedBy) {
          if (shouldShowNotification('inventory', 'discarded')) {
            toast.info(
              `${getMemberName(item.discardedBy)} discarded ${item.productName}`,
              {
                icon: '🗑️',
                duration: 4000
              }
            )
          }
        }
        break

      case 'modified':
        // Item was updated (quantity changed, marked expired, etc.)
        if (item.lastModifiedBy && item.lastModifiedBy !== currentUser) {
          // Only notify for significant changes
          if (item.quantity === 0 && item.needed) {
            if (shouldShowNotification('inventory', 'lowStock')) {
              toast.info(
                `${getMemberName(item.lastModifiedBy)} marked ${item.productName} as used up`,
                {
                  icon: '✓',
                  duration: 3000
                }
              )
            }
          }
        }
        break

      case 'added':
        // New item added to inventory
        if (item.purchasedBy && item.purchasedBy !== currentUser) {
          if (shouldShowNotification('inventory', 'added')) {
            toast.success(
              `${getMemberName(item.purchasedBy)} added ${item.productName} to inventory`,
              {
                icon: '📦',
                duration: 3000
              }
            )
          }
        }
        break
    }
  }, [getMemberName, userId, shouldShowNotification])

  /**
   * Organize items by storage location
   */
  const organizeItems = useCallback((items: ShoppingItem[]) => {
    const fridge: ShoppingItem[] = []
    const freezer: ShoppingItem[] = []
    const pantry: ShoppingItem[] = []
    const counter: ShoppingItem[] = []

    items.forEach(item => {
      switch (item.location) {
        case 'fridge':
          fridge.push(item)
          break
        case 'freezer':
          freezer.push(item)
          break
        case 'pantry':
          pantry.push(item)
          break
        case 'counter':
          counter.push(item)
          break
      }
    })

    return { fridge, freezer, pantry, counter }
  }, [])

  // Real-time listener for inventory
  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    logger.info('[RealtimeInventory] Setting up snapshot listener', {
      userId,
      householdId,
      mode: householdId ? 'household' : 'user'
    })

    // Query for all in-stock items
    // If householdId is provided, query by household; otherwise fall back to userId (legacy)
    const q = householdId
      ? query(
          collection(db, 'shopping_items'),
          where('householdId', '==', householdId),
          where('inStock', '==', true),
          orderBy('expiresAt', 'asc')
        )
      : query(
          collection(db, 'shopping_items'),
          where('userId', '==', userId),
          where('inStock', '==', true),
          orderBy('expiresAt', 'asc')
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
          expiresAt: doc.data().expiresAt?.toDate?.() || (doc.data().expiresAt ? new Date(doc.data().expiresAt) : undefined)
        })) as ShoppingItem[]

        const organized = organizeItems(items)

        setState({
          allItems: items,
          fridgeItems: organized.fridge,
          freezerItems: organized.freezer,
          pantryItems: organized.pantry,
          counterItems: organized.counter,
          loading: false,
          error: null
        })

        // Handle changes (but skip initial load)
        if (!isFirstSnapshot) {
          snapshot.docChanges().forEach(change => {
            handleInventoryChange(change)
          })
        }

        isFirstSnapshot = false

        logger.info('[RealtimeInventory] Snapshot received', {
          userId,
          householdId,
          totalItems: items.length,
          fridge: organized.fridge.length,
          freezer: organized.freezer.length,
          pantry: organized.pantry.length,
          counter: organized.counter.length
        })
      },
      (error) => {
        logger.error('[RealtimeInventory] Snapshot error', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load inventory'
        }))
        toast.error('Failed to load inventory. Please refresh.')
      }
    )

    // Cleanup listener on unmount
    return () => {
      logger.info('[RealtimeInventory] Cleaning up snapshot listener', { userId, householdId })
      unsubscribe()
    }
  }, [userId, householdId, handleInventoryChange, organizeItems])

  /**
   * Get items by specific location
   */
  const getItemsByLocation = useCallback((location: StorageLocation): ShoppingItem[] => {
    switch (location) {
      case 'fridge':
        return state.fridgeItems
      case 'freezer':
        return state.freezerItems
      case 'pantry':
        return state.pantryItems
      case 'counter':
        return state.counterItems
      default:
        return []
    }
  }, [state])

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(() => {
    const expiringWithin3Days = state.allItems.filter(item => {
      if (!item.expiresAt) return false
      const daysUntil = Math.ceil(
        (item.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysUntil >= 0 && daysUntil <= 3
    }).length

    const expiringWithin7Days = state.allItems.filter(item => {
      if (!item.expiresAt) return false
      const daysUntil = Math.ceil(
        (item.expiresAt.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
      return daysUntil >= 0 && daysUntil <= 7
    }).length

    return {
      totalItems: state.allItems.length,
      inStockItems: state.allItems.length,
      expiringWithin3Days,
      expiringWithin7Days,
      expiredItems: 0, // Will be calculated by expired items hook
      byLocation: {
        fridge: state.fridgeItems.length,
        freezer: state.freezerItems.length,
        pantry: state.pantryItems.length,
        counter: state.counterItems.length
      }
    }
  }, [state])

  return {
    allItems: state.allItems,
    fridgeItems: state.fridgeItems,
    freezerItems: state.freezerItems,
    pantryItems: state.pantryItems,
    counterItems: state.counterItems,
    loading: state.loading,
    error: state.error,
    getItemsByLocation,
    getSummary
  }
}
