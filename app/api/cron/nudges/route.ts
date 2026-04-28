import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Cron job to process nudge notifications (meal reminders, re-engagement, milestones)
 * Runs every hour via Vercel Cron
 *
 * GET /api/cron/nudges
 *
 * Reuses nudge logic from lib/nudge-system.ts but runs server-side with adminDb.
 * Sends push via the existing /api/notifications/send-push endpoint.
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const stats = { usersChecked: 0, nudgesSent: 0, errors: 0 }

  try {
    // Get all users with active notification tokens
    const tokensSnap = await adminDb.collection('notification_tokens')
      .where('token', '!=', null)
      .get()

    if (tokensSnap.empty) {
      return NextResponse.json({ success: true, message: 'No users with push tokens', ...stats })
    }

    const now = new Date()
    const currentHour = now.getHours()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    for (const tokenDoc of tokensSnap.docs) {
      const { userId, token } = tokenDoc.data()
      if (!userId || !token) continue

      stats.usersChecked++

      try {
        // Get user's notification settings
        const userDoc = await adminDb.collection('users').doc(userId).get()
        const userData = userDoc.data()
        const settings = userData?.notificationSettings || {
          enabled: true,
          mealReminders: true,
          encouragement: true,
          milestones: true,
          reEngagement: true,
          quietHoursStart: 22,
          quietHoursEnd: 7,
        }

        // Skip disabled users
        if (!settings.enabled) continue

        // Skip quiet hours
        const { quietHoursStart = 22, quietHoursEnd = 7 } = settings
        const inQuietHours = quietHoursStart > quietHoursEnd
          ? (currentHour >= quietHoursStart || currentHour < quietHoursEnd)
          : (currentHour >= quietHoursStart && currentHour < quietHoursEnd)
        if (inQuietHours) continue

        // --- Meal reminders ---
        if (settings.mealReminders !== false) {
          const mealNudge = getMealReminder(currentHour)
          if (mealNudge) {
            // Check if user already logged this meal type today
            const mealsSnap = await adminDb
              .collection(`users/${userId}/mealLogs`)
              .where('loggedAt', '>=', todayStart.toISOString())
              .limit(1)
              .get()

            // Also check for already-sent nudge today to avoid duplicates
            const existingNudge = await adminDb
              .collection('scheduled_nudges')
              .where('userId', '==', userId)
              .where('category', '==', 'meal_reminder')
              .where('createdAt', '>=', todayStart.toISOString())
              .where('data.mealType', '==', mealNudge.mealType)
              .limit(1)
              .get()

            if (mealsSnap.empty && existingNudge.empty) {
              const sent = await sendPush(userId, token, mealNudge.title, mealNudge.body, {
                action: 'log_meal',
                mealType: mealNudge.mealType,
              })
              if (sent) {
                stats.nudgesSent++
                await recordNudge(userId, 'meal_reminder', mealNudge.mealType)
              }
            }
          }
        }

        // --- Re-engagement (24h+ inactive) ---
        if (settings.reEngagement !== false) {
          const lastActive = userData?.lastActiveAt?.toDate?.() || null
          if (lastActive) {
            const hoursSince = (now.getTime() - lastActive.getTime()) / (1000 * 60 * 60)
            if (hoursSince >= 24 && hoursSince < 72) {
              // Check if we already sent a re-engagement nudge in the last 24h
              const existingReEngagement = await adminDb
                .collection('scheduled_nudges')
                .where('userId', '==', userId)
                .where('category', '==', 're_engagement')
                .where('createdAt', '>=', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())
                .limit(1)
                .get()

              if (existingReEngagement.empty) {
                const sent = await sendPush(userId, token, 'We miss you!', 'Come back and continue your health journey', {
                  action: 'open_app',
                })
                if (sent) {
                  stats.nudgesSent++
                  await recordNudge(userId, 're_engagement', 'inactive')
                }
              }
            }
          }
        }

        // --- Milestone check (streak) ---
        if (settings.milestones !== false) {
          const gamificationSnap = await adminDb
            .collection(`users/${userId}/gamification`)
            .limit(1)
            .get()

          if (!gamificationSnap.empty) {
            const { currentStreak } = gamificationSnap.docs[0].data()
            if ([7, 14, 30, 60, 100].includes(currentStreak)) {
              const existingMilestone = await adminDb
                .collection('scheduled_nudges')
                .where('userId', '==', userId)
                .where('category', '==', 'milestone')
                .where('data.value', '==', String(currentStreak))
                .limit(1)
                .get()

              if (existingMilestone.empty) {
                const sent = await sendPush(
                  userId,
                  token,
                  `${currentStreak}-day streak!`,
                  `Amazing consistency! You've logged meals ${currentStreak} days in a row.`,
                  { action: 'open_app', milestone: 'streak', value: String(currentStreak) }
                )
                if (sent) {
                  stats.nudgesSent++
                  await recordNudge(userId, 'milestone', `streak_${currentStreak}`)
                }
              }
            }
          }
        }
      } catch (userError) {
        logger.error('[NudgeCron] Error processing user', userError as Error, { userId })
        stats.errors++
      }
    }

    logger.info('[NudgeCron] Job completed', stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    logger.error('[NudgeCron] Fatal error', error as Error)
    return NextResponse.json({ success: false, error: 'Job failed' }, { status: 500 })
  }
}

// --- Helpers ---

function getMealReminder(hour: number): { mealType: string; title: string; body: string } | null {
  if (hour >= 9 && hour < 12) {
    return { mealType: 'breakfast', title: 'Don\'t forget breakfast!', body: 'Log your morning meal to stay on track.' }
  }
  if (hour >= 13 && hour < 16) {
    return { mealType: 'lunch', title: 'Lunchtime reminder', body: 'Take a moment to log your lunch.' }
  }
  if (hour >= 19 && hour < 22) {
    return { mealType: 'dinner', title: 'Evening check-in', body: 'Log your dinner before the day ends.' }
  }
  return null
}

async function sendPush(userId: string, token: string, title: string, body: string, data?: Record<string, string>): Promise<boolean> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wellnessprojectionlab.com'
    const res = await fetch(`${baseUrl}/api/notifications/send-push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // userId is passed alongside token so send-push can prune the
      // notification_tokens doc if FCM rejects with a stale-token error.
      body: JSON.stringify({ userId, token, notification: { title, body }, data }),
    })
    return res.ok
  } catch {
    return false
  }
}

async function recordNudge(userId: string, category: string, subtype: string): Promise<void> {
  const id = `${category}-${userId}-${subtype}-${Date.now()}`
  await adminDb.collection('scheduled_nudges').doc(id).set({
    id,
    userId,
    category,
    sent: true,
    sentAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    data: { mealType: subtype, value: subtype },
  })
}
