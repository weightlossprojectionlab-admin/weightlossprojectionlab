/**
 * Super Admin Rollback Script
 *
 * This script removes super admin Custom Claims from Firebase Auth users.
 * Use this to rollback the migrate-super-admins.ts migration.
 *
 * Prerequisites:
 * - Firebase Admin SDK must be initialized
 * - SUPER_ADMIN_EMAILS must be set in environment (to know which users to rollback)
 *
 * Usage:
 *   npx tsx scripts/rollback-super-admins.ts          # DRY RUN (default)
 *   npx tsx scripts/rollback-super-admins.ts --apply  # Remove claims
 *
 * Options:
 *   --apply: Actually remove custom claims (default is dry-run)
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

const auth = admin.auth()

interface RollbackStats {
  emailsFound: number
  usersRolledBack: number
  usersAlreadyClear: number
  usersNotFound: string[]
  errors: string[]
}

interface RollbackLog {
  timestamp: string
  email: string
  uid: string
  previousClaims: any
  action: 'removed' | 'already_clear' | 'not_found' | 'error'
  error?: string
}

const rollbackLog: RollbackLog[] = []

/**
 * Get super admin emails from environment variable
 */
function getSuperAdminEmails(): string[] {
  const emailsEnv = process.env.SUPER_ADMIN_EMAILS ?? ''

  if (!emailsEnv) {
    throw new Error('SUPER_ADMIN_EMAILS not set in environment variables')
  }

  const emails = emailsEnv
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (emails.length === 0) {
    throw new Error('No valid super admin emails found in SUPER_ADMIN_EMAILS')
  }

  return emails
}

/**
 * Check if user has super admin claims
 */
function hasSuperAdminClaims(user: admin.auth.UserRecord): boolean {
  return user.customClaims?.role === 'super_admin' || user.customClaims?.admin === true
}

/**
 * Remove custom claims from a user
 */
async function removeSuperAdminClaims(
  email: string,
  dryRun: boolean,
  stats: RollbackStats
): Promise<void> {
  try {
    // Get user by email
    let user: admin.auth.UserRecord
    try {
      user = await auth.getUserByEmail(email)
    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log(`⚠️  User not found: ${email}`)
        stats.usersNotFound.push(email)
        rollbackLog.push({
          timestamp: new Date().toISOString(),
          email,
          uid: '',
          previousClaims: null,
          action: 'not_found',
        })
        return
      }
      throw error
    }

    // Check if user has super admin claims
    if (!hasSuperAdminClaims(user)) {
      console.log(`✓ User ${email} already has no super admin claims`)
      stats.usersAlreadyClear++
      rollbackLog.push({
        timestamp: new Date().toISOString(),
        email,
        uid: user.uid,
        previousClaims: user.customClaims || null,
        action: 'already_clear',
      })
      return
    }

    const previousClaims = { ...user.customClaims }

    if (dryRun) {
      console.log(`[DRY RUN] Would remove super admin claims from ${email} (uid: ${user.uid})`)
      console.log(`  Current claims:`, user.customClaims)
      console.log(`  New claims: null (all claims removed)`)
      stats.usersRolledBack++
      return
    }

    // Remove all custom claims (set to null)
    // If you want to preserve other claims, you'd need to selectively remove only role and admin
    await auth.setCustomUserClaims(user.uid, null)

    console.log(`✅ Removed super admin claims from ${email} (uid: ${user.uid})`)
    stats.usersRolledBack++

    rollbackLog.push({
      timestamp: new Date().toISOString(),
      email,
      uid: user.uid,
      previousClaims,
      action: 'removed',
    })
  } catch (error: any) {
    const errorMsg = `Failed to rollback ${email}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)

    rollbackLog.push({
      timestamp: new Date().toISOString(),
      email,
      uid: '',
      previousClaims: null,
      action: 'error',
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

  const logFile = path.join(logDir, `super-admin-rollback-${Date.now()}.json`)
  fs.writeFileSync(logFile, JSON.stringify(rollbackLog, null, 2))

  console.log(`\n📝 Rollback log saved: ${logFile}`)
}

/**
 * Main rollback function
 */
async function rollback(applyChanges: boolean): Promise<void> {
  const stats: RollbackStats = {
    emailsFound: 0,
    usersRolledBack: 0,
    usersAlreadyClear: 0,
    usersNotFound: [],
    errors: []
  }

  console.log('\n🔄 Super Admin Rollback')
  console.log('='.repeat(60))
  console.log(`Mode: ${applyChanges ? 'APPLY' : 'DRY RUN'}`)

  // Get super admin emails
  let superAdminEmails: string[]
  try {
    superAdminEmails = getSuperAdminEmails()
  } catch (error: any) {
    console.error(`\n❌ ${error.message}`)
    process.exit(1)
  }

  stats.emailsFound = superAdminEmails.length
  console.log(`\nSuper admin emails to rollback: ${stats.emailsFound}`)
  superAdminEmails.forEach(email => console.log(`  - ${email}`))
  console.log('')

  // Show warning if applying changes
  if (applyChanges) {
    console.log('⚠️  WARNING: This will remove super admin custom claims!')
    console.log('⚠️  Users will lose super admin privileges!')
    console.log('⚠️  Waiting 3 seconds before proceeding...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // Process each super admin email
  for (const email of superAdminEmails) {
    await removeSuperAdminClaims(email, !applyChanges, stats)
  }

  // Save rollback log
  if (rollbackLog.length > 0) {
    saveRollbackLog()
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Rollback Summary')
  console.log('='.repeat(60))
  console.log(`Super admin emails: ${stats.emailsFound}`)
  console.log(`Users rolled back: ${stats.usersRolledBack}`)
  console.log(`Users already clear: ${stats.usersAlreadyClear}`)
  console.log(`Users not found: ${stats.usersNotFound.length}`)

  if (stats.usersNotFound.length > 0) {
    console.log('\n⚠️  Users not found in Firebase Auth:')
    stats.usersNotFound.forEach(email => console.log(`  - ${email}`))
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (!applyChanges && stats.usersRolledBack > 0) {
    console.log('\n💡 This was a DRY RUN. To apply rollback, run:')
    console.log('   npx tsx scripts/rollback-super-admins.ts --apply')
  }

  if (applyChanges && stats.usersRolledBack > 0) {
    console.log('\n⚠️  IMPORTANT: Users have been rolled back to regular users')
    console.log('⚠️  To restore super admin access, run:')
    console.log('   npx tsx scripts/migrate-super-admins.ts --apply')
  }

  console.log('\n' + (applyChanges ? '✅ ROLLBACK COMPLETE' : '🔍 DRY RUN COMPLETE - No changes made'))
}

// Parse command line arguments
const args = process.argv.slice(2)
const applyChanges = args.includes('--apply')

// Run rollback
rollback(applyChanges)
  .then(() => {
    console.log('\n✨ Script finished')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error)
    process.exit(1)
  })
