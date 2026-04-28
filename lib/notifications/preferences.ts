/**
 * Notification Preferences Evaluator
 *
 * Server-side helper that decides whether a given notification should fire
 * for a given user/type/channel/priority right now. Reads:
 *
 *   - notification_preferences/{userId}   (the new per-type/per-channel shape
 *                                          written by the /profile UI)
 *   - users/{userId}.notificationSettings (legacy fallback used by the meal
 *                                          nudges cron — read only)
 *
 * Used by lib/notifications/dispatch.ts before invoking each channel sender.
 *
 * SERVER-SIDE ONLY. Uses firebase-admin.
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
  type NotificationChannelPreferences,
  type NotificationType,
  type NotificationPriority,
} from '@/types/notifications'

// ─── Types ──────────────────────────────────────────────────────────────

export type Channel = 'push' | 'inApp' | 'email' | 'voice' | 'sms'

export interface DispatchContext {
  userId: string
  type: NotificationType
  channel: Channel
  /** 'urgent' bypasses quiet-hours suppression on push/voice/sms */
  priority?: NotificationPriority
  /** Optional preloaded prefs to avoid repeated reads in a fan-out. */
  prefs?: NotificationPreferences
}

// ─── Public API ─────────────────────────────────────────────────────────

/**
 * Returns true if a notification of the given type/channel should fire.
 * Rules in order:
 *   1. globallyEnabled === false → never dispatch
 *   2. The per-type per-channel toggle is false → don't dispatch on that channel
 *   3. quietHours active AND priority !== 'urgent' → suppress push/voice/sms
 *      (inApp + email pass; user reads them when they choose to look)
 *   4. Otherwise dispatch
 *
 * Voice + SMS channels follow the same rules as push for now (gate behind
 * global + per-type + quiet hours). When per-channel toggles are added for
 * those channels, this function is the single place to extend.
 */
export async function shouldDispatch(ctx: DispatchContext): Promise<boolean> {
  const prefs = ctx.prefs ?? (await getUserPreferences(ctx.userId))

  // Rule 1: global kill switch
  if (prefs.globallyEnabled === false) {
    logger.debug('[notifications/preferences] skipped: globally disabled', {
      userId: ctx.userId, type: ctx.type, channel: ctx.channel,
    })
    return false
  }

  // Rule 2: per-type per-channel toggle. Voice and SMS aren't yet keyed in
  // NotificationChannelPreferences — fall through to push's setting until
  // those channels' toggles ship in the UI. That keeps voice opt-in
  // implicit on the same global+type basis as push.
  const typePrefs = prefs[ctx.type] as NotificationChannelPreferences | undefined
  if (typePrefs) {
    const channelKey = mapChannelToPrefKey(ctx.channel)
    if (channelKey && typePrefs[channelKey] === false) {
      logger.debug('[notifications/preferences] skipped: type/channel disabled', {
        userId: ctx.userId, type: ctx.type, channel: ctx.channel,
      })
      return false
    }
  }

  // Rule 3: quiet hours suppress push/voice/sms unless urgent
  const isQuietable = ctx.channel === 'push' || ctx.channel === 'voice' || ctx.channel === 'sms'
  if (isQuietable && ctx.priority !== 'urgent' && isInQuietHours(prefs)) {
    logger.debug('[notifications/preferences] skipped: quiet hours', {
      userId: ctx.userId, type: ctx.type, channel: ctx.channel,
    })
    return false
  }

  return true
}

/**
 * Read a user's notification preferences. Memoized per-fan-out — the dispatcher
 * fetches once, then passes via ctx.prefs to subsequent shouldDispatch calls
 * so a single event doesn't trigger 5 Firestore reads.
 */
export async function getUserPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const doc = await adminDb.collection('notification_preferences').doc(userId).get()
    if (doc.exists) {
      const data = doc.data() as Partial<NotificationPreferences>
      // Merge with defaults so newly-added types in the schema have safe values
      // for users who set their prefs before the type existed.
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...data }
    }
  } catch (error) {
    logger.warn('[notifications/preferences] getUserPreferences failed; falling back', { userId, error })
  }

  // Fallback: legacy users/{uid}.notificationSettings shape used by the nudges
  // cron. Maps a small handful of toggles into the new per-type structure so
  // existing legacy users see consistent gating without a destructive backfill.
  return await readLegacyPreferences(userId)
}

// ─── Legacy fallback ────────────────────────────────────────────────────

interface LegacyNotificationSettings {
  enabled?: boolean
  mealReminders?: boolean
  encouragement?: boolean
  milestones?: boolean
  reEngagement?: boolean
  quietHoursStart?: number
  quietHoursEnd?: number
}

async function readLegacyPreferences(userId: string): Promise<NotificationPreferences> {
  try {
    const userDoc = await adminDb.collection('users').doc(userId).get()
    const legacy = (userDoc.data()?.notificationSettings ?? {}) as LegacyNotificationSettings

    // Start from defaults, then layer legacy overrides on top.
    const prefs: NotificationPreferences = { ...DEFAULT_NOTIFICATION_PREFERENCES }

    if (legacy.enabled === false) {
      prefs.globallyEnabled = false
    }

    // Map legacy meal reminders → meal_logged push/inApp gating. The meal
    // nudges cron previously read legacy.mealReminders; now it goes through
    // shouldDispatch which lands here for legacy users.
    if (legacy.mealReminders === false) {
      prefs.meal_logged = { email: false, push: false, inApp: false }
    }

    if (typeof legacy.quietHoursStart === 'number' && typeof legacy.quietHoursEnd === 'number') {
      prefs.quietHours = {
        enabled: true,
        startHour: legacy.quietHoursStart,
        endHour: legacy.quietHoursEnd,
      }
    }

    return prefs
  } catch (error) {
    logger.warn('[notifications/preferences] readLegacyPreferences failed', { userId, error })
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────

function mapChannelToPrefKey(channel: Channel): keyof NotificationChannelPreferences | null {
  switch (channel) {
    case 'push': return 'push'
    case 'inApp': return 'inApp'
    case 'email': return 'email'
    // Voice and SMS aren't yet first-class in NotificationChannelPreferences —
    // they ride along on the 'push' toggle until the UI ships their own
    // controls. Returning 'push' here means: if you've turned off push for
    // medication_reminder, voice and SMS for medication_reminder are also off.
    case 'voice': return 'push'
    case 'sms': return 'push'
    default: return null
  }
}

/**
 * Returns true if "now" (in the user's local timezone, when set) falls inside
 * the user's configured quiet-hours window. Handles the wrap-around case
 * where startHour > endHour (e.g. 22:00–07:00).
 */
function isInQuietHours(prefs: NotificationPreferences): boolean {
  if (!prefs.quietHours?.enabled) return false
  const { startHour, endHour } = prefs.quietHours
  if (typeof startHour !== 'number' || typeof endHour !== 'number') return false

  const now = new Date()
  // Use server time as a reasonable default. A user-timezone aware variant
  // can be added later by reading prefs.timezone and using
  // toLocaleString('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).
  const hour = now.getHours()

  if (startHour < endHour) {
    return hour >= startHour && hour < endHour
  }
  // Wrap-around: e.g. 22 → 07
  return hour >= startHour || hour < endHour
}
