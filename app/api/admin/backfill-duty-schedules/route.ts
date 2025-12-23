import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { HouseholdDuty } from '@/types/household-duties'
import { ScheduledNotification } from '@/lib/duty-scheduler-service'
import { logger } from '@/lib/logger'

/**
 * POST /api/admin/backfill-duty-schedules
 *
 * One-time migration endpoint to create scheduled_notifications for existing duties.
 * Requires admin authentication via CRON_SECRET.
 *
 * Usage:
 *   curl -X POST https://your-app.netlify.app/api/admin/backfill-duty-schedules \
 *     -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication (use CRON_SECRET for security)
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[Backfill] Unauthorized backfill attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    logger.info('[Backfill] Starting backfill for duty schedules')

    const db = getAdminDb()
    const now = new Date()
    let processedCount = 0
    let scheduledCount = 0
    let skippedCount = 0

    // Get all active duties with a next due date
    const dutiesSnapshot = await db.collection('household_duties')
      .where('isActive', '==', true)
      .get()

    logger.info('[Backfill] Found active duties', { count: dutiesSnapshot.size })

    for (const doc of dutiesSnapshot.docs) {
      processedCount++
      const duty = { id: doc.id, ...doc.data() } as HouseholdDuty

      // Skip if no due date
      if (!duty.nextDueDate) {
        skippedCount++
        continue
      }

      const dueDate = new Date(duty.nextDueDate)

      // Skip if already past due
      if (dueDate <= now) {
        skippedCount++
        continue
      }

      // Check if notifications already exist
      const existingNotifications = await db.collection('scheduled_notifications')
        .where('dutyId', '==', duty.id)
        .where('status', '==', 'pending')
        .get()

      if (!existingNotifications.empty) {
        skippedCount++
        continue
      }

      const notifications: Omit<ScheduledNotification, 'id'>[] = []

      // Schedule reminder (24 hours before due)
      if (duty.reminderEnabled) {
        const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)

        if (reminderTime > now) {
          notifications.push({
            type: 'duty_reminder',
            dutyId: duty.id!,
            scheduledFor: reminderTime.toISOString(),
            status: 'pending',
            retryCount: 0,
            createdAt: now.toISOString(),
            metadata: {
              householdId: duty.householdId,
              assignedTo: duty.assignedTo,
              dutyName: duty.name,
              priority: duty.priority
            }
          })
        }
      }

      // Schedule overdue notification (at due date)
      if (duty.notifyOnOverdue) {
        notifications.push({
          type: 'duty_overdue',
          dutyId: duty.id!,
          scheduledFor: dueDate.toISOString(),
          status: 'pending',
          retryCount: 0,
          createdAt: now.toISOString(),
          metadata: {
            householdId: duty.householdId,
            assignedTo: duty.assignedTo,
            dutyName: duty.name,
            priority: duty.priority
          }
        })
      }

      // Batch write all notifications
      if (notifications.length > 0) {
        const batch = db.batch()
        notifications.forEach(notification => {
          const ref = db.collection('scheduled_notifications').doc()
          batch.set(ref, notification)
        })
        await batch.commit()

        scheduledCount += notifications.length
        logger.info('[Backfill] Scheduled notifications for duty', {
          dutyId: duty.id,
          dutyName: duty.name,
          notificationCount: notifications.length
        })
      } else {
        skippedCount++
      }
    }

    const summary = {
      success: true,
      processedCount,
      scheduledCount,
      skippedCount
    }

    logger.info('[Backfill] Backfill complete', summary)

    return NextResponse.json(summary)
  } catch (error) {
    logger.error('[Backfill] Error during backfill', error as Error)
    return NextResponse.json({
      success: false,
      error: 'Backfill failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
