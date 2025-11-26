/**
 * Data Migration Script: Medications from User Profile to Patient Records
 *
 * This script migrates medications from:
 *   users/{userId}/profile.medications[]
 * to:
 *   patients/{patientId}/medications/{medicationId}
 *
 * Strategy:
 * 1. For each user with medications in their profile:
 *    a. Get all their patient records
 *    b. For each medication:
 *       - If medication has patientName, find matching patient by name
 *       - If no patientName or no match, assign to first patient (primary patient)
 *       - Create medication document under that patient
 * 2. After successful migration, remove medications from user profile
 *
 * Usage:
 *   npx tsx scripts/migrate-medications-to-patients.ts [--dry-run]
 */

import { initializeApp, cert, ServiceAccount } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import * as fs from 'fs'
import * as path from 'path'

// Initialize Firebase Admin
const serviceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json')

if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ firebase-service-account.json not found')
  console.error('Please download it from Firebase Console → Project Settings → Service Accounts')
  process.exit(1)
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8')) as ServiceAccount

initializeApp({
  credential: cert(serviceAccount)
})

const db = getFirestore()

interface OldMedication {
  name: string
  brandName?: string
  strength: string
  dosageForm: string
  frequency?: string
  prescribedFor?: string
  patientName?: string
  rxcui?: string
  ndc?: string
  rxNumber?: string
  quantity?: string
  refills?: string
  fillDate?: string
  expirationDate?: string
  warnings?: string[]
  pharmacyName?: string
  pharmacyPhone?: string
  patientAddress?: string
  scannedAt: string
  drugClass?: string
}

interface PatientProfile {
  id: string
  userId: string
  name: string
  type: 'human' | 'pet'
}

const DRY_RUN = process.argv.includes('--dry-run')

console.log('\n🏥 Medication Migration Script')
console.log('================================\n')

if (DRY_RUN) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n')
}

async function migrate() {
  let totalUsers = 0
  let totalMedications = 0
  let totalMigrated = 0
  let totalErrors = 0

  try {
    // Get all users with medications
    const usersSnapshot = await db.collection('users').get()

    console.log(`Found ${usersSnapshot.size} users\n`)

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id
      const userData = userDoc.data()

      const medications = userData?.profile?.medications as OldMedication[] | undefined

      if (!medications || medications.length === 0) {
        continue
      }

      totalUsers++
      totalMedications += medications.length

      console.log(`\n📋 User: ${userData.email || userId}`)
      console.log(`   Medications: ${medications.length}`)

      // Get all patients for this user
      const patientsSnapshot = await db
        .collection('patients')
        .where('userId', '==', userId)
        .get()

      if (patientsSnapshot.empty) {
        console.log(`   ⚠️  No patients found - skipping`)
        totalErrors += medications.length
        continue
      }

      const patients: PatientProfile[] = patientsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PatientProfile[]

      console.log(`   Patients: ${patients.map(p => p.name).join(', ')}`)

      // Migrate each medication
      for (const med of medications) {
        try {
          // Find matching patient by name
          let targetPatient = patients[0] // Default to first patient

          if (med.patientName) {
            const matchedPatient = patients.find(p =>
              p.name.toLowerCase() === med.patientName!.toLowerCase() ||
              p.name.toLowerCase().includes(med.patientName!.toLowerCase())
            )
            if (matchedPatient) {
              targetPatient = matchedPatient
            }
          }

          console.log(`   → ${med.name} (${med.strength}) → ${targetPatient.name}`)

          if (!DRY_RUN) {
            const medicationRef = db
              .collection('patients')
              .doc(targetPatient.id)
              .collection('medications')
              .doc()

            const now = new Date()

            await medicationRef.set({
              id: medicationRef.id,
              patientId: targetPatient.id,
              userId: userId,
              name: med.name,
              brandName: med.brandName || null,
              strength: med.strength,
              dosageForm: med.dosageForm,
              frequency: med.frequency || null,
              prescribedFor: med.prescribedFor || null,
              rxcui: med.rxcui || null,
              ndc: med.ndc || null,
              drugClass: med.drugClass || null,
              rxNumber: med.rxNumber || null,
              quantity: med.quantity || null,
              refills: med.refills || null,
              fillDate: med.fillDate || null,
              expirationDate: med.expirationDate || null,
              warnings: med.warnings || null,
              pharmacyName: med.pharmacyName || null,
              pharmacyPhone: med.pharmacyPhone || null,
              addedAt: now,
              addedBy: userId,
              scannedAt: med.scannedAt || null,
              lastModified: now,
              notes: null
            })
          }

          totalMigrated++
        } catch (error: any) {
          console.log(`   ❌ Error: ${error.message}`)
          totalErrors++
        }
      }

      // Remove medications from user profile
      if (!DRY_RUN) {
        await userDoc.ref.update({
          'profile.medications': []
        })
        console.log(`   ✅ Cleared medications from user profile`)
      }
    }

    // Print summary
    console.log('\n\n📊 Migration Summary')
    console.log('====================')
    console.log(`Users with medications: ${totalUsers}`)
    console.log(`Total medications found: ${totalMedications}`)
    console.log(`Successfully migrated: ${totalMigrated}`)
    console.log(`Errors: ${totalErrors}`)

    if (DRY_RUN) {
      console.log('\n✅ Dry run complete - no changes made')
      console.log('Run without --dry-run to apply changes')
    } else {
      console.log('\n✅ Migration complete!')
    }
  } catch (error: any) {
    console.error('\n❌ Migration failed:', error.message)
    process.exit(1)
  }
}

migrate()
