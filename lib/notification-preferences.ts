/**
 * Notification Preferences Manager
 *
 * PHASE 3: Automation Level Preferences
 *
 * Controls notification frequency and proactiveness based on user's
 * automationLevel preference from onboarding.
 *
 * automationLevel = 'yes' => High automation (proactive notifications)
 * automationLevel = 'no' => Low automation (passive, user-triggered only)
 */

import { logger } from './logger'
import type { AutomationLevel } from '@/types'

export interface NotificationConfig {
  // Frequency controls
  mealReminders: boolean // Daily meal time reminders
  weightReminders: boolean // Weekly weight check-in reminders
  activityReminders: boolean // Step goal reminders
  medicationReminders: boolean // Med adherence reminders
  appointmentReminders: boolean // Upcoming appointment alerts

  // Proactive features (only for high automation)
  smartSuggestions: boolean // AI proactive meal/shopping suggestions
  plateauDetection: boolean // Proactive plateau warnings
  trendAlerts: boolean // Weight/vitals trend notifications
  goalMilestones: boolean // Achievement celebrations

  // Communication style
  reminderTone: 'encouraging' | 'informational' | 'minimal'
  notificationFrequency: 'high' | 'medium' | 'low'
}

/**
 * Get notification configuration based on automation level
 */
export function getNotificationConfig(automationLevel: AutomationLevel): NotificationConfig {
  if (automationLevel === 'yes') {
    // HIGH AUTOMATION: Proactive, helpful, frequent
    return {
      // Core reminders (enabled)
      mealReminders: true,
      weightReminders: true,
      activityReminders: true,
      medicationReminders: true,
      appointmentReminders: true,

      // Proactive features (enabled)
      smartSuggestions: true,
      plateauDetection: true,
      trendAlerts: true,
      goalMilestones: true,

      // Communication (encouraging & frequent)
      reminderTone: 'encouraging',
      notificationFrequency: 'high'
    }
  } else {
    // LOW AUTOMATION: Passive, minimal interruptions
    return {
      // Core reminders (only critical ones)
      mealReminders: false, // User logs when they want
      weightReminders: false, // User weighs when they want
      activityReminders: false, // User tracks steps voluntarily
      medicationReminders: true, // Keep med reminders for safety
      appointmentReminders: true, // Keep appointments for safety

      // Proactive features (disabled)
      smartSuggestions: false,
      plateauDetection: false,
      trendAlerts: false,
      goalMilestones: true, // Keep celebrations!

      // Communication (minimal & informational)
      reminderTone: 'minimal',
      notificationFrequency: 'low'
    }
  }
}

/**
 * Check if a specific notification type should be sent
 */
export function shouldSendNotification(
  notificationType:
    | 'meal_reminder'
    | 'weight_reminder'
    | 'activity_reminder'
    | 'medication_reminder'
    | 'appointment_reminder'
    | 'smart_suggestion'
    | 'plateau_detection'
    | 'trend_alert'
    | 'goal_milestone',
  automationLevel: AutomationLevel
): boolean {
  const config = getNotificationConfig(automationLevel)

  const notificationMap: Record<string, keyof NotificationConfig> = {
    meal_reminder: 'mealReminders',
    weight_reminder: 'weightReminders',
    activity_reminder: 'activityReminders',
    medication_reminder: 'medicationReminders',
    appointment_reminder: 'appointmentReminders',
    smart_suggestion: 'smartSuggestions',
    plateau_detection: 'plateauDetection',
    trend_alert: 'trendAlerts',
    goal_milestone: 'goalMilestones'
  }

  const configKey = notificationMap[notificationType]
  if (!configKey) {
    logger.warn('Unknown notification type:', { notificationType })
    return false
  }

  const shouldSend = config[configKey] as boolean
  logger.debug('Notification permission check:', {
    type: notificationType,
    automationLevel,
    shouldSend
  })

  return shouldSend
}

/**
 * Get appropriate notification message based on automation level
 */
export function getNotificationMessage(
  baseMessage: string,
  automationLevel: AutomationLevel
): { title: string; body: string } {
  const config = getNotificationConfig(automationLevel)

  if (config.reminderTone === 'encouraging') {
    // High automation: Add encouragement and emojis
    return {
      title: `${baseMessage} 🎯`,
      body: "You're doing great! Let's keep the momentum going."
    }
  } else if (config.reminderTone === 'minimal') {
    // Low automation: Simple, factual
    return {
      title: baseMessage,
      body: 'Tap to log your progress.'
    }
  } else {
    // Medium automation: Balanced
    return {
      title: baseMessage,
      body: 'Ready to log your progress?'
    }
  }
}

/**
 * Calculate optimal notification time windows based on automation level
 *
 * High automation: Tight windows (remind if not logged within 30 min of meal time)
 * Low automation: Wide windows (only remind if not logged all day)
 */
export function getNotificationWindow(
  eventType: 'meal' | 'weight' | 'medication',
  automationLevel: AutomationLevel
): { windowMinutes: number; maxRemindersPerDay: number } {
  const config = getNotificationConfig(automationLevel)

  if (config.notificationFrequency === 'high') {
    // Tight windows, frequent reminders
    return {
      windowMinutes: eventType === 'meal' ? 30 : 60,
      maxRemindersPerDay: eventType === 'meal' ? 3 : 2
    }
  } else if (config.notificationFrequency === 'low') {
    // Wide windows, infrequent reminders
    return {
      windowMinutes: eventType === 'meal' ? 240 : 1440, // 4 hours vs 24 hours
      maxRemindersPerDay: 1
    }
  } else {
    // Medium windows
    return {
      windowMinutes: eventType === 'meal' ? 120 : 480, // 2 hours vs 8 hours
      maxRemindersPerDay: eventType === 'meal' ? 2 : 1
    }
  }
}

/**
 * Example usage with notification scheduler integration
 */
export function shouldScheduleMealReminders(
  automationLevel: AutomationLevel,
  mealLoggingMode: string | string[]
): boolean {
  // Only schedule if:
  // 1. User wants automation, OR
  // 2. User explicitly selected 'with_reminders' in meal logging mode
  const config = getNotificationConfig(automationLevel)
  const hasReminderPreference = Array.isArray(mealLoggingMode)
    ? mealLoggingMode.includes('with_reminders')
    : mealLoggingMode === 'with_reminders'

  return config.mealReminders || hasReminderPreference
}
