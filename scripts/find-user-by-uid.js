/**
 * Find user by UID directly
 */

const admin = require('firebase-admin')
const serviceAccount = require('../service_account_key.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

async function findUser() {
  try {
    const uid = 'AVmoBIFY0TeZsPbjc1mHHztfI5z2'
    console.log(`\nLooking up UID: ${uid}`)

    // Try to get user document directly
    const userDoc = await db.collection('users').doc(uid).get()

    if (!userDoc.exists) {
      console.log('❌ User document does not exist in Firestore')
      console.log('This means the user signed up but may not have completed onboarding.')

      // Try to list all users to see the structure
      console.log('\nTrying to find any user documents...')
      const usersSnapshot = await db.collection('users').limit(3).get()
      console.log(`Found ${usersSnapshot.size} user documents`)

      if (!usersSnapshot.empty) {
        console.log('\nExample user document structure:')
        const exampleData = usersSnapshot.docs[0].data()
        console.log('Fields:', Object.keys(exampleData))
      }

      process.exit(0)
    }

    const data = userDoc.data()

    console.log('\n✅ User Found in Firestore!')
    console.log('Email:', data.email)
    console.log('Name:', data.name || 'N/A')
    console.log('Created:', data.createdAt?.toDate?.() || 'N/A')

    if (data.subscription) {
      console.log('\n📋 SUBSCRIPTION:')
      console.log('  Plan:', data.subscription.plan)
      console.log('  Status:', data.subscription.status)
      console.log('  Billing:', data.subscription.billingInterval || 'N/A')
      console.log('  Max Seats:', data.subscription.maxSeats)
      console.log('  Current Seats:', data.subscription.currentSeats)
    } else {
      console.log('\n⚠️  No subscription - FREE TIER')
    }

    if (data.preferences) {
      console.log('\n⚙️  Preferences:')
      console.log('  User Mode:', data.preferences.userMode || 'N/A')
      console.log('  Onboarding Completed:', data.preferences.onboardingCompleted || false)
    }

    console.log('\n')
    process.exit(0)

  } catch (error) {
    console.error('Error:', error.message)
    process.exit(1)
  }
}

setTimeout(() => {
  console.error('\n❌ Timeout')
  process.exit(1)
}, 15000)

findUser()
