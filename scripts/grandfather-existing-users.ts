/**
 * Database Migration Script: Grandfather Existing Users
 *
 * This script adds subscription objects to all existing users (those without subscriptions)
 * and grants them permanent free access as "Founding Members".
 *
 * USAGE:
 *   npx ts-node scripts/grandfather-existing-users.ts
 *
 * SAFETY:
 *   - Dry-run mode by default (set DRY_RUN=false to execute)
 *   - Only affects users WITHOUT existing subscriptions
 *   - Idempotent (safe to run multiple times)
 */

import * as admin from 'firebase-admin'
import * as path from 'path'
import * as fs from 'fs'

// Configuration
const DRY_RUN = process.env.DRY_RUN !== 'false' // Default to dry-run
const BATCH_SIZE = 500 // Firestore batch limit

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ Error: serviceAccountKey.json not found')
  console.error('   Please download it from Firebase Console > Project Settings > Service Accounts')
  console.error(`   Expected location: ${serviceAccountPath}`)
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'))

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

const db = admin.firestore()

// Subscription object for grandfathered users
const createGrandfatheredSubscription = () => ({
  plan: 'single',
  billingInterval: 'monthly',
  currentPeriodStart: admin.firestore.FieldValue.serverTimestamp(),
  currentPeriodEnd: null, // Never expires
  status: 'active',
  trialEndsAt: null,

  // Grandfathering flags
  isGrandfathered: true,
  grandfatheredAt: admin.firestore.FieldValue.serverTimestamp(),
  grandfatheredReason: 'founding_member',

  // Seat limits (Single User plan)
  maxSeats: 1,
  currentSeats: 0,
  maxExternalCaregivers: 0,
  currentExternalCaregivers: 0,
  maxPatients: 1,

  // No payment info (free forever)
  // stripeCustomerId, stripeSubscriptionId, stripePriceId intentionally omitted
})

async function grandfatherExistingUsers() {
  console.log('\n🚀 Starting User Grandfathering Migration')
  console.log('=' .repeat(60))
  console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '✍️  LIVE RUN (will modify database)'}`)
  console.log('=' .repeat(60))
  console.log('')

  try {
    // Step 1: Fetch all users
    console.log('📊 Fetching all users...')
    const usersSnapshot = await db.collection('users').get()
    console.log(`   Found ${usersSnapshot.size} total users\n`)

    // Step 2: Filter users without subscriptions
    const usersToGrandfather: admin.firestore.DocumentSnapshot[] = []
    const usersWithSubscriptions: admin.firestore.DocumentSnapshot[] = []

    usersSnapshot.forEach(doc => {
      const data = doc.data()
      if (!data || !data.subscription) {
        usersToGrandfather.push(doc)
      } else {
        usersWithSubscriptions.push(doc)
      }
    })

    console.log('📈 User Breakdown:')
    console.log(`   Users WITHOUT subscriptions: ${usersToGrandfather.length} (will be grandfathered)`)
    console.log(`   Users WITH subscriptions:    ${usersWithSubscriptions.length} (will be skipped)`)
    console.log('')

    if (usersToGrandfather.length === 0) {
      console.log('✅ No users need grandfathering. All users already have subscriptions.')
      return
    }

    // Step 3: Display users to be modified
    console.log('👥 Users to be Grandfathered:')
    console.log('-'.repeat(60))
    usersToGrandfather.forEach((doc, index) => {
      const data = doc.data()
      console.log(`   ${index + 1}. ${data?.email || 'No email'} (ID: ${doc.id})`)
      console.log(`      Created: ${data?.createdAt?.toDate?.() || 'Unknown'}`)
      console.log(`      Last Active: ${data?.lastActiveAt?.toDate?.() || 'Unknown'}`)
      console.log('')
    })

    if (DRY_RUN) {
      console.log('🔍 DRY RUN MODE - Showing what would be added to each user:')
      console.log(JSON.stringify(createGrandfatheredSubscription(), null, 2))
      console.log('')
      console.log('💡 To execute this migration, run:')
      console.log('   DRY_RUN=false npx ts-node scripts/grandfather-existing-users.ts')
      console.log('')
      return
    }

    // Step 4: Execute migration (LIVE MODE)
    console.log('✍️  Executing migration...')

    // Process in batches (Firestore limit is 500 writes per batch)
    let processedCount = 0

    for (let i = 0; i < usersToGrandfather.length; i += BATCH_SIZE) {
      const batch = db.batch()
      const batchUsers = usersToGrandfather.slice(i, i + BATCH_SIZE)

      batchUsers.forEach(doc => {
        const userRef = db.collection('users').doc(doc.id)
        batch.update(userRef, {
          subscription: createGrandfatheredSubscription()
        })
      })

      await batch.commit()
      processedCount += batchUsers.length

      console.log(`   ✓ Processed ${processedCount}/${usersToGrandfather.length} users`)
    }

    console.log('')
    console.log('✅ Migration Complete!')
    console.log('=' .repeat(60))
    console.log(`   Total users grandfathered: ${processedCount}`)
    console.log(`   Subscription plan: Single User (free forever)`)
    console.log(`   Reason: founding_member`)
    console.log('=' .repeat(60))
    console.log('')
    console.log('📧 Next Steps:')
    console.log('   1. Send "Thank You" email to all grandfathered users')
    console.log('   2. Add "Founding Member" badge to their profiles (UI update)')
    console.log('   3. Test feature gates to ensure grandfathered users have access')
    console.log('')

  } catch (error) {
    console.error('\n❌ Error during migration:', error)
    process.exit(1)
  }
}

// Run migration
grandfatherExistingUsers()
  .then(() => {
    console.log('✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  })
