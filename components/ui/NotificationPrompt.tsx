'use client'

import { memo } from 'react'
import { useNotifications } from '@/hooks/useNotifications'
import { logger } from '@/lib/logger'

export interface NotificationPromptProps {
  userId: string | undefined
}

/**
 * Prompt card to request notification permission
 */
export const NotificationPrompt = memo(function NotificationPrompt({ userId }: NotificationPromptProps) {
  const {
    permission,
    isSupported,
    isSubscribed,
    loading,
    requestPermission
  } = useNotifications(userId)

  // Don't show if not supported or already granted
  if (!isSupported || permission === 'granted' || isSubscribed) {
    return null
  }

  // Don't show if user has denied (respect their choice)
  if (permission === 'denied') {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg p-6 shadow-lg">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-4xl">🔔</div>

        <div className="flex-1">
          <h3 className="font-bold text-lg mb-2">Stay on track with reminders</h3>
          <p className="text-sm opacity-90 mb-4">
            Get helpful notifications for:
          </p>
          <ul className="text-sm space-y-1 mb-4">
            <li>• Meal logging reminders</li>
            <li>• Milestone celebrations</li>
            <li>• Encouragement messages</li>
            <li>• Weekly progress summaries</li>
          </ul>

          <button
            onClick={requestPermission}
            disabled={loading}
            className="bg-background text-secondary font-semibold px-6 py-2 rounded-lg hover:bg-muted transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Enabling...' : 'Enable Notifications'}
          </button>
        </div>

        {/* Close button (optional) */}
        <button
          className="text-white opacity-60 hover:opacity-100 text-xl"
          onClick={() => {
            // TODO: Implement "don't show again" preference
            logger.debug('Notification prompt dismissed')
          }}
        >
          ✕
        </button>
      </div>
    </div>
  )
})

/**
 * Notification settings panel
 */
export interface NotificationSettingsProps {
  userId: string | undefined
}

export const NotificationSettings = memo(function NotificationSettings({ userId }: NotificationSettingsProps) {
  const {
    isSupported,
    isSubscribed,
    settings,
    loading,
    updateSettings,
    revokePermission
  } = useNotifications(userId)

  if (!isSupported || !isSubscribed || !settings) {
    return null
  }

  return (
    <div className="bg-card rounded-lg p-6">
      <h3 className="font-bold text-lg mb-4">Notification Preferences</h3>

      <div className="space-y-4">
        {/* Master toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium">Enable Notifications</p>
            <p className="text-sm text-muted-foreground">Receive all notifications</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              disabled={loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {/* Individual toggles */}
        {settings.enabled && (
          <>
            <div className="flex items-center justify-between border-t pt-4">
              <div>
                <p className="font-medium">Meal Reminders</p>
                <p className="text-sm text-muted-foreground">Reminders to log meals</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.mealReminders}
                  onChange={(e) => updateSettings({ mealReminders: e.target.checked })}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Encouragement</p>
                <p className="text-sm text-muted-foreground">Motivational messages</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.encouragement}
                  onChange={(e) => updateSettings({ encouragement: e.target.checked })}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Milestones</p>
                <p className="text-sm text-muted-foreground">Level ups and achievements</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.milestones}
                  onChange={(e) => updateSettings({ milestones: e.target.checked })}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Weekly Summary</p>
                <p className="text-sm text-muted-foreground">Progress recap every week</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.weeklySummary}
                  onChange={(e) => updateSettings({ weeklySummary: e.target.checked })}
                  disabled={loading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-light rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
          </>
        )}

        {/* Disable notifications button */}
        <div className="border-t pt-4">
          <button
            onClick={revokePermission}
            disabled={loading}
            className="text-error hover:text-error-dark text-sm font-medium disabled:opacity-60"
          >
            Disable All Notifications
          </button>
        </div>
      </div>
    </div>
  )
})

