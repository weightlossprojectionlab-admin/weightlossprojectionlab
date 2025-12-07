'use client'

/**
 * Real-Time Expired Items Hook
 *
 * Provides live synchronization of expired inventory items
 * Monitors items that have passed their expiration date
 * Alerts users when items expire in real-time
 */

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  QuerySnapshot
} from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import type { ShoppingItem } from '@/types/shopping'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'
import { patientOperations } from '@/lib/medical-operations'
import { useNotificationPreferences } from './useNotificationPreferences'

interface ExpiredItem extends ShoppingItem {
  daysExpired: number
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
}

interface ExpiredItemsState {
  expiredItems: ExpiredItem[]
  totalExpired: number
  criticalItems: ExpiredItem[] // > 7 days expired
  highRiskItems: ExpiredItem[] // 3-7 days expired
  mediumRiskItems: ExpiredItem[] // 1-3 days expired
  lowRiskItems: ExpiredItem[] // 0-1 days expired
  loading: boolean
  error: string | null
}

export function useRealtimeExpiredItems() {
  const [state, setState] = useState<ExpiredItemsState>({
    expiredItems: [],
    totalExpired: 0,
    criticalItems: [],
    highRiskItems: [],
    mediumRiskItems: [],
    lowRiskItems: [],
    loading: true,
    error: null
  })

  const [members, setMembers] = useState<Record<string, { name: string; nickname?: string }>>(
    {}
  )
  const userId = auth.currentUser?.uid
  const { shouldShowNotification } = useNotificationPreferences()

  // Fetch household members
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
        logger.error('[RealtimeExpiredItems] Error fetching members', error as Error)
      }
    }

    if (userId) {
      fetchMembers()
    }
  }, [userId])

  /**
   * Calculate risk level based on days expired
   */
  const getRiskLevel = useCallback((daysExpired: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (daysExpired > 7) return 'critical'
    if (daysExpired >= 3) return 'high'
    if (daysExpired >= 1) return 'medium'
    return 'low'
  }, [])

  /**
   * Process expired items and categorize by risk
   */
  const processExpiredItems = useCallback(
    (items: ShoppingItem[]): ExpiredItem[] => {
      const now = new Date()

      return items
        .map(item => {
          if (!item.expiresAt) return null

          const expiresAt = item.expiresAt instanceof Date ? item.expiresAt : item.expiresAt.toDate()
          const daysExpired = Math.floor(
            (now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24)
          )

          // Only include items that are actually expired
          if (daysExpired < 0) return null

          return {
            ...item,
            daysExpired,
            riskLevel: getRiskLevel(daysExpired)
          }
        })
        .filter((item): item is ExpiredItem => item !== null)
        .sort((a, b) => b.daysExpired - a.daysExpired) // Most expired first
    },
    [getRiskLevel]
  )

  /**
   * Categorize expired items by risk level
   */
  const categorizeByRisk = useCallback((items: ExpiredItem[]) => {
    return {
      critical: items.filter(item => item.riskLevel === 'critical'),
      high: items.filter(item => item.riskLevel === 'high'),
      medium: items.filter(item => item.riskLevel === 'medium'),
      low: items.filter(item => item.riskLevel === 'low')
    }
  }, [])

  /**
   * Notify when new items expire
   */
  const notifyNewExpiredItems = useCallback(
    (newItems: ExpiredItem[], previousCount: number) => {
      const newCount = newItems.length
      if (newCount > previousCount) {
        const newlyExpired = newCount - previousCount
        if (shouldShowNotification('inventory', 'expired')) {
          toast.error(
            `${newlyExpired} ${newlyExpired === 1 ? 'item has' : 'items have'} expired`,
            {
              icon: '⚠️',
              duration: 6000,
              id: 'newly-expired' // Prevent duplicate notifications
            }
          )
        }
      }
    },
    [shouldShowNotification]
  )

  // Real-time listener for expired items
  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    logger.info('[RealtimeExpiredItems] Setting up snapshot listener')

    // Query for in-stock items ordered by expiration
    // We'll filter client-side for expired items to avoid complex Firestore queries
    const q = query(
      collection(db, 'shopping_items'),
      where('userId', '==', userId),
      where('inStock', '==', true),
      orderBy('expiresAt', 'asc')
    )

    let isFirstSnapshot = true
    let previousExpiredCount = 0

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot) => {
        const allItems = snapshot.docs.map(doc => {
          const data = doc.data()

          // Helper to safely convert timestamps
          const toSafeDate = (value: any): Date | undefined => {
            if (!value) return undefined
            if (value?.toDate) return value.toDate()
            if (typeof value === 'string' || typeof value === 'number') {
              const date = new Date(value)
              return isNaN(date.getTime()) ? undefined : date
            }
            return undefined
          }

          return {
            id: doc.id,
            ...data,
            createdAt: toSafeDate(data.createdAt) || new Date(),
            updatedAt: toSafeDate(data.updatedAt) || new Date(),
            expiresAt: toSafeDate(data.expiresAt)
          }
        }) as ShoppingItem[]

        // Process and filter for expired items
        const expiredItems = processExpiredItems(allItems)
        const categorized = categorizeByRisk(expiredItems)

        setState({
          expiredItems,
          totalExpired: expiredItems.length,
          criticalItems: categorized.critical,
          highRiskItems: categorized.high,
          mediumRiskItems: categorized.medium,
          lowRiskItems: categorized.low,
          loading: false,
          error: null
        })

        // Notify about newly expired items (skip first load)
        if (!isFirstSnapshot) {
          notifyNewExpiredItems(expiredItems, previousExpiredCount)
        }

        previousExpiredCount = expiredItems.length
        isFirstSnapshot = false

        logger.info('[RealtimeExpiredItems] Snapshot received', {
          totalExpired: expiredItems.length,
          critical: categorized.critical.length,
          high: categorized.high.length,
          medium: categorized.medium.length,
          low: categorized.low.length
        })
      },
      error => {
        logger.error('[RealtimeExpiredItems] Snapshot error', error)
        setState(prev => ({
          ...prev,
          loading: false,
          error: error.message || 'Failed to load expired items'
        }))
        toast.error('Failed to load expired items. Please refresh.')
      }
    )

    // Cleanup listener on unmount
    return () => {
      logger.info('[RealtimeExpiredItems] Cleaning up snapshot listener')
      unsubscribe()
    }
  }, [userId, processExpiredItems, categorizeByRisk, notifyNewExpiredItems])

  /**
   * Get items expiring soon (within next N days)
   */
  const getExpiringSoon = useCallback((days: number = 3): ShoppingItem[] => {
    // This would require a separate query or client-side filtering
    // For now, return empty array - can be enhanced later
    return []
  }, [])

  /**
   * Get summary statistics
   */
  const getSummary = useCallback(() => {
    return {
      totalExpired: state.totalExpired,
      critical: state.criticalItems.length,
      high: state.highRiskItems.length,
      medium: state.mediumRiskItems.length,
      low: state.lowRiskItems.length,
      needsImmediateAttention: state.criticalItems.length + state.highRiskItems.length
    }
  }, [state])

  return {
    expiredItems: state.expiredItems,
    criticalItems: state.criticalItems,
    highRiskItems: state.highRiskItems,
    mediumRiskItems: state.mediumRiskItems,
    lowRiskItems: state.lowRiskItems,
    totalExpired: state.totalExpired,
    loading: state.loading,
    error: state.error,
    getExpiringSoon,
    getSummary
  }
}
