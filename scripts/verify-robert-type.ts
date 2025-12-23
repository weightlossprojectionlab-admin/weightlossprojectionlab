/**
 * Verify Robert Edmonds patient type
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { adminDb } from '../lib/firebase-admin'

async function verifyRobertType() {
  console.log('🔍 Checking Robert Edmonds current type...\n')

  const usersSnapshot = await adminDb.collection('users').get()

  for (const userDoc of usersSnapshot.docs) {
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(userDoc.id)
      .collection('patients')
      .where('name', '==', 'Robert Edmonds')
      .get()

    if (!patientsSnapshot.empty) {
      for (const patientDoc of patientsSnapshot.docs) {
        const patientData = patientDoc.data()

        console.log(`📋 Robert Edmonds:`)
        console.log(`   Patient ID: ${patientDoc.id}`)
        console.log(`   Type: ${patientData.type}`)
        console.log(`   Relationship: ${patientData.relationship}`)
        console.log(`   Last Modified: ${patientData.lastModified}`)
      }
    }
  }
}

verifyRobertType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
