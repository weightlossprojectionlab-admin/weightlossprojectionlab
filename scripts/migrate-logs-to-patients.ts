/**
 * Data Migration Script: Move User-Level Logs to Patient Subcollections
 *
 * This script migrates:
 * - weightLogs (user-level) → users/{uid}/patients/{patientId}/weightLogs
 * - mealLogs (user-level) → users/{uid}/patients/{patientId}/mealLogs
 * - stepLogs (user-level) → users/{uid}/patients/{patientId}/stepLogs
 *
 * Prerequisites:
 * - Each user must have at least one patient profile (create "Self" if needed)
 * - Firebase Admin SDK must be initialized
 *
 * Usage:
 *   ts-node scripts/migrate-logs-to-patients.ts [--dry-run] [--user-id=USER_ID]
 *
 * Options:
 *   --dry-run: Preview migration without making changes
 *   --user-id: Migrate only specific user (default: all users)
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize Firebase Admin
if (!admin.apps.length) {
  // Try to use base64 encoded service account first
  const base64ServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64

  if (base64ServiceAccount) {
    const serviceAccount = JSON.parse(
      Buffer.from(base64ServiceAccount, 'base64').toString('utf8')
    )

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id
    })
  } else if (process.env.FIREBASE_ADMIN_PROJECT_ID &&
             process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
             process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    // Fallback to individual environment variables
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
      })
    })
  } else {
    throw new Error('Firebase Admin credentials not found in environment variables')
  }
}

const db = admin.firestore()

interface MigrationStats {
  usersProcessed: number
  patientsCreated: number
  weightLogsMigrated: number
  mealLogsMigrated: number
  stepLogsMigrated: number
  errors: string[]
}

interface MigrationOptions {
  dryRun: boolean
  userId?: string
}

/**
 * Get or create "Self" patient profile for user
 */
async function getOrCreateSelfPatient(userId: string, dryRun: boolean): Promise<string> {
  const patientsSnapshot = await db
    .collection('users')
    .doc(userId)
    .collection('patients')
    .where('relationship', '==', 'self')
    .limit(1)
    .get()

  if (!patientsSnapshot.empty) {
    return patientsSnapshot.docs[0].id
  }

  // Create "Self" patient profile
  const userDoc = await db.collection('users').doc(userId).get()
  const userData = userDoc.data()

  const selfPatient = {
    userId,
    type: 'human',
    name: userData?.displayName || userData?.email?.split('@')[0] || 'Me',
    relationship: 'self',
    dateOfBirth: userData?.dateOfBirth || new Date().toISOString(),
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString()
  }

  if (dryRun) {
    console.log(`[DRY RUN] Would create "Self" patient for user ${userId}`)
    return 'DRY_RUN_PATIENT_ID'
  }

  const patientRef = await db
    .collection('users')
    .doc(userId)
    .collection('patients')
    .add(selfPatient)

  console.log(`✅ Created "Self" patient ${patientRef.id} for user ${userId}`)
  return patientRef.id
}

/**
 * Migrate weight logs for a user
 */
async function migrateWeightLogs(
  userId: string,
  patientId: string,
  dryRun: boolean
): Promise<number> {
  // Query from top-level weightLogs collection (old structure)
  const weightLogsSnapshot = await db
    .collection('weightLogs')
    .where('uid', '==', userId)
    .get()

  if (weightLogsSnapshot.empty) {
    return 0
  }

  const batch = db.batch()
  let count = 0

  for (const doc of weightLogsSnapshot.docs) {
    const data = doc.data()

    // Transform to new schema
    const newLog = {
      patientId,
      userId,
      weight: data.weight || 0,
      unit: data.unit || 'lbs',
      loggedAt: data.loggedAt || data.createdAt || new Date().toISOString(),
      loggedBy: userId,
      notes: data.notes,
      bodyFat: data.bodyFat,
      bmi: data.bmi,
      source: data.source || 'manual',
      deviceId: data.deviceId,
      tags: data.tags || []
    }

    if (!dryRun) {
      const newRef = db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)
        .collection('weightLogs')
        .doc()

      batch.set(newRef, newLog)
    }

    count++
  }

  if (!dryRun && count > 0) {
    await batch.commit()
  }

  return count
}

/**
 * Migrate meal logs for a user
 */
async function migrateMealLogs(
  userId: string,
  patientId: string,
  dryRun: boolean
): Promise<number> {
  // Query from top-level mealLogs collection (old structure)
  const mealLogsSnapshot = await db
    .collection('mealLogs')
    .where('uid', '==', userId)
    .get()

  if (mealLogsSnapshot.empty) {
    return 0
  }

  const batch = db.batch()
  let count = 0

  for (const doc of mealLogsSnapshot.docs) {
    const data = doc.data()

    // Transform to new schema
    const newLog = {
      patientId,
      userId,
      mealType: data.mealType || 'snack',
      foodItems: data.foodItems || [],
      description: data.description,
      photoUrl: data.photoUrl,
      photoHash: data.photoHash,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
      fiber: data.fiber,
      loggedAt: data.loggedAt || data.createdAt || new Date().toISOString(),
      loggedBy: userId,
      consumedAt: data.consumedAt,
      notes: data.notes,
      tags: data.tags || [],
      location: data.location,
      aiAnalyzed: data.aiAnalyzed || false,
      aiConfidence: data.aiConfidence
    }

    if (!dryRun) {
      const newRef = db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)
        .collection('mealLogs')
        .doc()

      batch.set(newRef, newLog)
    }

    count++
  }

  if (!dryRun && count > 0) {
    await batch.commit()
  }

  return count
}

/**
 * Migrate step logs for a user
 */
async function migrateStepLogs(
  userId: string,
  patientId: string,
  dryRun: boolean
): Promise<number> {
  // Query from top-level stepLogs collection (old structure)
  const stepLogsSnapshot = await db
    .collection('stepLogs')
    .where('uid', '==', userId)
    .get()

  if (stepLogsSnapshot.empty) {
    return 0
  }

  const batch = db.batch()
  let count = 0

  for (const doc of stepLogsSnapshot.docs) {
    const data = doc.data()

    // Transform to new schema
    const newLog = {
      patientId,
      userId,
      steps: data.steps || 0,
      date: data.date,
      distance: data.distance,
      calories: data.calories,
      activeMinutes: data.activeMinutes,
      floors: data.floors,
      source: data.source || 'manual',
      deviceId: data.deviceId,
      loggedAt: data.loggedAt || data.createdAt || new Date().toISOString(),
      loggedBy: userId,
      notes: data.notes,
      synced: data.synced || false,
      lastSyncedAt: data.lastSyncedAt
    }

    if (!dryRun) {
      const newRef = db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)
        .collection('stepLogs')
        .doc()

      batch.set(newRef, newLog)
    }

    count++
  }

  if (!dryRun && count > 0) {
    await batch.commit()
  }

  return count
}

/**
 * Migrate logs for a single user
 */
async function migrateUserLogs(
  userId: string,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  try {
    console.log(`\n📦 Processing user: ${userId}`)

    // Get or create "Self" patient
    const patientId = await getOrCreateSelfPatient(userId, dryRun)
    if (!dryRun && patientId !== 'DRY_RUN_PATIENT_ID') {
      stats.patientsCreated++
    }

    // Migrate logs
    const weightCount = await migrateWeightLogs(userId, patientId, dryRun)
    const mealCount = await migrateMealLogs(userId, patientId, dryRun)
    const stepCount = await migrateStepLogs(userId, patientId, dryRun)

    stats.weightLogsMigrated += weightCount
    stats.mealLogsMigrated += mealCount
    stats.stepLogsMigrated += stepCount
    stats.usersProcessed++

    console.log(`✅ User ${userId}: ${weightCount} weight, ${mealCount} meals, ${stepCount} steps`)
  } catch (error: any) {
    const errorMsg = `Failed to migrate user ${userId}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
  }
}

/**
 * Main migration function
 */
async function migrate(options: MigrationOptions): Promise<void> {
  const stats: MigrationStats = {
    usersProcessed: 0,
    patientsCreated: 0,
    weightLogsMigrated: 0,
    mealLogsMigrated: 0,
    stepLogsMigrated: 0,
    errors: []
  }

  console.log('\n🚀 Starting log migration...')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)

  if (options.userId) {
    console.log(`Target: Single user ${options.userId}`)
    await migrateUserLogs(options.userId, options.dryRun, stats)
  } else {
    console.log('Target: All users')

    // Get all users with logs
    const usersSnapshot = await db.collection('users').get()

    for (const userDoc of usersSnapshot.docs) {
      await migrateUserLogs(userDoc.id, options.dryRun, stats)
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Users processed: ${stats.usersProcessed}`)
  console.log(`"Self" patients created: ${stats.patientsCreated}`)
  console.log(`Weight logs migrated: ${stats.weightLogsMigrated}`)
  console.log(`Meal logs migrated: ${stats.mealLogsMigrated}`)
  console.log(`Step logs migrated: ${stats.stepLogsMigrated}`)
  console.log(`Total logs migrated: ${stats.weightLogsMigrated + stats.mealLogsMigrated + stats.stepLogsMigrated}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  console.log('\n' + (options.dryRun ? '🔍 DRY RUN COMPLETE - No changes made' : '✅ MIGRATION COMPLETE'))
}

// Parse command line arguments
const args = process.argv.slice(2)
const options: MigrationOptions = {
  dryRun: args.includes('--dry-run'),
  userId: args.find(arg => arg.startsWith('--user-id='))?.split('=')[1]
}

// Run migration
migrate(options)
  .then(() => {
    console.log('\n✨ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
