/**
 * Trial Expiration Cloud Function
 * Runs daily to expire trial subscriptions that have ended
 */

import * as functions from 'firebase-functions'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions'

const db = getFirestore()

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

        batchCount++

        // Commit batch if we hit the limit
        if (batchCount === batchSize) {
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

      // TODO: Send email notifications to expired users
      // TODO: Log to analytics for monitoring conversion rates

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
