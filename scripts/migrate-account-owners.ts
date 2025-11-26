/**
 * Account Owner Migration Script
 *
 * This script migrates existing users to the Account Owner system by:
 * 1. Finding all users who have created patients (they are Account Owners)
 * 2. Setting isAccountOwner=true and accountOwnerSince=earliest patient createdAt
 * 3. For all family members in their familyMembers collection:
 *    - Set familyRole='caregiver' (if not already set)
 *    - Set managedBy to the Account Owner's userId
 *    - Set canBeEditedBy=[ownerId]
 *    - Set roleAssignedAt and roleAssignedBy
 *
 * Prerequisites:
 * - Firebase Admin SDK must be initialized
 * - Users with patients will be designated as Account Owners
 *
 * Usage:
 *   npx tsx scripts/migrate-account-owners.ts [--dry-run] [--user-id=USER_ID]
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
  accountOwnersCreated: number
  existingAccountOwners: number
  usersWithoutPatients: number
  familyMembersUpdated: number
  familyMembersWithRoles: number
  errors: string[]
  auditLog: AuditEntry[]
}

interface AuditEntry {
  timestamp: string
  userId: string
  action: string
  details: Record<string, any>
}

interface MigrationOptions {
  dryRun: boolean
  userId?: string
}

/**
 * Add audit log entry
 */
function addAuditLog(
  stats: MigrationStats,
  userId: string,
  action: string,
  details: Record<string, any>
) {
  stats.auditLog.push({
    timestamp: new Date().toISOString(),
    userId,
    action,
    details
  })
}

/**
 * Get earliest patient creation date for a user
 */
async function getEarliestPatientCreatedAt(userId: string): Promise<string | null> {
  try {
    const patientsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('patients')
      .orderBy('createdAt', 'asc')
      .limit(1)
      .get()

    if (patientsSnapshot.empty) {
      return null
    }

    const firstPatient = patientsSnapshot.docs[0].data()
    return firstPatient.createdAt || new Date().toISOString()
  } catch (error) {
    console.warn(`Failed to get earliest patient for user ${userId}:`, error)
    return new Date().toISOString() // Fallback to current time
  }
}

/**
 * Migrate user to Account Owner status
 */
async function migrateUserToAccountOwner(
  userId: string,
  dryRun: boolean,
  stats: MigrationStats
): Promise<boolean> {
  try {
    const userRef = db.collection('users').doc(userId)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      console.log(`⚠️  User document not found: ${userId}`)
      return false
    }

    const userData = userDoc.data()!

    // Check if user already has isAccountOwner flag
    if (userData.preferences?.isAccountOwner === true) {
      console.log(`✓ User ${userId} is already an Account Owner`)
      stats.existingAccountOwners++
      addAuditLog(stats, userId, 'EXISTING_ACCOUNT_OWNER', {
        accountOwnerSince: userData.preferences?.accountOwnerSince
      })
      return true
    }

    // Get earliest patient creation date
    const accountOwnerSince = await getEarliestPatientCreatedAt(userId)

    if (!accountOwnerSince) {
      console.log(`⚠️  User ${userId} has no patients - skipping`)
      stats.usersWithoutPatients++
      return false
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would set user ${userId} as Account Owner (since: ${accountOwnerSince})`)
      stats.accountOwnersCreated++
      addAuditLog(stats, userId, 'WOULD_CREATE_ACCOUNT_OWNER', {
        accountOwnerSince
      })
      return true
    }

    // Update user preferences
    await userRef.update({
      'preferences.isAccountOwner': true,
      'preferences.accountOwnerSince': accountOwnerSince,
      lastModified: new Date().toISOString()
    })

    console.log(`✅ Set user ${userId} as Account Owner (since: ${accountOwnerSince})`)
    stats.accountOwnersCreated++
    addAuditLog(stats, userId, 'CREATE_ACCOUNT_OWNER', {
      accountOwnerSince
    })

    return true
  } catch (error: any) {
    const errorMsg = `Failed to migrate user ${userId} to Account Owner: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
    return false
  }
}

/**
 * Migrate family members for an Account Owner
 */
async function migrateFamilyMembers(
  userId: string,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  try {
    // Get all family members across all patients
    const patientsSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('patients')
      .get()

    if (patientsSnapshot.empty) {
      console.log(`  No patients found for user ${userId}`)
      return
    }

    const now = new Date().toISOString()
    let familyMembersProcessed = 0

    for (const patientDoc of patientsSnapshot.docs) {
      const patientId = patientDoc.id

      // Get family members for this patient
      const familyMembersSnapshot = await db
        .collection('users')
        .doc(userId)
        .collection('patients')
        .doc(patientId)
        .collection('familyMembers')
        .get()

      if (familyMembersSnapshot.empty) {
        continue
      }

      for (const memberDoc of familyMembersSnapshot.docs) {
        const memberId = memberDoc.id
        const memberData = memberDoc.data()

        // Check if member already has family role set
        if (memberData.familyRole && memberData.managedBy && memberData.canBeEditedBy) {
          console.log(`  ✓ Family member ${memberId} already has role configured`)
          stats.familyMembersWithRoles++
          addAuditLog(stats, userId, 'FAMILY_MEMBER_HAS_ROLE', {
            patientId,
            memberId,
            familyRole: memberData.familyRole
          })
          continue
        }

        // Prepare update data
        const updates: Record<string, any> = {}

        if (!memberData.familyRole) {
          updates.familyRole = 'caregiver'
        }

        if (!memberData.managedBy) {
          updates.managedBy = userId
        }

        if (!memberData.canBeEditedBy) {
          updates.canBeEditedBy = [userId]
        }

        if (!memberData.roleAssignedAt) {
          updates.roleAssignedAt = now
        }

        if (!memberData.roleAssignedBy) {
          updates.roleAssignedBy = userId
        }

        // Skip if no updates needed
        if (Object.keys(updates).length === 0) {
          continue
        }

        if (dryRun) {
          console.log(`  [DRY RUN] Would update family member ${memberId} (patient: ${patientId}):`, updates)
          stats.familyMembersUpdated++
          addAuditLog(stats, userId, 'WOULD_UPDATE_FAMILY_MEMBER', {
            patientId,
            memberId,
            updates
          })
          familyMembersProcessed++
          continue
        }

        // Apply updates
        await db
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .collection('familyMembers')
          .doc(memberId)
          .update(updates)

        console.log(`  ✅ Updated family member ${memberId} (patient: ${patientId})`)
        stats.familyMembersUpdated++
        addAuditLog(stats, userId, 'UPDATE_FAMILY_MEMBER', {
          patientId,
          memberId,
          updates
        })
        familyMembersProcessed++
      }
    }

    if (familyMembersProcessed > 0) {
      console.log(`  Processed ${familyMembersProcessed} family members`)
    }
  } catch (error: any) {
    const errorMsg = `Failed to migrate family members for user ${userId}: ${error.message}`
    console.error(`❌ ${errorMsg}`)
    stats.errors.push(errorMsg)
  }
}

/**
 * Migrate a single user and their family members
 */
async function migrateUser(
  userId: string,
  dryRun: boolean,
  stats: MigrationStats
): Promise<void> {
  try {
    console.log(`\n📦 Processing user: ${userId}`)

    // Step 1: Migrate user to Account Owner
    const isAccountOwner = await migrateUserToAccountOwner(userId, dryRun, stats)

    if (!isAccountOwner) {
      // User doesn't have patients or migration failed
      stats.usersProcessed++
      return
    }

    // Step 2: Migrate family members
    await migrateFamilyMembers(userId, dryRun, stats)

    stats.usersProcessed++
    console.log(`✅ User ${userId} migration complete`)
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
    accountOwnersCreated: 0,
    existingAccountOwners: 0,
    usersWithoutPatients: 0,
    familyMembersUpdated: 0,
    familyMembersWithRoles: 0,
    errors: [],
    auditLog: []
  }

  console.log('\n🚀 Starting Account Owner migration...')
  console.log(`Mode: ${options.dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log('=' .repeat(60))

  if (options.userId) {
    console.log(`Target: Single user ${options.userId}`)
    await migrateUser(options.userId, options.dryRun, stats)
  } else {
    console.log('Target: All users')

    // Get all users
    const usersSnapshot = await db.collection('users').get()
    console.log(`Found ${usersSnapshot.docs.length} users to process`)

    for (const userDoc of usersSnapshot.docs) {
      await migrateUser(userDoc.id, options.dryRun, stats)
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Users processed: ${stats.usersProcessed}`)
  console.log(`New Account Owners: ${stats.accountOwnersCreated}`)
  console.log(`Existing Account Owners: ${stats.existingAccountOwners}`)
  console.log(`Users without patients (skipped): ${stats.usersWithoutPatients}`)
  console.log(`Family members updated: ${stats.familyMembersUpdated}`)
  console.log(`Family members with existing roles: ${stats.familyMembersWithRoles}`)

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors (${stats.errors.length}):`)
    stats.errors.forEach(err => console.log(`  - ${err}`))
  }

  // Save audit log (if not dry run)
  if (!options.dryRun && stats.auditLog.length > 0) {
    try {
      const auditLogPath = `audit_logs/account_owner_migration_${Date.now()}.json`
      const auditLogRef = db.collection('admin').doc('migrations').collection('audit_logs').doc()

      await auditLogRef.set({
        type: 'account_owner_migration',
        timestamp: new Date().toISOString(),
        stats: {
          usersProcessed: stats.usersProcessed,
          accountOwnersCreated: stats.accountOwnersCreated,
          existingAccountOwners: stats.existingAccountOwners,
          usersWithoutPatients: stats.usersWithoutPatients,
          familyMembersUpdated: stats.familyMembersUpdated,
          familyMembersWithRoles: stats.familyMembersWithRoles,
          errorCount: stats.errors.length
        },
        entries: stats.auditLog
      })

      console.log(`\n📋 Audit log saved to Firestore: ${auditLogRef.id}`)
    } catch (error) {
      console.error('\n⚠️  Failed to save audit log:', error)
    }
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
