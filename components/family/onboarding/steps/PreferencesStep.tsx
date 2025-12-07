'use client'

import type { CaregiverPreferences, ContactMethod } from '@/types/caregiver-profile'
import { COMMON_LANGUAGES } from '@/types/caregiver-profile'

interface PreferencesStepProps {
  data: CaregiverPreferences | undefined
  onChange: (data: CaregiverPreferences) => void
}

const CONTACT_METHODS: { value: ContactMethod; label: string; icon: string; description: string }[] = [
  {
    value: 'app',
    label: 'App Notifications',
    icon: '📱',
    description: 'Get real-time updates in the app'
  },
  {
    value: 'email',
    label: 'Email',
    icon: '📧',
    description: 'Receive updates via email'
  },
  {
    value: 'sms',
    label: 'Text Message',
    icon: '💬',
    description: 'Get SMS notifications'
  },
  {
    value: 'phone',
    label: 'Phone Call',
    icon: '📞',
    description: 'Receive phone calls for important updates'
  }
]

export function PreferencesStep({ data, onChange }: PreferencesStepProps) {
  const preferencesData: CaregiverPreferences = data || {
    languagesSpoken: ['English'],
    preferredContactMethod: 'app',
    alternateContactMethods: [],
    communicationStyle: '',
    notifications: {
      email: true,
      sms: false,
      push: true,
      emergencyOnly: false
    },
    quietHours: {
      startTime: '22:00',
      endTime: '08:00'
    }
  }

  const handleChange = (updates: Partial<CaregiverPreferences>) => {
    onChange({ ...preferencesData, ...updates })
  }

  const handleToggleLanguage = (language: string) => {
    const updated = preferencesData.languagesSpoken.includes(language)
      ? preferencesData.languagesSpoken.filter(l => l !== language)
      : [...preferencesData.languagesSpoken, language]

    // Ensure at least one language is selected
    if (updated.length > 0) {
      handleChange({ languagesSpoken: updated })
    }
  }

  const handleToggleAlternateMethod = (method: ContactMethod) => {
    const current = preferencesData.alternateContactMethods || []
    const updated = current.includes(method)
      ? current.filter(m => m !== method)
      : [...current, method]

    handleChange({ alternateContactMethods: updated })
  }

  return (
    <div className="space-y-6">
      {/* Languages Spoken */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Languages You Speak <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Select all languages you're comfortable communicating in
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {COMMON_LANGUAGES.map((language) => {
            const isSelected = preferencesData.languagesSpoken.includes(language)
            return (
              <button
                key={language}
                type="button"
                onClick={() => handleToggleLanguage(language)}
                className={`
                  px-4 py-3 rounded-xl text-left font-medium transition-all
                  ${isSelected
                    ? 'bg-primary text-white border-2 border-primary'
                    : 'bg-card border-2 border-border hover:border-primary text-foreground'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{language}</span>
                  {isSelected && <span>✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Preferred Contact Method */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Preferred Contact Method <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          How would you like to receive non-urgent updates?
        </p>
        <div className="grid gap-3">
          {CONTACT_METHODS.map((method) => {
            const isSelected = preferencesData.preferredContactMethod === method.value
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => handleChange({ preferredContactMethod: method.value })}
                className={`
                  p-4 rounded-xl text-left transition-all
                  ${isSelected
                    ? 'bg-primary text-white border-2 border-primary shadow-lg'
                    : 'bg-card border-2 border-border hover:border-primary'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{method.icon}</span>
                  <div className="flex-1">
                    <div className="font-semibold">{method.label}</div>
                    <div className={`text-sm ${isSelected ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {method.description}
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-2xl">✓</span>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Alternate Contact Methods */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Backup Contact Methods (Optional)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Select additional ways to reach you if primary method fails
        </p>
        <div className="grid grid-cols-2 gap-2">
          {CONTACT_METHODS.filter(m => m.value !== preferencesData.preferredContactMethod).map((method) => {
            const isSelected = preferencesData.alternateContactMethods?.includes(method.value)
            return (
              <button
                key={method.value}
                type="button"
                onClick={() => handleToggleAlternateMethod(method.value)}
                className={`
                  px-4 py-3 rounded-xl text-left font-medium transition-all
                  ${isSelected
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-card border-2 border-border hover:border-primary text-foreground'
                  }
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span>{method.icon}</span>
                    <span className="text-sm">{method.label}</span>
                  </div>
                  {isSelected && <span>✓</span>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Notification Settings
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-border bg-card">
          <input
            type="checkbox"
            checked={preferencesData.notifications?.email ?? true}
            onChange={(e) =>
              handleChange({
                notifications: {
                  ...preferencesData.notifications!,
                  email: e.target.checked
                }
              })
            }
            className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground">Email Notifications</span>
            <p className="text-sm text-muted-foreground mt-1">
              Receive daily summaries and important updates via email
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-border bg-card">
          <input
            type="checkbox"
            checked={preferencesData.notifications?.sms ?? false}
            onChange={(e) =>
              handleChange({
                notifications: {
                  ...preferencesData.notifications!,
                  sms: e.target.checked
                }
              })
            }
            className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground">SMS Notifications</span>
            <p className="text-sm text-muted-foreground mt-1">
              Get text messages for time-sensitive updates
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-border bg-card">
          <input
            type="checkbox"
            checked={preferencesData.notifications?.push ?? true}
            onChange={(e) =>
              handleChange({
                notifications: {
                  ...preferencesData.notifications!,
                  push: e.target.checked
                }
              })
            }
            className="w-5 h-5 rounded border-2 border-border text-primary focus:ring-2 focus:ring-primary"
          />
          <div className="flex-1">
            <span className="font-medium text-foreground">Push Notifications</span>
            <p className="text-sm text-muted-foreground mt-1">
              Receive real-time alerts on your device
            </p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer p-4 rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-900/10">
          <input
            type="checkbox"
            checked={preferencesData.notifications?.emergencyOnly ?? false}
            onChange={(e) =>
              handleChange({
                notifications: {
                  ...preferencesData.notifications!,
                  emergencyOnly: e.target.checked
                }
              })
            }
            className="w-5 h-5 rounded border-2 border-amber-500 text-amber-600 focus:ring-2 focus:ring-amber-500"
          />
          <div className="flex-1">
            <span className="font-medium text-amber-900 dark:text-amber-100">
              Emergency-Only Mode
            </span>
            <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
              Only receive critical/emergency notifications (overrides other settings)
            </p>
          </div>
        </label>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-foreground">
          Quiet Hours (Optional)
        </label>
        <p className="text-xs text-muted-foreground mb-2">
          Set times when you don't want to receive non-emergency notifications
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Start Time (Quiet begins)
            </label>
            <input
              type="time"
              value={preferencesData.quietHours?.startTime || '22:00'}
              onChange={(e) =>
                handleChange({
                  quietHours: {
                    ...preferencesData.quietHours!,
                    startTime: e.target.value
                  }
                })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              End Time (Quiet ends)
            </label>
            <input
              type="time"
              value={preferencesData.quietHours?.endTime || '08:00'}
              onChange={(e) =>
                handleChange({
                  quietHours: {
                    ...preferencesData.quietHours!,
                    endTime: e.target.value
                  }
                })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Communication Style */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-foreground">
          Communication Preferences (Optional)
        </label>
        <textarea
          value={preferencesData.communicationStyle || ''}
          onChange={(e) => handleChange({ communicationStyle: e.target.value })}
          placeholder="e.g., 'I prefer detailed updates,' 'Keep it brief,' 'I work night shifts, so mornings are better'"
          rows={4}
          className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background focus:border-primary focus:outline-none transition-colors resize-none"
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {preferencesData.communicationStyle?.length || 0}/500 characters
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-muted border border-border">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔔</span>
          <div className="flex-1">
            <h4 className="font-semibold text-foreground mb-1">Smart Notifications</h4>
            <p className="text-sm text-muted-foreground">
              We'll respect your preferences while ensuring you never miss critical alerts.
              Emergency notifications always override quiet hours and notification settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
