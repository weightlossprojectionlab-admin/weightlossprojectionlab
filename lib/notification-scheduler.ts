/**
 * Notification Scheduler for Meal Reminders
 *
 * PHASE 2: Meal Logging Mode Enforcement
 *
 * This module schedules push notifications for users who selected
 * 'with_reminders' in their meal logging preferences during onboarding.
 *
 * Uses browser Push Notifications API (requires user permission)
 */

import { logger } from './logger'

export interface MealReminderSchedule {
  breakfastTime: string // "07:00"
  lunchTime: string // "12:00"
  dinnerTime: string // "18:00"
  snackTimes?: string[] // ["10:00", "15:00"]
}

export interface MealReminder {
  id: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  scheduledTime: string // "HH:MM"
  title: string
  body: string
}

/**
 * Default meal reminder schedule (if user hasn't set custom times)
 */
export const DEFAULT_MEAL_SCHEDULE: MealReminderSchedule = {
  breakfastTime: '07:30',
  lunchTime: '12:00',
  dinnerTime: '18:30',
  snackTimes: ['10:00', '15:00']
}

/**
 * Check if browser supports push notifications
 */
export function isPushNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushNotificationSupported()) {
    logger.warn('Push notifications not supported in this browser')
    return 'denied'
  }

  try {
    const permission = await Notification.requestPermission()
    logger.info('Notification permission:', { permission })
    return permission
  } catch (error) {
    logger.error('Error requesting notification permission:', error as Error)
    return 'denied'
  }
}

/**
 * Show a local notification (for testing)
 */
export function showLocalNotification(title: string, body: string, options?: NotificationOptions) {
  if (!isPushNotificationSupported()) {
    logger.warn('Cannot show notification: not supported')
    return null
  }

  if (Notification.permission !== 'granted') {
    logger.warn('Cannot show notification: permission not granted')
    return null
  }

  try {
    const notification = new Notification(title, {
      body,
      icon: '/icon-192x192.png',
      badge: '/icon-72x72.png',
      tag: 'meal-reminder',
      requireInteraction: false,
      ...options
    })

    logger.debug('Notification shown:', { title, body })
    return notification
  } catch (error) {
    logger.error('Error showing notification:', error as Error)
    return null
  }
}

/**
 * Schedule meal reminders based on user's schedule
 *
 * NOTE: Browser-based scheduling has limitations:
 * - Only works when page is open
 * - Cannot persist across browser restarts
 * - For production, use Firebase Cloud Functions + FCM
 *
 * This is a lightweight implementation for Phase 2 MVP
 */
export function scheduleMealReminders(
  schedule: MealReminderSchedule,
  onReminder?: (reminder: MealReminder) => void
): () => void {
  const timers: NodeJS.Timeout[] = []

  const scheduleReminder = (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', time: string) => {
    const now = new Date()
    const [hours, minutes] = time.split(':').map(Number)

    const reminderTime = new Date()
    reminderTime.setHours(hours, minutes, 0, 0)

    // If time has passed today, schedule for tomorrow
    if (reminderTime <= now) {
      reminderTime.setDate(reminderTime.getDate() + 1)
    }

    const delay = reminderTime.getTime() - now.getTime()

    const timer = setTimeout(() => {
      const reminder: MealReminder = {
        id: `${mealType}-${time}`,
        mealType,
        scheduledTime: time,
        title: `Time for ${mealType}!`,
        body: `Don't forget to log your ${mealType} 📸`
      }

      showLocalNotification(reminder.title, reminder.body, {
        tag: reminder.id,
        data: { mealType, time }
      })

      if (onReminder) {
        onReminder(reminder)
      }

      logger.debug('Meal reminder triggered:', { reminder })

      // Reschedule for next day
      scheduleReminder(mealType, time)
    }, delay)

    timers.push(timer)
    logger.debug(`Scheduled ${mealType} reminder for ${time} (in ${Math.round(delay / 1000 / 60)} minutes)`)
  }

  // Schedule main meals
  scheduleReminder('breakfast', schedule.breakfastTime)
  scheduleReminder('lunch', schedule.lunchTime)
  scheduleReminder('dinner', schedule.dinnerTime)

  // Schedule snacks (optional)
  if (schedule.snackTimes) {
    schedule.snackTimes.forEach(time => {
      scheduleReminder('snack', time)
    })
  }

  // Return cleanup function
  return () => {
    timers.forEach(timer => clearTimeout(timer))
    logger.info('Meal reminders cancelled')
  }
}

/**
 * Get next scheduled meal based on current time
 */
export function getNextScheduledMeal(schedule: MealReminderSchedule): MealReminder | null {
  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }

  const meals: Array<{ mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack', time: string }> = [
    { mealType: 'breakfast' as const, time: schedule.breakfastTime },
    { mealType: 'lunch' as const, time: schedule.lunchTime },
    { mealType: 'dinner' as const, time: schedule.dinnerTime }
  ]

  // Add snacks if configured
  if (schedule.snackTimes) {
    schedule.snackTimes.forEach((time, index) => {
      meals.push({ mealType: 'snack' as const, time })
    })
  }

  // Sort by time
  meals.sort((a, b) => parseTime(a.time) - parseTime(b.time))

  // Find next upcoming meal
  for (const meal of meals) {
    const mealMinutes = parseTime(meal.time)
    if (mealMinutes > currentMinutes) {
      return {
        id: `${meal.mealType}-${meal.time}`,
        mealType: meal.mealType,
        scheduledTime: meal.time,
        title: `Time for ${meal.mealType}!`,
        body: `Don't forget to log your ${meal.mealType} 📸`
      }
    }
  }

  // If no meal found today, return tomorrow's breakfast
  return {
    id: `breakfast-${schedule.breakfastTime}`,
    mealType: 'breakfast',
    scheduledTime: schedule.breakfastTime,
    title: 'Time for breakfast!',
    body: "Don't forget to log your breakfast 📸"
  }
}

/**
 * PHASE 3: Advanced notification preferences based on automation level
 *
 * This will be implemented in Phase 3 to control notification frequency
 * based on user's automationLevel preference.
 */
export function getNotificationFrequency(automationLevel: 'yes' | 'no'): 'high' | 'low' {
  return automationLevel === 'yes' ? 'high' : 'low'
}
