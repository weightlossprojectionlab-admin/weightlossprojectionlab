'use client'

import { useState, useEffect } from 'react'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import type { NotificationPreferences as NotificationPrefsType, NotificationType } from '@/types/notifications'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/types/notifications'
import toast from 'react-hot-toast'

interface NotificationPreferencesProps {
  userId: string
}

interface NotificationCategory {
  title: string
  description?: string
  types: Array<{
    type: NotificationType
    label: string
    description: string
  }>
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    title: 'Medication & Health',
    description: 'Medication changes and health monitoring',
    types: [
      {
        type: 'medication_added',
        label: 'Medication Added',
        description: 'When a new medication is added'
      },
      {
        type: 'medication_updated',
        label: 'Medication Updated',
        description: 'When medication information is changed'
      },
      {
        type: 'medication_deleted',
        label: 'Medication Deleted',
        description: 'When a medication is removed'
      },
      {
        type: 'medication_reminder',
        label: 'Medication Reminders',
        description: 'Time to take medication'
      },
      {
        type: 'vital_logged',
        label: 'Vital Signs Logged',
        description: 'When vitals are recorded'
      },
      {
        type: 'vital_alert',
        label: 'Vital Sign Alerts',
        description: 'When vitals are out of normal range'
      },
      {
        type: 'weight_logged',
        label: 'Weight Logged',
        description: 'When weight is recorded'
      },
      {
        type: 'meal_logged',
        label: 'Meal Logged',
        description: 'When meals are logged'
      }
    ]
  },
  {
    title: 'Documents & Reports',
    description: 'Document uploads and health reports',
    types: [
      {
        type: 'document_uploaded',
        label: 'Document Uploaded',
        description: 'When a new document is uploaded'
      },
      {
        type: 'health_report_generated',
        label: 'Health Report Generated',
        description: 'When a health report is created'
      }
    ]
  },
  {
    title: 'Appointments',
    description: 'Appointment scheduling and reminders',
    types: [
      {
        type: 'appointment_scheduled',
        label: 'Appointment Scheduled',
        description: 'When a new appointment is scheduled'
      },
      {
        type: 'appointment_updated',
        label: 'Appointment Updated',
        description: 'When appointment details change'
      },
      {
        type: 'appointment_cancelled',
        label: 'Appointment Cancelled',
        description: 'When an appointment is cancelled'
      },
      {
        type: 'appointment_reminder',
        label: 'Appointment Reminders',
        description: 'Upcoming appointment notifications'
      }
    ]
  },
  {
    title: 'Family & Account',
    description: 'Family member and patient management',
    types: [
      {
        type: 'family_member_invited',
        label: 'Family Member Invited',
        description: 'When someone is invited to family circle'
      },
      {
        type: 'family_member_joined',
        label: 'Family Member Joined',
        description: 'When someone accepts an invitation'
      },
      {
        type: 'patient_added',
        label: 'Patient Added',
        description: 'When a new patient is added'
      }
    ]
  }
]

export function NotificationPreferences({ userId }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<NotificationPrefsType>(DEFAULT_NOTIFICATION_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  // Load preferences on mount
  useEffect(() => {
    loadPreferences()
  }, [userId])

  const loadPreferences = async () => {
    try {
      setLoading(true)

      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const idToken = await user.getIdToken()
      const response = await fetch('/api/notifications/preferences', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch preferences')
      }

      const data = await response.json()
      setPreferences(data.data)
    } catch (error) {
      logger.error('Error loading notification preferences', error as Error)
      toast.error('Failed to load notification preferences')
    } finally {
      setLoading(false)
    }
  }

  const handleSavePreferences = async () => {
    try {
      setSaving(true)

      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const idToken = await user.getIdToken()
      const response = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      })

      if (!response.ok) {
        throw new Error('Failed to save preferences')
      }

      toast.success('Notification preferences saved successfully')
      setHasChanges(false)
    } catch (error) {
      logger.error('Error saving notification preferences', error as Error)
      toast.error('Failed to save notification preferences')
    } finally {
      setSaving(false)
    }
  }

  const handleToggleMaster = (enabled: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      globallyEnabled: enabled
    }))
    setHasChanges(true)
  }

  const handleToggleChannel = (
    type: NotificationType,
    channel: 'email' | 'push',
    enabled: boolean
  ) => {
    setPreferences((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: enabled
      }
    }))
    setHasChanges(true)
  }

  const handleToggleQuietHours = (enabled: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours!,
        enabled
      }
    }))
    setHasChanges(true)
  }

  const handleQuietHourChange = (field: 'startHour' | 'endHour', value: number) => {
    setPreferences((prev) => ({
      ...prev,
      quietHours: {
        ...prev.quietHours!,
        [field]: value
      }
    }))
    setHasChanges(true)
  }

  const handleSendTestNotification = async () => {
    setSendingTest(true)
    try {
      // Check if browser supports notifications
      if (!('Notification' in window)) {
        toast.error('Your browser does not support notifications')
        return
      }

      // Check current permission
      let permission = Notification.permission

      // Request permission if not granted
      if (permission === 'default') {
        permission = await Notification.requestPermission()
      }

      if (permission === 'denied') {
        toast.error('Notification permission denied. Please enable notifications in your browser settings.')
        return
      }

      if (permission === 'granted') {
        // Send a browser notification directly
        const notification = new Notification('Test Notification', {
          body: 'Your notification preferences are working! You will receive helpful updates based on your settings.',
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'test-notification',
          requireInteraction: false,
          silent: false
        })

        // Auto-close after 5 seconds
        setTimeout(() => notification.close(), 5000)

        // Handle click
        notification.onclick = () => {
          window.focus()
          notification.close()
        }

        toast.success('Test notification sent successfully!')
        logger.info('[NotificationPreferences] Test notification sent successfully')
      }
    } catch (error) {
      logger.error('Error sending test notification:', error as Error)
      toast.error('Failed to send test notification: ' + (error as Error).message)
    } finally {
      setSendingTest(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-card rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg p-6 shadow-sm space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-1">Notification Preferences</h2>
        <p className="text-sm text-muted-foreground">
          Choose how you want to be notified about family health updates
        </p>
      </div>

      {/* Master Toggle */}
      <div className="p-4 bg-accent-light dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="font-medium text-foreground">Enable All Notifications</p>
            <p className="text-sm text-muted-foreground">
              Master switch for all notification types
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={preferences.globallyEnabled}
              onChange={(e) => handleToggleMaster(e.target.checked)}
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>
      </div>

      {/* Notification Categories */}
      {preferences.globallyEnabled && (
        <div className="space-y-6">
          {NOTIFICATION_CATEGORIES.map((category) => (
            <div key={category.title} className="border border-border rounded-lg p-4">
              <div className="mb-4">
                <h3 className="font-medium text-foreground">{category.title}</h3>
                {category.description && (
                  <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
                )}
              </div>

              <div className="space-y-3">
                {category.types.map((item) => (
                  <div
                    key={item.type}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center p-3 bg-background rounded-lg"
                  >
                    <div className="sm:col-span-1">
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start sm:col-span-2 gap-4">
                      {/* Email Toggle */}
                      <div className="flex items-center gap-2 flex-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences[item.type]?.email ?? true}
                            onChange={(e) =>
                              handleToggleChannel(item.type, 'email', e.target.checked)
                            }
                          />
                          <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-success"></div>
                        </label>
                        <span className="text-sm text-foreground">Email</span>
                      </div>

                      {/* Push Toggle */}
                      <div className="flex items-center gap-2 flex-1">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={preferences[item.type]?.push ?? true}
                            onChange={(e) =>
                              handleToggleChannel(item.type, 'push', e.target.checked)
                            }
                          />
                          <div className="w-9 h-5 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                        </label>
                        <span className="text-sm text-foreground">Push</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Quiet Hours */}
          <div className="border border-border rounded-lg p-4">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-foreground">Quiet Hours</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Pause push notifications during these hours
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={preferences.quietHours?.enabled ?? true}
                    onChange={(e) => handleToggleQuietHours(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            {preferences.quietHours?.enabled && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Time
                  </label>
                  <select
                    value={preferences.quietHours.startHour}
                    onChange={(e) =>
                      handleQuietHourChange('startHour', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0
                          ? '12 AM'
                          : i < 12
                          ? `${i} AM`
                          : i === 12
                          ? '12 PM'
                          : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Time
                  </label>
                  <select
                    value={preferences.quietHours.endHour}
                    onChange={(e) =>
                      handleQuietHourChange('endHour', parseInt(e.target.value))
                    }
                    className="w-full px-3 py-2 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>
                        {i === 0
                          ? '12 AM'
                          : i < 12
                          ? `${i} AM`
                          : i === 12
                          ? '12 PM'
                          : `${i - 12} PM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Test Notification */}
          <div className="border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <h3 className="font-medium text-foreground mb-2">Test Your Settings</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Send a test notification to verify your preferences are working correctly
            </p>
            <button
              onClick={handleSendTestNotification}
              disabled={sendingTest}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {sendingTest ? 'Sending Test...' : 'Send Test Notification'}
            </button>
          </div>

          {/* Save Button */}
          {hasChanges && (
            <div className="sticky bottom-4 p-4 bg-warning-light border-2 border-warning-dark rounded-lg shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-warning-dark">
                  You have unsaved changes
                </p>
                <button
                  onClick={handleSavePreferences}
                  disabled={saving}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
