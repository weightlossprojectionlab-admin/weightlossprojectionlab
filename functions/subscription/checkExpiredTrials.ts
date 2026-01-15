/**
 * Scheduled Job: Check for Expired Trials
 * Runs every 6 hours to update Firestore for trials that expired without payment
 *
 * WHY: Stripe does NOT send webhook events when trials expire without a payment method.
 * This job proactively checks trialEndsAt dates and updates subscription.status accordingly.
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

export async function checkExpiredTrials() {
  try {
    logger.info('[CheckExpiredTrials] Starting scheduled check...')

    const now = new Date()

    // Query users with trialing status
    const trialingUsersSnapshot = await adminDb
      .collection('users')
      .where('subscription.status', '==', 'trialing')
      .get()

    const batch = adminDb.batch()
    let expiredCount = 0

    for (const userDoc of trialingUsersSnapshot.docs) {
      const subscription = userDoc.data().subscription

      if (!subscription?.trialEndsAt) continue

      // Handle Firestore Timestamp objects
      const trialEnd = subscription.trialEndsAt.toDate
        ? subscription.trialEndsAt.toDate()
        : new Date(subscription.trialEndsAt)

      // Check if trial has expired
      if (trialEnd <= now) {
        logger.info('[CheckExpiredTrials] Expiring trial', {
          userId: userDoc.id,
          email: userDoc.data().email,
          trialEnd: trialEnd.toISOString(),
          now: now.toISOString()
        })

        // Update status to expired
        batch.update(userDoc.ref, {
          'subscription.status': 'expired',
          'subscription.expiredAt': now,
          updatedAt: now
        })

        expiredCount++
      }
    }

    if (expiredCount > 0) {
      await batch.commit()
      logger.info(`[CheckExpiredTrials] Updated ${expiredCount} expired trials`)
    } else {
      logger.info('[CheckExpiredTrials] No expired trials found')
    }

    return { success: true, expiredCount, totalChecked: trialingUsersSnapshot.size }
  } catch (error) {
    logger.error('[CheckExpiredTrials] Error checking expired trials', error as Error)
    throw error
  }
}
