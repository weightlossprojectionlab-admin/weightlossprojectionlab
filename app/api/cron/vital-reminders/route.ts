import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'
import { sendVitalReminder } from '@/lib/notifications/dispatch'
import { shouldShowVitalReminder, type VitalFrequency } from '@/lib/vital-reminder-logic'
import type { VitalSign, VitalType, PatientProfile } from '@/types/medical'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Vital Reminders Cron
 *
 * Iterates patients with enabled vital reminders, computes whether each is
 * due (via shouldShowVitalReminder), and dispatches notifications across the
 * user's enabled channels (push + bell + email per notification_preferences).
 *
 * GET /api/cron/vital-reminders
 *
 * Scoping for v1:
 *  - Iterates users who have an FCM token registered (notification_tokens
 *    collection) — same scoping as the meal-nudges cron. Email-only users
 *    are not yet served by this cron; expand iteration later if needed.
 *  - Per-day dedupe: one reminder per (user, patient, vitalType) per
 *    calendar day. Sub-day frequencies (twice-daily, etc.) are honored as
 *    daily for now — finer scheduling lives in VitalMonitoringSchedule
 *    (the wizard) which has its own enforcement path.
 *
 * Auth: Bearer ${CRON_SECRET}, same as other crons.
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

  const stats = {
    usersChecked: 0,
    patientsChecked: 0,
    remindersFired: 0,
    skippedRecentlyFired: 0,
    skippedNotDue: 0,
    errors: 0,
  }

  try {
    const tokensSnap = await adminDb
      .collection('notification_tokens')
      .where('token', '!=', null)
      .get()
    if (tokensSnap.empty) {
      return NextResponse.json({ success: true, message: 'No users with push tokens', ...stats })
    }

    const todayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

    for (const tokenDoc of tokensSnap.docs) {
      const { userId } = tokenDoc.data()
      if (!userId) continue
      stats.usersChecked++

      try {
        const patientsSnap = await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .get()

        for (const patientDoc of patientsSnap.docs) {
          const patient = patientDoc.data() as PatientProfile
          const patientId = patientDoc.id
          const vitalReminders = patient?.preferences?.vitalReminders ?? {}
          const enabled = Object.entries(vitalReminders).filter(([_, c]) => (c as any)?.enabled)
          if (enabled.length === 0) continue
          stats.patientsChecked++

          for (const [type, config] of enabled) {
            const vitalType = type as VitalType
            const frequency = (config as { frequency: VitalFrequency }).frequency
            if (!frequency) continue

            // Per-day dedupe: skip if we've already fired this exact
            // (user, patient, vitalType) reminder today. Stops a flapping
            // cron schedule from spamming on every run.
            const dedupeId = `vital-${userId}-${patientId}-${vitalType}-${todayKey}`
            const dedupeRef = adminDb.collection('scheduled_nudges').doc(dedupeId)
            const dedupeDoc = await dedupeRef.get()
            if (dedupeDoc.exists) {
              stats.skippedRecentlyFired++
              continue
            }

            // Fetch the most recent log of this vital type
            const lastLogSnap = await adminDb
              .collection('users')
              .doc(userId)
              .collection('patients')
              .doc(patientId)
              .collection('vitals')
              .where('type', '==', vitalType)
              .orderBy('recordedAt', 'desc')
              .limit(1)
              .get()
            const lastLog = lastLogSnap.empty
              ? null
              : (lastLogSnap.docs[0].data() as VitalSign)

            const reminderResult = shouldShowVitalReminder(vitalType, lastLog, frequency)
            if (!reminderResult.shouldShow) {
              stats.skippedNotDue++
              continue
            }

            // Fire through the shared dispatcher (push + bell + email per
            // user prefs; sendVitalReminder's link deep-links to the
            // vital's quick-log modal).
            const result = await sendVitalReminder({
              userId,
              patientId,
              vitalType,
            })

            if (result.ok) {
              stats.remindersFired++
              // Record the dedupe doc so subsequent runs today skip.
              try {
                await dedupeRef.set({
                  id: dedupeId,
                  userId,
                  patientId,
                  vitalType,
                  category: 'vital_reminder',
                  sent: true,
                  sentAt: new Date().toISOString(),
                  createdAt: new Date().toISOString(),
                  data: { date: todayKey, frequency },
                })
              } catch (writeError) {
                logger.warn('[VitalCron] dedupe write failed', { dedupeId, writeError })
              }
            }
          }
        }
      } catch (userError) {
        logger.error('[VitalCron] Error processing user', userError as Error, { userId })
        stats.errors++
      }
    }

    logger.info('[VitalCron] Job completed', stats)
    return NextResponse.json({ success: true, ...stats })
  } catch (error) {
    logger.error('[VitalCron] Fatal error', error as Error)
    return NextResponse.json(
      { success: false, error: 'Job failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
