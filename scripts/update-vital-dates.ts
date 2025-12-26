/**
 * Script to update vital dates for test user
 * Fixes timezone issues by updating recordedAt timestamps
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// Initialize Firebase Admin
if (getApps().length === 0) {
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY

  if (!privateKey) {
    throw new Error('FIREBASE_ADMIN_PRIVATE_KEY environment variable is not set')
  }

  // Remove quotes if present
  privateKey = privateKey.replace(/^["']|["']$/g, '')

  // Replace escaped newlines with actual newlines
  privateKey = privateKey.replace(/\\n/g, '\n')

  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_ADMIN_CLIENT_EMAIL) {
    throw new Error('Missing required environment variables')
  }

  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      privateKey: privateKey
    })
  })
}

const db = getFirestore()

async function updateVitalDates() {
  try {
    console.log('🔍 Searching for users with "weightloss" in email...')

    // Get all users and filter
    const usersSnapshot = await db.collection('users').get()

    console.log(`📊 Total users: ${usersSnapshot.size}`)

    const matchingUsers = usersSnapshot.docs.filter(doc => {
      const data = doc.data()
      return data.email?.toLowerCase().includes('weightloss')
    })

    console.log(`📊 Found ${matchingUsers.length} users with "weightloss" in email`)

    matchingUsers.forEach(doc => {
      const data = doc.data()
      console.log(`  - ${doc.id}: ${data.email}`)
    })

    if (matchingUsers.length === 0) {
      console.log('❌ No matching users found')
      return
    }

    const userId = matchingUsers[0].id
    const userEmail = matchingUsers[0].data().email
    console.log(`\n✅ Using user: ${userId} (${userEmail})`)

    // Find patients for this user
    console.log('🔍 Finding patients...')
    const patientsSnapshot = await db.collection('patients')
      .where('userId', '==', userId)
      .get()

    console.log(`📊 Found ${patientsSnapshot.size} patients`)

    if (patientsSnapshot.empty) {
      console.log('❌ No patients found')
      return
    }

    const patientIds: string[] = []
    patientsSnapshot.forEach(doc => {
      const data = doc.data()
      patientIds.push(doc.id)
      console.log(`  - ${doc.id}: ${data.name}`)
    })

    // Find vitals for these patients from last 48 hours
    console.log('\n🔍 Finding recent vitals for these patients...')
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const vitalsRef = db.collection('vitals')
    const vitalsSnapshot = await vitalsRef
      .where('recordedAt', '>=', Timestamp.fromDate(twoDaysAgo))
      .get()

    // Filter for our patients
    const relevantVitals = vitalsSnapshot.docs.filter(doc =>
      patientIds.includes(doc.data().patientId)
    )

    console.log(`📊 Found ${relevantVitals.length} vitals in last 48 hours`)

    if (relevantVitals.length === 0) {
      console.log('❌ No recent vitals to update')
      return
    }

    // Show them
    relevantVitals.forEach(doc => {
      const data = doc.data()
      const date = data.recordedAt?.toDate()
      console.log(`  - ${doc.id}: ${data.type} for patient ${data.patientId}`)
      console.log(`    Recorded: ${date?.toISOString()} (${date?.toLocaleString()})`)
    })

    // Update each vital to use current time today (noon)
    const today = new Date()
    const noonToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0)

    console.log(`\n📅 Updating all to: ${noonToday.toISOString()} (${noonToday.toLocaleString()})`)

    const batch = db.batch()
    let count = 0

    relevantVitals.forEach(doc => {
      batch.update(doc.ref, {
        recordedAt: Timestamp.fromDate(noonToday)
      })
      count++
    })

    console.log(`💾 Committing batch update for ${count} vitals...`)
    await batch.commit()

    console.log('✅ All vitals updated successfully!')
    console.log(`📅 New date: ${noonToday.toLocaleDateString()} ${noonToday.toLocaleTimeString()}`)

  } catch (error) {
    console.error('❌ Error updating vitals:', error)
    throw error
  }
}

// Run the script
updateVitalDates()
  .then(() => {
    console.log('\n🎉 Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })
