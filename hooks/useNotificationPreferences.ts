'use client'

/**
 * Notification Preferences Hook
 *
 * Manages user preferences for real-time notifications
 * Includes silent mode for work/meetings
 * Persists preferences to Firestore for cross-device sync
 */

import { useState, useEffect, useCallback } from 'react'
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'

export interface NotificationPreferences {
  // Silent mode - suppress all notifications
  silentMode: boolean
  silentModeSchedule?: {
    enabled: boolean
    // Days of week (0 = Sunday, 6 = Saturday)
    days: number[]
    // Time in 24hr format
    startTime: string // "09:00"
    endTime: string // "17:00"
  }

  // Shopping alerts
  shoppingAlerts: {
    enabled: boolean
    inStoreFinds: boolean // When someone finds an item at the store
    itemPurchased: boolean // When someone purchases an item
    itemAddedToList: boolean // When someone adds to shopping list
  }

  // Inventory alerts
  inventoryAlerts: {
    enabled: boolean
    itemExpiring: boolean // When items are expiring soon
    itemExpired: boolean // When items have expired
    itemDiscarded: boolean // When someone discards an item
    itemAdded: boolean // When someone adds to inventory
    lowStock: boolean // When quantity is low
  }

  // Notification methods
  methods: {
    inApp: boolean // Toast notifications in app
    push: boolean // Push notifications (future)
    email: boolean // Email notifications (future)
  }
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  silentMode: false,
  silentModeSchedule: {
    enabled: false,
    days: [1, 2, 3, 4, 5], // Monday-Friday
    startTime: '09:00',
    endTime: '17:00'
  },
  shoppingAlerts: {
    enabled: true,
    inStoreFinds: true,
    itemPurchased: true,
    itemAddedToList: true
  },
  inventoryAlerts: {
    enabled: true,
    itemExpiring: true,
    itemExpired: true,
    itemDiscarded: true,
    itemAdded: true,
    lowStock: true
  },
  methods: {
    inApp: true,
    push: false,
    email: false
  }
}

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const userId = auth.currentUser?.uid

  /**
   * Check if currently in silent mode based on schedule
   */
  const isInSilentPeriod = useCallback((prefs: NotificationPreferences): boolean => {
    if (!prefs.silentModeSchedule?.enabled) return false

    const now = new Date()
    const currentDay = now.getDay()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    // Check if today is in the schedule
    if (!prefs.silentModeSchedule.days.includes(currentDay)) return false

    // Check if current time is within the range
    return (
      currentTime >= prefs.silentModeSchedule.startTime &&
      currentTime <= prefs.silentModeSchedule.endTime
    )
  }, [])

  /**
   * Check if a notification should be shown
   */
  const shouldShowNotification = useCallback(
    (type: 'shopping' | 'inventory', subtype?: string): boolean => {
      // Check manual silent mode
      if (preferences.silentMode) return false

      // Check scheduled silent mode
      if (isInSilentPeriod(preferences)) return false

      // Check if in-app notifications are enabled
      if (!preferences.methods.inApp) return false

      // Check category-specific settings
      if (type === 'shopping') {
        if (!preferences.shoppingAlerts.enabled) return false

        if (subtype === 'inStoreFind' && !preferences.shoppingAlerts.inStoreFinds) return false
        if (subtype === 'purchased' && !preferences.shoppingAlerts.itemPurchased) return false
        if (subtype === 'addedToList' && !preferences.shoppingAlerts.itemAddedToList) return false
      }

      if (type === 'inventory') {
        if (!preferences.inventoryAlerts.enabled) return false

        if (subtype === 'expiring' && !preferences.inventoryAlerts.itemExpiring) return false
        if (subtype === 'expired' && !preferences.inventoryAlerts.itemExpired) return false
        if (subtype === 'discarded' && !preferences.inventoryAlerts.itemDiscarded) return false
        if (subtype === 'added' && !preferences.inventoryAlerts.itemAdded) return false
        if (subtype === 'lowStock' && !preferences.inventoryAlerts.lowStock) return false
      }

      return true
    },
    [preferences, isInSilentPeriod]
  )

  /**
   * Toggle silent mode on/off
   */
  const toggleSilentMode = useCallback(async () => {
    if (!userId) return

    const newValue = !preferences.silentMode
    setPreferences(prev => ({ ...prev, silentMode: newValue }))

    try {
      await setDoc(
        doc(db, 'users', userId, 'settings', 'notifications'),
        { silentMode: newValue },
        { merge: true }
      )
      logger.info('[NotificationPreferences] Silent mode toggled', { silentMode: newValue })
    } catch (error) {
      logger.error('[NotificationPreferences] Failed to toggle silent mode', error as Error)
      // Revert on error
      setPreferences(prev => ({ ...prev, silentMode: !newValue }))
    }
  }, [userId, preferences.silentMode])

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(
    async (updates: Partial<NotificationPreferences>) => {
      if (!userId) return

      setSaving(true)
      try {
        const newPreferences = { ...preferences, ...updates }
        setPreferences(newPreferences)

        await setDoc(
          doc(db, 'users', userId, 'settings', 'notifications'),
          newPreferences,
          { merge: true }
        )
        logger.info('[NotificationPreferences] Preferences updated', updates)
      } catch (error) {
        logger.error('[NotificationPreferences] Failed to update preferences', error as Error)
        throw error
      } finally {
        setSaving(false)
      }
    },
    [userId, preferences]
  )

  /**
   * Load preferences from Firestore
   */
  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }

    logger.info('[NotificationPreferences] Setting up listener')

    // Real-time listener for preferences
    const unsubscribe = onSnapshot(
      doc(db, 'users', userId, 'settings', 'notifications'),
      snapshot => {
        if (snapshot.exists()) {
          const data = snapshot.data() as NotificationPreferences
          setPreferences(prev => ({ ...DEFAULT_PREFERENCES, ...data }))
          logger.info('[NotificationPreferences] Preferences loaded', data)
        } else {
          // No preferences yet, use defaults
          setPreferences(DEFAULT_PREFERENCES)
          logger.info('[NotificationPreferences] Using default preferences')
        }
        setLoading(false)
      },
      error => {
        logger.error('[NotificationPreferences] Snapshot error', error)
        setPreferences(DEFAULT_PREFERENCES)
        setLoading(false)
      }
    )

    return () => {
      logger.info('[NotificationPreferences] Cleaning up listener')
      unsubscribe()
    }
  }, [userId])

  return {
    preferences,
    loading,
    saving,
    shouldShowNotification,
    toggleSilentMode,
    updatePreferences,
    isInSilentPeriod: isInSilentPeriod(preferences)
  }
}
