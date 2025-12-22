/**
 * Fix Subscription Limits
 * Adds missing maxSeats, maxPatients, and maxExternalCaregivers fields to existing subscriptions
 */

const admin = require('firebase-admin')
require('dotenv').config({ path: '.env.local' })

// Initialize Firebase Admin using environment variables
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')
  })
})

const db = admin.firestore()

// Define subscription limits
const seatLimits = {
  free: 1,
  single: 1,
  single_plus: 1,
  family_basic: 5,
  family_plus: 10,
  family_premium: 999,
}

const caregiverLimits = {
  free: 0,
  single: 0,
  single_plus: 3,
  family_basic: 5,
  family_plus: 10,
  family_premium: 999,
}

async function fixSubscriptionLimits() {
  console.log('🔍 Fetching all users with subscriptions...')

  const usersSnapshot = await db.collection('users').get()

  let updatedCount = 0
  let skippedCount = 0

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()
    const subscription = userData.subscription

    if (!subscription || !subscription.plan) {
      console.log(`⏭️  Skipping user ${userDoc.id}: No subscription`)
      skippedCount++
      continue
    }

    const plan = subscription.plan

    // Check if limits already exist
    if (subscription.maxSeats !== undefined && subscription.maxPatients !== undefined) {
      console.log(`✅ User ${userDoc.id}: Already has limits (plan: ${plan})`)
      skippedCount++
      continue
    }

    // Add missing limits
    const updates = {
      'subscription.maxSeats': seatLimits[plan] || 1,
      'subscription.maxPatients': seatLimits[plan] || 1,
      'subscription.maxExternalCaregivers': caregiverLimits[plan] || 0,
      'subscription.updatedAt': new Date().toISOString()
    }

    await db.collection('users').doc(userDoc.id).update(updates)

    console.log(`🔧 Updated user ${userDoc.id}: ${plan} -> maxSeats: ${updates['subscription.maxSeats']}, maxCaregivers: ${updates['subscription.maxExternalCaregivers']}`)
    updatedCount++
  }

  console.log('\n✅ Done!')
  console.log(`   Updated: ${updatedCount}`)
  console.log(`   Skipped: ${skippedCount}`)

  process.exit(0)
}

fixSubscriptionLimits().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
