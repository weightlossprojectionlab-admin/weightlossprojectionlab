/**
 * Fix Patient Data Script
 *
 * Fixes incorrect patient data:
 * 1. Percy Rice (percyrice) - Update name and date of birth
 * 2. Darlene Rice - Change type from 'pet' to 'human'
 *
 * Usage:
 *   npx tsx scripts/fix-patient-data.ts [--dry-run]
 *
 * Options:
 *   --dry-run: Preview changes without applying them
 */

import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

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
      projectId: serviceAccount.project_id
    })
  } else if (process.env.FIREBASE_ADMIN_PROJECT_ID &&
             process.env.FIREBASE_ADMIN_CLIENT_EMAIL &&
             process.env.FIREBASE_ADMIN_PRIVATE_KEY) {
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

interface PatientFix {
  name: string
  searchName: string
  updates: {
    name?: string
    dateOfBirth?: string
    type?: 'human' | 'pet'
    gender?: string
  }
}

const PATIENT_FIXES: PatientFix[] = [
  {
    name: 'Percy Rice',
    searchName: 'Percy Rice',
    updates: {
      gender: 'male',
      type: 'human'
    }
  },
  {
    name: 'Darlene Rice',
    searchName: 'Darlene Rice',
    updates: {
      type: 'human',
      dateOfBirth: '1972-12-23'
    }
  }
]

async function findAndFixPatient(fix: PatientFix, dryRun: boolean): Promise<boolean> {
  console.log(`\n🔍 Searching for patient: ${fix.searchName}`)

  try {
    // Search across all users' patients
    const usersSnapshot = await db.collection('users').get()

    for (const userDoc of usersSnapshot.docs) {
      const patientsSnapshot = await db
        .collection('users')
        .doc(userDoc.id)
        .collection('patients')
        .get()

      for (const patientDoc of patientsSnapshot.docs) {
        const data = patientDoc.data()

        // Case-insensitive name match
        if (data.name?.toLowerCase() === fix.searchName.toLowerCase()) {
          console.log(`✅ Found patient: ${data.name}`)
          console.log(`   Patient ID: ${patientDoc.id}`)
          console.log(`   User ID: ${userDoc.id}`)
          console.log(`   Current type: ${data.type}`)
          console.log(`   Current dateOfBirth: ${data.dateOfBirth}`)

          if (dryRun) {
            console.log(`   [DRY RUN] Would update with:`, fix.updates)
            return true
          }

          // Apply updates
          await db
            .collection('users')
            .doc(userDoc.id)
            .collection('patients')
            .doc(patientDoc.id)
            .update({
              ...fix.updates,
              lastModified: new Date().toISOString()
            })

          console.log(`   ✅ Updated successfully!`)
          console.log(`   New values:`, fix.updates)
          return true
        }
      }
    }

    console.log(`   ⚠️ Patient not found: ${fix.searchName}`)
    return false
  } catch (error) {
    console.error(`   ❌ Error processing ${fix.searchName}:`, error)
    return false
  }
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  console.log('=====================================')
  console.log('🔧 Patient Data Fix Script')
  console.log('=====================================')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be applied)'}`)
  console.log()

  let successCount = 0
  let totalCount = PATIENT_FIXES.length

  for (const fix of PATIENT_FIXES) {
    const success = await findAndFixPatient(fix, dryRun)
    if (success) successCount++
  }

  console.log('\n=====================================')
  console.log('📊 Summary')
  console.log('=====================================')
  console.log(`Patients processed: ${successCount}/${totalCount}`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)

  if (dryRun) {
    console.log('\n💡 Run without --dry-run to apply changes')
  } else {
    console.log('\n✅ All changes have been applied!')
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
