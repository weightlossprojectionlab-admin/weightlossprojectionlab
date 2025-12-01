/**
 * Super Admin Custom Claims Migration Script
 *
 * This script sets custom claims for super admin users:
 * - role: 'super_admin'
 * - admin: true
 *
 * Super admin emails are read from SUPER_ADMIN_EMAILS environment variable.
 *
 * Prerequisites:
 * - Firebase Admin SDK must be initialized
 * - SUPER_ADMIN_EMAILS must be set in .env.local
 *
 * Usage:
 *   npx tsx scripts/migrate-super-admins.ts          # DRY RUN (default)
 *   npx tsx scripts/migrate-super-admins.ts --apply  # Apply changes
 *
 * Options:
 *   --apply: Actually set custom claims (default is dry-run)
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

const auth = admin.auth()

interface MigrationStats {
  emailsFound: number
  usersUpdated: number
  usersAlreadySet: number
  usersNotFound: string[]
  errors: string[]
}

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
 * Check if user already has super admin claims
 */
function hasSuperAdminClaims(user: admin.auth.UserRecord): boolean {
  return user.customClaims?.role === 'super_admin' && user.customClaims?.admin === true
}

/**
 * Set custom claims for a user
 */
async function setSuperAdminClaims(
  email: string,
  dryRun: boolean,
  stats: MigrationStats
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
        return
      }
      throw error
    }

    // Check if claims are already set
    if (hasSuperAdminClaims(user)) {
      console.log(`✓ User ${email} already has super admin claims`)
      stats.usersAlreadySet++
      return
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would set super admin claims for ${email} (uid: ${user.uid})`)
      console.log(`  Current claims:`, user.customClaims || {})
      console.log(`  New claims: { role: 'super_admin', admin: true }`)
      stats.usersUpdated++
      return
    }

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, {
      role: 'super_admin',
      admin: true,
    })

    console.log(`✅ Set super admin claims for ${email} (uid: ${user.uid})`)
    stats.usersUpdated++
  } catch (error: any) {
    const errorMsg = `Failed to set claims for ${email}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
  }
}

/**
 * Main migration function
 */
async function migrate(applyChanges: boolean): Promise<void> {
  const stats: MigrationStats = {
    emailsFound: 0,
    usersUpdated: 0,
    usersAlreadySet: 0,
    usersNotFound: [],
    errors: []
  }

  console.log('\n🚀 Super Admin Custom Claims Migration')
  console.log('=' .repeat(60))
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
  console.log(`\nSuper admin emails found: ${stats.emailsFound}`)
  superAdminEmails.forEach(email => console.log(`  - ${email}`))
  console.log('')

  // Show warning if applying changes
  if (applyChanges) {
    console.log('⚠️  WARNING: This will set custom claims for super admin users!')
    console.log('⚠️  Waiting 3 seconds before proceeding...\n')
    await new Promise(resolve => setTimeout(resolve, 3000))
  }

  // Process each super admin email
  for (const email of superAdminEmails) {
    await setSuperAdminClaims(email, !applyChanges, stats)
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Super admin emails: ${stats.emailsFound}`)
  console.log(`Users updated: ${stats.usersUpdated}`)
  console.log(`Users already set: ${stats.usersAlreadySet}`)
  console.log(`Users not found: ${stats.usersNotFound.length}`)

  if (stats.usersNotFound.length > 0) {
    console.log('\n⚠️  Users not found in Firebase Auth:')
    stats.usersNotFound.forEach(email => console.log(`  - ${email}`))
  }

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  if (!applyChanges && stats.usersUpdated > 0) {
    console.log('\n💡 This was a DRY RUN. To apply changes, run:')
    console.log('   npx tsx scripts/migrate-super-admins.ts --apply')
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
