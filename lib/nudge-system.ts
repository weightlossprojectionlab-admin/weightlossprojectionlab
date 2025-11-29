/**
 * Nudge Delivery System
 *
 * Push notification system for behavioral prompts and reminders.
 * Part of Phase 3 Backend Agents implementation.
 */

import { logger } from '@/lib/logger'
import { collection, query, where, getDocs, getDoc, doc, setDoc, updateDoc, orderBy, limit } from 'firebase/firestore'
import { db } from './firebase'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type NudgeTriggerType = 'time' | 'behavior' | 'milestone'
export type NudgeCategory = 'meal_reminder' | 'encouragement' | 'milestone' | 're_engagement' | 'weekly_summary'

export interface Nudge {
  id: string
  userId: string
  category: NudgeCategory
  triggerType: NudgeTriggerType
  title: string
  body: string
  data?: Record<string, string>
  scheduledFor: string // ISO date string
  sent: boolean
  sentAt?: string
  createdAt: string
}

export interface NotificationToken {
  userId: string
  token: string
  createdAt: string
  lastUsed: string
}

export interface NotificationSettings {
  enabled: boolean
  mealReminders: boolean
  encouragement: boolean
  milestones: boolean
  reEngagement: boolean
  weeklySummary: boolean
  quietHoursStart: number // 22 (10pm)
  quietHoursEnd: number // 7 (7am)
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: true,
  mealReminders: true,
  encouragement: true,
  milestones: true,
  reEngagement: true,
  weeklySummary: true,
  quietHoursStart: 22, // 10pm
  quietHoursEnd: 7 // 7am
}

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================

/**
 * Save FCM token for user
 */
export async function saveNotificationToken(userId: string, token: string): Promise<void> {
  try {
    await setDoc(doc(db, 'notification_tokens', userId), {
      userId,
      token,
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString()
    })

    logger.info('[Nudge] Saved notification token for user', { userId })
  } catch (error) {
    logger.error('[Nudge] Error saving notification token', error as Error, { userId })
    throw error
  }
}

/**
 * Get FCM token for user
 */
export async function getNotificationToken(userId: string): Promise<string | null> {
  try {
    const tokenQuery = query(
      collection(db, 'notification_tokens'),
      where('userId', '==', userId),
      limit(1)
    )

    const tokenSnap = await getDocs(tokenQuery)
    if (tokenSnap.empty) {
      return null
    }

    const tokenData = tokenSnap.docs[0].data() as NotificationToken
    return tokenData.token
  } catch (error) {
    logger.error('[Nudge] Error getting notification token', error as Error)
    return null
  }
}

/**
 * Delete notification token (when user revokes permission)
 */
export async function deleteNotificationToken(userId: string): Promise<void> {
  try {
    await setDoc(doc(db, 'notification_tokens', userId), {
      userId,
      token: null,
      deletedAt: new Date().toISOString()
    })

    logger.info('[Nudge] Deleted notification token for user', { userId })
  } catch (error) {
    logger.error('[Nudge] Error deleting notification token', error as Error, { userId })
  }
}

// ============================================================================
// NOTIFICATION SETTINGS
// ============================================================================

/**
 * Get user's notification settings
 */
export async function getNotificationSettings(userId: string): Promise<NotificationSettings> {
  try {
    // Query by document ID directly instead of using where clause
    const userDocRef = doc(db, 'users', userId)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      return DEFAULT_NOTIFICATION_SETTINGS
    }

    const userData = userDoc.data()
    return userData.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS
  } catch (error) {
    logger.error('[Nudge] Error getting notification settings', error as Error)
    return DEFAULT_NOTIFICATION_SETTINGS
  }
}

/**
 * Update user's notification settings
 */
export async function updateNotificationSettings(
  userId: string,
  settings: Partial<NotificationSettings>
): Promise<void> {
  try {
    // Update by document ID directly
    const userDocRef = doc(db, 'users', userId)
    await updateDoc(userDocRef, {
      notificationSettings: settings
    })

    logger.info('[Nudge] Updated notification settings for user', { userId })
  } catch (error) {
    logger.error('[Nudge] Error updating notification settings', error as Error, { userId })
    throw error
  }
}

// ============================================================================
// QUIET HOURS CHECK
// ============================================================================

/**
 * Check if current time is within user's quiet hours
 */
export function isQuietHours(settings: NotificationSettings): boolean {
  const now = new Date()
  const currentHour = now.getHours()

  const { quietHoursStart, quietHoursEnd } = settings

  // Handle overnight quiet hours (e.g., 10pm to 7am)
  if (quietHoursStart > quietHoursEnd) {
    return currentHour >= quietHoursStart || currentHour < quietHoursEnd
  }

  // Handle same-day quiet hours
  return currentHour >= quietHoursStart && currentHour < quietHoursEnd
}

// ============================================================================
// TRIGGER CHECKS
// ============================================================================

/**
 * Check if user missed logging a meal (time-based trigger)
 */
export async function checkMissedMealLogging(userId: string): Promise<Nudge | null> {
  try {
    const settings = await getNotificationSettings(userId)

    // Check if meal reminders are enabled
    if (!settings.enabled || !settings.mealReminders) {
      return null
    }

    // Check quiet hours
    if (isQuietHours(settings)) {
      return null
    }

    const now = new Date()
    const hour = now.getHours()

    // Define meal times
    let mealType: 'breakfast' | 'lunch' | 'dinner' | null = null
    let reminderTitle = ''
    let reminderBody = ''

    if (hour >= 9 && hour < 12) {
      mealType = 'breakfast'
      reminderTitle = 'Don\'t forget breakfast!'
      reminderBody = 'Log your morning meal to stay on track'
    } else if (hour >= 13 && hour < 16) {
      mealType = 'lunch'
      reminderTitle = 'Lunchtime reminder'
      reminderBody = 'Take a moment to log your lunch'
    } else if (hour >= 19 && hour < 22) {
      mealType = 'dinner'
      reminderTitle = 'Evening check-in'
      reminderBody = 'Log your dinner before the day ends'
    }

    if (!mealType) {
      return null
    }

    // Check if user already logged this meal type today
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mealsQuery = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      where('mealType', '==', mealType),
      where('loggedAt', '>=', today.toISOString())
    )

    const mealsSnap = await getDocs(mealsQuery)

    // If meal is already logged, no reminder needed
    if (!mealsSnap.empty) {
      return null
    }

    // Create nudge
    return {
      id: `meal-reminder-${userId}-${mealType}-${Date.now()}`,
      userId,
      category: 'meal_reminder',
      triggerType: 'time',
      title: reminderTitle,
      body: reminderBody,
      data: {
        mealType,
        action: 'log_meal'
      },
      scheduledFor: now.toISOString(),
      sent: false,
      createdAt: now.toISOString()
    }
  } catch (error) {
    logger.error('[Nudge] Error checking missed meal logging', error as Error)
    return null
  }
}

/**
 * Check for inactive user (behavior-based trigger)
 */
export async function checkInactiveUser(userId: string): Promise<Nudge | null> {
  try {
    const settings = await getNotificationSettings(userId)

    // Check if re-engagement is enabled
    if (!settings.enabled || !settings.reEngagement) {
      return null
    }

    // Check quiet hours
    if (isQuietHours(settings)) {
      return null
    }

    // Get user's last meal log
    const mealsQuery = query(
      collection(db, 'meals'),
      where('userId', '==', userId),
      orderBy('loggedAt', 'desc'),
      limit(1)
    )

    const mealsSnap = await getDocs(mealsQuery)

    if (mealsSnap.empty) {
      // No meals logged, user might be new
      return null
    }

    const lastMeal = mealsSnap.docs[0].data()
    const lastMealDate = new Date(lastMeal.loggedAt)
    const now = new Date()
    const hoursSinceLastLog = (now.getTime() - lastMealDate.getTime()) / (1000 * 60 * 60)

    // Trigger re-engagement if inactive for 24+ hours
    if (hoursSinceLastLog >= 24) {
      return {
        id: `re-engagement-${userId}-${Date.now()}`,
        userId,
        category: 're_engagement',
        triggerType: 'behavior',
        title: 'We miss you!',
        body: 'Come back and continue your health journey 💪',
        data: {
          action: 'open_app',
          hoursSinceLastLog: Math.round(hoursSinceLastLog).toString()
        },
        scheduledFor: now.toISOString(),
        sent: false,
        createdAt: now.toISOString()
      }
    }

    return null
  } catch (error) {
    logger.error('[Nudge] Error checking inactive user', error as Error)
    return null
  }
}

/**
 * Check for milestone achievements (milestone-based trigger)
 */
export async function checkMilestoneAchievements(userId: string): Promise<Nudge[]> {
  const nudges: Nudge[] = []

  try {
    const settings = await getNotificationSettings(userId)

    // Check if milestone notifications are enabled
    if (!settings.enabled || !settings.milestones) {
      return nudges
    }

    // Check quiet hours
    if (isQuietHours(settings)) {
      return nudges
    }

    // Get user's gamification data
    const gamificationQuery = query(
      collection(db, 'gamification'),
      where('userId', '==', userId),
      limit(1)
    )

    const gamificationSnap = await getDocs(gamificationQuery)

    if (gamificationSnap.empty) {
      return nudges
    }

    const gamificationData = gamificationSnap.docs[0].data()

    // Check for level up (if level changed recently)
    // TODO: Track last notification sent to avoid duplicates

    // Check for streak milestones (7, 14, 30, 100 days)
    const { currentStreak } = gamificationData
    if ([7, 14, 30, 100].includes(currentStreak)) {
      nudges.push({
        id: `milestone-streak-${userId}-${currentStreak}-${Date.now()}`,
        userId,
        category: 'milestone',
        triggerType: 'milestone',
        title: `${currentStreak}-day streak! 🔥`,
        body: `Amazing consistency! You've logged meals ${currentStreak} days in a row`,
        data: {
          milestone: 'streak',
          value: currentStreak.toString(),
          action: 'open_app'
        },
        scheduledFor: new Date().toISOString(),
        sent: false,
        createdAt: new Date().toISOString()
      })
    }

    return nudges
  } catch (error) {
    logger.error('[Nudge] Error checking milestone achievements', error as Error)
    return nudges
  }
}

// ============================================================================
// NUDGE SCHEDULING
// ============================================================================

/**
 * Schedule a nudge for later delivery
 */
export async function scheduleNudge(nudge: Nudge): Promise<void> {
  try {
    await setDoc(doc(db, 'scheduled_nudges', nudge.id), nudge)
    logger.debug('[Nudge] Scheduled nudge', { nudgeId: nudge.id })
  } catch (error) {
    logger.error('[Nudge] Error scheduling nudge', error as Error)
    throw error
  }
}

/**
 * Mark nudge as sent
 */
export async function markNudgeSent(nudgeId: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'scheduled_nudges', nudgeId), {
      sent: true,
      sentAt: new Date().toISOString()
    })

    logger.debug('[Nudge] Marked nudge as sent', { nudgeId })
  } catch (error) {
    logger.error('[Nudge] Error marking nudge as sent', error as Error, { nudgeId })
  }
}

/**
 * Get pending nudges for user
 */
export async function getPendingNudges(userId: string): Promise<Nudge[]> {
  try {
    const nudgesQuery = query(
      collection(db, 'scheduled_nudges'),
      where('userId', '==', userId),
      where('sent', '==', false),
      orderBy('scheduledFor', 'asc')
    )

    const nudgesSnap = await getDocs(nudgesQuery)
    return nudgesSnap.docs.map(doc => doc.data() as Nudge)
  } catch (error) {
    logger.error('[Nudge] Error getting pending nudges', error as Error)
    return []
  }
}
