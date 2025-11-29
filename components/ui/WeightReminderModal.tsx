'use client'

import { useEffect, useState } from 'react'
import { WeightLog } from '@/types/medical'
import { shouldShowWeightReminder, getWeightReminderMessage, getWeightReminderColor } from '@/lib/weight-reminder-logic'

interface WeightReminderModalProps {
  lastWeightLog: WeightLog | null
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly'
  lastMealLogDate?: Date | null
  patientName?: string // Name of the patient/family member
  onLogWeight: () => void
  onDismiss: () => void
}

const STORAGE_KEY = 'weight-reminder-dismissed'

/**
 * Get today's date string in YYYY-MM-DD format for localStorage comparison
 */
function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0]
}

/**
 * Check if reminder was dismissed today
 */
function wasDismissedToday(): boolean {
  if (typeof window === 'undefined') return false

  try {
    const dismissedDate = localStorage.getItem(STORAGE_KEY)
    return dismissedDate === getTodayDateString()
  } catch {
    return false
  }
}

/**
 * Mark reminder as dismissed for today
 */
function dismissForToday(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, getTodayDateString())
  } catch (error) {
    console.error('Failed to save dismissal to localStorage:', error)
  }
}

export function WeightReminderModal({
  lastWeightLog,
  frequency,
  lastMealLogDate,
  patientName,
  onLogWeight,
  onDismiss
}: WeightReminderModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if we should show the reminder
    const reminderStatus = shouldShowWeightReminder(lastWeightLog, frequency, lastMealLogDate)

    // Show if:
    // 1. Should show reminder (due/overdue)
    // 2. NOT dismissed today
    if (reminderStatus.shouldShow && !wasDismissedToday()) {
      setIsVisible(true)
    }
  }, [lastWeightLog, frequency, lastMealLogDate])

  const reminderStatus = shouldShowWeightReminder(lastWeightLog, frequency, lastMealLogDate)
  const colors = getWeightReminderColor(reminderStatus.status)
  const message = getWeightReminderMessage(reminderStatus, frequency)

  const handleRemindLater = () => {
    setIsVisible(false)
    onDismiss()
  }

  const handleDismissToday = () => {
    dismissForToday()
    setIsVisible(false)
    onDismiss()
  }

  const handleLogWeight = () => {
    setIsVisible(false)
    onLogWeight()
  }

  if (!isVisible) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-card rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className={`flex items-center gap-3 mb-4 pb-4 border-b-2 ${colors.border}`}>
          <span className="text-4xl">⚖️</span>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${colors.text}`}>
              {reminderStatus.isOverdue ? 'Weight Check-in Overdue' : 'Time for Your Weigh-in'}
            </h2>
            {patientName && (
              <p className="text-sm text-muted-foreground mt-1">
                for <span className="font-semibold text-foreground">{patientName}</span>
              </p>
            )}
            <div className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${colors.badge}`}>
              {frequency.replace('-', ' ')} check-in
            </div>
          </div>
        </div>

        {/* Message */}
        <div className={`rounded-lg p-4 mb-6 ${colors.bg} ${colors.border} border`}>
          <p className="text-sm text-foreground leading-relaxed">
            {message}
          </p>
          {reminderStatus.nextDueDate && !reminderStatus.isOverdue && (
            <p className="text-xs text-muted-foreground mt-2">
              Next check-in: {reminderStatus.nextDueDate.toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={handleLogWeight}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <span>⚖️</span>
            Log Weight Now
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleRemindLater}
              className="px-4 py-2 border border-border rounded-lg text-foreground hover:bg-background transition-colors text-sm font-medium"
            >
              Remind Later
            </button>
            <button
              onClick={handleDismissToday}
              className="px-4 py-2 border border-border rounded-lg text-muted-foreground hover:bg-background transition-colors text-sm"
            >
              Don't Show Today
            </button>
          </div>
        </div>

        {/* Helper Text */}
        <p className="text-xs text-center text-muted-foreground dark:text-muted-foreground mt-4">
          You can change your check-in frequency in Settings
        </p>
      </div>
    </div>
  )
}
