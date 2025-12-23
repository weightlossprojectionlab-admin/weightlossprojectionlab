/**
 * Duty Scheduler Service
 *
 * Event-driven notification scheduling for household duties.
 * Replaces inefficient polling-based cron with targeted processing.
 *
 * Flow:
 * 1. Duty created → Schedule reminder (24hrs before) + overdue (at due time)
 * 2. Hourly cron → Process pending scheduled_notifications
 * 3. Duty updated → Reschedule notifications
 */

import { getAdminDb } from '@/lib/firebase-admin'
import { HouseholdDuty } from '@/types/household-duties'
import { notifyDutyReminder, notifyDutyOverdue } from './duty-notification-service'
import { logger } from './logger'

export interface ScheduledNotification {
  id?: string
  type: 'duty_reminder' | 'duty_overdue'
  dutyId: string
  scheduledFor: string // ISO 8601
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  retryCount: number
  createdAt: string
  sentAt?: string
  error?: string
  metadata: {
    householdId: string
    assignedTo: string[]
    dutyName: string
    priority: string
  }
}

/**
 * Schedule all notifications for a duty (reminder + overdue)
 * Called when duty is created or updated
 */
export async function scheduleDutyNotifications(duty: HouseholdDuty): Promise<void> {
  try {
    const db = getAdminDb()
    const now = new Date()

    // Cancel existing pending notifications for this duty
    await cancelDutyNotifications(duty.id!)

    const notifications: Omit<ScheduledNotification, 'id'>[] = []

    // Schedule reminder (24 hours before due)
    if (duty.reminderEnabled && duty.nextDueDate) {
      const dueDate = new Date(duty.nextDueDate)
      const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000)

      // Only schedule if reminder is in the future
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
    if (duty.notifyOnOverdue && duty.nextDueDate) {
      const dueDate = new Date(duty.nextDueDate)

      // Only schedule if due date is in the future
      if (dueDate > now) {
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
    }

    // Batch write all notifications
    if (notifications.length > 0) {
      const batch = db.batch()
      notifications.forEach(notification => {
        const ref = db.collection('scheduled_notifications').doc()
        batch.set(ref, notification)
      })
      await batch.commit()

      logger.info('[DutyScheduler] Notifications scheduled', {
        dutyId: duty.id,
        count: notifications.length,
        types: notifications.map(n => n.type)
      })
    }
  } catch (error) {
    logger.error('[DutyScheduler] Error scheduling notifications', error as Error, {
      dutyId: duty.id
    })
    // Don't throw - scheduling failure shouldn't block duty creation
  }
}

/**
 * Cancel all pending notifications for a duty
 * Called before rescheduling or when duty is deleted/completed
 */
export async function cancelDutyNotifications(dutyId: string): Promise<void> {
  try {
    const db = getAdminDb()
    const snapshot = await db.collection('scheduled_notifications')
      .where('dutyId', '==', dutyId)
      .where('status', '==', 'pending')
      .get()

    if (snapshot.empty) return

    const batch = db.batch()
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'cancelled' })
    })
    await batch.commit()

    logger.info('[DutyScheduler] Cancelled pending notifications', {
      dutyId,
      count: snapshot.size
    })
  } catch (error) {
    logger.error('[DutyScheduler] Error cancelling notifications', error as Error, {
      dutyId
    })
  }
}

/**
 * Process all pending scheduled notifications
 * Called by hourly cron job
 */
export async function processPendingNotifications(): Promise<{
  processed: number
  sent: number
  failed: number
}> {
  const db = getAdminDb()
  const now = new Date()
  const stats = { processed: 0, sent: 0, failed: 0 }

  try {
    // Query notifications that are due (uses composite index)
    const snapshot = await db.collection('scheduled_notifications')
      .where('scheduledFor', '<=', now.toISOString())
      .where('status', '==', 'pending')
      .limit(100) // Process in batches to avoid timeouts
      .get()

    logger.info('[DutyScheduler] Processing scheduled notifications', {
      count: snapshot.size
    })

    for (const doc of snapshot.docs) {
      stats.processed++
      const notification = { id: doc.id, ...doc.data() } as ScheduledNotification

      try {
        // Get duty details
        const dutyDoc = await db.collection('household_duties').doc(notification.dutyId).get()
        if (!dutyDoc.exists) {
          await doc.ref.update({
            status: 'failed',
            error: 'Duty not found'
          })
          stats.failed++
          continue
        }

        const duty = { id: dutyDoc.id, ...dutyDoc.data() } as HouseholdDuty

        // Skip if duty is completed or inactive
        if (duty.status === 'completed' || !duty.isActive) {
          await doc.ref.update({ status: 'cancelled' })
          logger.info('[DutyScheduler] Notification cancelled (duty completed/inactive)', {
            notificationId: doc.id,
            dutyId: notification.dutyId
          })
          continue
        }

        // Send notification based on type
        if (notification.type === 'duty_reminder') {
          await notifyDutyReminder(duty)
        } else if (notification.type === 'duty_overdue') {
          await notifyDutyOverdue(duty)
        }

        // Mark as sent
        await doc.ref.update({
          status: 'sent',
          sentAt: new Date().toISOString()
        })
        stats.sent++

        logger.info('[DutyScheduler] Notification sent', {
          notificationId: doc.id,
          type: notification.type,
          dutyId: notification.dutyId,
          latency: (new Date().getTime() - new Date(notification.scheduledFor).getTime()) / 1000 / 60 // minutes
        })
      } catch (error) {
        // Retry logic: retry up to 3 times, then mark as failed
        const retryCount = notification.retryCount + 1
        if (retryCount < 3) {
          // Retry in 1 hour
          const retryTime = new Date(now.getTime() + 60 * 60 * 1000)
          await doc.ref.update({
            retryCount,
            scheduledFor: retryTime.toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          logger.warn('[DutyScheduler] Notification retry scheduled', {
            notificationId: doc.id,
            dutyId: notification.dutyId,
            retryCount,
            retryAt: retryTime.toISOString()
          })
        } else {
          await doc.ref.update({
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          stats.failed++
          logger.error('[DutyScheduler] Notification failed (max retries)', error as Error, {
            notificationId: doc.id,
            dutyId: notification.dutyId
          })
        }
      }
    }

    logger.info('[DutyScheduler] Batch complete', stats)
    return stats
  } catch (error) {
    logger.error('[DutyScheduler] Error processing notifications', error as Error)
    throw error
  }
}
