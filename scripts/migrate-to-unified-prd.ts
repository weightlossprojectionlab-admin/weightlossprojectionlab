/**
 * Migration Script: Migrate existing users to UNIFIED PRD v3.0
 *
 * This script infers user mode and onboarding answers for users who completed
 * the old 6-step onboarding system, so they don't need to re-onboard.
 *
 * Usage:
 *   npx tsx scripts/migrate-to-unified-prd.ts [userId]
 *
 * If no userId provided, migrates ALL users who need migration.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as path from 'path'
import { UserMode, PrimaryRole, OnboardingAnswers, FeaturePreference } from '../types'

// Initialize Firebase Admin (if not already initialized)
if (!getApps().length) {
  const serviceAccount = require(path.join(process.cwd(), 'service_account_key.json'))
  initializeApp({
    credential: cert(serviceAccount)
  })
}

const db = getFirestore()

/**
 * Infer user mode from existing user data
 */
async function inferUserMode(userId: string): Promise<UserMode> {
  // Check if user has multiple patients (family members)
  const patientsSnapshot = await db.collection('patients')
    .where('userId', '==', userId)
    .get()

  const patientCount = patientsSnapshot.size

  // If user has 2+ patients, they're in household or caregiver mode
  if (patientCount >= 2) {
    // Check if any patients have "caregiver" relationship
    const hasCaregiver = patientsSnapshot.docs.some(doc => {
      const data = doc.data()
      return data.relationship === 'caregiver'
    })

    return hasCaregiver ? 'caregiver' : 'household'
  }

  // Single user mode
  return 'single'
}

/**
 * Infer primary role from user mode and patient data
 */
async function inferPrimaryRole(userId: string, userMode: UserMode): Promise<PrimaryRole> {
  if (userMode === 'caregiver') {
    return 'caregiver'
  }

  if (userMode === 'single') {
    return 'myself'
  }

  // Household mode - check patient relationships
  const patientsSnapshot = await db.collection('patients')
    .where('userId', '==', userId)
    .get()

  const relationships = patientsSnapshot.docs.map(doc => doc.data().relationship)

  if (relationships.includes('spouse')) return 'partner'
  if (relationships.includes('child')) return 'parent'
  if (relationships.includes('pet')) return 'pet'

  return 'family'
}

/**
 * Infer feature preferences from usage history
 */
async function inferFeaturePreferences(userId: string): Promise<FeaturePreference[]> {
  const preferences: FeaturePreference[] = []

  // Check if user has weight logs
  const weightLogsSnapshot = await db.collection('weightLogs')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!weightLogsSnapshot.empty) {
    preferences.push('weight_loss')
  }

  // Check if user has meal logs
  const mealLogsSnapshot = await db.collection('mealLogs')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!mealLogsSnapshot.empty) {
    preferences.push('meal_planning')
  }

  // Check if user has appointments
  const appointmentsSnapshot = await db.collection('appointments')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!appointmentsSnapshot.empty) {
    preferences.push('medical_tracking')
  }

  // Check if user has medications
  const medicationsSnapshot = await db.collection('medications')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!medicationsSnapshot.empty) {
    preferences.push('medications')
  }

  // Check if user has vitals
  const vitalsSnapshot = await db.collection('vitals')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!vitalsSnapshot.empty) {
    preferences.push('vitals')
  }

  // Check if user has shopping items
  const shoppingSnapshot = await db.collection('shoppingItems')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!shoppingSnapshot.empty) {
    preferences.push('shopping_automation')
  }

  // Check if user has step logs
  const stepLogsSnapshot = await db.collection('stepLogs')
    .where('userId', '==', userId)
    .limit(1)
    .get()

  if (!stepLogsSnapshot.empty) {
    preferences.push('fitness')
  }

  // If no preferences found, default to weight_loss and meal_planning
  if (preferences.length === 0) {
    preferences.push('weight_loss', 'meal_planning')
  }

  return preferences
}

/**
 * Migrate a single user to UNIFIED PRD v3.0
 */
export async function migrateUser(userId: string): Promise<void> {
  console.log(`🔄 Migrating user ${userId}...`)

  // Fetch user document
  const userDoc = await db.collection('users').doc(userId).get()

  if (!userDoc.exists) {
    console.log(`❌ User ${userId} not found`)
    return
  }

  const userData = userDoc.data()

  // Check if already migrated
  if (userData?.preferences?.onboardingAnswers) {
    console.log(`✅ User ${userId} already migrated`)
    return
  }

  // Check if onboarding completed
  if (!userData?.profile?.onboardingCompleted) {
    console.log(`⏭️  User ${userId} hasn't completed onboarding yet`)
    return
  }

  // Infer user data
  const userMode = await inferUserMode(userId)
  const primaryRole = await inferPrimaryRole(userId, userMode)
  const featurePreferences = await inferFeaturePreferences(userId)

  // Build onboarding answers
  const onboardingAnswers: OnboardingAnswers = {
    userMode,
    primaryRole,
    featurePreferences,
    kitchenMode: 'self', // Default assumption
    mealLoggingMode: 'both', // Most users use both
    automationLevel: userData?.preferences?.notifications ? 'yes' : 'no',
    addFamilyNow: false, // Already added if applicable
    completedAt: userData?.profile?.onboardingCompletedAt?.toDate() || new Date()
  }

  // Update user document
  await db.collection('users').doc(userId).set({
    preferences: {
      ...userData?.preferences,
      onboardingAnswers,
      userMode
    }
  }, { merge: true })

  console.log(`✅ User ${userId} migrated successfully`)
  console.log(`   User Mode: ${userMode}`)
  console.log(`   Primary Role: ${primaryRole}`)
  console.log(`   Features: ${featurePreferences.join(', ')}`)
}

/**
 * Migrate all users who need migration
 */
async function migrateAllUsers(): Promise<void> {
  console.log('🚀 Starting migration for all users...\n')

  // Get all users who completed onboarding but don't have onboardingAnswers
  const usersSnapshot = await db.collection('users')
    .where('profile.onboardingCompleted', '==', true)
    .get()

  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const userDoc of usersSnapshot.docs) {
    const userData = userDoc.data()

    // Skip if already migrated
    if (userData?.preferences?.onboardingAnswers) {
      skipped++
      continue
    }

    try {
      await migrateUser(userDoc.id)
      migrated++
    } catch (error) {
      console.error(`❌ Error migrating user ${userDoc.id}:`, error)
      errors++
    }
  }

  console.log(`\n✅ Migration complete!`)
  console.log(`   Migrated: ${migrated}`)
  console.log(`   Skipped (already migrated): ${skipped}`)
  console.log(`   Errors: ${errors}`)
}

/**
 * Main execution
 */
async function main() {
  const userId = process.argv[2]

  if (userId) {
    // Migrate specific user
    await migrateUser(userId)
  } else {
    // Migrate all users
    await migrateAllUsers()
  }

  process.exit(0)
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  })
}
