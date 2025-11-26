/**
 * Check where meal logs are stored
 *
 * This script checks both:
 * - /users/{userId}/meal-logs (old user-level)
 * - /users/{userId}/patients/{patientId}/meal-logs (new patient-level)
 *
 * Usage: npx tsx scripts/check-meal-locations.ts
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

async function checkMealLocations() {
  try {
    console.log('🔍 Checking meal log locations...\n')

    const usersSnapshot = await db.collection('users').get()

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()

      // Check user-level meal logs
      const userMealLogs = await db
        .collection('users')
        .doc(userId)
        .collection('meal-logs')
        .get()

      // Check patients
      const patientsSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .get()

      if (userMealLogs.size > 0 || patientsSnapshot.size > 0) {
        console.log(`\n👤 User: ${userId}`)
        console.log(`   Email: ${userData.email || 'N/A'}`)
        console.log(`   📝 User-level meal logs: ${userMealLogs.size}`)

        if (userMealLogs.size > 0) {
          console.log('   User-level meals:')
          userMealLogs.docs.slice(0, 3).forEach(doc => {
            const data = doc.data()
            console.log(`      - ${data.mealType} (${data.loggedAt}) - ${data.calories || 0} cal`)
          })
          if (userMealLogs.size > 3) {
            console.log(`      ... and ${userMealLogs.size - 3} more`)
          }
        }

        if (patientsSnapshot.size > 0) {
          console.log(`   👥 Patients: ${patientsSnapshot.size}`)

          for (const patientDoc of patientsSnapshot.docs) {
            const patientId = patientDoc.id
            const patientData = patientDoc.data()

            const patientMealLogs = await db
              .collection('users')
              .doc(userId)
              .collection('patients')
              .doc(patientId)
              .collection('meal-logs')
              .get()

            if (patientMealLogs.size > 0) {
              console.log(`      📋 ${patientData.name || 'Unknown'} (${patientId}): ${patientMealLogs.size} meals`)
              patientMealLogs.docs.slice(0, 3).forEach(doc => {
                const data = doc.data()
                console.log(`         - ${data.mealType} (${data.loggedAt}) - ${data.calories || 0} cal`)
              })
              if (patientMealLogs.size > 3) {
                console.log(`         ... and ${patientMealLogs.size - 3} more`)
              }
            }
          }
        }
      }
    }

    console.log('\n✅ Check complete')

  } catch (error) {
    console.error('❌ Error checking meal locations:', error)
    throw error
  }
}

// Run the script
checkMealLocations()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
