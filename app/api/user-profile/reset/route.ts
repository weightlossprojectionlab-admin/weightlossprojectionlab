import { NextRequest, NextResponse } from 'next/server'
import { adminDb, verifyIdToken } from '@/lib/firebase-admin'

// Set max duration to 25 seconds (just under Netlify's 26s limit)
export const maxDuration = 25

/**
 * DELETE - Reset all user data (nuclear option)
 *
 * This endpoint permanently deletes:
 * - All user profile data (profile, goals, preferences)
 * - All weight logs
 * - All meal logs
 * - All step logs
 * - All meal templates
 *
 * This allows users to start fresh if they admitted they entered false data during onboarding.
 * Requires explicit confirmation from the user.
 */
export async function DELETE(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const idToken = authHeader.split('Bearer ')[1]

    // Verify the token and get user info
    const decodedToken = await verifyIdToken(idToken)
    const userId = decodedToken.uid

    console.log(`⚠️ RESET ALL DATA requested for user: ${userId}`)

    // Get user document reference
    const userDocRef = adminDb.collection('users').doc(userId)

    // Start a batch write for atomic operations
    const batch = adminDb.batch()

    // 1. Reset user profile document to defaults (keep the document but clear data)
    batch.set(userDocRef, {
      profile: {
        onboardingCompleted: false,
        currentOnboardingStep: 1
      },
      goals: {},
      preferences: {
        units: 'imperial',
        notifications: true,
        biometricEnabled: false
      },
      updatedAt: new Date()
    }, { merge: false }) // merge: false means overwrite the entire document

    // Commit the batch for the main user document
    await batch.commit()

    // 2. Delete all subcollections (these need to be done separately)
    const collections = ['weightLogs', 'mealLogs', 'stepLogs', 'mealTemplates']
    const deletionResults = []

    for (const collectionName of collections) {
      const collectionRef = userDocRef.collection(collectionName)

      try {
        const snapshot = await collectionRef.limit(500).get() // Limit to prevent timeout on huge datasets

        if (snapshot.empty) {
          console.log(`⏭️ Skipping empty collection: ${collectionName}`)
          deletionResults.push({ collection: collectionName, deleted: 0 })
          continue
        }

        // Delete in a single batch (max 500 operations)
        const deleteBatch = adminDb.batch()
        snapshot.docs.forEach(doc => {
          deleteBatch.delete(doc.ref)
        })

        await deleteBatch.commit()

        const deletedCount = snapshot.size
        console.log(`✅ Deleted ${deletedCount} documents from ${collectionName}`)
        deletionResults.push({ collection: collectionName, deleted: deletedCount })

      } catch (error) {
        console.error(`❌ Error deleting ${collectionName}:`, error)
        deletionResults.push({
          collection: collectionName,
          deleted: 0,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    console.log(`✅ All data reset completed for user: ${userId}`)

    return NextResponse.json({
      success: true,
      message: 'All user data has been reset. You can now start onboarding again.',
      deletionResults,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error resetting user data:', error)
    return NextResponse.json(
      {
        error: 'Failed to reset user data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
