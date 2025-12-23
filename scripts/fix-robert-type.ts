/**
 * Fix Robert Edmonds patient type from 'pet' to 'human'
 *
 * Usage: npx tsx scripts/fix-robert-type.ts
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { adminDb } from '../lib/firebase-admin'

async function fixRobertType() {
  console.log('🔍 Searching for Robert Edmonds...')

  // Search across all users' patients
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

        console.log(`\n📋 Found Robert Edmonds:`)
        console.log(`   Patient ID: ${patientDoc.id}`)
        console.log(`   User ID: ${userDoc.id}`)
        console.log(`   Current Type: ${patientData.type}`)
        console.log(`   Relationship: ${patientData.relationship}`)

        if (patientData.type === 'pet' || patientData.type === undefined || patientData.type === null) {
          console.log(`\n🔧 Updating type from '${patientData.type}' to 'human'...`)

          await adminDb
            .collection('users')
            .doc(userDoc.id)
            .collection('patients')
            .doc(patientDoc.id)
            .update({
              type: 'human',
              lastModified: new Date().toISOString()
            })

          console.log('✅ Successfully updated Robert Edmonds to type: human')
        } else if (patientData.type === 'human') {
          console.log(`ℹ️  Type is already 'human', no update needed`)
        } else {
          console.log(`⚠️  Type is '${patientData.type}', which is unexpected`)
        }
      }
    }
  }

  console.log('\n✨ Done!')
}

fixRobertType()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
