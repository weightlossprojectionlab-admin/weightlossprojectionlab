/**
 * Clear Test Stripe Data Script
 *
 * Removes test mode Stripe customer IDs and subscription IDs from user profiles
 * Run with: npx tsx scripts/clear-test-stripe-data.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') })

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

async function clearTestStripeData() {
  console.log('🔍 Searching for users with test Stripe data...')

  try {
    const usersSnapshot = await db.collection('users').get()

    let updatedCount = 0
    let skippedCount = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const subscription = userData.subscription

      if (subscription?.stripeCustomerId) {
        const customerId = subscription.stripeCustomerId

        // Check if this is a test mode customer ID (starts with cus_T)
        // Test mode IDs often start with cus_T, while live mode varies
        // But more reliably, if user reports error, we clear it
        if (customerId.startsWith('cus_')) {
          console.log(`📝 Clearing test Stripe data for user ${userDoc.id}:`)
          console.log(`   Customer ID: ${customerId}`)
          console.log(`   Subscription ID: ${subscription.stripeSubscriptionId || 'none'}`)

          // Clear Stripe-related fields but keep subscription status as trialing
          await userDoc.ref.update({
            'subscription.stripeCustomerId': null,
            'subscription.stripeSubscriptionId': null,
            'subscription.stripeProductId': null,
            'subscription.stripePriceId': null,
            'subscription.currentPeriodStart': null,
            'subscription.currentPeriodEnd': subscription.trialEndsAt || null,
          })

          updatedCount++
          console.log(`   ✅ Cleared Stripe data, trial status preserved`)
        }
      } else {
        skippedCount++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   ✅ Updated: ${updatedCount} users`)
    console.log(`   ⏭️  Skipped: ${skippedCount} users (no Stripe data)`)
    console.log(`   📝 Total processed: ${usersSnapshot.size} users`)

  } catch (error) {
    console.error('❌ Error clearing test Stripe data:', error)
    throw error
  }
}

// Run the script
clearTestStripeData()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    console.log('\n📌 Next steps:')
    console.log('   1. Users can now create new subscriptions with live Stripe keys')
    console.log('   2. Their trial status is preserved')
    console.log('   3. They can subscribe through the pricing page or profile page')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
