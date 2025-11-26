import * as admin from 'firebase-admin'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, '\n')
    })
  })
}

const db = admin.firestore()

async function checkWeightLogs() {
  const patientId = '5a53d109-b19b-4c20-8237-0156f0809b28'
  const userId = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2'
  
  console.log(`\nChecking weight logs for patient: ${patientId}\n`)
  
  // Check weight-logs collection
  const weightLogsRef = db
    .collection('users')
    .doc(userId)
    .collection('patients')
    .doc(patientId)
    .collection('weight-logs')
  
  const snapshot = await weightLogsRef.orderBy('loggedAt', 'desc').limit(10).get()
  
  console.log(`Found ${snapshot.size} weight logs\n`)
  
  snapshot.docs.forEach((doc, index) => {
    console.log(`Weight Log ${index + 1}:`)
    console.log(`  ID: ${doc.id}`)
    console.log(`  Data:`, JSON.stringify(doc.data(), null, 2))
    console.log()
  })
  
  // Also check vitals collection for weight type
  const vitalsRef = db
    .collection('users')
    .doc(userId)
    .collection('patients')
    .doc(patientId)
    .collection('vitals')
  
  const vitalsSnapshot = await vitalsRef.where('type', '==', 'weight').orderBy('recordedAt', 'desc').limit(10).get()
  
  console.log(`\nFound ${vitalsSnapshot.size} weight vitals\n`)
  
  vitalsSnapshot.docs.forEach((doc, index) => {
    console.log(`Weight Vital ${index + 1}:`)
    console.log(`  ID: ${doc.id}`)
    console.log(`  Data:`, JSON.stringify(doc.data(), null, 2))
    console.log()
  })
}

checkWeightLogs().then(() => {
  console.log('Done!')
  process.exit(0)
}).catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
