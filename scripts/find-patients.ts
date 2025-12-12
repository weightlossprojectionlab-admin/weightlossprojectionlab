/**
 * Find Barbara Rice and Darlene Rice patients
 */

import { adminDb } from '../lib/firebase-admin'

async function findPatients() {
  try {
    console.log('Searching for patients: Barbara Rice and Darlene Rice\n')

    // Search all users' patient collections
    const usersSnapshot = await adminDb.collection('users').get()

    for (const userDoc of usersSnapshot.docs) {
      const patientsSnapshot = await adminDb
        .collection('users')
        .doc(userDoc.id)
        .collection('patients')
        .get()

      const matchingPatients: any[] = []

      patientsSnapshot.forEach((patientDoc) => {
        const patient = patientDoc.data()
        if (patient.name === 'Barbara Rice' || patient.name === 'Darlene Rice') {
          matchingPatients.push({
            id: patientDoc.id,
            ...patient
          })
        }
      })

      if (matchingPatients.length > 0) {
        console.log(`✅ Found ${matchingPatients.length} matching patient(s) under account owner:`)
        console.log(`   User ID: ${userDoc.id}`)

        const ownerData = userDoc.data()
        console.log(`   Name: ${ownerData.name || 'N/A'}`)
        console.log(`   Email: ${ownerData.email || 'N/A'}`)
        console.log('\n   Patients:')

        matchingPatients.forEach((patient) => {
          console.log(`   - ${patient.name} (${patient.relationship || 'N/A'})`)
          console.log(`     Patient ID: ${patient.id}`)
        })
        console.log('\n' + '='.repeat(60) + '\n')
      }
    }

    console.log('Search complete')

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

findPatients()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
