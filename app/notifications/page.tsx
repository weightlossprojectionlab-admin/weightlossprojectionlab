'use client'

import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useNotifications } from '@/hooks/useNotifications'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { useRouter } from 'next/navigation'
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { formatDistanceToNow, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns'
import type { Notification, NotificationType, NotificationPriority } from '@/types/notifications'
import toast from 'react-hot-toast'

/**
 * Notification Center Page
 *
 * Full list of notifications with:
 * - Pagination
 * - Filter by patient, type, read/unread
 * - Search functionality
 * - Bulk "Mark all as read" button
 * - Group by date (Today, Yesterday, This Week, Older)
 * - Click notification to navigate to context
 */
export default function NotificationsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const {
    getNotifications,
    markAsRead,
    markAllAsRead,
    notificationsLoading
  } = useNotifications(user?.uid)

  const [notifications, setNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<NotificationType | 'all'>('all')
  const [filterPriority, setFilterPriority] = useState<NotificationPriority | 'all'>('all')
  const [filterRead, setFilterRead] = useState<'all' | 'read' | 'unread'>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load notifications
  useEffect(() => {
    if (!user?.uid) return

    const loadNotifications = async () => {
      setLoading(true)
      try {
        const filters: any = {}

        if (filterType !== 'all') {
          filters.type = filterType
        }

        if (filterPriority !== 'all') {
          filters.priority = filterPriority
        }

        if (filterRead === 'read') {
          filters.read = true
        } else if (filterRead === 'unread') {
          filters.read = false
        }

        const fetchedNotifications = await getNotifications(filters)
        setNotifications(fetchedNotifications)
      } catch (error) {
        console.error('Error loading notifications:', error)
        toast.error('Failed to load notifications')
      } finally {
        setLoading(false)
      }
    }

    loadNotifications()
  }, [user?.uid, filterType, filterPriority, filterRead, getNotifications])

  // Filter notifications by search query
  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return notifications

    const lowerQuery = searchQuery.toLowerCase()
    return notifications.filter(
      (n) =>
        n.title.toLowerCase().includes(lowerQuery) ||
        n.message.toLowerCase().includes(lowerQuery)
    )
  }, [notifications, searchQuery])

  // Group notifications by date
  const groupedNotifications = useMemo(() => {
    const groups: {
      today: Notification[]
      yesterday: Notification[]
      thisWeek: Notification[]
      older: Notification[]
    } = {
      today: [],
      yesterday: [],
      thisWeek: [],
      older: []
    }

    filteredNotifications.forEach((notification) => {
      const date = parseISO(notification.createdAt)

      if (isToday(date)) {
        groups.today.push(notification)
      } else if (isYesterday(date)) {
        groups.yesterday.push(notification)
      } else if (isThisWeek(date, { weekStartsOn: 0 })) {
        groups.thisWeek.push(notification)
      } else {
        groups.older.push(notification)
      }
    })

    return groups
  }, [filteredNotifications])

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      try {
        await markAsRead(notification.id)
        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        )
      } catch (error) {
        console.error('Error marking notification as read:', error)
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      router.push(notification.actionUrl)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead()
      // Reload notifications
      const fetchedNotifications = await getNotifications()
      setNotifications(fetchedNotifications)
    } catch (error) {
      console.error('Error marking all as read:', error)
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
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      case 'high':
        return 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
      case 'normal':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
      case 'low':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
    }
  }

  const getPriorityBadge = (priority: string) => {
    const color = getPriorityColor(priority)
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    )
  }

  const renderNotificationGroup = (title: string, notifications: Notification[]) => {
    if (notifications.length === 0) return null

    return (
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-foreground mb-4 px-4">{title}</h2>
        <div className="space-y-2">
          {notifications.map((notification) => (
            <button
              key={notification.id}
              type="button"
              onClick={() => handleNotificationClick(notification)}
              className={`w-full px-4 py-4 text-left hover:bg-muted transition-colors border border-border rounded-lg ${
                !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-card'
              }`}
            >
              <div className="flex gap-4">
                {/* Icon */}
                <div className="text-3xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-semibold text-foreground">
                      {notification.title}
                    </h3>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getPriorityBadge(notification.priority)}
                      {!notification.read && (
                        <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                      )}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-3">
                    {notification.message}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                      {notification.metadata?.createdByName && (
                        <p className="text-xs text-muted-foreground">
                          Created by <span className="font-medium text-foreground">{notification.metadata.createdByName}</span>
                        </p>
                      )}
                    </div>

                    {notification.actionLabel && (
                      <span className="text-sm font-medium text-primary">
                        {notification.actionLabel} →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background pb-20">
        <PageHeader
          title="Notifications"
          subtitle={`${unreadCount} unread`}
          backButton
        />

        <div className="max-w-4xl mx-auto px-4 py-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Filter Toggle and Mark All Read */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-foreground hover:bg-muted transition-colors"
              >
                <FunnelIcon className="h-5 w-5" />
                <span className="font-medium">Filters</span>
              </button>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors font-medium ml-auto"
                >
                  <CheckIcon className="h-5 w-5" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">Filter Notifications</h3>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <XMarkIcon className="h-5 w-5 text-muted-foreground" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Filter by Read Status */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Status
                    </label>
                    <select
                      value={filterRead}
                      onChange={(e) => setFilterRead(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All</option>
                      <option value="unread">Unread</option>
                      <option value="read">Read</option>
                    </select>
                  </div>

                  {/* Filter by Priority */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Priority
                    </label>
                    <select
                      value={filterPriority}
                      onChange={(e) => setFilterPriority(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All</option>
                      <option value="urgent">Urgent</option>
                      <option value="high">High</option>
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  {/* Filter by Type */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Type
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="all">All</option>
                      <option value="medication_added">Medication Added</option>
                      <option value="medication_updated">Medication Updated</option>
                      <option value="vital_logged">Vital Logged</option>
                      <option value="meal_logged">Meal Logged</option>
                      <option value="weight_logged">Weight Logged</option>
                      <option value="appointment_scheduled">Appointment Scheduled</option>
                      <option value="appointment_reminder">Appointment Reminder</option>
                      <option value="vital_alert">Vital Alert</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Spinner size="lg" />
            </div>
          ) : filteredNotifications.length === 0 ? (
            /* Empty State */
            <EmptyState
              title="No notifications"
              description={
                searchQuery
                  ? "No notifications match your search query. Try adjusting your filters."
                  : "You're all caught up! No notifications to show."
              }
              icon="🔔"
            />
          ) : (
            /* Grouped Notifications */
            <div>
              {renderNotificationGroup('Today', groupedNotifications.today)}
              {renderNotificationGroup('Yesterday', groupedNotifications.yesterday)}
              {renderNotificationGroup('This Week', groupedNotifications.thisWeek)}
              {renderNotificationGroup('Older', groupedNotifications.older)}
            </div>
          )}
        </div>
      </div>
    </AuthGuard>
  )
}
