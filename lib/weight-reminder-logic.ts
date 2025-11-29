import { WeightLog } from '@/types/medical'

interface WeightReminderResult {
  shouldShow: boolean
  daysSince: number
  nextDueDate: Date | null
  isOverdue: boolean
  status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'
  isUserInactive?: boolean
  daysSinceLastMealLog?: number
}

/**
 * Determines if the user should be reminded to log their weight
 * based on their preferred check-in frequency and last weight log.
 * Also considers user activity (meal logging) to avoid nagging inactive users.
 *
 * @param lastWeightLog - The most recent weight log (or null if none)
 * @param frequency - User's preferred check-in frequency
 * @param lastMealLogDate - Date of most recent meal log (optional, for activity tracking)
 * @returns Reminder metadata including whether to show reminder
 */
export function shouldShowWeightReminder(
  lastWeightLog: WeightLog | null,
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' = 'weekly',
  lastMealLogDate?: Date | null
): WeightReminderResult {
  // If no weight logs exist, always show reminder
  if (!lastWeightLog) {
    return {
      shouldShow: true,
      daysSince: 0,
      nextDueDate: new Date(), // Due now
      isOverdue: true,
      status: 'overdue'
    }
  }

  const now = new Date()
  const lastLogDate = new Date(lastWeightLog.loggedAt)

  // Compare calendar dates, not time differences
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const lastLogCalendarDate = new Date(lastLogDate.getFullYear(), lastLogDate.getMonth(), lastLogDate.getDate())
  const daysSinceLastLog = Math.floor((todayDate.getTime() - lastLogCalendarDate.getTime()) / (1000 * 60 * 60 * 24))

  // Check if already logged today
  const loggedToday = daysSinceLastLog === 0

  // Check user activity (meal logging)
  let daysSinceLastMealLog = 0
  let isUserInactive = false

  if (lastMealLogDate) {
    daysSinceLastMealLog = Math.floor((now.getTime() - lastMealLogDate.getTime()) / (1000 * 60 * 60 * 24))
    // Consider user inactive if no meal logs for 14+ days
    isUserInactive = daysSinceLastMealLog >= 14
  }

  // If user is inactive (not logging meals), show re-engagement message instead of weight reminder
  if (isUserInactive) {
    return {
      shouldShow: true,
      daysSince: daysSinceLastLog,
      nextDueDate: null,
      isOverdue: false,
      status: 'inactive',
      isUserInactive: true,
      daysSinceLastMealLog
    }
  }

  // Calculate frequency in days
  const frequencyDays: Record<string, number> = {
    daily: 1,
    weekly: 7,
    biweekly: 14,
    monthly: 30
  }

  const targetDays = frequencyDays[frequency]
  const nextDueDate = new Date(lastLogDate)
  nextDueDate.setDate(nextDueDate.getDate() + targetDays)

  // For daily frequency, check if logged today specifically
  if (frequency === 'daily') {
    if (loggedToday) {
      // Already logged today - no reminder
      return {
        shouldShow: false,
        daysSince: 0,
        nextDueDate: new Date(todayDate.getTime() + 24 * 60 * 60 * 1000), // Tomorrow
        isOverdue: false,
        status: 'on-track'
      }
    } else if (daysSinceLastLog === 1) {
      // Last log was yesterday - due today
      return {
        shouldShow: true,
        daysSince: 1,
        nextDueDate: todayDate,
        isOverdue: false,
        status: 'due-soon'
      }
    } else {
      // Overdue (2+ days)
      return {
        shouldShow: true,
        daysSince: daysSinceLastLog,
        nextDueDate: todayDate,
        isOverdue: true,
        status: 'overdue'
      }
    }
  }

  // For weekly/biweekly/monthly, use existing logic
  const isOverdue = daysSinceLastLog >= targetDays
  const isDueSoon = daysSinceLastLog >= targetDays - 1 && !isOverdue // Due tomorrow

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
    daysSinceLastMealLog
  }
}

/**
 * Gets a friendly message for the weight reminder
 */
export function getWeightReminderMessage(result: WeightReminderResult, frequency: string): string {
  if (result.daysSince === 0) {
    return `Log your first weight to start tracking progress!`
  }

  if (result.status === 'inactive') {
    return `Welcome back! It's been ${result.daysSinceLastMealLog || 0} days since your last meal log. Let's get back on track by logging your current weight!`
  }

  if (result.isOverdue) {
    const daysOverdue = result.daysSince - (frequency === 'daily' ? 1 : frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30)
    return `Time for your ${frequency} weigh-in! Last logged ${result.daysSince} days ago (${daysOverdue} days overdue).`
  }

  if (result.status === 'due-soon') {
    return `Your ${frequency} weigh-in is due tomorrow. Last logged ${result.daysSince} days ago.`
  }

  return `Last weigh-in: ${result.daysSince} days ago. Next check-in: ${result.nextDueDate?.toLocaleDateString()}`
}

/**
 * Gets color classes for weight reminder status
 */
export function getWeightReminderColor(status: 'on-track' | 'due-soon' | 'overdue' | 'inactive'): {
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
