/**
 * VitalReminderPrompt Component
 *
 * Proactive in-page prompt that appears on patient page when vitals are due today.
 * Shows which vitals haven't been logged yet and prompts user to log them.
 *
 * Features:
 * - Only shows vitals that are DUE TODAY (based on user's reminder preferences)
 * - Dismissible with two options:
 *   1. "Remind me later" - Dismiss for now, keeps reminder active
 *   2. "Don't remind me again" - Permanently disables this vital reminder in profile
 * - Integrates with user's vital reminder preferences from /profile
 */

'use client'

import { useState } from 'react'
import { XMarkIcon, BellIcon, ClockIcon } from '@heroicons/react/24/outline'
import { VitalSign } from '@/types/medical'
import { shouldShowVitalReminder, getVitalReminderMessage, getVitalReminderColor, VitalFrequency } from '@/lib/vital-reminder-logic'
import { userProfileOperations } from '@/lib/firebase-operations'
import toast from 'react-hot-toast'

interface VitalReminderPromptProps {
  patientId: string
  patientName: string
  vitals: VitalSign[]
  userPreferences?: {
    vitalReminders?: {
      blood_pressure?: { enabled: boolean; frequency: string }
      blood_sugar?: { enabled: boolean; frequency: string }
      temperature?: { enabled: boolean; frequency: string }
      pulse_oximeter?: { enabled: boolean; frequency: string }
      weight?: { enabled: boolean; frequency: string }
    }
  }
  onLogVitalsClick: () => void
  onLogSpecificVital?: (vitalType: VitalType) => void
}

type VitalType = 'blood_pressure' | 'blood_sugar' | 'temperature' | 'pulse_oximeter' | 'weight'

interface VitalReminderInfo {
  type: VitalType
  label: string
  icon: string
  message: string
  status: 'due_soon' | 'overdue' | 'on_track'
  color: string
}

export default function VitalReminderPrompt({
  patientId,
  patientName,
  vitals,
  userPreferences,
  onLogVitalsClick,
  onLogSpecificVital
}: VitalReminderPromptProps) {
  const [dismissedVitals, setDismissedVitals] = useState<Set<VitalType>>(new Set())
  const [confirmDisable, setConfirmDisable] = useState<{ type: VitalType; label: string } | null>(null)

  // DEBUG: Log component render and props
  console.log('[VitalReminderPrompt] Component rendering', {
    patientId,
    patientName,
    vitalsCount: vitals?.length,
    hasUserPreferences: !!userPreferences,
    vitalReminders: userPreferences?.vitalReminders,
    vitalsTypes: vitals?.map(v => v.type)
  })

  // Define vital types with metadata
  const vitalTypes: Array<{ type: VitalType; label: string; icon: string }> = [
    { type: 'blood_pressure', label: 'Blood Pressure', icon: '💓' },
    { type: 'blood_sugar', label: 'Blood Sugar', icon: '🩸' },
    { type: 'temperature', label: 'Temperature', icon: '🌡️' },
    { type: 'pulse_oximeter', label: 'Pulse Oximeter', icon: '❤️' },
    { type: 'weight', label: 'Weight', icon: '⚖️' },
    { type: 'mood', label: 'Mood', icon: '😊' }
  ]

  // Calculate which vitals need reminders today
  const vitalsNeedingReminders: VitalReminderInfo[] = []

  for (const vitalType of vitalTypes) {
    // Skip if user has dismissed this vital in current session
    if (dismissedVitals.has(vitalType.type)) {
      console.debug(`[VitalReminderPrompt] Skipping ${vitalType.type} - dismissed in session`)
      continue
    }

    // Skip if reminder is not enabled in user preferences
    const reminderConfig = userPreferences?.vitalReminders?.[vitalType.type]
    if (!reminderConfig?.enabled) {
      console.debug(`[VitalReminderPrompt] Skipping ${vitalType.type} - not enabled`, reminderConfig)
      continue
    }

    console.log(`[VitalReminderPrompt] Checking ${vitalType.type}`, { reminderConfig })

    // Validate frequency value
    const frequency = reminderConfig.frequency as VitalFrequency
    if (!frequency) {
      console.warn(`[VitalReminderPrompt] Invalid frequency for ${vitalType.type}:`, reminderConfig.frequency)
      continue
    }

    // Get last log for this vital type
    const lastLog = vitals
      .filter(v => v.type === vitalType.type)
      .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime())[0]

    console.log(`[VitalReminderPrompt] ${vitalType.type} last log:`, lastLog)

    // Check if reminder should be shown
    const reminderResult = shouldShowVitalReminder(
      vitalType.type,
      lastLog,
      frequency
    )

    console.log(`[VitalReminderPrompt] ${vitalType.type} reminder result:`, reminderResult)

    if (reminderResult.shouldShow) {
      const message = getVitalReminderMessage(reminderResult, frequency)
      console.log(`[VitalReminderPrompt] Adding ${vitalType.type} to reminders:`, message)

      vitalsNeedingReminders.push({
        type: vitalType.type,
        label: vitalType.label,
        icon: vitalType.icon,
        message,
        status: reminderResult.status,
        color: getVitalReminderColor(reminderResult.status)
      })
    }
  }

  // Don't show component if no vitals need reminders
  if (vitalsNeedingReminders.length === 0) {
    // Debug logging to help troubleshoot why no reminders are showing
    if (process.env.NODE_ENV === 'development') {
      const enabledReminders = Object.entries(userPreferences?.vitalReminders || {})
        .filter(([_, config]) => config?.enabled)
        .map(([type, config]) => `${type}:${config?.frequency}`)

      console.debug('[VitalReminderPrompt] No reminders to show', {
        patientId,
        vitalsCount: vitals.length,
        enabledReminders,
        dismissedCount: dismissedVitals.size
      })
    }
    return null
  }

  // Handle "Remind me later" - just dismiss for this session
  const handleRemindLater = (vitalType: VitalType) => {
    setDismissedVitals(prev => new Set(prev).add(vitalType))
  }

  // Handle "Don't remind me again" - permanently disable in profile
  const handleDisableReminder = async (vitalType: VitalType) => {
    try {
      // Update user preferences to disable this vital reminder
      await userProfileOperations.updateUserProfile({
        preferences: {
          ...userPreferences,
          vitalReminders: {
            ...userPreferences?.vitalReminders,
            [vitalType]: {
              enabled: false,
              frequency: userPreferences?.vitalReminders?.[vitalType]?.frequency || 'daily'
            }
          }
        }
      })

      // Remove from local dismissed list
      setDismissedVitals(prev => new Set(prev).add(vitalType))

      toast.success(`${vitalTypes.find(v => v.type === vitalType)?.label} reminders disabled`)
      setConfirmDisable(null)
    } catch (error) {
      toast.error('Failed to update reminder settings')
    }
  }

  // Open confirmation modal before disabling
  const confirmDisableReminder = (vitalType: VitalType) => {
    const vital = vitalTypes.find(v => v.type === vitalType)
    if (vital) {
      setConfirmDisable({ type: vitalType, label: vital.label })
    }
  }

  // Handle "Log Now" button
  const handleLogNow = () => {
    onLogVitalsClick()
  }

  return (
    <>
      {/* Modal Overlay */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vital-reminder-title"
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            // Dismiss all vitals and close modal
            vitalsNeedingReminders.forEach(v => {
              setDismissedVitals(prev => new Set(prev).add(v.type))
            })
          }
        }}
      >
        {/* Modal Content */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-200">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-3 bg-white/20 rounded-full">
                <BellIcon className="h-8 w-8" />
              </div>
              <div className="flex-1">
                <h2 id="vital-reminder-title" className="text-2xl font-bold mb-2">
                  Time to Check Vitals
                </h2>
                <p className="text-blue-100">
                  {patientName} has {vitalsNeedingReminders.length} vital{vitalsNeedingReminders.length !== 1 ? 's' : ''} due today
                </p>
              </div>
            </div>
          </div>

          {/* Body - Scrollable */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-250px)]">

            {/* Vital Cards */}
            <div className="space-y-3">
              {vitalsNeedingReminders.map((vital) => (
                <div
                  key={vital.type}
                  className={`bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border-l-4 ${vital.color.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Vital Info */}
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{vital.icon}</span>
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground text-lg">{vital.label}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{vital.message}</p>
                      </div>
                    </div>

                    {/* Action Buttons - Mobile Responsive */}
                    <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-2">
                      {/* Log this vital button - only show if callback provided */}
                      {onLogSpecificVital && (
                        <button
                          onClick={() => {
                            onLogSpecificVital(vital.type)
                            handleRemindLater(vital.type)
                          }}
                          className="w-full sm:w-auto px-4 py-2.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                          aria-label={`Log ${vital.label} now`}
                        >
                          Log Now
                        </button>
                      )}

                      {/* Remind Later */}
                      <button
                        onClick={() => handleRemindLater(vital.type)}
                        className="w-full sm:w-auto p-2.5 sm:p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        aria-label={`Remind me later about ${vital.label}`}
                        title="Remind me later"
                      >
                        <ClockIcon className="h-5 w-5" aria-hidden="true" />
                        <span className="sm:hidden">Remind Later</span>
                      </button>

                      {/* Don't Remind Again */}
                      <button
                        onClick={() => confirmDisableReminder(vital.type)}
                        className="w-full sm:w-auto p-2.5 sm:p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        aria-label={`Disable ${vital.label} reminders`}
                        title="Don't remind me again"
                      >
                        <XMarkIcon className="h-5 w-5" aria-hidden="true" />
                        <span className="sm:hidden">Disable</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer - Action Buttons */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gray-50 dark:bg-gray-800/50">
            {onLogSpecificVital && vitalsNeedingReminders.length === 1 ? (
              // If only one vital is due AND quick log is available, hide the bottom button (use individual "Log Now" instead)
              <button
                onClick={() => {
                  // Dismiss all for this session
                  vitalsNeedingReminders.forEach(v => {
                    setDismissedVitals(prev => new Set(prev).add(v.type))
                  })
                }}
                className="w-full px-6 py-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
              >
                Maybe Later
              </button>
            ) : (
              // Multiple vitals due - show both quick log buttons AND wizard button for comprehensive logging
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  onClick={handleLogNow}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all font-semibold flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <BellIcon className="h-5 w-5" />
                  {onLogSpecificVital ? 'Log All Vitals (Wizard)' : 'Log Vitals Now'}
                </button>

                <button
                  onClick={() => {
                    // Dismiss all for this session
                    vitalsNeedingReminders.forEach(v => {
                      setDismissedVitals(prev => new Set(prev).add(v.type))
                    })
                  }}
                  className="px-6 py-4 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                >
                  Maybe Later
                </button>
              </div>
            )}

            {/* Footer Help Text */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-center text-muted-foreground">
                💡 <strong>Tip:</strong> {onLogSpecificVital
                  ? 'Click "Log Now" on any vital for quick entry, or use the wizard to log multiple vitals with guided questions.'
                  : 'Use the clock icon (⏰) to snooze or X to disable a specific vital reminder.'}
                {' '}Manage all reminders in <a href="/profile" className="text-primary hover:underline font-medium">Profile Settings</a>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal for Disabling Reminder */}
      {confirmDisable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-foreground mb-2">
              Disable {confirmDisable.label} Reminders?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to stop receiving {confirmDisable.label} reminders? You can re-enable this in Profile Settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDisable(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-foreground rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDisableReminder(confirmDisable.type)}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium"
              >
                Yes, Disable
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
