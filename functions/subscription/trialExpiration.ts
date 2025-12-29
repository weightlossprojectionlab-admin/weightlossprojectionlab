/**
 * Trial Expiration Cloud Function
 * Runs daily to:
 * 1. Send reminders before trial expires (3 days, 1 day before)
 * 2. Expire trial subscriptions that have ended
 */

import * as functions from 'firebase-functions'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'
import { TRIAL_POLICY } from '@/lib/subscription-policies'

const db = getFirestore()

/**
 * Send trial expiry reminders (3 days and 1 day before)
 */
export const sendTrialExpiryReminders = functions.pubsub
  .schedule('0 9 * * *') // Run at 9 AM UTC every day
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      logger.info('Starting trial expiry reminder check...')

      const now = new Date()
      const reminders: Array<{ daysBeforeExpiry: number; users: any[] }> = []

      // Check each reminder day (3 days, 1 day before)
      for (const daysBeforeExpiry of TRIAL_POLICY.REMINDER_DAYS_BEFORE_EXPIRY) {
        const reminderDate = new Date(now)
        reminderDate.setDate(reminderDate.getDate() + daysBeforeExpiry)
        reminderDate.setHours(0, 0, 0, 0)

        const nextDay = new Date(reminderDate)
        nextDay.setDate(nextDay.getDate() + 1)

        // Query users whose trial ends in X days
        const usersRef = db.collection('users')
        const query = usersRef
          .where('subscription.status', '==', 'trialing')
          .where('subscription.trialEndsAt', '>=', reminderDate)
          .where('subscription.trialEndsAt', '<', nextDay)

        const snapshot = await query.get()

        if (!snapshot.empty) {
          const users: Array<{ uid: string; email: string; trialEndsAt: Date }> = []

          for (const doc of snapshot.docs) {
            const userData = doc.data()
            users.push({
              uid: doc.id,
              email: userData.email || 'unknown',
              trialEndsAt: userData.subscription?.trialEndsAt?.toDate(),
            })

            // Create notification in Firestore
            await db.collection('notifications').add({
              userId: doc.id,
              type: 'trial_expiring',
              title: `Your trial ends in ${daysBeforeExpiry} ${daysBeforeExpiry === 1 ? 'day' : 'days'}`,
              message: `Your ${daysBeforeExpiry}-day trial ends soon. Add payment to continue using the platform.`,
              daysRemaining: daysBeforeExpiry,
              read: false,
              createdAt: now,
            })
          }

          reminders.push({ daysBeforeExpiry, users })
          logger.info(`Sent ${users.length} reminders for trials expiring in ${daysBeforeExpiry} days`)
        }
      }

      return {
        success: true,
        reminders,
      }
    } catch (error) {
      logger.error('Error sending trial expiry reminders:', error)
      throw error
    }
  })

/**
 * Scheduled function that runs daily at midnight UTC
 * Finds and expires trial subscriptions that have passed their trial end date
 */
export const expireTrialSubscriptions = functions.pubsub
  .schedule('0 0 * * *') // Run at midnight UTC every day
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      logger.info('Starting trial expiration check...')

      const now = Timestamp.now()

      // Query users with trialing subscriptions where trialEndsAt < now
      const usersRef = db.collection('users')
      const trialingUsersQuery = usersRef
        .where('subscription.status', '==', 'trialing')
        .where('subscription.trialEndsAt', '<=', now.toDate())

      const snapshot = await trialingUsersQuery.get()

      if (snapshot.empty) {
        logger.info('No expired trials found')
        return null
      }

      logger.info(`Found ${snapshot.size} expired trials`)

      // Batch update (Firestore allows max 500 writes per batch)
      const batchSize = 500
      let batch = db.batch()
      let batchCount = 0

      const expiredUsers: Array<{ uid: string; email: string }> = []

      for (const doc of snapshot.docs) {
        const userData = doc.data()
        const userId = doc.id

        expiredUsers.push({
          uid: userId,
          email: userData.email || 'unknown',
        })

        // Update subscription status to expired
        batch.update(doc.ref, {
          'subscription.status': 'expired',
          'subscription.currentPeriodEnd': now.toDate(),
          updatedAt: now.toDate(),
        })

        // Create expiration notification
        const notificationRef = db.collection('notifications').doc()
        batch.set(notificationRef, {
          userId,
          type: 'trial_expired',
          title: 'Your trial has ended',
          message: 'Your trial has ended. Add payment to continue using the platform.',
          read: false,
          createdAt: now.toDate(),
        })

        batchCount++

        // Commit batch if we hit the limit (accounting for 2 writes per user)
        if (batchCount >= batchSize / 2) {
          await batch.commit()
          logger.info(`Committed batch of ${batchCount} updates`)
          batch = db.batch()
          batchCount = 0
        }
      }

      // Commit any remaining updates
      if (batchCount > 0) {
        await batch.commit()
        logger.info(`Committed final batch of ${batchCount} updates`)
      }

      logger.info(`Expired ${expiredUsers.length} trial subscriptions`)
      logger.info('Expired users:', expiredUsers)

      return {
        success: true,
        expiredCount: expiredUsers.length,
        users: expiredUsers,
      }
    } catch (error) {
      logger.error('Error expiring trial subscriptions:', error)
      throw error
    }
  })

/**
 * Manual trigger function for testing or one-time cleanup
 * Can be called via HTTP request
 */
export const manualExpireTrials = functions.https.onCall(async (data, context) => {
  // Verify admin authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to expire trials'
    )
  }

  // Check if user is admin (add your admin email check here)
  const adminEmails = ['weightlossprojectionlab@gmail.com', 'admin:weightlossprojectionlab@gmail.com']
  const userEmail = context.auth.token.email

  if (!userEmail || !adminEmails.includes(userEmail)) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Must be admin to manually expire trials'
    )
  }

  try {
    logger.info(`Manual trial expiration triggered by ${userEmail}`)

    const now = Timestamp.now()

    // Query users with trialing subscriptions where trialEndsAt < now
    const usersRef = db.collection('users')
    const trialingUsersQuery = usersRef
      .where('subscription.status', '==', 'trialing')
      .where('subscription.trialEndsAt', '<=', now.toDate())

    const snapshot = await trialingUsersQuery.get()

    if (snapshot.empty) {
      return {
        success: true,
        message: 'No expired trials found',
        expiredCount: 0,
      }
    }

    // Batch update
    const batch = db.batch()
    const expiredUsers: Array<{ uid: string; email: string }> = []

    for (const doc of snapshot.docs) {
      const userData = doc.data()

      expiredUsers.push({
        uid: doc.id,
        email: userData.email || 'unknown',
      })

      batch.update(doc.ref, {
        'subscription.status': 'expired',
        'subscription.currentPeriodEnd': now.toDate(),
        updatedAt: now.toDate(),
      })
    }

    await batch.commit()

    logger.info(`Manually expired ${expiredUsers.length} trial subscriptions`)

    return {
      success: true,
      message: `Expired ${expiredUsers.length} trial subscriptions`,
      expiredCount: expiredUsers.length,
      users: expiredUsers,
    }
  } catch (error) {
    logger.error('Error in manual trial expiration:', error)
    throw new functions.https.HttpsError(
      'internal',
      'Failed to expire trials',
      error
    )
  }
})
