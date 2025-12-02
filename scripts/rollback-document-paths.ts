/**
 * Document Path Rollback Script
 *
 * This script reverses the document path migration by moving files back to the old structure:
 * - FROM: documents/{userId}/{patientId}/{documentId}
 * - TO:   documents/{patientId}/{documentId}
 *
 * Can use migration operation log for accurate rollback, or scan for all migrated files.
 *
 * Prerequisites:
 * - Firebase Admin SDK must be initialized
 * - Storage bucket must be accessible
 * - Migration log file (optional but recommended)
 *
 * Usage:
 *   npx tsx scripts/rollback-document-paths.ts                      # DRY RUN (default)
 *   npx tsx scripts/rollback-document-paths.ts --apply              # Rollback changes
 *   npx tsx scripts/rollback-document-paths.ts --log=path/to/log.json --apply  # Use specific log
 *
 * Options:
 *   --apply: Actually move files (default is dry-run)
 *   --log=FILE: Use specific migration log file for rollback
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Initialize Firebase Admin
if (!admin.apps.length) {
  const base64ServiceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64

  if (base64ServiceAccount) {
    const serviceAccount = JSON.parse(
      Buffer.from(base64ServiceAccount, 'base64').toString('utf8')
    )

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: serviceAccount.project_id,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    })
  } else if (process.env.FIREBASE_ADMIN_PROJECT_ID &&
             process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
             process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n')
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`
    })
  } else {
    throw new Error('Firebase Admin credentials not found in environment variables')
  }
}

const bucket = admin.storage().bucket()

interface RollbackStats {
  filesFound: number
  filesRolledBack: number
  filesSkipped: number
  errors: string[]
  totalSize: number
}

interface RollbackOperation {
  fromPath: string  // New path (documents/userId/patientId/doc)
  toPath: string    // Old path (documents/patientId/doc)
  size: number
}

interface MigrationLogEntry {
  timestamp: string
  action: string
  oldPath: string
  newPath: string
  error?: string
}

const rollbackLog: any[] = []

/**
 * Load migration log file if specified
 */
function loadMigrationLog(logPath?: string): MigrationLogEntry[] | null {
  if (!logPath) {
    return null
  }

  try {
    const logContent = fs.readFileSync(logPath, 'utf8')
    const entries = JSON.parse(logContent) as MigrationLogEntry[]

    // Filter only successful move operations
    return entries.filter(e => e.action === 'move' && e.newPath && e.oldPath)
  } catch (error: any) {
    console.warn(`⚠️  Could not load migration log: ${error.message}`)
    return null
  }
}

/**
 * Check if file is in new (migrated) path structure
 */
function isMigratedPath(filePath: string): boolean {
  // New path structure: documents/{userId}/{patientId}/{documentId}
  const pathParts = filePath.split('/')
  return pathParts[0] === 'documents' && pathParts.length >= 4
}

/**
 * Scan storage bucket for migrated documents
 */
async function scanMigratedDocuments(): Promise<RollbackOperation[]> {
  console.log('🔍 Scanning Firebase Storage for migrated documents...\n')

  const [files] = await bucket.getFiles({
    prefix: 'documents/',
  })

  const documentsToRollback: RollbackOperation[] = []

  for (const file of files) {
    const filePath = file.name

    // Only rollback files in new structure
    if (!isMigratedPath(filePath)) {
      continue
    }

    // Parse new path: documents/{userId}/{patientId}/{documentId}
    const pathParts = filePath.split('/')

    if (pathParts.length < 4) {
      continue
    }

    const userId = pathParts[1]
    const patientId = pathParts[2]
    const documentId = pathParts.slice(3).join('/') // Handle nested paths

    // Get file metadata
    const [metadata] = await file.getMetadata()
    const size = parseInt(metadata.size as string) || 0

    // Generate old path
    const oldPath = `documents/${patientId}/${documentId}`

    documentsToRollback.push({
      fromPath: filePath,
      toPath: oldPath,
      size,
    })
  }

  return documentsToRollback
}

/**
 * Get rollback operations from migration log
 */
function getRollbackOperationsFromLog(logEntries: MigrationLogEntry[]): RollbackOperation[] {
  return logEntries.map(entry => ({
    fromPath: entry.newPath,  // Reverse: new path becomes source
    toPath: entry.oldPath,    // Old path becomes destination
    size: 0, // Size not available in log
  }))
}

/**
 * Rollback a single document
 */
async function rollbackDocument(
  op: RollbackOperation,
  dryRun: boolean,
  stats: RollbackStats
): Promise<void> {
  try {
    const sourceFile = bucket.file(op.fromPath)
    const destFile = bucket.file(op.toPath)

    // Check if source exists
    const [sourceExists] = await sourceFile.exists()
    if (!sourceExists) {
      console.log(`⚠️  Source file not found: ${op.fromPath}`)
      stats.filesSkipped++
      rollbackLog.push({
        timestamp: new Date().toISOString(),
        action: 'skip',
        fromPath: op.fromPath,
        toPath: op.toPath,
        error: 'Source file not found',
      })
      return
    }

    // Check if destination already exists
    const [destExists] = await destFile.exists()
    if (destExists) {
      console.log(`⚠️  Destination already exists: ${op.toPath}`)
      stats.filesSkipped++
      rollbackLog.push({
        timestamp: new Date().toISOString(),
        action: 'skip',
        fromPath: op.fromPath,
        toPath: op.toPath,
        error: 'Destination already exists',
      })
      return
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would rollback:`)
      console.log(`  FROM: ${op.fromPath}`)
      console.log(`  TO:   ${op.toPath}`)
      if (op.size > 0) {
        console.log(`  Size: ${(op.size / 1024).toFixed(2)} KB`)
      }
      stats.filesRolledBack++
      stats.totalSize += op.size
      return
    }

    // Perform the rollback (copy then delete)
    console.log(`🔄 Rolling back: ${op.fromPath}`)

    // Copy file to old location with metadata
    await sourceFile.copy(destFile)

    // Verify copy succeeded
    const [verifyExists] = await destFile.exists()
    if (!verifyExists) {
      throw new Error('File copy verification failed')
    }

    // Delete new location
    await sourceFile.delete()

    console.log(`✅ Rolled back: ${op.fromPath} → ${op.toPath}`)

    stats.filesRolledBack++
    stats.totalSize += op.size

    rollbackLog.push({
      timestamp: new Date().toISOString(),
      action: 'rollback',
      fromPath: op.fromPath,
      toPath: op.toPath,
    })
  } catch (error: any) {
    const errorMsg = `Failed to rollback ${op.fromPath}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)

    rollbackLog.push({
      timestamp: new Date().toISOString(),
      action: 'error',
      fromPath: op.fromPath,
      toPath: op.toPath,
      error: error.message,
    })
  }
}

/**
 * Save rollback log to file
 */
function saveRollbackLog(): void {
  const logDir = path.join(process.cwd(), 'migration-logs')

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, `document-paths-rollback-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify(rollbackLog, null, 2))

  console.log(`\n📝 Rollback log saved: ${logFile}`)
}

/**
 * Main rollback function
 */
async function rollback(applyChanges: boolean, logPath?: string): Promise<void> {
  const stats: RollbackStats = {
    filesFound: 0,
    filesRolledBack: 0,
    filesSkipped: 0,
    errors: [],
    totalSize: 0,
  }

  console.log('\n🔄 Document Path Rollback')
  console.log('='.repeat(60))
  console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Bucket: ${bucket.name}`)
  if (logPath) {
    console.log(`Using migration log: ${logPath}`)
  }
  console.log('')

  // Get rollback operations
  let rollbackOperations: RollbackOperation[]

  if (logPath) {
    console.log('📄 Loading migration log...')
    const logEntries = loadMigrationLog(logPath)

    if (logEntries && logEntries.length > 0) {
      rollbackOperations = getRollbackOperationsFromLog(logEntries)
      console.log(`Found ${rollbackOperations.length} operations in log\n`)
    } else {
      console.log('⚠️  Migration log not valid or empty, scanning bucket instead...\n')
      rollbackOperations = await scanMigratedDocuments()
    }
  } else {
    console.log('📂 Scanning for migrated documents...')
    rollbackOperations = await scanMigratedDocuments()
  }

  stats.filesFound = rollbackOperations.length

  if (rollbackOperations.length === 0) {
    console.log('✅ No documents need rollback')
    return
  }

  console.log(`\nFound ${rollbackOperations.length} documents to rollback\n`)

  // Show sample
  const sampleSize = Math.min(5, rollbackOperations.length)
  console.log('Sample of files to rollback:')
  for (let i = 0; i < sampleSize; i++) {
    const op = rollbackOperations[i]
    console.log(`  ${i + 1}. ${op.fromPath}`)
    console.log(`     → ${op.toPath}`)
  }

  if (rollbackOperations.length > sampleSize) {
    console.log(`  ... and ${rollbackOperations.length - sampleSize} more`)
  }

  console.log('')

  // Show warning if applying changes
  if (applyChanges) {
    console.log('⚠️  WARNING: This will move files back to old path structure!')
    console.log('⚠️  This reverses the security improvements from migration!')
    console.log('⚠️  Waiting 5 seconds before proceeding...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Process documents in batches
  const batchSize = 10
  for (let i = 0; i < rollbackOperations.length; i += batchSize) {
    const batch = rollbackOperations.slice(i, i + batchSize)

    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(rollbackOperations.length / batchSize)}...`)

    for (const op of batch) {
      await rollbackDocument(op, !applyChanges, stats)
    }
  }

  // Save rollback log
  if (rollbackLog.length > 0) {
    saveRollbackLog()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Rollback Summary')
  console.log('='.repeat(60))
  console.log(`Files found: ${stats.filesFound}`)
  console.log(`Files rolled back: ${stats.filesRolledBack}`)
  console.log(`Files skipped: ${stats.filesSkipped}`)
  if (stats.totalSize > 0) {
    console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`)
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (!applyChanges && stats.filesRolledBack > 0) {
    console.log('\n💡 This was a DRY RUN. To apply rollback, run:')
    console.log('   npx tsx scripts/rollback-document-paths.ts --apply')
    if (logPath) {
      console.log(`   (with log: --log=${logPath})`)
    }
  }

  if (applyChanges && stats.filesRolledBack > 0) {
    console.log('\n⚠️  IMPORTANT: Documents are now back at old paths')
    console.log('⚠️  Security: Update storage rules if needed')
    console.log('⚠️  To re-migrate, run:')
    console.log('   npx tsx scripts/migrate-document-paths.ts --apply')
  }

  console.log('\n' + (applyChanges ? '✅ ROLLBACK COMPLETE' : '🔍 DRY RUN COMPLETE - No changes made'))
}

// Parse command line arguments
const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')
const logArg = args.find(arg => arg.startsWith('--log='))
const logPath = logArg?.split('=')[1]

// Run rollback
rollback(applyChanges, logPath)
  .then(() => {
    console.log('\n✨ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
