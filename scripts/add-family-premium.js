/**
 * Add Family Premium Subscription
 * Manually adds Family Premium subscription to weightlossprojectionlab@gmail.com
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
const auth = admin.auth()

// Define subscription limits
const seatLimits = {
  family_premium: 999,
}

const caregiverLimits = {
  family_premium: 999,
}

async function addFamilyPremium() {
  const email = 'weightlossprojectionlab@gmail.com'

  console.log(`🔍 Adding Family Premium to: ${email}`)

  try {
    // Get user from Firebase Auth
    const userRecord = await auth.getUserByEmail(email)
    const userId = userRecord.uid

    console.log(`✅ Found user: ${userId}`)

    const subscriptionData = {
      plan: 'family_premium',
      billingInterval: 'monthly',
      status: 'active',
      maxSeats: seatLimits.family_premium,
      maxPatients: seatLimits.family_premium,
      maxExternalCaregivers: caregiverLimits.family_premium,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
      // Note: No Stripe IDs since this is a manual/test subscription
    }

    console.log('💾 Saving subscription data:', JSON.stringify(subscriptionData, null, 2))

    await db.collection('users').doc(userId).set(
      {
        subscription: subscriptionData
      },
      { merge: true }
    )

    console.log('\n✅ Family Premium subscription added successfully!')
    console.log('   Refresh the profile page to see the changes.')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  process.exit(0)
}

addFamilyPremium()
