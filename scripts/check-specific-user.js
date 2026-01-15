/**
 * Check specific user's subscription and profile data
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

async function checkUser() {
  const email = 'lnumerisstrategies@gmail.com'

  console.log(`🔍 Checking user: ${email}\n`)

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

    console.log('\n📋 SUBSCRIPTION DATA:')
    console.log(JSON.stringify(userData.subscription, null, 2))

    console.log('\n📋 PROFILE DATA:')
    console.log('onboardingCompleted:', userData.profile?.onboardingCompleted)
    console.log('onboardingCompletedAt:', userData.profile?.onboardingCompletedAt)

    console.log('\n📋 ONBOARDING ANSWERS:')
    console.log('userMode:', userData.preferences?.onboardingAnswers?.userMode)
    console.log('completedAt:', userData.preferences?.onboardingAnswers?.completedAt)

    console.log('\n🔍 ANALYSIS:')

    const subStatus = userData.subscription?.status
    const trialEnd = userData.subscription?.trialEndsAt
    const now = new Date()

    console.log(`Subscription Status: ${subStatus}`)

    if (trialEnd) {
      const trialEndDate = trialEnd.toDate ? trialEnd.toDate() : new Date(trialEnd)
      console.log(`Trial End Date: ${trialEndDate.toISOString()}`)
      console.log(`Current Date: ${now.toISOString()}`)
      console.log(`Trial Expired: ${trialEndDate <= now ? 'YES ❌' : 'NO ✅'}`)
    }

    console.log(`\nShould be blocked: ${subStatus === 'expired' || subStatus === 'canceled' ? 'YES ❌' : 'NO ✅'}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  process.exit(0)
}

checkUser()
