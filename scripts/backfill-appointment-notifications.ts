/**
 * Backfill notifications for existing appointments that don't have them
 * Run with: npx tsx scripts/backfill-appointment-notifications.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function backfillAppointmentNotifications() {
  console.log('Starting backfill of appointment notifications...\n')

  try {
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get()

    let totalAppointments = 0
    let notificationsCreated = 0

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      console.log(`Processing user: ${userId}`)

      // Get all appointments for this user
      const appointmentsSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('appointments')
        .get()

      for (const appointmentDoc of appointmentsSnapshot.docs) {
        totalAppointments++
        const appointment = appointmentDoc.data()
        const appointmentId = appointmentDoc.id

        // Check if notification already exists for this appointment
        const existingNotification = await adminDb
          .collection('notifications')
          .where('userId', '==', userId)
          .where('metadata.appointmentId', '==', appointmentId)
          .get()

        if (existingNotification.empty) {
          // Create notification
          const appointmentDate = new Date(appointment.dateTime)
          const now = new Date().toISOString()

          // Get creator's name from Firebase Auth
          let creatorName = 'Unknown'
          const creatorId = appointment.createdBy || appointment.userId
          if (creatorId) {
            try {
              const creatorUser = await adminAuth.getUser(creatorId)
              creatorName = creatorUser.displayName || creatorUser.email || 'Unknown'
            } catch (error) {
              console.log(`  ⚠ Could not fetch creator name for user: ${creatorId}`)
            }
          }

          // Build metadata, only including fields that have values
          const metadata: any = {
            appointmentId,
            patientId: appointment.patientId,
            patientName: appointment.patientName,
            dateTime: appointment.dateTime,
            createdBy: creatorId,
            createdByName: creatorName
          }

          if (appointment.providerId) {
            metadata.providerId = appointment.providerId
          }
          if (appointment.providerName) {
            metadata.providerName = appointment.providerName
          }

          const notificationData = {
            type: 'appointment_scheduled',
            title: 'Appointment Scheduled',
            message: `${appointment.patientName} has an appointment${appointment.providerName ? ` with ${appointment.providerName}` : ''} on ${appointmentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at ${appointmentDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`,
            priority: 'normal' as const,
            read: false,
            actionUrl: `/calendar`,
            actionLabel: 'View Calendar',
            metadata,
            createdAt: now,
            updatedAt: now
          }

          const notificationRef = adminDb.collection('notifications').doc()
          await notificationRef.set({
            id: notificationRef.id,
            userId: userId,
            ...notificationData
          })

          notificationsCreated++
          console.log(`  ✓ Created notification for appointment: ${appointmentId}`)
        } else {
          console.log(`  - Notification already exists for appointment: ${appointmentId}`)
        }
      }
    }

    console.log('\n=== Backfill Complete ===')
    console.log(`Total appointments processed: ${totalAppointments}`)
    console.log(`Notifications created: ${notificationsCreated}`)
  } catch (error) {
    console.error('Error during backfill:', error)
    process.exit(1)
  }
}

// Run the backfill
backfillAppointmentNotifications()
  .then(() => {
    console.log('\nBackfill completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Backfill failed:', error)
    process.exit(1)
  })
