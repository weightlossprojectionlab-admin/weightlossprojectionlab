'use client'

/**
 * Notification Settings Component
 *
 * Allows users to configure notification preferences
 * Includes silent mode toggle and scheduled quiet hours
 */

import { useState } from 'react'
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences'
import { logger } from '@/lib/logger'
import toast from 'react-hot-toast'

export function NotificationSettings() {
  const {
    preferences,
    loading,
    saving,
    toggleSilentMode,
    updatePreferences,
    isInSilentPeriod
  } = useNotificationPreferences()

  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Silent Mode Toggle */}
      <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">Silent Mode</h3>
              {isInSilentPeriod && (
                <span className="text-xs px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                  Scheduled
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Temporarily disable all notifications (e.g., during meetings)
            </p>
          </div>
          <button
            onClick={toggleSilentMode}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              preferences.silentMode
                ? 'bg-purple-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                preferences.silentMode ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Scheduled Silent Mode */}
      <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Scheduled Quiet Hours</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Automatically enable silent mode during specific times
            </p>
          </div>
          <button
            onClick={async () => {
              try {
                await updatePreferences({
                  silentModeSchedule: {
                    ...preferences.silentModeSchedule!,
                    enabled: !preferences.silentModeSchedule?.enabled
                  }
                })
                toast.success(
                  preferences.silentModeSchedule?.enabled
                    ? 'Scheduled quiet hours disabled'
                    : 'Scheduled quiet hours enabled'
                )
              } catch (error) {
                toast.error('Failed to update schedule')
              }
            }}
            disabled={saving}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              preferences.silentModeSchedule?.enabled
                ? 'bg-blue-600'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                preferences.silentModeSchedule?.enabled ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {preferences.silentModeSchedule?.enabled && (
          <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={preferences.silentModeSchedule.startTime}
                  onChange={async e => {
                    try {
                      await updatePreferences({
                        silentModeSchedule: {
                          ...preferences.silentModeSchedule!,
                          startTime: e.target.value
                        }
                      })
                    } catch (error) {
                      logger.error('Failed to update start time', error as Error)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={preferences.silentModeSchedule.endTime}
                  onChange={async e => {
                    try {
                      await updatePreferences({
                        silentModeSchedule: {
                          ...preferences.silentModeSchedule!,
                          endTime: e.target.value
                        }
                      })
                    } catch (error) {
                      logger.error('Failed to update end time', error as Error)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Days of Week
              </label>
              <div className="flex flex-wrap gap-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <button
                    key={day}
                    onClick={async () => {
                      const currentDays = preferences.silentModeSchedule!.days
                      const newDays = currentDays.includes(index)
                        ? currentDays.filter(d => d !== index)
                        : [...currentDays, index].sort()

                      try {
                        await updatePreferences({
                          silentModeSchedule: {
                            ...preferences.silentModeSchedule!,
                            days: newDays
                          }
                        })
                      } catch (error) {
                        logger.error('Failed to update days', error as Error)
                      }
                    }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                      preferences.silentModeSchedule?.days.includes(index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Shopping Alerts */}
      <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === 'shopping' ? null : 'shopping')
          }
          className="w-full flex items-center justify-between"
        >
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">Shopping Alerts</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Notifications about shopping list and store activity
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              expandedSection === 'shopping' ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expandedSection === 'shopping' && (
          <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {[
              {
                key: 'inStoreFinds',
                label: 'In-Store Finds',
                description: 'When someone finds an item at the store'
              },
              {
                key: 'itemPurchased',
                label: 'Item Purchased',
                description: 'When someone purchases an item'
              },
              {
                key: 'itemAddedToList',
                label: 'Added to List',
                description: 'When someone adds an item to shopping list'
              }
            ].map(({ key, label, description }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                <input
                  type="checkbox"
                  checked={
                    preferences.shoppingAlerts[key as keyof typeof preferences.shoppingAlerts]
                  }
                  onChange={async e => {
                    try {
                      await updatePreferences({
                        shoppingAlerts: {
                          ...preferences.shoppingAlerts,
                          [key]: e.target.checked
                        }
                      })
                    } catch (error) {
                      toast.error('Failed to update setting')
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Inventory Alerts */}
      <div className="bg-card rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <button
          onClick={() =>
            setExpandedSection(expandedSection === 'inventory' ? null : 'inventory')
          }
          className="w-full flex items-center justify-between"
        >
          <div className="text-left">
            <h3 className="text-lg font-semibold text-foreground">Inventory Alerts</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Notifications about kitchen inventory changes
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${
              expandedSection === 'inventory' ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {expandedSection === 'inventory' && (
          <div className="mt-4 space-y-3 border-t border-gray-200 dark:border-gray-700 pt-3">
            {[
              {
                key: 'itemExpiring',
                label: 'Items Expiring Soon',
                description: 'Alerts for items approaching expiration'
              },
              {
                key: 'itemExpired',
                label: 'Items Expired',
                description: 'When items have passed their expiration date'
              },
              {
                key: 'itemDiscarded',
                label: 'Items Discarded',
                description: 'When someone discards an item'
              },
              {
                key: 'itemAdded',
                label: 'Items Added',
                description: 'When someone adds to inventory'
              },
              {
                key: 'lowStock',
                label: 'Low Stock',
                description: 'When item quantity is running low'
              }
            ].map(({ key, label, description }) => (
              <label key={key} className="flex items-center justify-between cursor-pointer">
                <div>
                  <div className="font-medium text-foreground">{label}</div>
                  <div className="text-sm text-muted-foreground">{description}</div>
                </div>
                <input
                  type="checkbox"
                  checked={
                    preferences.inventoryAlerts[
                      key as keyof typeof preferences.inventoryAlerts
                    ]
                  }
                  onChange={async e => {
                    try {
                      await updatePreferences({
                        inventoryAlerts: {
                          ...preferences.inventoryAlerts,
                          [key]: e.target.checked
                        }
                      })
                    } catch (error) {
                      toast.error('Failed to update setting')
                    }
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                />
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
