/**
 * Check Percy's Subscription
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

async function checkPercySubscription() {
  const email = 'percyricemusic@gmail.com'

  console.log(`🔍 Checking subscription for: ${email}`)

  try {
    // Get user from Firebase Auth
    const userRecord = await auth.getUserByEmail(email)
    console.log(`✅ Found user in Auth: ${userRecord.uid}`)

    // Get user document from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get()

    if (!userDoc.exists) {
      console.log('❌ User document not found in Firestore')
      process.exit(1)
    }

    const userData = userDoc.data()
    const subscription = userData.subscription

    console.log('\n📋 User Data:')
    console.log('UID:', userRecord.uid)
    console.log('Email:', userRecord.email)

    console.log('\n💳 Subscription Data:')
    if (subscription) {
      console.log(JSON.stringify(subscription, null, 2))
    } else {
      console.log('❌ No subscription data found!')
      console.log('\nThis user needs a subscription added.')
    }

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ User not found: ${email}`)
    } else {
      console.error('❌ Error:', error.message)
    }
    process.exit(1)
  }

  process.exit(0)
}

checkPercySubscription()
