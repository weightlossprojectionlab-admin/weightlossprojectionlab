'use client'

/**
 * useInventory Hook
 *
 * React hook for managing kitchen inventory and expiring items
 */

import { useState, useEffect, useCallback } from 'react'
import { auth } from '@/lib/firebase'
import type { ShoppingItem, InventorySummary, StorageLocation, ExpirationAlert } from '@/types/shopping'
import { logger } from '@/lib/logger'
import {
  getInventoryItems,
  getExpiringItems
} from '@/lib/shopping-operations'
import {
  getExpirationAlerts,
  getExpirationSummary,
  sortByExpirationPriority
} from '@/lib/expiration-tracker'

export function useInventory() {
  const [allItems, setAllItems] = useState<ShoppingItem[]>([])
  const [fridgeItems, setFridgeItems] = useState<ShoppingItem[]>([])
  const [freezerItems, setFreezerItems] = useState<ShoppingItem[]>([])
  const [pantryItems, setPantryItems] = useState<ShoppingItem[]>([])
  const [counterItems, setCounterItems] = useState<ShoppingItem[]>([])
  const [expiringItems, setExpiringItems] = useState<ShoppingItem[]>([])
  const [expirationAlerts, setExpirationAlerts] = useState<ExpirationAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = auth.currentUser?.uid

  /**
   * Fetch inventory items
   */
  const fetchInventory = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const [all, fridge, freezer, pantry, counter, expiring] = await Promise.all([
        getInventoryItems(userId),
        getInventoryItems(userId, 'fridge'),
        getInventoryItems(userId, 'freezer'),
        getInventoryItems(userId, 'pantry'),
        getInventoryItems(userId, 'counter'),
        getExpiringItems(userId, 7)
      ])

      setAllItems(all)
      setFridgeItems(sortByExpirationPriority(fridge))
      setFreezerItems(sortByExpirationPriority(freezer))
      setPantryItems(sortByExpirationPriority(pantry))
      setCounterItems(sortByExpirationPriority(counter))
      setExpiringItems(sortByExpirationPriority(expiring))

      // Generate expiration alerts
      const alerts = getExpirationAlerts(all, {
        includeExpired: true,
        daysAhead: 7,
        sortBySeverity: true
      })
      setExpirationAlerts(alerts)
    } catch (err: any) {
      logger.error('Error fetching inventory:', err)
      setError(err.message || 'Failed to load inventory')
    } finally {
      setLoading(false)
    }
  }, [userId])

  /**
   * Get items by location
   */
  const getItemsByLocation = useCallback((location: StorageLocation): ShoppingItem[] => {
    switch (location) {
      case 'fridge':
        return fridgeItems
      case 'freezer':
        return freezerItems
      case 'pantry':
        return pantryItems
      case 'counter':
        return counterItems
      default:
        return []
    }
  }, [fridgeItems, freezerItems, pantryItems, counterItems])

  /**
   * Get inventory summary
   */
  const getSummary = useCallback((): InventorySummary => {
    const summary = getExpirationSummary(allItems)

    return {
      totalItems: allItems.length,
      inStockItems: allItems.filter(item => item.inStock).length,
      expiringWithin3Days: summary.expiring3Days,
      expiringWithin7Days: summary.expiring7Days,
      expiredItems: summary.expired,
      byLocation: {
        fridge: fridgeItems.length,
        freezer: freezerItems.length,
        pantry: pantryItems.length,
        counter: counterItems.length
      }
    }
  }, [allItems, fridgeItems, freezerItems, pantryItems, counterItems])

  /**
   * Get critical alerts (expiring today or expired)
   */
  const getCriticalAlerts = useCallback((): ExpirationAlert[] => {
    return expirationAlerts.filter(alert =>
      alert.severity === 'critical' || alert.severity === 'expired'
    )
  }, [expirationAlerts])

  // Load inventory on mount
  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  return {
    allItems,
    fridgeItems,
    freezerItems,
    pantryItems,
    counterItems,
    expiringItems,
    expirationAlerts,
    loading,
    error,
    getItemsByLocation,
    getSummary,
    getCriticalAlerts,
    refresh: fetchInventory
  }
}
