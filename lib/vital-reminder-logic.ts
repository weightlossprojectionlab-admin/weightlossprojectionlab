/**
 * Unified Vital Reminder Logic
 *
 * Determines when users should be reminded to log vital signs based on:
 * - Their preferred check-in frequency
 * - Last logged vital of that type
 * - User activity status
 *
 * ARCHITECTURE NOTE:
 * This is the SIMPLE frequency-based reminder system for profile settings.
 * For advanced multi-time schedules with compliance tracking, see:
 * - lib/vital-schedule-service.ts
 * - types/vital-schedules.ts
 *
 * Reminder Hierarchy:
 * 1. VitalMonitoringSchedule (wizard) takes precedence if exists
 * 2. Profile frequency reminders (this file) for casual monitoring
 */

import { VitalSign, VitalType } from '@/types/medical'

export type VitalFrequency =
  | 'daily'
  | 'twice-daily'
  | 'three-times-daily'
  | 'four-times-daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'

export interface VitalReminderResult {
  shouldShow: boolean
  daysSince: number
  nextDueDate: Date | null
  isOverdue: boolean
  status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'
  isUserInactive?: boolean
  daysSinceLastActivity?: number
  vitalType: VitalType
}

/**
 * Vital Type Display Names
 */
export const VITAL_DISPLAY_NAMES: Record<VitalType, string> = {
  blood_pressure: 'Blood Pressure',
  blood_sugar: 'Blood Sugar',
  temperature: 'Temperature',
  pulse_oximeter: 'Pulse Oximeter',
  weight: 'Weight',
  mood: 'Mood'
}

/**
 * Vital Type Icons
 */
export const VITAL_ICONS: Record<VitalType, string> = {
  blood_pressure: '💓',
  blood_sugar: '🩸',
  temperature: '🌡️',
  pulse_oximeter: '❤️',
  weight: '⚖️',
  mood: '😊'
}

/**
 * Default Frequencies per Vital Type
 */
export const DEFAULT_FREQUENCIES: Record<VitalType, VitalFrequency> = {
  blood_pressure: 'daily',
  blood_sugar: 'daily',
  temperature: 'weekly',
  pulse_oximeter: 'daily',
  weight: 'weekly',
  mood: 'daily'
}

/**
 * Available Frequency Options per Vital Type
 */
export const FREQUENCY_OPTIONS: Record<VitalType, VitalFrequency[]> = {
  blood_pressure: ['daily', 'twice-daily', 'weekly', 'monthly'],
  blood_sugar: ['daily', 'twice-daily', 'three-times-daily', 'four-times-daily'],
  temperature: ['daily', 'weekly', 'biweekly'],
  pulse_oximeter: ['daily', 'twice-daily', 'weekly'],
  weight: ['daily', 'weekly', 'biweekly', 'monthly'],
  mood: ['daily', 'twice-daily', 'three-times-daily']
}

/**
 * Frequency Display Labels
 */
export const FREQUENCY_LABELS: Record<VitalFrequency, string> = {
  'daily': 'Daily',
  'twice-daily': 'Twice Daily',
  'three-times-daily': '3x Daily',
  'four-times-daily': '4x Daily',
  'weekly': 'Weekly',
  'biweekly': 'Bi-weekly',
  'monthly': 'Monthly'
}

/**
 * Convert frequency to days for calculation
 */
function frequencyToDays(frequency: VitalFrequency): number {
  const frequencyDays: Record<VitalFrequency, number> = {
    'daily': 1,
    'twice-daily': 0.5, // Multiple times per day
    'three-times-daily': 0.33,
    'four-times-daily': 0.25,
    'weekly': 7,
    'biweekly': 14,
    'monthly': 30
  }
  return frequencyDays[frequency]
}

/**
 * Determines if the user should be reminded to log a vital sign
 * based on their preferred check-in frequency and last vital log.
 * Also considers user activity to avoid nagging inactive users.
 *
 * @param vitalType - The type of vital sign
 * @param lastVitalLog - The most recent vital log (or null if none)
 * @param frequency - User's preferred check-in frequency
 * @param lastActivityDate - Date of most recent activity (optional, for activity tracking)
 * @returns Reminder metadata including whether to show reminder
 */
export function shouldShowVitalReminder(
  vitalType: VitalType,
  lastVitalLog: VitalSign | null,
  frequency: VitalFrequency = DEFAULT_FREQUENCIES[vitalType],
  lastActivityDate?: Date | null
): VitalReminderResult {
  // If no vital logs exist, DON'T show reminder - let users discover it naturally
  // Only nag users who have established a logging habit
  // EXCEPTION: Mood is opt-in, so show reminders even if never logged before
  if (!lastVitalLog && vitalType !== 'mood') {
    return {
      shouldShow: false,
      daysSince: 0,
      nextDueDate: new Date(), // Due now
      isOverdue: false,
      status: 'on-track',
      vitalType
    }
  }

  // For mood with no previous logs, treat as if it's overdue and needs first entry
  if (!lastVitalLog && vitalType === 'mood') {
    return {
      shouldShow: true,
      daysSince: 999, // Large number to indicate "never logged"
      nextDueDate: new Date(), // Due now
      isOverdue: true,
      status: 'overdue',
      vitalType
    }
  }

  const now = new Date()
  const lastLogDate = new Date(lastVitalLog.recordedAt)

  // Compare calendar dates, not time differences
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastLogCalendarDate = new Date(lastLogDate.getFullYear(), lastLogDate.getMonth(), lastLogDate.getDate())
  const daysSinceLastLog = Math.floor((todayDate.getTime() - lastLogCalendarDate.getTime()) / (1000 * 60 * 60 * 24))

  // Check if already logged today
  const loggedToday = daysSinceLastLog === 0

  // Check user activity
  let daysSinceLastActivity = 0
  let isUserInactive = false

  if (lastActivityDate) {
    daysSinceLastActivity = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    // Consider user inactive if no activity for 14+ days
    isUserInactive = daysSinceLastActivity >= 14
  }

  // If user is inactive, show re-engagement message instead of vital reminder
  if (isUserInactive) {
    return {
      shouldShow: true,
      daysSince: daysSinceLastLog,
      nextDueDate: null,
      isOverdue: false,
      status: 'inactive',
      isUserInactive: true,
      daysSinceLastActivity,
      vitalType
    }
  }

  // Calculate frequency in days
  const targetDays = frequencyToDays(frequency)
  const nextDueDate = new Date(lastLogDate)
  nextDueDate.setDate(nextDueDate.getDate() + Math.ceil(targetDays))

  // For daily frequency, check if logged today specifically
  if (frequency === 'daily') {
    if (loggedToday) {
      // Already logged today - no reminder
      return {
        shouldShow: false,
        daysSince: 0,
        nextDueDate: new Date(todayDate.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        isOverdue: false,
        status: 'on-track',
        vitalType
      }
    } else if (daysSinceLastLog === 1) {
      // Last log was yesterday - due today
      return {
        shouldShow: true,
        daysSince: 1,
        nextDueDate: todayDate,
        isOverdue: false,
        status: 'due-soon',
        vitalType
      }
    } else {
      // Overdue (2+ days)
      return {
        shouldShow: true,
        daysSince: daysSinceLastLog,
        nextDueDate: todayDate,
        isOverdue: true,
        status: 'overdue',
        vitalType
      }
    }
  }

  // For multiple-times-daily frequencies (twice-daily, 3x, 4x)
  if (frequency.includes('daily') && frequency !== 'daily') {
    // For multi-daily frequencies, check if logged today
    if (loggedToday) {
      // Already logged today - show reminder based on time since last log
      const hoursSinceLastLog = Math.floor((now.getTime() - lastLogDate.getTime()) / (1000 * 60 * 60))
      const targetHours = Math.floor(24 / parseInt(frequency.replace(/[^0-9]/g, '') || '2'))

      if (hoursSinceLastLog >= targetHours) {
        return {
          shouldShow: true,
          daysSince: 0,
          nextDueDate: now,
          isOverdue: false,
          status: 'due-soon',
          vitalType
        }
      } else {
        return {
          shouldShow: false,
          daysSince: 0,
          nextDueDate: new Date(lastLogDate.getTime() + targetHours * 60 * 60 * 1000),
          isOverdue: false,
          status: 'on-track',
          vitalType
        }
      }
    } else {
      // Not logged today - overdue
      return {
        shouldShow: true,
        daysSince: daysSinceLastLog,
        nextDueDate: todayDate,
        isOverdue: true,
        status: 'overdue',
        vitalType
      }
    }
  }

  // For weekly/biweekly/monthly, use existing logic
  const targetDaysInt = Math.ceil(targetDays)
  const isOverdue = daysSinceLastLog >= targetDaysInt
  const isDueSoon = daysSinceLastLog >= targetDaysInt - 1 && !isOverdue // Due tomorrow

  let status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'
  if (isOverdue) {
    status = 'overdue'
  } else if (isDueSoon) {
    status = 'due-soon'
  } else {
    status = 'on-track'
  }

  // Show reminder if overdue or due soon
  const shouldShow = isOverdue || isDueSoon

  return {
    shouldShow,
    daysSince: daysSinceLastLog,
    nextDueDate,
    isOverdue,
    status,
    isUserInactive: false,
    daysSinceLastActivity,
    vitalType
  }
}

/**
 * Gets a friendly message for the vital reminder
 */
export function getVitalReminderMessage(
  result: VitalReminderResult,
  frequency: VitalFrequency
): string {
  const vitalName = VITAL_DISPLAY_NAMES[result.vitalType]

  if (result.daysSince === 0) {
    return `Log your first ${vitalName.toLowerCase()} reading to start tracking!`
  }

  if (result.status === 'inactive') {
    return `Welcome back! It's been ${result.daysSinceLastActivity || 0} days since your last activity. Let's get back on track by logging your ${vitalName.toLowerCase()}!`
  }

  if (result.isOverdue) {
    const frequencyDays = Math.ceil(frequencyToDays(frequency))
    const daysOverdue = result.daysSince - frequencyDays
    return `Time for your ${FREQUENCY_LABELS[frequency].toLowerCase()} ${vitalName.toLowerCase()} check! Last logged ${result.daysSince} days ago${daysOverdue > 0 ? ` (${daysOverdue} days overdue)` : ''}.`
  }

  if (result.status === 'due-soon') {
    return `Your ${FREQUENCY_LABELS[frequency].toLowerCase()} ${vitalName.toLowerCase()} check is due soon. Last logged ${result.daysSince} days ago.`
  }

  return `Last ${vitalName.toLowerCase()} check: ${result.daysSince} days ago. Next check-in: ${result.nextDueDate?.toLocaleDateString()}`
}

/**
 * Gets color classes for vital reminder status
 */
export function getVitalReminderColor(status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'): {
  border: string
  bg: string
  text: string
  badge: string
} {
  switch (status) {
    case 'on-track':
      return {
        border: 'border-green-200 dark:border-green-800',
        bg: 'bg-success-light dark:bg-green-900/20',
        text: 'text-success-dark dark:text-green-300',
        badge: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
      }
    case 'due-soon':
      return {
        border: 'border-warning-light',
        bg: 'bg-warning-light',
        text: 'text-yellow-700 dark:text-yellow-300',
        badge: 'bg-yellow-100 dark:bg-yellow-900 text-warning-dark'
      }
    case 'overdue':
      return {
        border: 'border-red-200 dark:border-red-800',
        bg: 'bg-error-light dark:bg-red-900/20',
        text: 'text-error-dark dark:text-red-300',
        badge: 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
      }
    case 'inactive':
      return {
        border: 'border-secondary-light',
        bg: 'bg-secondary-light',
        text: 'text-blue-700 dark:text-blue-300',
        badge: 'bg-blue-100 dark:bg-blue-900 text-secondary-dark'
      }
  }
}

/**
 * Get all vital types with their reminder configurations
 */
export function getAllVitalTypes(): VitalType[] {
  return ['blood_pressure', 'blood_sugar', 'temperature', 'pulse_oximeter', 'weight', 'mood']
}

/**
 * Migrate legacy weight reminder settings to new unified format
 */
export function migrateLegacyWeightReminders(
  disableWeightReminders?: boolean,
  weightCheckInFrequency?: 'daily' | 'weekly' | 'biweekly' | 'monthly'
): { enabled: boolean; frequency: VitalFrequency } | undefined {
  if (disableWeightReminders !== undefined || weightCheckInFrequency !== undefined) {
    return {
      enabled: !disableWeightReminders,
      frequency: (weightCheckInFrequency || 'weekly') as VitalFrequency
    }
  }
  return undefined
}
