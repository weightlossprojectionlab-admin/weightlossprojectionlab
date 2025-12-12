/**
 * Find correct account owner by email
 */

import { adminAuth, adminDb } from '../lib/firebase-admin'

async function findOwner() {
  try {
    console.log('Searching for weightlossprojectionlab@gmail.com...\n')

    // Try to find by email in Auth
    try {
      const userRecord = await adminAuth.getUserByEmail('weightlossprojectionlab@gmail.com')
      console.log('✅ Found in Firebase Auth:')
      console.log(`   User ID: ${userRecord.uid}`)
      console.log(`   Email: ${userRecord.email}`)
      console.log(`   Display Name: ${userRecord.displayName || 'N/A'}`)

      // Check Firestore
      const userDoc = await adminDb.collection('users').doc(userRecord.uid).get()
      if (userDoc.exists) {
        const userData = userDoc.data()
        console.log('\n✅ Firestore data exists:')
        console.log(`   Name: ${userData?.name || 'N/A'}`)
        console.log(`   Email: ${userData?.email || 'N/A'}`)

        // Check patients
        const patientsSnapshot = await adminDb
          .collection('users')
          .doc(userRecord.uid)
          .collection('patients')
          .get()

        console.log(`\n📋 Patients: ${patientsSnapshot.size}`)
        patientsSnapshot.forEach((doc) => {
          const patient = doc.data()
          console.log(`   - ${patient.name} (${patient.relationship || 'N/A'})`)
          console.log(`     ID: ${doc.id}`)
        })
      }

      return userRecord.uid

    } catch (error: any) {
      if (error.code === 'auth/user-not-found') {
        console.log('❌ Email not found in Firebase Auth')

        // Search Firestore directly
        console.log('\nSearching Firestore users collection...')
        const usersSnapshot = await adminDb.collection('users').get()

        for (const doc of usersSnapshot.docs) {
          const data = doc.data()
          if (data.email === 'weightlossprojectionlab@gmail.com') {
            console.log('\n✅ Found in Firestore:')
            console.log(`   User ID: ${doc.id}`)
            console.log(`   Email: ${data.email}`)
            console.log(`   Name: ${data.name || 'N/A'}`)
            return doc.id
          }
        }

        console.log('❌ Not found in Firestore either')
      } else {
        throw error
      }
    }

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

findOwner()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
