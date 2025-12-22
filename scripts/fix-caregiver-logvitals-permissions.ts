/**
 * Migration Script: Fix Caregiver logVitals Permissions
 *
 * PROBLEM:
 * - Caregivers were created with logVitals: false due to schema defaults
 * - This blocks them from basic caregiving functionality
 *
 * SOLUTION:
 * - Query all family members with familyRole === 'caregiver'
 * - Update permissions.logVitals = true for all caregivers
 * - Update both account-level and patient-level family member records
 *
 * USAGE:
 *   npx tsx scripts/fix-caregiver-logvitals-permissions.ts [--dry-run]
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  })
}

const db = getFirestore()

interface MigrationStats {
  accountOwnersChecked: number
  caregiversFound: number
  caregiversAlreadyFixed: number
  caregiversUpdated: number
  patientRecordsUpdated: number
  errors: Array<{ memberId: string; error: string }>
}

async function fixCaregiversInAccount(
  accountOwnerId: string,
  dryRun: boolean = false
): Promise<MigrationStats> {
  const stats: MigrationStats = {
    accountOwnersChecked: 1,
    caregiversFound: 0,
    caregiversAlreadyFixed: 0,
    caregiversUpdated: 0,
    patientRecordsUpdated: 0,
    errors: []
  }

  console.log(`\n📂 Checking account: ${accountOwnerId}`)

  try {
    // Get all family members for this account
    const familyMembersSnapshot = await db
      .collection('users')
      .doc(accountOwnerId)
      .collection('familyMembers')
      .get()

    for (const memberDoc of familyMembersSnapshot.docs) {
      const member = memberDoc.data()
      const memberId = memberDoc.id

      // Only process caregivers
      if (member.familyRole !== 'caregiver') {
        continue
      }

      stats.caregiversFound++

      // Check if already has logVitals: true
      if (member.permissions?.logVitals === true) {
        console.log(`  ✓ ${member.name} (${member.email}) already has logVitals: true`)
        stats.caregiversAlreadyFixed++
        continue
      }

      console.log(`  ❌ ${member.name} (${member.email}) has logVitals: ${member.permissions?.logVitals}`)

      if (!dryRun) {
        try {
          // Update account-level family member record
          await memberDoc.ref.update({
            'permissions.logVitals': true,
            lastModified: new Date().toISOString()
          })
          stats.caregiversUpdated++
          console.log(`  ✅ Updated account-level record for ${member.name}`)

          // Update all patient-level family member records
          const patientsAccess = member.patientsAccess || []
          for (const patientId of patientsAccess) {
            try {
              const patientFamilyMemberRef = db
                .collection('users')
                .doc(accountOwnerId)
                .collection('patients')
                .doc(patientId)
                .collection('familyMembers')
                .doc(memberId)

              const patientFamilyDoc = await patientFamilyMemberRef.get()
              if (patientFamilyDoc.exists) {
                await patientFamilyMemberRef.update({
                  'permissions.logVitals': true,
                  lastModified: new Date().toISOString()
                })
                stats.patientRecordsUpdated++
                console.log(`    ✅ Updated patient-level record for patient ${patientId}`)
              }
            } catch (patientError: any) {
              console.error(`    ⚠️ Failed to update patient ${patientId}:`, patientError.message)
            }
          }
        } catch (error: any) {
          console.error(`  ⚠️ Failed to update ${member.name}:`, error.message)
          stats.errors.push({ memberId, error: error.message })
        }
      } else {
        console.log(`  🔄 [DRY RUN] Would update ${member.name}`)
        stats.caregiversUpdated++
      }
    }
  } catch (error: any) {
    console.error(`❌ Error processing account ${accountOwnerId}:`, error.message)
    stats.errors.push({ memberId: accountOwnerId, error: error.message })
  }

  return stats
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('🔧 Fix Caregiver logVitals Permissions Migration')
  console.log('================================================\n')

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n')
  } else {
    console.log('⚠️  LIVE MODE - Changes will be written to database\n')
  }

  const globalStats: MigrationStats = {
    accountOwnersChecked: 0,
    caregiversFound: 0,
    caregiversAlreadyFixed: 0,
    caregiversUpdated: 0,
    patientRecordsUpdated: 0,
    errors: []
  }

  try {
    // Get all users who are account owners
    const usersSnapshot = await db
      .collection('users')
      .where('preferences.isAccountOwner', '==', true)
      .get()

    console.log(`Found ${usersSnapshot.size} account owners to check\n`)

    for (const userDoc of usersSnapshot.docs) {
      const accountStats = await fixCaregiversInAccount(userDoc.id, dryRun)

      // Aggregate stats
      globalStats.accountOwnersChecked += accountStats.accountOwnersChecked
      globalStats.caregiversFound += accountStats.caregiversFound
      globalStats.caregiversAlreadyFixed += accountStats.caregiversAlreadyFixed
      globalStats.caregiversUpdated += accountStats.caregiversUpdated
      globalStats.patientRecordsUpdated += accountStats.patientRecordsUpdated
      globalStats.errors.push(...accountStats.errors)
    }

    // Print summary
    console.log('\n================================================')
    console.log('📊 MIGRATION SUMMARY')
    console.log('================================================')
    console.log(`Account Owners Checked:      ${globalStats.accountOwnersChecked}`)
    console.log(`Caregivers Found:            ${globalStats.caregiversFound}`)
    console.log(`Already Fixed:               ${globalStats.caregiversAlreadyFixed}`)
    console.log(`Updated:                     ${globalStats.caregiversUpdated}`)
    console.log(`Patient Records Updated:     ${globalStats.patientRecordsUpdated}`)
    console.log(`Errors:                      ${globalStats.errors.length}`)

    if (globalStats.errors.length > 0) {
      console.log('\n❌ ERRORS:')
      globalStats.errors.forEach(({ memberId, error }) => {
        console.log(`  - ${memberId}: ${error}`)
      })
    }

    if (dryRun) {
      console.log('\n🔍 DRY RUN COMPLETE - Run without --dry-run to apply changes')
    } else {
      console.log('\n✅ MIGRATION COMPLETE')
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR:', error)
    process.exit(1)
  }
}

main()
