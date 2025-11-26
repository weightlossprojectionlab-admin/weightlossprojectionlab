/**
 * Delete all user-level meal logs (development only)
 *
 * This script deletes meal logs from /users/{userId}/meal-logs
 * since we've migrated to patient-specific meal logs at
 * /users/{userId}/patients/{patientId}/meal-logs
 *
 * Usage: npx tsx scripts/delete-user-meal-logs.ts
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') })

// Initialize Firebase Admin
if (!getApps().length) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Missing Firebase Admin credentials in .env.local')
    console.error('Required: NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY')
    process.exit(1)
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

const db = getFirestore()

async function deleteUserMealLogs() {
  try {
    console.log('🔍 Finding all users...')

    const usersSnapshot = await db.collection('users').get()
    console.log(`📊 Found ${usersSnapshot.size} users`)

    let totalDeleted = 0

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      console.log(`\n👤 Processing user: ${userId}`)

      // Get all meal logs for this user
      const mealLogsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('meal-logs')
        .get()

      if (mealLogsSnapshot.empty) {
        console.log(`   ✓ No meal logs found`)
        continue
      }

      console.log(`   📝 Found ${mealLogsSnapshot.size} meal logs`)

      // Delete in batches of 500 (Firestore limit)
      const batch = db.batch()
      let batchCount = 0

      for (const mealDoc of mealLogsSnapshot.docs) {
        batch.delete(mealDoc.ref)
        batchCount++
        totalDeleted++

        // Commit batch every 500 operations
        if (batchCount === 500) {
          await batch.commit()
          console.log(`   ✓ Deleted ${batchCount} meal logs (batch committed)`)
          batchCount = 0
        }
      }

      // Commit remaining operations
      if (batchCount > 0) {
        await batch.commit()
        console.log(`   ✓ Deleted ${batchCount} meal logs`)
      }
    }

    console.log(`\n✅ COMPLETE: Deleted ${totalDeleted} total meal logs`)
    console.log('🎉 All user-level meal logs have been removed')

  } catch (error) {
    console.error('❌ Error deleting meal logs:', error)
    throw error
  }
}

// Run the script
deleteUserMealLogs()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
