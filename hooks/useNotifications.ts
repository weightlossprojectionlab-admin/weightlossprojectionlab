'use client'

import { useState, useEffect } from 'react'
import { getToken, onMessage } from 'firebase/messaging'
import { initializeMessaging } from '@/lib/firebase'
import {
  saveNotificationToken,
  deleteNotificationToken,
  getNotificationSettings,
  updateNotificationSettings,
  type NotificationSettings
} from '@/lib/nudge-system'
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
 * Hook to manage push notification permissions and settings
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
          console.error('[useNotifications] Error loading settings:', error)
        }
      }
    }

    checkSupport()
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
      // TODO: Replace with your actual VAPID key from Firebase Console
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY

      if (!vapidKey) {
        console.warn('[useNotifications] VAPID key not configured')
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
        console.log('[useNotifications] Foreground message:', payload)

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
      console.error('[useNotifications] Error requesting permission:', error)
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
      console.error('[useNotifications] Error revoking permission:', error)
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
      console.error('[useNotifications] Error updating settings:', error)
      toast.error('Failed to update settings')
    }
  }

  return {
    ...state,
    requestPermission,
    revokePermission,
    updateSettings
  }
}
