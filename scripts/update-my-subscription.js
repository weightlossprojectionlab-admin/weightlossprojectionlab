/**
 * Update Current User's Subscription
 * Manually adds subscription limit fields to your current subscription
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

async function updateMySubscription() {
  // Your user ID from the script output
  const userId = 'AVmoBIFY0TeZsPbjc1mHHztfI5z2'

  console.log(`🔍 Fetching subscription for user ${userId}...`)

  const userDoc = await db.collection('users').doc(userId).get()

  if (!userDoc.exists) {
    console.error('❌ User not found!')
    process.exit(1)
  }

  const userData = userDoc.data()
  const subscription = userData.subscription

  if (!subscription || !subscription.plan) {
    console.error('❌ No subscription found!')
    process.exit(1)
  }

  console.log(`📝 Current plan: ${subscription.plan}`)

  const plan = subscription.plan

  // Update with limits
  const updates = {
    'subscription.maxSeats': seatLimits[plan] || 1,
    'subscription.maxPatients': seatLimits[plan] || 1,
    'subscription.maxExternalCaregivers': caregiverLimits[plan] || 0,
    'subscription.updatedAt': new Date().toISOString()
  }

  console.log(`🔧 Adding limits:`)
  console.log(`   - maxSeats: ${updates['subscription.maxSeats']}`)
  console.log(`   - maxPatients: ${updates['subscription.maxPatients']}`)
  console.log(`   - maxExternalCaregivers: ${updates['subscription.maxExternalCaregivers']}`)

  await db.collection('users').doc(userId).update(updates)

  console.log('\n✅ Subscription updated successfully!')
  console.log('   Refresh your profile page to see the changes.')

  process.exit(0)
}

updateMySubscription().catch(error => {
  console.error('❌ Error:', error)
  process.exit(1)
})
