/**
 * Document Path Migration Script
 *
 * This script migrates Firebase Storage documents from old path structure to new user-scoped structure:
 * - OLD: documents/{patientId}/{documentId}
 * - NEW: documents/{userId}/{patientId}/{documentId}
 *
 * This prevents cross-user document access by ensuring documents are isolated by userId.
 *
 * Prerequisites:
 * - Firebase Admin SDK must be initialized
 * - Storage bucket must be accessible
 * - Firestore database access for patient -> userId mapping
 *
 * Usage:
 *   npx tsx scripts/migrate-document-paths.ts          # DRY RUN (default)
 *   npx tsx scripts/migrate-document-paths.ts --apply  # Apply changes
 *
 * Options:
 *   --apply: Actually move files (default is dry-run)
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

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
      projectId: serviceAccount.project_id,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
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
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_ADMIN_PROJECT_ID}.appspot.com`
    })
  } else {
    throw new Error('Firebase Admin credentials not found in environment variables')
  }
}

const db = admin.firestore()
const bucket = admin.storage().bucket()

interface MigrationStats {
  filesFound: number
  filesMigrated: number
  filesSkipped: number
  filesAlreadyMigrated: number
  errors: string[]
  totalSize: number
}

interface DocumentInfo {
  oldPath: string
  newPath: string
  patientId: string
  userId: string
  documentId: string
  size: number
  metadata: any
}

interface OperationLog {
  timestamp: string
  action: 'move' | 'skip' | 'error'
  oldPath: string
  newPath: string
  error?: string
}

const operationLog: OperationLog[] = []

/**
 * Get userId for a given patientId from Firestore
 */
async function getUserIdForPatient(patientId: string): Promise<string | null> {
  try {
    const patientDoc = await db.collection('patients').doc(patientId).get()

    if (!patientDoc.exists) {
      console.warn(`⚠️  Patient document not found: ${patientId}`)
      return null
    }

    const data = patientDoc.data()
    const userId = data?.userId || data?.accountOwnerId

    if (!userId) {
      console.warn(`⚠️  Patient ${patientId} has no userId/accountOwnerId field`)
      return null
    }

    return userId
  } catch (error: any) {
    console.error(`❌ Error fetching patient ${patientId}:`, error.message)
    return null
  }
}

/**
 * Check if file is already at new path structure
 */
function isAlreadyMigrated(filePath: string): boolean {
  // New path structure: documents/{userId}/{patientId}/{documentId}
  const pathParts = filePath.split('/')

  if (pathParts[0] !== 'documents') {
    return false
  }

  // Check if it has 3 levels after 'documents/'
  // documents/userId/patientId/documentId.ext
  return pathParts.length >= 4
}

/**
 * Scan storage bucket for documents to migrate
 */
async function scanDocuments(): Promise<DocumentInfo[]> {
  console.log('🔍 Scanning Firebase Storage for documents...\n')

  const [files] = await bucket.getFiles({
    prefix: 'documents/',
  })

  const documentsToMigrate: DocumentInfo[] = []

  for (const file of files) {
    const filePath = file.name

    // Skip if already migrated
    if (isAlreadyMigrated(filePath)) {
      continue
    }

    // Parse old path: documents/{patientId}/{documentId}
    const pathParts = filePath.split('/')

    if (pathParts.length < 3) {
      console.warn(`⚠️  Skipping invalid path: ${filePath}`)
      continue
    }

    const patientId = pathParts[1]
    const documentId = pathParts.slice(2).join('/') // Handle nested paths

    // Get userId for this patient
    const userId = await getUserIdForPatient(patientId)

    if (!userId) {
      console.warn(`⚠️  Skipping ${filePath} - cannot determine userId`)
      continue
    }

    // Get file metadata
    const [metadata] = await file.getMetadata()
    const size = parseInt(metadata.size as string) || 0

    const newPath = `documents/${userId}/${patientId}/${documentId}`

    documentsToMigrate.push({
      oldPath: filePath,
      newPath,
      patientId,
      userId,
      documentId,
      size,
      metadata,
    })
  }

  return documentsToMigrate
}

/**
 * Migrate a single document
 */
async function migrateDocument(
  doc: DocumentInfo,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  try {
    const sourceFile = bucket.file(doc.oldPath)
    const destFile = bucket.file(doc.newPath)

    // Check if destination already exists
    const [destExists] = await destFile.exists()
    if (destExists) {
      console.log(`⚠️  Destination already exists: ${doc.newPath}`)
      stats.filesSkipped++
      operationLog.push({
        timestamp: new Date().toISOString(),
        action: 'skip',
        oldPath: doc.oldPath,
        newPath: doc.newPath,
        error: 'Destination already exists',
      })
      return
    }

    // Check if source exists
    const [sourceExists] = await sourceFile.exists()
    if (!sourceExists) {
      console.log(`⚠️  Source file not found: ${doc.oldPath}`)
      stats.filesSkipped++
      operationLog.push({
        timestamp: new Date().toISOString(),
        action: 'skip',
        oldPath: doc.oldPath,
        newPath: doc.newPath,
        error: 'Source file not found',
      })
      return
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would migrate:`)
      console.log(`  FROM: ${doc.oldPath}`)
      console.log(`  TO:   ${doc.newPath}`)
      console.log(`  Size: ${(doc.size / 1024).toFixed(2)} KB`)
      stats.filesMigrated++
      stats.totalSize += doc.size
      return
    }

    // Perform the migration (copy then delete)
    console.log(`📦 Migrating: ${doc.oldPath}`)

    // Copy file to new location with metadata
    await sourceFile.copy(destFile)

    // Verify copy succeeded
    const [verifyExists] = await destFile.exists()
    if (!verifyExists) {
      throw new Error('File copy verification failed')
    }

    // Delete original
    await sourceFile.delete()

    console.log(`✅ Migrated: ${doc.oldPath} → ${doc.newPath}`)

    stats.filesMigrated++
    stats.totalSize += doc.size

    operationLog.push({
      timestamp: new Date().toISOString(),
      action: 'move',
      oldPath: doc.oldPath,
      newPath: doc.newPath,
    })
  } catch (error: any) {
    const errorMsg = `Failed to migrate ${doc.oldPath}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)

    operationLog.push({
      timestamp: new Date().toISOString(),
      action: 'error',
      oldPath: doc.oldPath,
      newPath: doc.newPath,
      error: error.message,
    })
  }
}

/**
 * Save operation log to file for rollback capability
 */
function saveOperationLog(): void {
  const logDir = path.join(process.cwd(), 'migration-logs')

  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }

  const logFile = path.join(logDir, `document-paths-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify(operationLog, null, 2))

  console.log(`\n📝 Operation log saved: ${logFile}`)
}

/**
 * Main migration function
 */
async function migrate(applyChanges: boolean): Promise<void> {
  const stats: MigrationStats = {
    filesFound: 0,
    filesMigrated: 0,
    filesSkipped: 0,
    filesAlreadyMigrated: 0,
    errors: [],
    totalSize: 0,
  }

  console.log('\n🚀 Document Path Migration')
  console.log('='.repeat(60))
  console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Bucket: ${bucket.name}\n`)

  // Scan for documents to migrate
  const documentsToMigrate = await scanDocuments()

  stats.filesFound = documentsToMigrate.length

  if (documentsToMigrate.length === 0) {
    console.log('✅ No documents need migration')
    return
  }

  console.log(`\nFound ${documentsToMigrate.length} documents to migrate\n`)

  // Show sample of files to migrate
  const sampleSize = Math.min(5, documentsToMigrate.length)
  console.log('Sample of files to migrate:')
  for (let i = 0; i < sampleSize; i++) {
    const doc = documentsToMigrate[i]
    console.log(`  ${i + 1}. ${doc.oldPath}`)
    console.log(`     → ${doc.newPath}`)
  }

  if (documentsToMigrate.length > sampleSize) {
    console.log(`  ... and ${documentsToMigrate.length - sampleSize} more`)
  }

  console.log('')

  // Show warning if applying changes
  if (applyChanges) {
    console.log('⚠️  WARNING: This will move files in Firebase Storage!')
    console.log('⚠️  Waiting 5 seconds before proceeding...\n')
    await new Promise(resolve => setTimeout(resolve, 5000))
  }

  // Process documents in batches
  const batchSize = 10
  for (let i = 0; i < documentsToMigrate.length; i += batchSize) {
    const batch = documentsToMigrate.slice(i, i + batchSize)

    console.log(`\nProcessing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(documentsToMigrate.length / batchSize)}...`)

    for (const doc of batch) {
      await migrateDocument(doc, !applyChanges, stats)
    }
  }

  // Save operation log
  if (operationLog.length > 0) {
    saveOperationLog()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Files found: ${stats.filesFound}`)
  console.log(`Files migrated: ${stats.filesMigrated}`)
  console.log(`Files skipped: ${stats.filesSkipped}`)
  console.log(`Total size: ${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (!applyChanges && stats.filesMigrated > 0) {
    console.log('\n💡 This was a DRY RUN. To apply changes, run:')
    console.log('   npx tsx scripts/migrate-document-paths.ts --apply')
  }

  console.log('\n' + (applyChanges ? '✅ MIGRATION COMPLETE' : '🔍 DRY RUN COMPLETE - No changes made'))
}

// Parse command line arguments
const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')

// Run migration
migrate(applyChanges)
  .then(() => {
    console.log('\n✨ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
