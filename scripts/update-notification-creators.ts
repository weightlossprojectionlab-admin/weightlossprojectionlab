/**
 * Update existing notifications to include creator information
 * Run with: npx tsx scripts/update-notification-creators.ts
 */

import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminDb, adminAuth } from '@/lib/firebase-admin'

async function updateNotificationCreators() {
  console.log('Starting update of notification creator information...\n')

  try {
    // Get all notifications
    const notificationsSnapshot = await adminDb
      .collection('notifications')
      .where('type', '==', 'appointment_scheduled')
      .get()

    let totalNotifications = 0
    let updatedNotifications = 0

    for (const notificationDoc of notificationsSnapshot.docs) {
      totalNotifications++
      const notification = notificationDoc.data()
      const notificationId = notificationDoc.id

      // Check if it already has creator info
      if (notification.metadata?.createdByName) {
        console.log(`  - Notification ${notificationId} already has creator info`)
        continue
      }

      // Get the appointment to find the creator
      if (notification.metadata?.appointmentId) {
        const appointmentId = notification.metadata.appointmentId

        // Find the appointment in the user's collection
        const usersSnapshot = await adminDb.collection('users').get()

        for (const userDoc of usersSnapshot.docs) {
          const appointmentRef = adminDb
            .collection('users')
            .doc(userDoc.id)
            .collection('appointments')
            .doc(appointmentId)

          const appointmentDoc = await appointmentRef.get()

          if (appointmentDoc.exists) {
            const appointment = appointmentDoc.data()
            const creatorId = appointment?.createdBy || appointment?.userId

            if (creatorId) {
              // Get creator's name from Firebase Auth
              let creatorName = 'Unknown'
              try {
                const creatorUser = await adminAuth.getUser(creatorId)
                creatorName = creatorUser.displayName || creatorUser.email || 'Unknown'
              } catch (error) {
                console.log(`  ⚠ Could not fetch creator name for user: ${creatorId}`)
              }

              // Update the notification
              await notificationDoc.ref.update({
                'metadata.createdBy': creatorId,
                'metadata.createdByName': creatorName
              })

              updatedNotifications++
              console.log(`  ✓ Updated notification ${notificationId} with creator: ${creatorName}`)
            }
            break // Found the appointment, no need to check other users
          }
        }
      }
    }

    console.log('\n=== Update Complete ===')
    console.log(`Total notifications processed: ${totalNotifications}`)
    console.log(`Notifications updated: ${updatedNotifications}`)
  } catch (error) {
    console.error('Error during update:', error)
    process.exit(1)
  }
}

// Run the update
updateNotificationCreators()
  .then(() => {
    console.log('\nUpdate completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Update failed:', error)
    process.exit(1)
  })
