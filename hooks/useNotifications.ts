'use client'

import { useState, useEffect, useCallback } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { initializeMessaging } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import {
  saveNotificationToken,
  deleteNotificationToken,
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings
} from '@/lib/nudge-system'
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  writeBatch,
  getDocs,
  getCountFromServer,
  Timestamp
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Notification, NotificationFilter } from '@/types/notifications'
import toast from 'react-hot-toast'

export interface NotificationState {
  permission: NotificationPermission
  isSupported: boolean
  isSubscribed: boolean
  settings: NotificationSettings | null
  loading: boolean
  error: string | null
}

/**
 * Hook to manage push notification permissions, settings, and notification fetching
 */
export function useNotifications(userId: string | undefined) {
  const [state, setState] = useState<NotificationState>({
    permission: 'default',
    isSupported: false,
    isSubscribed: false,
    settings: null,
    loading: true,
    error: null
  })

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)

  /**
   * Check notification support and initial permission state
   */
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        setState(prev => ({
          ...prev,
          isSupported: false,
          loading: false
        }))
        return
      }

      setState(prev => ({
        ...prev,
        isSupported: true,
        permission: Notification.permission,
        loading: false
      }))

      // Load user settings
      if (userId) {
        try {
          const settings = await getNotificationSettings(userId)
          setState(prev => ({
            ...prev,
            settings
          }))
        } catch (error) {
          logger.error('[useNotifications] Error loading settings:', error as Error)
        }
      }
    }

    checkSupport()
  }, [userId])

  /**
   * Real-time listener for unread count
   */
  useEffect(() => {
    if (!userId) {
      setUnreadCount(0)
      return
    }

    const unreadQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    )

    const unsubscribe = onSnapshot(
      unreadQuery,
      (snapshot) => {
        setUnreadCount(snapshot.size)
      },
      (error) => {
        logger.error('[useNotifications] Error listening to unread count:', error)
      }
    )

    return () => unsubscribe()
  }, [userId])

  /**
   * Request notification permission and register FCM token
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!state.isSupported || !userId) {
      toast.error('Notifications not supported in this browser')
      return false
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Request permission
      const permission = await Notification.requestPermission()

      setState(prev => ({ ...prev, permission }))

      if (permission !== 'granted') {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Notification permission denied'
        }))
        toast.error('Please enable notifications to receive reminders')
        return false
      }

      // Initialize messaging
      const messaging = await initializeMessaging()
      if (!messaging) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to initialize messaging'
        }))
        return false
      }

      // Get FCM token with VAPID key
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

      if (!vapidKey) {
        logger.warn('[useNotifications] VAPID key not configured')
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'VAPID key not configured'
        }))
        return false
      }

      const token = await getToken(messaging, { vapidKey })

      if (!token) {
        setState(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to get FCM token'
        }))
        return false
      }

      // Save token to Firestore
      await saveNotificationToken(userId, token)

      setState(prev => ({
        ...prev,
        isSubscribed: true,
        loading: false
      }))

      // Listen for foreground messages
      onMessage(messaging, (payload) => {
        logger.debug('[useNotifications] Foreground message:', {
          title: payload.notification?.title,
          body: payload.notification?.body
        })

        // Show toast notification
        if (payload.notification) {
          toast.success(
            `${payload.notification.title}\n${payload.notification.body}`,
            { duration: 5000 }
          )
        }
      })

      toast.success('Notifications enabled! You\'ll receive helpful reminders')
      return true
    } catch (error) {
      logger.error('[useNotifications] Error requesting permission:', error as Error)
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      toast.error('Failed to enable notifications')
      return false
    }
  }

  /**
   * Revoke notification permission (delete token)
   */
  const revokePermission = async (): Promise<void> => {
    if (!userId) return

    try {
      await deleteNotificationToken(userId)

      setState(prev => ({
        ...prev,
        isSubscribed: false
      }))

      toast.success('Notifications disabled')
    } catch (error) {
      logger.error('[useNotifications] Error revoking permission:', error as Error)
      toast.error('Failed to disable notifications')
    }
  }

  /**
   * Update notification settings
   */
  const updateSettings = async (settings: Partial<NotificationSettings>): Promise<void> => {
    if (!userId) return

    try {
      await updateNotificationSettings(userId, settings)

      setState(prev => ({
        ...prev,
        settings: prev.settings ? { ...prev.settings, ...settings } : null
      }))

      toast.success('Notification settings updated')
    } catch (error) {
      logger.error('[useNotifications] Error updating settings:', error as Error)
      toast.error('Failed to update settings')
    }
  }

  /**
   * Get notifications with filters
   */
  const getNotifications = useCallback(async (filters?: NotificationFilter): Promise<Notification[]> => {
    if (!userId) return []

    try {
      setNotificationsLoading(true)

      let notificationQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId)
      )

      // Apply filters
      if (filters?.patientId) {
        notificationQuery = query(notificationQuery, where('patientId', '==', filters.patientId))
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type]
        notificationQuery = query(notificationQuery, where('type', 'in', types))
      }

      if (filters?.read !== undefined) {
        notificationQuery = query(notificationQuery, where('read', '==', filters.read))
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority]
        notificationQuery = query(notificationQuery, where('priority', 'in', priorities))
      }

      // Always order by createdAt descending
      notificationQuery = query(notificationQuery, orderBy('createdAt', 'desc'))

      // Apply limit
      if (filters?.limit) {
        notificationQuery = query(notificationQuery, limit(filters.limit))
      }

      const snapshot = await getDocs(notificationQuery)
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[]

      setNotifications(fetchedNotifications)
      setNotificationsLoading(false)
      return fetchedNotifications
    } catch (error) {
      logger.error('[useNotifications] Error fetching notifications:', error as Error)
      setNotificationsLoading(false)
      return []
    }
  }, [userId])

  /**
   * Get unread count
   */
  const getUnreadCount = useCallback(async (): Promise<number> => {
    if (!userId) return 0

    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      )

      const snapshot = await getCountFromServer(unreadQuery)
      return snapshot.data().count
    } catch (error) {
      logger.error('[useNotifications] Error getting unread count:', error as Error)
      return 0
    }
  }, [userId])

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId: string): Promise<void> => {
    if (!userId) return

    try {
      const notificationRef = doc(db, 'notifications', notificationId)
      await updateDoc(notificationRef, {
        read: true,
        readAt: new Date().toISOString()
      })

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read: true, readAt: new Date().toISOString() }
            : n
        )
      )
    } catch (error) {
      logger.error('[useNotifications] Error marking notification as read:', error as Error)
      throw error
    }
  }, [userId])

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!userId) return

    try {
      const unreadQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', userId),
        where('read', '==', false)
      )

      const snapshot = await getDocs(unreadQuery)

      if (snapshot.empty) {
        toast('No unread notifications')
        return
      }

      const batch = writeBatch(db)
      const now = new Date().toISOString()

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          read: true,
          readAt: now,
          updatedAt: now
        })
      })

      await batch.commit()

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, readAt: now }))
      )

      toast.success(`Marked ${snapshot.size} notifications as read`)
    } catch (error) {
      logger.error('[useNotifications] Error marking all as read:', error as Error)
      toast.error('Failed to mark all as read')
      throw error
    }
  }, [userId])

  /**
   * Real-time listener for latest notifications
   */
  const subscribeToNotifications = useCallback((limitCount: number = 5) => {
    if (!userId) return () => {}

    const notificationQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    const unsubscribe = onSnapshot(
      notificationQuery,
      (snapshot) => {
        const latestNotifications = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Notification[]

        setNotifications(latestNotifications)
      },
      (error) => {
        logger.error('[useNotifications] Error subscribing to notifications:', error)
      }
    )

    return unsubscribe
  }, [userId])

  return {
    ...state,
    requestPermission,
    revokePermission,
    updateSettings,
    // New notification functions
    notifications,
    unreadCount,
    notificationsLoading,
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    subscribeToNotifications
  }
}
