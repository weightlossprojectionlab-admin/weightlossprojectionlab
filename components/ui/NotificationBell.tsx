'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import { BellIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid'
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
    markAsRead
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

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-xl z-50 max-h-[600px] overflow-hidden flex flex-col">
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
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full px-4 py-3 text-left hover:bg-muted transition-colors ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
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
                            {notification.type === 'appointment_scheduled' && notification.metadata?.dateTime ? (
                              // For appointments, show the appointment date
                              new Date(notification.metadata.dateTime).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })
                            ) : (
                              // For other notifications, show relative time
                              formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })
                            )}
                          </p>

                          {notification.actionLabel && (
                            <span className="text-xs font-medium text-primary">
                              {notification.actionLabel}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
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
