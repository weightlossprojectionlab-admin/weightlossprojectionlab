/**
 * Quick script to check a user's subscription details
 * Usage: npx tsx scripts/check-user-subscription.ts <email>
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Initialize Firebase Admin
const serviceAccount = require('../weightlossprojectlab-firebase-adminsdk.json')

initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

async function checkUserSubscription(email: string) {
  try {
    console.log(`\nLooking up user: ${email}`)
    console.log('='.repeat(60))

    // Find user by email
    const usersSnapshot = await db.collection('users')
      .where('email', '==', email)
      .limit(1)
      .get()

    if (usersSnapshot.empty) {
      console.log('❌ User not found')
      return
    }

    const userDoc = usersSnapshot.docs[0]
    const userData = userDoc.data()

    console.log(`\n✅ User Found:`)
    console.log(`   UID: ${userDoc.id}`)
    console.log(`   Email: ${userData.email}`)
    console.log(`   Name: ${userData.name || 'N/A'}`)
    console.log(`   Created: ${userData.createdAt?.toDate?.() || 'N/A'}`)

    // Check subscription
    if (userData.subscription) {
      const sub = userData.subscription
      console.log(`\n📋 Subscription Details:`)
      console.log(`   Plan: ${sub.plan}`)
      console.log(`   Status: ${sub.status}`)
      console.log(`   Billing Interval: ${sub.billingInterval || 'N/A'}`)
      console.log(`   Max Seats: ${sub.maxSeats}`)
      console.log(`   Current Seats: ${sub.currentSeats}`)
      console.log(`   Max External Caregivers: ${sub.maxExternalCaregivers}`)
      console.log(`   Current External Caregivers: ${sub.currentExternalCaregivers}`)
      console.log(`   Period Start: ${sub.currentPeriodStart?.toDate?.() || 'N/A'}`)
      console.log(`   Period End: ${sub.currentPeriodEnd?.toDate?.() || 'No expiration'}`)

      if (sub.stripeCustomerId) {
        console.log(`\n💳 Stripe Details:`)
        console.log(`   Customer ID: ${sub.stripeCustomerId}`)
        console.log(`   Subscription ID: ${sub.stripeSubscriptionId || 'N/A'}`)
        console.log(`   Price ID: ${sub.stripePriceId || 'N/A'}`)
      }

      if (sub.trialEndsAt) {
        console.log(`\n🎁 Trial Info:`)
        console.log(`   Trial Ends: ${sub.trialEndsAt.toDate?.() || sub.trialEndsAt}`)
      }
    } else {
      console.log(`\n⚠️  No subscription found - user may be on free tier or subscription not initialized`)
    }

    // Check user preferences
    if (userData.preferences) {
      console.log(`\n⚙️  User Preferences:`)
      console.log(`   User Mode: ${userData.preferences.userMode || 'N/A'}`)
      console.log(`   Is Account Owner: ${userData.preferences.isAccountOwner || false}`)
    }

    // Check activity
    console.log(`\n📊 Activity Summary:`)
    const mealLogs = await db.collection('meal-logs')
      .where('userId', '==', userDoc.id)
      .count()
      .get()
    console.log(`   Meal Logs: ${mealLogs.data().count}`)

    const weightLogs = await db.collection('weight-logs')
      .where('userId', '==', userDoc.id)
      .count()
      .get()
    console.log(`   Weight Logs: ${weightLogs.data().count}`)

    const patients = await db.collection('patients')
      .where('userId', '==', userDoc.id)
      .count()
      .get()
    console.log(`   Patients: ${patients.data().count}`)

    const familyMembers = await db.collection('family-members')
      .where('accountOwnerId', '==', userDoc.id)
      .count()
      .get()
    console.log(`   Family Members: ${familyMembers.data().count}`)

    console.log('\n' + '='.repeat(60) + '\n')

  } catch (error) {
    console.error('Error checking user subscription:', error)
    throw error
  }
}

// Get email from command line
const email = process.argv[2]

if (!email) {
  console.error('Usage: npx tsx scripts/check-user-subscription.ts <email>')
  process.exit(1)
}

checkUserSubscription(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed:', error)
    process.exit(1)
  })
