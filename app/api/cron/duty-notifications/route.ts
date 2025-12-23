import { NextRequest, NextResponse } from 'next/server'
import { getAdminDb } from '@/lib/firebase-admin'
import { HouseholdDuty } from '@/types/household-duties'
import { notifyDutyReminder, notifyDutyOverdue } from '@/lib/duty-notification-service'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * Cron job to send duty reminders and overdue notifications
 * Called by Netlify scheduled function every 30 minutes
 *
 * GET /api/cron/duty-notifications
 */
export async function GET(request: NextRequest) {
  try {
    // Verify request is from Netlify cron (check secret header)
    const authHeader = request.headers.get('Authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      logger.error('[DutyCron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    if (authHeader !== `Bearer ${cronSecret}`) {
      logger.warn('[DutyCron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getAdminDb()
    const now = new Date()
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    let reminderCount = 0
    let overdueCount = 0
    const errors: string[] = []

    // Query all active duties
    const dutiesSnapshot = await db.collection('household_duties')
      .where('isActive', '==', true)
      .get()

    logger.info('[DutyCron] Processing duties', { totalDuties: dutiesSnapshot.size })

    for (const doc of dutiesSnapshot.docs) {
      try {
        const duty = { id: doc.id, ...doc.data() } as HouseholdDuty

        // Skip duties without a due date
        if (!duty.nextDueDate) continue

        // Skip completed duties
        if (duty.status === 'completed') continue

        const dueDate = new Date(duty.nextDueDate)
        const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60)

        // Check if overdue
        if (hoursUntilDue < 0 && duty.notifyOnOverdue) {
          // Check if we've already sent overdue notification today
          const lastNotificationCheck = await checkLastNotification(db, duty.id!, 'overdue')

          if (!lastNotificationCheck) {
            await notifyDutyOverdue(duty)
            await recordNotificationSent(db, duty.id!, 'overdue')
            overdueCount++
          }
        }
        // Check if reminder needed (24 hours before due)
        else if (hoursUntilDue > 0 && hoursUntilDue <= 24 && duty.reminderEnabled) {
          // Check if we've already sent reminder today
          const lastNotificationCheck = await checkLastNotification(db, duty.id!, 'reminder')

          if (!lastNotificationCheck) {
            await notifyDutyReminder(duty)
            await recordNotificationSent(db, duty.id!, 'reminder')
            reminderCount++
          }
        }
      } catch (error) {
        const errorMsg = `Error processing duty ${doc.id}: ${error instanceof Error ? error.message : String(error)}`
        logger.error('[DutyCron] Error processing duty', error as Error, { dutyId: doc.id })
        errors.push(errorMsg)
      }
    }

    logger.info('[DutyCron] Job completed', {
      remindersSent: reminderCount,
      overdueSent: overdueCount,
      errorCount: errors.length
    })

    return NextResponse.json({
      success: true,
      remindersSent: reminderCount,
      overdueSent: overdueCount,
      totalProcessed: dutiesSnapshot.size,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (error) {
    logger.error('[DutyCron] Fatal error in duty notification job', error as Error)
    return NextResponse.json({
      success: false,
      error: 'Job failed',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

/**
 * Check if notification was sent today
 */
async function checkLastNotification(
  db: FirebaseFirestore.Firestore,
  dutyId: string,
  notificationType: 'reminder' | 'overdue'
): Promise<boolean> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const snapshot = await db.collection('duty_notification_log')
    .where('dutyId', '==', dutyId)
    .where('type', '==', notificationType)
    .where('sentAt', '>=', today.toISOString())
    .limit(1)
    .get()

  return !snapshot.empty
}

/**
 * Record that notification was sent
 */
async function recordNotificationSent(
  db: FirebaseFirestore.Firestore,
  dutyId: string,
  notificationType: 'reminder' | 'overdue'
): Promise<void> {
  await db.collection('duty_notification_log').add({
    dutyId,
    type: notificationType,
    sentAt: new Date().toISOString()
  })
}
