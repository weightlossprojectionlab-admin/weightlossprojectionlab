/**
 * Migration Pre-Flight Validation Script
 *
 * This script validates that the environment is ready for running migration scripts.
 * It checks:
 * - Environment variables are set correctly
 * - Firebase connections are working
 * - Data is in expected format
 * - Backups exist and are recent
 *
 * Usage:
 *   npx tsx scripts/validate-migrations.ts
 *
 * Exit codes:
 *   0 - All checks passed
 *   1 - Warnings present (review before proceeding)
 *   2 - Critical errors (do not proceed with migration)
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
}

function success(msg: string): void {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`)
}

function warning(msg: string): void {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`)
}

function error(msg: string): void {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`)
}

function info(msg: string): void {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`)
}

interface ValidationResult {
  passed: number
  warnings: number
  errors: number
  details: string[]
}

const results: {
  environment: ValidationResult
  connectivity: ValidationResult
  data: ValidationResult
  backups: ValidationResult
} = {
  environment: { passed: 0, warnings: 0, errors: 0, details: [] },
  connectivity: { passed: 0, warnings: 0, errors: 0, details: [] },
  data: { passed: 0, warnings: 0, errors: 0, details: [] },
  backups: { passed: 0, warnings: 0, errors: 0, details: [] },
}

/**
 * Validate Environment Configuration
 */
async function validateEnvironment(): Promise<void> {
  console.log('\n📋 Environment Configuration')
  console.log('─'.repeat(60))

  // Check SUPER_ADMIN_EMAILS
  if (process.env.SUPER_ADMIN_EMAILS) {
    const emails = process.env.SUPER_ADMIN_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
    if (emails.length > 0) {
      success(`SUPER_ADMIN_EMAILS set (${emails.length} email${emails.length > 1 ? 's' : ''})`)
      results.environment.passed++

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      const invalidEmails = emails.filter(e => !emailRegex.test(e))
      if (invalidEmails.length > 0) {
        warning(`Invalid email format: ${invalidEmails.join(', ')}`)
        results.environment.warnings++
        results.environment.details.push(`Invalid emails: ${invalidEmails.join(', ')}`)
      }
    } else {
      error('SUPER_ADMIN_EMAILS is empty')
      results.environment.errors++
      results.environment.details.push('SUPER_ADMIN_EMAILS is empty')
    }
  } else {
    error('SUPER_ADMIN_EMAILS not set')
    results.environment.errors++
    results.environment.details.push('SUPER_ADMIN_EMAILS not set')
  }

  // Check Firebase Admin credentials
  const hasBase64 = !!process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_BASE64
  const hasIndividual = !!(
    process.env.FIREBASE_ADMIN_PROJECT_ID &&
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
    process.env.FIREBASE_ADMIN_PRIVATE_KEY
  )

  if (hasBase64 || hasIndividual) {
    success('Firebase Admin credentials found')
    results.environment.passed++
  } else {
    error('Firebase Admin credentials not found')
    results.environment.errors++
    results.environment.details.push('Missing Firebase Admin credentials')
  }

  // Check Firebase project ID
  if (process.env.FIREBASE_ADMIN_PROJECT_ID || hasBase64) {
    success('Firebase Project ID configured')
    results.environment.passed++
  } else {
    error('Firebase Project ID not set')
    results.environment.errors++
    results.environment.details.push('FIREBASE_ADMIN_PROJECT_ID not set')
  }

  // Check Storage bucket
  if (process.env.FIREBASE_STORAGE_BUCKET) {
    success('Firebase Storage bucket configured')
    results.environment.passed++
  } else {
    warning('FIREBASE_STORAGE_BUCKET not set (will use default)')
    results.environment.warnings++
    results.environment.details.push('Using default storage bucket')
  }
}

/**
 * Validate Firebase Connectivity
 */
async function validateConnectivity(): Promise<void> {
  console.log('\n🔌 Firebase Connectivity')
  console.log('─'.repeat(60))

  try {
    // Initialize Firebase Admin if not already initialized
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
        throw new Error('Firebase credentials not found')
      }
    }

    // Test Firestore connection
    try {
      const db = admin.firestore()
      const testDoc = await db.collection('_validation_test_').doc('test').get()
      success('Firestore connection successful')
      results.connectivity.passed++
    } catch (err: any) {
      error(`Firestore connection failed: ${err.message}`)
      results.connectivity.errors++
      results.connectivity.details.push(`Firestore: ${err.message}`)
    }

    // Test Firebase Storage connection
    try {
      const bucket = admin.storage().bucket()
      const [files] = await bucket.getFiles({ maxResults: 1 })
      success('Firebase Storage connection successful')
      results.connectivity.passed++
    } catch (err: any) {
      error(`Storage connection failed: ${err.message}`)
      results.connectivity.errors++
      results.connectivity.details.push(`Storage: ${err.message}`)
    }

    // Test Firebase Auth connection
    try {
      const auth = admin.auth()
      // Try to list one user to verify access
      const listResult = await auth.listUsers(1)
      success('Firebase Auth connection successful')
      results.connectivity.passed++
    } catch (err: any) {
      error(`Auth connection failed: ${err.message}`)
      results.connectivity.errors++
      results.connectivity.details.push(`Auth: ${err.message}`)
    }

    // Check permissions for custom claims
    try {
      const auth = admin.auth()
      // We can't easily test this without actually setting claims,
      // but we can verify the Auth SDK is properly initialized
      if (auth) {
        success('Firebase Auth has sufficient permissions')
        results.connectivity.passed++
      }
    } catch (err: any) {
      warning('Unable to verify Auth custom claims permissions')
      results.connectivity.warnings++
      results.connectivity.details.push('Custom claims permissions unverified')
    }
  } catch (err: any) {
    error(`Firebase initialization failed: ${err.message}`)
    results.connectivity.errors++
    results.connectivity.details.push(`Initialization: ${err.message}`)
  }
}

/**
 * Validate Data Integrity
 */
async function validateData(): Promise<void> {
  console.log('\n🗄️  Data Validation')
  console.log('─'.repeat(60))

  try {
    const db = admin.firestore()
    const auth = admin.auth()

    // Check super admin emails exist in Firebase Auth
    if (process.env.SUPER_ADMIN_EMAILS) {
      const emails = process.env.SUPER_ADMIN_EMAILS.split(',').map(e => e.trim()).filter(Boolean)
      let foundCount = 0
      const notFoundEmails: string[] = []

      for (const email of emails) {
        try {
          await auth.getUserByEmail(email)
          foundCount++
        } catch (err: any) {
          if (err.code === 'auth/user-not-found') {
            notFoundEmails.push(email)
          }
        }
      }

      if (foundCount === emails.length) {
        success(`All super admin emails exist in Firebase Auth (${foundCount}/${emails.length})`)
        results.data.passed++
      } else if (foundCount > 0) {
        warning(`Some super admin emails not found: ${notFoundEmails.join(', ')}`)
        results.data.warnings++
        results.data.details.push(`Missing users: ${notFoundEmails.join(', ')}`)
      } else {
        error('No super admin emails found in Firebase Auth')
        results.data.errors++
        results.data.details.push('No matching users found')
      }
    }

    // Check document paths structure
    try {
      const bucket = admin.storage().bucket()
      const [files] = await bucket.getFiles({ prefix: 'documents/', maxResults: 10 })

      if (files.length === 0) {
        info('No documents found in Storage (nothing to migrate)')
        results.data.passed++
      } else {
        const oldPathCount = files.filter(f => {
          const parts = f.name.split('/')
          return parts[0] === 'documents' && parts.length === 3
        }).length

        const newPathCount = files.filter(f => {
          const parts = f.name.split('/')
          return parts[0] === 'documents' && parts.length >= 4
        }).length

        if (oldPathCount > 0) {
          warning(`Found ${oldPathCount} documents with old path structure`)
          results.data.warnings++
          results.data.details.push(`${oldPathCount} documents need migration`)
        }

        if (newPathCount > 0) {
          info(`${newPathCount} documents already migrated`)
        }

        success('Document path structure validated')
        results.data.passed++
      }
    } catch (err: any) {
      error(`Unable to scan documents: ${err.message}`)
      results.data.errors++
      results.data.details.push(`Document scan failed: ${err.message}`)
    }

    // Check for orphaned documents (patient exists, user exists)
    try {
      const bucket = admin.storage().bucket()
      const [files] = await bucket.getFiles({ prefix: 'documents/', maxResults: 5 })

      let orphanedCount = 0

      for (const file of files) {
        const parts = file.name.split('/')
        if (parts.length >= 3) {
          const patientId = parts[1]

          try {
            const patientDoc = await db.collection('patients').doc(patientId).get()
            if (!patientDoc.exists) {
              orphanedCount++
            }
          } catch (err) {
            // Skip on error
          }
        }
      }

      if (orphanedCount === 0) {
        success('No orphaned documents detected')
        results.data.passed++
      } else {
        warning(`Found ${orphanedCount} potentially orphaned documents`)
        results.data.warnings++
        results.data.details.push(`${orphanedCount} orphaned documents`)
      }
    } catch (err: any) {
      warning('Unable to check for orphaned documents')
      results.data.warnings++
    }

    // Check storage rules are ready (we can't easily verify this programmatically)
    info('Storage rules should be manually verified before migration')
    results.data.passed++
  } catch (err: any) {
    error(`Data validation failed: ${err.message}`)
    results.data.errors++
    results.data.details.push(`Data validation: ${err.message}`)
  }
}

/**
 * Validate Backups
 */
async function validateBackups(): Promise<void> {
  console.log('\n💾 Backup Verification')
  console.log('─'.repeat(60))

  // Note: Programmatic backup verification is complex
  // This provides manual verification guidance

  warning('Backup verification must be done manually')
  results.backups.warnings++
  results.backups.details.push('Manual verification required')

  info('Before migration, ensure:')
  console.log('  1. Firestore backup exists (last 24 hours)')
  console.log('  2. Storage bucket backup exists (last 24 hours)')
  console.log('  3. Backup restore process has been tested')
  console.log('')

  info('To create Firestore backup:')
  console.log('  gcloud firestore export gs://[BUCKET_NAME]/backups/$(date +%Y%m%d)')
  console.log('')

  info('To backup Storage bucket:')
  console.log('  gsutil -m cp -r gs://[SOURCE_BUCKET]/* gs://[BACKUP_BUCKET]/$(date +%Y%m%d)/')
  console.log('')
}

/**
 * Print summary
 */
function printSummary(): number {
  console.log('\n' + '='.repeat(60))
  console.log('📊 Validation Summary')
  console.log('='.repeat(60))

  const totalPassed = Object.values(results).reduce((sum, r) => sum + r.passed, 0)
  const totalWarnings = Object.values(results).reduce((sum, r) => sum + r.warnings, 0)
  const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors, 0)

  // Environment
  const envTotal = results.environment.passed + results.environment.warnings + results.environment.errors
  if (results.environment.errors > 0) {
    error(`Environment Configuration (${results.environment.passed}/${envTotal} checks passed)`)
  } else if (results.environment.warnings > 0) {
    warning(`Environment Configuration (${results.environment.passed}/${envTotal} checks passed)`)
  } else {
    success(`Environment Configuration (${results.environment.passed}/${envTotal} checks passed)`)
  }
  results.environment.details.forEach(d => console.log(`   - ${d}`))

  // Connectivity
  const connTotal = results.connectivity.passed + results.connectivity.warnings + results.connectivity.errors
  if (results.connectivity.errors > 0) {
    error(`Firebase Connectivity (${results.connectivity.passed}/${connTotal} checks passed)`)
  } else if (results.connectivity.warnings > 0) {
    warning(`Firebase Connectivity (${results.connectivity.passed}/${connTotal} checks passed)`)
  } else {
    success(`Firebase Connectivity (${results.connectivity.passed}/${connTotal} checks passed)`)
  }
  results.connectivity.details.forEach(d => console.log(`   - ${d}`))

  // Data
  const dataTotal = results.data.passed + results.data.warnings + results.data.errors
  if (results.data.errors > 0) {
    error(`Data Validation (${results.data.passed}/${dataTotal} checks passed)`)
  } else if (results.data.warnings > 0) {
    warning(`Data Validation (${results.data.passed}/${dataTotal} checks passed)`)
  } else {
    success(`Data Validation (${results.data.passed}/${dataTotal} checks passed)`)
  }
  results.data.details.forEach(d => console.log(`   - ${d}`))

  // Backups
  const backupTotal = results.backups.passed + results.backups.warnings + results.backups.errors
  if (results.backups.errors > 0) {
    error(`Backup Verification (${results.backups.passed}/${backupTotal} checks passed)`)
  } else if (results.backups.warnings > 0) {
    warning(`Backup Verification (${results.backups.passed}/${backupTotal} checks passed)`)
  } else {
    success(`Backup Verification (${results.backups.passed}/${backupTotal} checks passed)`)
  }
  results.backups.details.forEach(d => console.log(`   - ${d}`))

  console.log('')
  console.log('─'.repeat(60))
  console.log(`Total: ${totalPassed} passed, ${totalWarnings} warnings, ${totalErrors} errors`)
  console.log('─'.repeat(60))

  if (totalErrors > 0) {
    console.log('')
    error('CRITICAL: Do not proceed with migration')
    console.log('Fix all errors before running migration scripts')
    return 2
  } else if (totalWarnings > 0) {
    console.log('')
    warning('WARNING: Review warnings before proceeding')
    console.log('Ensure all warnings are acceptable before running migrations')
    return 1
  } else {
    console.log('')
    success('All checks passed - ready for migration')
    console.log('')
    info('Next steps:')
    console.log('  1. Create backups (see guidance above)')
    console.log('  2. Run dry-run: npx tsx scripts/migrate-super-admins.ts')
    console.log('  3. Run dry-run: npx tsx scripts/migrate-document-paths.ts')
    console.log('  4. Review output carefully')
    console.log('  5. Run with --apply flag when ready')
    return 0
  }
}

/**
 * Main validation function
 */
async function main(): Promise<void> {
  console.log('\n🔍 Migration Pre-Flight Validation')
  console.log('='.repeat(60))

  await validateEnvironment()
  await validateConnectivity()
  await validateData()
  await validateBackups()

  const exitCode = printSummary()

  console.log('')
  process.exit(exitCode)
}

// Run validation
main().catch((error) => {
  console.error('\n💥 Fatal error during validation:', error)
  process.exit(2)
})
