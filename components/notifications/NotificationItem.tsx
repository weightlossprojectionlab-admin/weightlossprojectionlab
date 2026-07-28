'use client'

/**
 * A single notification row — the shared render used by BOTH the global
 * /notifications page and the Medical hub's Notifications tab, so they look and
 * behave identically (DOSI single source for presentation). Data + actions come
 * from useNotifications; this component is pure presentation + callbacks.
 */

import { XMarkIcon } from '@heroicons/react/24/outline'
import { formatDistanceToNow } from 'date-fns'
import type { Notification } from '@/types/notifications'

function getNotificationIcon(type: string): string {
  switch (type) {
    case 'medication_added':
    case 'medication_updated':
    case 'medication_deleted':
    case 'medication_dose_logged':
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
    case 'health_trend_alert':
      return '⚠️'
    case 'medication_reminder':
      return '⏰'
    default:
      return '🔔'
  }
}

function priorityBadge(priority: string) {
  const color =
    priority === 'urgent'
      ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
      : priority === 'high'
        ? 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
        : priority === 'normal'
          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
          : 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  )
}

export function NotificationItem({
  notification,
  onClick,
  onArchive,
}: {
  notification: Notification
  onClick: (n: Notification) => void
  /** Provide to show a dismiss (archive) button; omit to hide it. */
  onArchive?: (id: string) => void
}) {
  return (
    <div
      className={`relative w-full px-4 py-4 border border-border rounded-lg ${
        !notification.read ? 'bg-primary/5 border-primary/20' : 'bg-card'
      }`}
    >
      <div className="flex gap-4">
        <div className="text-3xl flex-shrink-0">{getNotificationIcon(notification.type)}</div>

        <button
          type="button"
          onClick={() => onClick(notification)}
          className="flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-foreground">{notification.title}</h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {priorityBadge(notification.priority)}
              {!notification.read && <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>}
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-3">{notification.message}</p>

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
              {'actionBy' in notification.metadata && notification.metadata.actionBy && (
                <p className="text-xs text-muted-foreground">
                  Created by{' '}
                  <span className="font-medium text-foreground">{notification.metadata.actionBy}</span>
                </p>
              )}
            </div>

            {notification.actionLabel && (
              <span className="text-sm font-medium text-primary">{notification.actionLabel} →</span>
            )}
          </div>
        </button>

        {onArchive && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onArchive(notification.id)
            }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted active:bg-muted/80 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
            title="Dismiss notification"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  )
}
