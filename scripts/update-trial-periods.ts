/**
 * Update Trial Periods Script
 *
 * Updates all existing trial users from 30-day trials to 7-day trials
 * Run with: npx tsx scripts/update-trial-periods.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (getApps().length === 0) {
  const serviceAccountBase64 = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64

  if (!serviceAccountBase64) {
    throw new Error('FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64 environment variable not set')
  }

  const serviceAccount = JSON.parse(
    Buffer.from(serviceAccountBase64, 'base64').toString('utf-8')
  )

  initializeApp({
    credential: cert(serviceAccount)
  })
}

const db = getFirestore()

async function updateTrialPeriods() {
  console.log('🔍 Searching for users with active trials...')

  try {
    // Get all users with trialing subscriptions
    const usersSnapshot = await db.collection('users').get()

    let updatedCount = 0
    let skippedCount = 0
    const batch = db.batch()
    let batchCount = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const subscription = userData.subscription

      // Only update if user is currently trialing
      if (subscription && subscription.status === 'trialing' && subscription.trialEndsAt) {
        const trialEndsAt = subscription.trialEndsAt.toDate()
        const now = new Date()

        // Calculate new trial end date (7 days from now)
        const newTrialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

        console.log(`📝 Updating user ${userDoc.id}:`)
        console.log(`   Old trial end: ${trialEndsAt.toLocaleDateString()}`)
        console.log(`   New trial end: ${newTrialEnd.toLocaleDateString()}`)

        // Update subscription with new trial end date
        batch.update(userDoc.ref, {
          'subscription.trialEndsAt': newTrialEnd,
          'subscription.currentPeriodEnd': newTrialEnd
        })

        updatedCount++
        batchCount++

        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit()
          console.log(`✅ Committed batch of ${batchCount} updates`)
          batchCount = 0
        }
      } else {
        skippedCount++
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit()
      console.log(`✅ Committed final batch of ${batchCount} updates`)
    }

    console.log('\n📊 Summary:')
    console.log(`   ✅ Updated: ${updatedCount} users`)
    console.log(`   ⏭️  Skipped: ${skippedCount} users (not trialing)`)
    console.log(`   📝 Total processed: ${usersSnapshot.size} users`)

  } catch (error) {
    console.error('❌ Error updating trial periods:', error)
    throw error
  }
}

// Run the script
updateTrialPeriods()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
