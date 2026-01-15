/**
 * Manually run the expired trials check
 * This is the same logic as the cron job
 */

const admin = require('firebase-admin')
require('dotenv').config({ path: '.env.local' })

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
})

const db = admin.firestore()

async function checkExpiredTrials() {
  try {
    console.log('[CheckExpiredTrials] Starting check...')

    const now = new Date()
    console.log('[CheckExpiredTrials] Current time:', now.toISOString())

    // Query users with trialing status
    const trialingUsersSnapshot = await db
      .collection('users')
      .where('subscription.status', '==', 'trialing')
      .get()

    console.log(`[CheckExpiredTrials] Found ${trialingUsersSnapshot.size} users with trialing status`)

    const batch = db.batch()
    let expiredCount = 0

    for (const userDoc of trialingUsersSnapshot.docs) {
      const subscription = userDoc.data().subscription
      const email = userDoc.data().email

      if (!subscription?.trialEndsAt) {
        console.log(`[CheckExpiredTrials] ${email}: No trialEndsAt, skipping`)
        continue
      }

      // Handle Firestore Timestamp objects
      const trialEnd = subscription.trialEndsAt.toDate
        ? subscription.trialEndsAt.toDate()
        : new Date(subscription.trialEndsAt)

      console.log(`[CheckExpiredTrials] ${email}: Trial ends at ${trialEnd.toISOString()}`)

      // Check if trial has expired
      if (trialEnd <= now) {
        console.log(`[CheckExpiredTrials] ❌ ${email}: EXPIRED - updating status`)

        // Update status to expired
        batch.update(userDoc.ref, {
          'subscription.status': 'expired',
          'subscription.expiredAt': now,
          updatedAt: now
        })

        expiredCount++
      } else {
        console.log(`[CheckExpiredTrials] ✅ ${email}: Still active`)
      }
    }

    if (expiredCount > 0) {
      await batch.commit()
      console.log(`\n[CheckExpiredTrials] ✅ Updated ${expiredCount} expired trials`)
    } else {
      console.log(`\n[CheckExpiredTrials] No expired trials found`)
    }

    return { success: true, expiredCount, totalChecked: trialingUsersSnapshot.size }
  } catch (error) {
    console.error('[CheckExpiredTrials] Error:', error)
    throw error
  }
}

checkExpiredTrials()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
