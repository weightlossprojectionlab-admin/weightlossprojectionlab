/**
 * Backfill Script: Create scheduled_notifications for existing duties
 *
 * This script creates scheduled_notification records for all existing active duties
 * that have future due dates. Run this once to migrate from the old polling-based
 * cron to the new event-driven notification system.
 *
 * Usage:
 *   npx tsx scripts/backfill-duty-schedules.ts
 */

import { getAdminDb } from '@/lib/firebase-admin'
import { HouseholdDuty } from '@/types/household-duties'
import { ScheduledNotification } from '@/lib/duty-scheduler-service'

async function backfillDutySchedules() {
  console.log('🚀 Starting backfill for duty schedules...\n')

  const db = getAdminDb()
  const now = new Date()
  let processedCount = 0
  let scheduledCount = 0
  let skippedCount = 0

  try {
    // Get all active duties with a next due date
    console.log('📋 Fetching active duties...')
    const dutiesSnapshot = await db.collection('household_duties')
      .where('isActive', '==', true)
      .get()

    console.log(`Found ${dutiesSnapshot.size} active duties\n`)

    for (const doc of dutiesSnapshot.docs) {
      processedCount++
      const duty = { id: doc.id, ...doc.data() } as HouseholdDuty

      console.log(`[${processedCount}/${dutiesSnapshot.size}] Processing duty: ${duty.name} (${duty.id})`)

      // Skip if no due date
      if (!duty.nextDueDate) {
        console.log(`  ⏭️  Skipped: No due date`)
        skippedCount++
        continue
      }

      const dueDate = new Date(duty.nextDueDate)

      // Skip if already past due
      if (dueDate <= now) {
        console.log(`  ⏭️  Skipped: Due date in the past (${duty.nextDueDate})`)
        skippedCount++
        continue
      }

      // Check if notifications already exist
      const existingNotifications = await db.collection('scheduled_notifications')
        .where('dutyId', '==', duty.id)
        .where('status', '==', 'pending')
        .get()

      if (!existingNotifications.empty) {
        console.log(`  ⏭️  Skipped: Already has ${existingNotifications.size} pending notification(s)`)
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
          console.log(`  ✅ Scheduled reminder for ${reminderTime.toISOString()}`)
        } else {
          console.log(`  ⚠️  Reminder time in the past, skipping reminder`)
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
        console.log(`  ✅ Scheduled overdue check for ${dueDate.toISOString()}`)
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
        console.log(`  📬 Created ${notifications.length} scheduled notification(s)`)
      } else {
        console.log(`  ⏭️  No notifications to schedule (reminders/overdue disabled)`)
        skippedCount++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('✅ Backfill complete!\n')
    console.log(`📊 Summary:`)
    console.log(`   Total duties processed: ${processedCount}`)
    console.log(`   Notifications scheduled: ${scheduledCount}`)
    console.log(`   Duties skipped: ${skippedCount}`)
    console.log('='.repeat(60))
  } catch (error) {
    console.error('\n❌ Error during backfill:', error)
    throw error
  }
}

// Run the backfill
backfillDutySchedules()
  .then(() => {
    console.log('\n🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
