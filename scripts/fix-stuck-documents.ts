/**
 * Fix Stuck Documents Script
 *
 * Finds documents stuck in "processing" status for more than 5 minutes
 * and marks them as "failed" so users can retry OCR extraction
 */

import { adminDb } from '../lib/firebase-admin'

async function fixStuckDocuments() {
  console.log('🔍 Searching for stuck documents...')

  try {
    // Get all users
    const usersSnapshot = await adminDb.collection('users').get()

    let totalFixed = 0
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id

      // Get all patients for this user
      const patientsSnapshot = await adminDb
        .collection('users')
        .doc(userId)
        .collection('patients')
        .get()

      for (const patientDoc of patientsSnapshot.docs) {
        const patientId = patientDoc.id

        // Get documents stuck in processing
        const documentsSnapshot = await adminDb
          .collection('users')
          .doc(userId)
          .collection('patients')
          .doc(patientId)
          .collection('documents')
          .where('ocrStatus', '==', 'processing')
          .get()

        for (const doc of documentsSnapshot.docs) {
          const data = doc.data()
          const updatedAt = data.updatedAt ? new Date(data.updatedAt) : new Date(0)

          // If document has been processing for more than 5 minutes, mark as failed
          if (updatedAt < fiveMinutesAgo) {
            console.log(`  ⚠️  Found stuck document: ${doc.id} (patient: ${data.name || 'unnamed'})`)
            console.log(`      Stuck since: ${updatedAt.toLocaleString()}`)

            await doc.ref.update({
              ocrStatus: 'failed',
              ocrError: 'Processing timeout - please retry',
              updatedAt: new Date().toISOString()
            })

            totalFixed++
            console.log(`  ✅ Marked as failed - user can now retry`)
          }
        }
      }
    }

    console.log(`\n✨ Fixed ${totalFixed} stuck document(s)`)

    if (totalFixed === 0) {
      console.log('✅ No stuck documents found')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing stuck documents:', error)
    process.exit(1)
  }
}

// Run the script
fixStuckDocuments()
