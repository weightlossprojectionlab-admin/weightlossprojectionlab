/**
 * Fix Missing onboardingCompleted Flag
 *
 * Some users completed onboarding but don't have profile.onboardingCompleted set to true.
 * This causes them to be stuck in an onboarding redirect loop.
 *
 * This script finds users with:
 * - preferences.onboardingAnswers.completedAt exists (they completed onboarding)
 * - profile.onboardingCompleted is missing or false
 *
 * And sets profile.onboardingCompleted = true for them.
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

async function fixMissingOnboardingFlags() {
  console.log('🔍 Searching for users with missing onboardingCompleted flags...\n')

  try {
    const usersSnapshot = await db.collection('users').get()
    let fixedCount = 0
    let alreadyCorrect = 0
    let needsOnboarding = 0

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data()
      const userId = userDoc.id

      // Check if user has completedAt in onboardingAnswers
      const completedAt = userData.preferences?.onboardingAnswers?.completedAt
      const onboardingCompleted = userData.profile?.onboardingCompleted

      if (completedAt && !onboardingCompleted) {
        // User completed onboarding but flag is missing!
        console.log(`❌ ${userData.email || userId}: Missing onboardingCompleted flag`)

        // Handle both Firestore Timestamp and regular Date objects
        let completedAtTimestamp = completedAt
        if (completedAt.toDate && typeof completedAt.toDate === 'function') {
          console.log(`   Completed onboarding at: ${completedAt.toDate().toISOString()}`)
        } else if (completedAt instanceof Date) {
          console.log(`   Completed onboarding at: ${completedAt.toISOString()}`)
          completedAtTimestamp = admin.firestore.Timestamp.fromDate(completedAt)
        } else if (typeof completedAt === 'string') {
          const dateObj = new Date(completedAt)
          console.log(`   Completed onboarding at: ${dateObj.toISOString()}`)
          completedAtTimestamp = admin.firestore.Timestamp.fromDate(dateObj)
        } else {
          console.log(`   Completed onboarding at: ${new Date().toISOString()}`)
          completedAtTimestamp = admin.firestore.Timestamp.now()
        }

        // Fix it
        await db.collection('users').doc(userId).set(
          {
            profile: {
              onboardingCompleted: true,
              onboardingCompletedAt: completedAtTimestamp // Use their original completion time
            }
          },
          { merge: true }
        )

        console.log(`   ✅ Fixed!\n`)
        fixedCount++
      } else if (onboardingCompleted === true) {
        alreadyCorrect++
      } else {
        needsOnboarding++
      }
    }

    console.log('\n📊 Summary:')
    console.log(`   ✅ Fixed: ${fixedCount} users`)
    console.log(`   ✓  Already correct: ${alreadyCorrect} users`)
    console.log(`   ⏳ Need to complete onboarding: ${needsOnboarding} users`)
    console.log(`   📋 Total users: ${usersSnapshot.size}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  process.exit(0)
}

fixMissingOnboardingFlags()
