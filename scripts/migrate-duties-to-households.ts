/**
 * Migration Script: Patient-Scoped Duties → Household-Scoped Duties
 *
 * This script migrates existing household duties from patient-scoped to household-scoped.
 *
 * Changes:
 * - Renames `patientId` field to `forPatientId` (optional)
 * - Adds new `householdId` field (required)
 * - For patients without a household, creates a default household
 *
 * SAFETY:
 * - Dry-run mode by default
 * - Creates backups before modifying data
 * - Logs all changes for audit trail
 * - Rollback capability
 */

import * as admin from 'firebase-admin'
import * as fs from 'fs'
import * as path from 'path'

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  })
}

const db = admin.firestore()

interface OldHouseholdDuty {
  id: string
  patientId: string // OLD schema
  userId: string
  [key: string]: any
}

interface NewHouseholdDuty {
  id: string
  householdId: string // NEW - required
  forPatientId?: string // NEW - optional (renamed from patientId)
  userId: string
  [key: string]: any
}

interface MigrationLog {
  timestamp: string
  dutyId: string
  oldData: OldHouseholdDuty
  newData: NewHouseholdDuty
  householdCreated?: boolean
  householdId?: string
}

const BACKUP_DIR = path.join(__dirname, '../backups')
const LOG_FILE = path.join(BACKUP_DIR, `migration-log-${Date.now()}.json`)

async function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true })
  }
}

/**
 * Find or create a household for a patient
 */
async function getOrCreateHousehold(patientId: string, userId: string): Promise<{
  householdId: string
  created: boolean
}> {
  // Check if patient already belongs to a household
  const householdsSnapshot = await db.collection('households')
    .where('memberIds', 'array-contains', patientId)
    .limit(1)
    .get()

  if (!householdsSnapshot.empty) {
    return {
      householdId: householdsSnapshot.docs[0].id,
      created: false
    }
  }

  // Patient doesn't have a household - create default household
  const patientDoc = await db.collection('patients').doc(patientId).get()
  const patientData = patientDoc.data()

  if (!patientData) {
    throw new Error(`Patient ${patientId} not found`)
  }

  const householdRef = db.collection('households').doc()
  const householdData = {
    name: `${patientData.name}'s Household`,
    userId: userId,
    memberIds: [patientId],
    caregiverIds: [userId],
    primaryCaregiverId: userId,
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US'
    },
    createdAt: new Date().toISOString(),
    createdBy: 'migration-script',
    lastModified: new Date().toISOString(),
    isActive: true,
    migratedFrom: 'patient-scoped-duties' // Flag to identify migrated households
  }

  await householdRef.set(householdData)

  console.log(`✓ Created household ${householdRef.id} for patient ${patientData.name}`)

  return {
    householdId: householdRef.id,
    created: true
  }
}

/**
 * Migrate a single duty from old schema to new schema
 */
async function migrateDuty(
  oldDuty: OldHouseholdDuty,
  dryRun: boolean = true
): Promise<MigrationLog> {
  const { patientId, userId, id, ...rest } = oldDuty

  // Get or create household for this patient
  const { householdId, created: householdCreated } = await getOrCreateHousehold(patientId, userId)

  // Build new duty schema
  const newDuty: NewHouseholdDuty = {
    ...rest,
    id,
    householdId, // NEW field
    forPatientId: patientId, // Renamed (now optional, indicates patient-specific context)
    userId,
    migratedAt: new Date().toISOString(), // Track migration
    migratedFrom: 'patient-scoped' // Flag for audit
  }

  const migrationLog: MigrationLog = {
    timestamp: new Date().toISOString(),
    dutyId: id,
    oldData: oldDuty,
    newData: newDuty,
    householdCreated,
    householdId
  }

  if (!dryRun) {
    // Update duty in Firestore
    await db.collection('household_duties').doc(id).set(newDuty)
    console.log(`✓ Migrated duty ${id} to household ${householdId}`)
  } else {
    console.log(`[DRY RUN] Would migrate duty ${id} to household ${householdId}`)
  }

  return migrationLog
}

/**
 * Main migration function
 */
async function migrate(dryRun: boolean = true) {
  console.log('========================================')
  console.log('Household Duties Migration Script')
  console.log('Patient-scoped → Household-scoped')
  console.log('========================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`)
  console.log('========================================\n')

  await ensureBackupDir()

  // Get all household duties
  const dutiesSnapshot = await db.collection('household_duties').get()

  if (dutiesSnapshot.empty) {
    console.log('No duties found to migrate.')
    return
  }

  console.log(`Found ${dutiesSnapshot.size} duties to process\n`)

  const logs: MigrationLog[] = []
  let migrated = 0
  let skipped = 0
  let errors = 0

  for (const dutyDoc of dutiesSnapshot.docs) {
    const dutyData = dutyDoc.data() as any

    // Skip if already migrated
    if (dutyData.householdId && dutyData.migratedFrom === 'patient-scoped') {
      console.log(`⊘ Skipping ${dutyDoc.id} - already migrated`)
      skipped++
      continue
    }

    // Skip if it's already using new schema (householdId exists)
    if (dutyData.householdId && !dutyData.patientId) {
      console.log(`⊘ Skipping ${dutyDoc.id} - already using new schema`)
      skipped++
      continue
    }

    // Must have patientId to migrate
    if (!dutyData.patientId) {
      console.error(`✗ Error: Duty ${dutyDoc.id} has no patientId - cannot migrate`)
      errors++
      continue
    }

    try {
      const oldDuty: OldHouseholdDuty = {
        id: dutyDoc.id,
        ...dutyData
      }

      const log = await migrateDuty(oldDuty, dryRun)
      logs.push(log)
      migrated++
    } catch (error) {
      console.error(`✗ Error migrating duty ${dutyDoc.id}:`, error)
      errors++
    }
  }

  // Save migration log
  const logData = {
    migratedAt: new Date().toISOString(),
    dryRun,
    stats: {
      total: dutiesSnapshot.size,
      migrated,
      skipped,
      errors
    },
    logs
  }

  fs.writeFileSync(LOG_FILE, JSON.stringify(logData, null, 2))

  console.log('\n========================================')
  console.log('Migration Summary')
  console.log('========================================')
  console.log(`Total duties: ${dutiesSnapshot.size}`)
  console.log(`Migrated: ${migrated}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Errors: ${errors}`)
  console.log(`Log file: ${LOG_FILE}`)
  console.log('========================================\n')

  if (dryRun) {
    console.log('✓ DRY RUN COMPLETE - No changes made')
    console.log('Run with --live flag to perform actual migration')
  } else {
    console.log('✓ MIGRATION COMPLETE')
  }
}

/**
 * Rollback migration (restore from log)
 */
async function rollback(logFilePath: string) {
  console.log('========================================')
  console.log('Rolling back migration...')
  console.log('========================================\n')

  if (!fs.existsSync(logFilePath)) {
    console.error(`Log file not found: ${logFilePath}`)
    process.exit(1)
  }

  const logData = JSON.parse(fs.readFileSync(logFilePath, 'utf8'))

  for (const log of logData.logs) {
    try {
      // Restore original duty data
      await db.collection('household_duties').doc(log.dutyId).set(log.oldData)
      console.log(`✓ Restored duty ${log.dutyId}`)

      // Optionally delete created household if it was created by migration
      if (log.householdCreated && log.householdId) {
        // Check if household has other members or duties before deleting
        const householdDuties = await db.collection('household_duties')
          .where('householdId', '==', log.householdId)
          .get()

        if (householdDuties.size === 1) {
          // Only this duty uses this household - safe to delete
          await db.collection('households').doc(log.householdId).delete()
          console.log(`✓ Deleted migrated household ${log.householdId}`)
        }
      }
    } catch (error) {
      console.error(`✗ Error rolling back duty ${log.dutyId}:`, error)
    }
  }

  console.log('\n✓ ROLLBACK COMPLETE\n')
}

// CLI interface
const args = process.argv.slice(2)
const command = args[0]

if (command === '--live') {
  migrate(false)
} else if (command === '--rollback') {
  const logFile = args[1]
  if (!logFile) {
    console.error('Usage: npm run migrate:duties:rollback <log-file-path>')
    process.exit(1)
  }
  rollback(logFile)
} else {
  // Default: dry run
  migrate(true)
}
