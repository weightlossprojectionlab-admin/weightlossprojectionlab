import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { errorResponse } from '@/lib/api-response'
import { DEFAULT_NOTIFICATION_PREFERENCES, type NotificationPreferences } from '@/types/notifications'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/backfill-notification-preferences
 *
 * One-time migration: copy legacy `users/{uid}.notificationSettings` (the
 * shape the meal-nudges cron used to read directly) into the new per-type
 * per-channel `notification_preferences/{uid}` collection that the
 * NotificationPreferences UI writes to.
 *
 * After this runs, every user has a `notification_preferences` doc, and the
 * read-fallback in lib/notifications/preferences.ts is no longer load-bearing
 * (we can drop the legacy fallback in a follow-up commit if we want, once
 * we're confident the backfill covered everyone).
 *
 * Auth: Bearer ${CRON_SECRET}.
 *
 * Defaults to DRY RUN — pass `?execute=true` to actually write. Always
 * returns per-user counts so you can review before committing the writes.
 *
 * Usage:
 *   curl -X POST https://prod.example.com/api/admin/backfill-notification-preferences \
 *     -H "Authorization: Bearer $CRON_SECRET"
 *   # then if the dry-run report looks right:
 *   curl -X POST 'https://prod.example.com/api/admin/backfill-notification-preferences?execute=true' \
 *     -H "Authorization: Bearer $CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[BackfillPrefs] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const execute = url.searchParams.get('execute') === 'true'

    const db = getAdminDb()
    const stats = {
      mode: execute ? 'execute' : 'dry-run',
      usersChecked: 0,
      usersWithLegacy: 0,
      usersAlreadyMigrated: 0,
      usersMissingBoth: 0,
      migrated: 0,
      errors: 0,
      sampleMappings: [] as Array<{ userId: string; legacy: any; mapped: Partial<NotificationPreferences> }>,
    }

    const usersSnap = await db.collection('users').get()
    logger.info('[BackfillPrefs] Iterating users', { count: usersSnap.size, mode: stats.mode })

    for (const userDoc of usersSnap.docs) {
      stats.usersChecked++
      const userId = userDoc.id

      try {
        const legacy = userDoc.data()?.notificationSettings as
          | LegacyNotificationSettings
          | undefined
        const newDocSnap = await db.collection('notification_preferences').doc(userId).get()

        if (newDocSnap.exists) {
          stats.usersAlreadyMigrated++
          continue
        }
        if (!legacy || Object.keys(legacy).length === 0) {
          stats.usersMissingBoth++
          continue
        }
        stats.usersWithLegacy++

        const mapped = mapLegacyToPreferences(legacy)

        // Sample first 5 mappings in the response so the operator can sanity-check
        // the dry-run output before flipping execute=true.
        if (stats.sampleMappings.length < 5) {
          stats.sampleMappings.push({ userId, legacy, mapped })
        }

        if (execute) {
          await db.collection('notification_preferences').doc(userId).set(
            { ...DEFAULT_NOTIFICATION_PREFERENCES, ...mapped },
            { merge: true }
          )
          stats.migrated++
        }
      } catch (userError) {
        logger.error('[BackfillPrefs] Error processing user', userError as Error, { userId })
        stats.errors++
      }
    }

    logger.info('[BackfillPrefs] Job completed', stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    return errorResponse(error, {
      route: '/api/admin/backfill-notification-preferences',
      operation: 'create',
    })
  }
}

// ─── Legacy → new-shape mapping ─────────────────────────────────────────

interface LegacyNotificationSettings {
  enabled?: boolean
  mealReminders?: boolean
  encouragement?: boolean
  milestones?: boolean
  reEngagement?: boolean
  quietHoursStart?: number
  quietHoursEnd?: number
}

/**
 * Translate the legacy notificationSettings shape into the partial
 * NotificationPreferences shape. The caller layers this on top of
 * DEFAULT_NOTIFICATION_PREFERENCES so any types not represented in the
 * legacy shape get sensible defaults.
 */
function mapLegacyToPreferences(legacy: LegacyNotificationSettings): Partial<NotificationPreferences> {
  const out: Partial<NotificationPreferences> = {}

  if (legacy.enabled === false) {
    out.globallyEnabled = false
  }

  // Legacy `mealReminders: false` historically suppressed both meal-log
  // reminders (via the meal nudges cron) and meal-logged event mirrors.
  // Map both sides off so behavior matches what the user expects.
  if (legacy.mealReminders === false) {
    out.meal_reminder = { email: false, push: false, inApp: false }
    out.meal_logged = { email: false, push: false, inApp: false }
  }

  if (legacy.reEngagement === false) {
    out.re_engagement = { email: false, push: false, inApp: false }
  }

  if (legacy.milestones === false) {
    out.milestone = { email: false, push: false, inApp: false }
  }

  if (
    typeof legacy.quietHoursStart === 'number' &&
    typeof legacy.quietHoursEnd === 'number'
  ) {
    out.quietHours = {
      enabled: true,
      startHour: legacy.quietHoursStart,
      endHour: legacy.quietHoursEnd,
    }
  }

  return out
}
