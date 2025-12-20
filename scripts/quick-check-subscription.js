/**
 * Quick subscription check - simple JavaScript version
 */

const admin = require('firebase-admin')
const serviceAccount = require('../service_account_key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function checkSubscription() {
  try {
    const email = 'percyricemusic@gmail.com'
    console.log(`\nChecking subscription for: ${email}`)

    // Query user by email
    const usersRef = db.collection('users')
    const snapshot = await usersRef.where('email', '==', email).limit(1).get()

    if (snapshot.empty) {
      console.log('❌ User not found in Firestore')
      process.exit(0)
    }

    const userDoc = snapshot.docs[0]
    const data = userDoc.data()

    console.log('\n✅ User Found!')
    console.log('UID:', userDoc.id)
    console.log('Email:', data.email)
    console.log('Name:', data.name || 'N/A')

    if (data.subscription) {
      console.log('\n📋 SUBSCRIPTION:')
      console.log('  Plan:', data.subscription.plan)
      console.log('  Status:', data.subscription.status)
      console.log('  Billing:', data.subscription.billingInterval || 'N/A')
      console.log('  Max Seats:', data.subscription.maxSeats)
      console.log('  Current Seats:', data.subscription.currentSeats)
      console.log('  Max Caregivers:', data.subscription.maxExternalCaregivers || 0)
      console.log('  Current Caregivers:', data.subscription.currentExternalCaregivers || 0)

      if (data.subscription.stripeCustomerId) {
        console.log('\n💳 Stripe:')
        console.log('  Customer:', data.subscription.stripeCustomerId)
        console.log('  Subscription:', data.subscription.stripeSubscriptionId || 'N/A')
      }
    } else {
      console.log('\n⚠️  No subscription object found')
      console.log('User is likely on FREE tier or subscription not initialized')
    }

    console.log('\n')
    process.exit(0)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

// Set timeout to prevent hanging
setTimeout(() => {
  console.error('\n❌ Script timed out after 15 seconds')
  process.exit(1)
}, 15000)

checkSubscription()
