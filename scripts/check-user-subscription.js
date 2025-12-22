/**
 * Check User Subscription by Email
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

async function checkUserSubscription() {
  const email = 'weightlossprojectionlab@gmail.com'

  console.log(`🔍 Searching for user: ${email}`)

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
    console.log('Display Name:', userRecord.displayName)

    console.log('\n💳 Subscription Data:')
    if (subscription) {
      console.log(JSON.stringify(subscription, null, 2))
    } else {
      console.log('❌ No subscription data found')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  process.exit(0)
}

checkUserSubscription()
