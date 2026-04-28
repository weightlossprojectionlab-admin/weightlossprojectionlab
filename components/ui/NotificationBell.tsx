'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
import toast from 'react-hot-toast'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types/notifications'

/**
 * NotificationBell Component
 *
 * Displays a bell icon with unread count badge.
 * Shows dropdown with last 5 notifications on click.
 * Real-time updates using onSnapshot.
 */
export function NotificationBell() {
  const { user } = useAuth()
  const router = useRouter()
  const {
    unreadCount,
    notifications,
    subscribeToNotifications,
    markAsRead,
    archiveNotification,
  } = useNotifications(user?.uid)

  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Subscribe to real-time notifications (last 5)
  useEffect(() => {
    if (!user?.uid) return

    const unsubscribe = subscribeToNotifications(5)
    return () => unsubscribe()
  }, [user?.uid, subscribeToNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }

    // Close dropdown
    setIsOpen(false)
  }

  // Dismiss = archive. Soft-delete only — the row stays in Firestore for
  // audit and is recoverable via the "Show Archived" toggle on /notifications.
  const handleDismiss = async (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation() // don't trigger the row click / navigation
    try {
      await archiveNotification(notification.id)
    } catch (error) {
      console.error('Error dismissing notification:', error)
      toast.error('Failed to dismiss notification')
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'medication_added':
      case 'medication_updated':
      case 'medication_deleted':
        return '💊'
      case 'vital_logged':
        return '❤️'
      case 'meal_logged':
        return '🍽️'
      case 'weight_logged':
        return '⚖️'
      case 'document_uploaded':
        return '📄'
      case 'appointment_scheduled':
      case 'appointment_updated':
      case 'appointment_cancelled':
      case 'appointment_reminder':
        return '📅'
      case 'health_report_generated':
        return '📊'
      case 'family_member_invited':
      case 'family_member_joined':
        return '👥'
      case 'patient_added':
        return '🏥'
      case 'vital_alert':
        return '⚠️'
      case 'medication_reminder':
        return '⏰'
      default:
        return '🔔'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600 dark:text-red-400'
      case 'high':
        return 'text-orange-600 dark:text-orange-400'
      case 'normal':
        return 'text-blue-600 dark:text-blue-400'
      case 'low':
        return 'text-gray-600 dark:text-gray-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  if (!user) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-foreground hover:bg-muted rounded-lg transition-colors"
        aria-label="Notifications"
      >
        {unreadCount > 0 ? (
          <BellIconSolid className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full min-w-[20px]">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown.
          Mobile (<sm): fixed to viewport, 8px from left/right edges, anchored
          below the sticky header — anchoring to the bell with right-0 caused
          the left side of the dropdown to overflow off-screen on narrow viewports.
          Desktop (sm+): absolute, anchored to the bell's right edge, 384px wide. */}
      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 top-16 sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 bg-card border border-border rounded-lg shadow-xl z-50 max-h-[calc(100vh-5rem)] sm:max-h-[600px] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            <Link
              href="/notifications"
              className="text-sm text-primary hover:text-primary-dark font-medium"
              onClick={() => setIsOpen(false)}
            >
              View All
            </Link>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-2 opacity-40">🔔</div>
                <p className="text-sm text-muted-foreground">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`relative group hover:bg-muted transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="w-full px-4 py-3 pr-12 text-left min-h-[60px] active:bg-muted/60 transition-colors"
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="text-2xl flex-shrink-0 mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4 className={`font-medium text-sm ${getPriorityColor(notification.priority)}`}>
                              {notification.title}
                            </h4>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1.5"></span>
                            )}
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-muted-foreground">
                              {notification.type === 'appointment_scheduled' && 'appointmentDateTime' in notification.metadata && notification.metadata.appointmentDateTime ? (
                                new Date(notification.metadata.appointmentDateTime).toLocaleDateString('en-US', {
                                  weekday: 'short',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })
                              ) : (
                                formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                              )}
                            </p>

                            {notification.actionLabel && (
                              <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary">
                                {notification.actionLabel}
                                <span aria-hidden="true">→</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* Dismiss (archive). Always visible — mobile has no hover
                        so an opacity-on-hover pattern would hide it on touch.
                        44×44 tap target meets Apple HIG / WCAG 2.5.5 (target size). */}
                    <button
                      type="button"
                      onClick={(e) => handleDismiss(e, notification)}
                      className="absolute top-1 right-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/80 active:bg-background transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                      aria-label="Dismiss notification"
                      title="Dismiss"
                    >
                      <XMarkIcon className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-border">
              <Link
                href="/notifications"
                className="block w-full text-center text-sm font-medium text-primary hover:text-primary-dark transition-colors"
                onClick={() => setIsOpen(false)}
              >
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
