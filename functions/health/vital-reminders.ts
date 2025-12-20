/**
 * Vital Reminders Scheduled Functions
 *
 * Firebase scheduled functions for sending vital sign monitoring reminders.
 * Runs every 15 minutes to check for upcoming scheduled vitals.
 */

import * as admin from 'firebase-admin'
import { logger } from '@/lib/logger'
import { addHours, parseISO, isWithinInterval } from 'date-fns'

interface ScheduledVitalInstance {
  id: string
  scheduleId: string
  patientId: string
  patientName: string
  vitalType: string
  scheduledFor: string
  scheduledTimeLocal: string
  status: 'pending' | 'reminded' | 'completed' | 'missed'
  windowEnd: string
  advanceReminderSentAt?: string
}

interface VitalMonitoringSchedule {
  id: string
  userId: string
  patientId: string
  patientName: string
  vitalType: string
  frequency: string
  active: boolean
  notificationChannels: {
    app: boolean
    email: boolean
    sms: boolean
  }
  quietHours?: {
    start: string
    end: string
  }
  advanceReminderMinutes: number
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(quietHours?: { start: string; end: string }): boolean {
  if (!quietHours) return false

  const now = new Date()
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()
  const currentTime = currentHour * 60 + currentMinute

  const [startHour, startMin] = quietHours.start.split(':').map(Number)
  const [endHour, endMin] = quietHours.end.split(':').map(Number)

  const startTime = startHour * 60 + startMin
  const endTime = endHour * 60 + endMin

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime
  }

  return currentTime >= startTime && currentTime <= endTime
}

/**
 * Send vital reminder notifications
 * Called every 15 minutes by Firebase Scheduler
 */
export async function sendVitalReminders(): Promise<void> {
  try {
    const db = admin.firestore()
    const now = new Date()
    const next30Minutes = addHours(now, 0.5) // 30 minutes from now

    logger.info('[VitalReminders] Starting reminder check', {
      currentTime: now.toISOString(),
      checkWindow: next30Minutes.toISOString()
    })

    // Query all pending instances scheduled in the next 30 minutes
    const instancesSnapshot = await db.collectionGroup('instances')
      .where('status', '==', 'pending')
      .where('scheduledFor', '>=', now.toISOString())
      .where('scheduledFor', '<=', next30Minutes.toISOString())
      .get()

    if (instancesSnapshot.empty) {
      logger.info('[VitalReminders] No reminders due in next 30 minutes')
      return
    }

    logger.info('[VitalReminders] Found instances to process', {
      count: instancesSnapshot.size
    })

    const batch = db.batch()
    let remindersSent = 0
    let remindersSkipped = 0

    // Process each instance
    for (const instanceDoc of instancesSnapshot.docs) {
      const instance = {
        id: instanceDoc.id,
        ...instanceDoc.data()
      } as ScheduledVitalInstance

      // Get parent schedule
      const scheduleDoc = await db.doc(`vitalSchedules/${instance.scheduleId}`).get()

      if (!scheduleDoc.exists) {
        logger.warn('[VitalReminders] Schedule not found', {
          scheduleId: instance.scheduleId,
          instanceId: instance.id
        })
        continue
      }

      const schedule = {
        id: scheduleDoc.id,
        ...scheduleDoc.data()
      } as VitalMonitoringSchedule

      // Skip if schedule is inactive
      if (!schedule.active) {
        logger.info('[VitalReminders] Skipping inactive schedule', {
          scheduleId: schedule.id
        })
        continue
      }

      // Check quiet hours
      if (isInQuietHours(schedule.quietHours)) {
        logger.info('[VitalReminders] Skipping due to quiet hours', {
          scheduleId: schedule.id,
          quietHours: schedule.quietHours
        })
        remindersSkipped++
        continue
      }

      // Determine channels to use
      const channels: string[] = []
      if (schedule.notificationChannels.app) channels.push('app')
      if (schedule.notificationChannels.email) channels.push('email')
      if (schedule.notificationChannels.sms) channels.push('sms')

      if (channels.length === 0) {
        logger.warn('[VitalReminders] No notification channels enabled', {
          scheduleId: schedule.id
        })
        continue
      }

      try {
        // Send notification (will be handled by notification service integration)
        await sendVitalReminderNotification({
          userId: schedule.userId,
          patientId: instance.patientId,
          patientName: instance.patientName,
          vitalType: instance.vitalType,
          scheduledTime: instance.scheduledTimeLocal,
          channels
        })

        // Update instance status
        const instanceRef = db.doc(`vitalSchedules/${instance.scheduleId}/instances/${instance.id}`)
        batch.update(instanceRef, {
          status: 'reminded',
          reminderSentAt: admin.firestore.FieldValue.serverTimestamp(),
          reminderChannels: channels
        })

        remindersSent++

        logger.info('[VitalReminders] Reminder sent', {
          instanceId: instance.id,
          patientName: instance.patientName,
          vitalType: instance.vitalType,
          channels
        })

      } catch (error) {
        logger.error('[VitalReminders] Failed to send reminder', error instanceof Error ? error : undefined, {
          instanceId: instance.id
        })
      }
    }

    // Commit batch updates
    if (remindersSent > 0) {
      await batch.commit()
    }

    logger.info('[VitalReminders] Reminder check complete', {
      total: instancesSnapshot.size,
      sent: remindersSent,
      skipped: remindersSkipped
    })

  } catch (error) {
    logger.error('[VitalReminders] Failed to process reminders', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Check for missed vitals and mark instances
 * Called daily at 2 AM
 */
export async function checkMissedVitals(): Promise<void> {
  try {
    const db = admin.firestore()
    const now = new Date()

    logger.info('[VitalReminders] Checking for missed vitals')

    // Query instances that have passed their compliance window
    const missedInstancesSnapshot = await db.collectionGroup('instances')
      .where('status', 'in', ['pending', 'reminded'])
      .where('windowEnd', '<', now.toISOString())
      .get()

    if (missedInstancesSnapshot.empty) {
      logger.info('[VitalReminders] No missed vitals found')
      return
    }

    const batch = db.batch()
    let missedCount = 0

    for (const doc of missedInstancesSnapshot.docs) {
      const instance = doc.data() as ScheduledVitalInstance

      // Mark as missed
      batch.update(doc.ref, {
        status: 'missed',
        missedReason: 'timeout'
      })

      missedCount++

      logger.info('[VitalReminders] Marked vital as missed', {
        instanceId: doc.id,
        patientName: instance.patientName,
        vitalType: instance.vitalType,
        scheduledFor: instance.scheduledFor
      })
    }

    await batch.commit()

    logger.info('[VitalReminders] Missed vitals check complete', {
      count: missedCount
    })

  } catch (error) {
    logger.error('[VitalReminders] Failed to check missed vitals', error instanceof Error ? error : undefined)
    throw error
  }
}

/**
 * Send vital reminder notification
 * This will be integrated with the notification service
 */
async function sendVitalReminderNotification(params: {
  userId: string
  patientId: string
  patientName: string
  vitalType: string
  scheduledTime: string
  channels: string[]
}): Promise<void> {
  const { userId, patientId, patientName, vitalType, scheduledTime, channels } = params

  // Format vital type for display
  const vitalTypeDisplay = vitalType
    .replace('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase())

  // Create notification data
  const notificationData = {
    type: 'vital_reminder',
    userId,
    patientId,
    patientName,
    vitalType,
    vitalTypeDisplay,
    scheduledTime,
    title: `Time to Check ${vitalTypeDisplay}`,
    message: `Reminder to check ${vitalTypeDisplay} for ${patientName} at ${scheduledTime}`,
    actionUrl: `/patients/${patientId}?tab=vitals`,
    channels,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  }

  // Store notification in Firestore (will be picked up by notification service)
  const db = admin.firestore()
  await db.collection('notifications').add(notificationData)

  logger.info('[VitalReminders] Notification created', {
    userId,
    vitalType,
    channels
  })
}

/**
 * Generate daily compliance reports
 * Called daily at 3 AM
 */
export async function generateDailyComplianceReports(): Promise<void> {
  try {
    const db = admin.firestore()

    logger.info('[VitalReminders] Generating daily compliance reports')

    // Get all active schedules
    const schedulesSnapshot = await db.collection('vitalSchedules')
      .where('active', '==', true)
      .get()

    if (schedulesSnapshot.empty) {
      logger.info('[VitalReminders] No active schedules found')
      return
    }

    let reportsGenerated = 0

    for (const scheduleDoc of schedulesSnapshot.docs) {
      const schedule = {
        id: scheduleDoc.id,
        ...scheduleDoc.data()
      } as VitalMonitoringSchedule

      try {
        // Calculate daily compliance (implementation would call compliance service)
        // For now, just log that we would generate a report
        logger.info('[VitalReminders] Would generate compliance report', {
          scheduleId: schedule.id,
          patientId: schedule.patientId,
          vitalType: schedule.vitalType
        })

        reportsGenerated++

      } catch (error) {
        logger.error('[VitalReminders] Failed to generate compliance report', error instanceof Error ? error : undefined, {
          scheduleId: schedule.id
        })
      }
    }

    logger.info('[VitalReminders] Daily compliance reports complete', {
      count: reportsGenerated
    })

  } catch (error) {
    logger.error('[VitalReminders] Failed to generate compliance reports', error instanceof Error ? error : undefined)
    throw error
  }
}
