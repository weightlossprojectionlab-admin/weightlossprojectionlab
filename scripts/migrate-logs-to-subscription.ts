/**
 * Migration Script: Add Subscription Field to Existing Users
 *
 * This script adds the subscription field to all existing users in Firestore.
 * It grandfathers all existing users with full access based on their current patient count.
 *
 * Usage: npx tsx scripts/migrate-logs-to-subscription.ts
 */

import * as admin from 'firebase-admin'
import { UserSubscription } from '../types'

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../service-account-key.json')

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  })
}

const db = admin.firestore()

/**
 * Determine subscription plan based on patient count
 */
function determineSubscriptionPlan(patientCount: number): UserSubscription {
  const now = new Date()

  if (patientCount === 0 || patientCount === 1) {
    // Single user with full features (grandfathered)
    return {
      plan: 'single',
      addons: {
        familyFeatures: true  // Grandfathered users get all features
      },
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: null,  // null = no expiration (grandfathered)
      maxPatients: 1
    }
  } else {
    // Family plan with full features (grandfathered)
    return {
      plan: 'family',
      addons: {
        familyFeatures: true  // Grandfathered users get all features
      },
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: null,  // null = no expiration (grandfathered)
      maxPatients: 10
    }
  }
}

/**
 * Main migration function
 */
async function migrateUsers() {
  console.log('🚀 Starting user subscription migration...\n')

  try {
    // Get all users
    const usersSnapshot = await db.collection('users').get()
    console.log(`📊 Found ${usersSnapshot.size} users to process\n`)

    let processedCount = 0
    let skippedCount = 0
    let errorCount = 0

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()

      try {
        // Skip if user already has subscription
        if (userData.subscription) {
          console.log(`⏭️  Skipping user ${userId} (${userData.email}) - already has subscription`)
          skippedCount++
          continue
        }

        // Count patients for this user
        const patientsSnapshot = await db
          .collection('users')
          .doc(userId)
          .collection('patients')
          .get()

        const patientCount = patientsSnapshot.size

        // Determine subscription based on patient count
        const subscription = determineSubscriptionPlan(patientCount)

        // Update user with subscription
        await userDoc.ref.update({
          subscription: subscription
        })

        console.log(`✅ Migrated user ${userId} (${userData.email})`)
        console.log(`   - Patients: ${patientCount}`)
        console.log(`   - Plan: ${subscription.plan}`)
        console.log(`   - Family Features: ${subscription.addons.familyFeatures ? 'Yes' : 'No'}`)
        console.log(`   - Status: ${subscription.status} (grandfathered - no expiration)`)
        console.log('')

        processedCount++

      } catch (error) {
        console.error(`❌ Error processing user ${userId}:`, error)
        errorCount++
      }
    }

    // Summary
    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Processed: ${processedCount}`)
    console.log(`   ⏭️  Skipped: ${skippedCount}`)
    console.log(`   ❌ Errors: ${errorCount}`)
    console.log(`   📈 Total: ${usersSnapshot.size}`)

    if (errorCount === 0) {
      console.log('\n🎉 Migration completed successfully!')
    } else {
      console.log('\n⚠️  Migration completed with errors. Please check the logs above.')
    }

  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

/**
 * Dry run to preview changes without applying them
 */
async function dryRun() {
  console.log('🔍 Running dry run (no changes will be made)...\n')

  try {
    const usersSnapshot = await db.collection('users').get()
    console.log(`📊 Found ${usersSnapshot.size} users\n`)

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()

      if (userData.subscription) {
        console.log(`⏭️  ${userId} (${userData.email}) - Already has subscription`)
        continue
      }

      const patientsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .get()

      const patientCount = patientsSnapshot.size
      const subscription = determineSubscriptionPlan(patientCount)

      console.log(`📝 ${userId} (${userData.email})`)
      console.log(`   - Patients: ${patientCount}`)
      console.log(`   - Would get plan: ${subscription.plan}`)
      console.log(`   - Would get features: ${subscription.addons.familyFeatures ? 'Yes' : 'No'}`)
      console.log('')
    }

    console.log('\n✨ Dry run complete! Run without --dry-run to apply changes.')

  } catch (error) {
    console.error('❌ Dry run failed:', error)
    process.exit(1)
  }
}

// Main execution
const isDryRun = process.argv.includes('--dry-run')

if (isDryRun) {
  dryRun()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
} else {
  // Confirm before running
  console.log('⚠️  This script will modify all user records in Firestore.')
  console.log('   Run with --dry-run flag to preview changes first.\n')
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n')

  setTimeout(() => {
    migrateUsers()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Error:', error)
        process.exit(1)
      })
  }, 5000)
}
