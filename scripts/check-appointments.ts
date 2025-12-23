/**
 * Check appointments for a user
 */

import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(__dirname, '../.env.local') })

import { adminDb } from '../lib/firebase-admin'

async function checkAppointments() {
  const userId = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2' // Percy's user ID

  console.log('📅 Checking appointments in multiple locations...\n')

  // Check top-level appointments collection
  console.log('1️⃣ Checking top-level appointments collection...')
  const appointmentsSnapshot = await adminDb
    .collection('appointments')
    .where('userId', '==', userId)
    .get()

  console.log(`   Found: ${appointmentsSnapshot.size} appointments\n`)

  // Check if appointments are stored per patient
  console.log('2️⃣ Checking patient subcollections...')
  const patientsSnapshot = await adminDb
    .collection('users')
    .doc(userId)
    .collection('patients')
    .get()

  console.log(`   Found ${patientsSnapshot.size} patients\n`)

  for (const patientDoc of patientsSnapshot.docs) {
    const patientData = patientDoc.data()
    const appointmentsInPatient = await adminDb
      .collection('users')
      .doc(userId)
      .collection('patients')
      .doc(patientDoc.id)
      .collection('appointments')
      .get()

    if (appointmentsInPatient.size > 0) {
      console.log(`   Patient ${patientData.name}: ${appointmentsInPatient.size} appointments`)
    }
  }

  console.log(`\n3️⃣ Checking all appointments (no filter)...`)
  const allAppointments = await adminDb.collection('appointments').get()
  console.log(`   Total appointments in database: ${allAppointments.size}\n`)

  console.log(`Total appointments with userId filter: ${appointmentsSnapshot.size}\n`)

  const now = new Date()
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  appointmentsSnapshot.docs.forEach((doc) => {
    const data = doc.data()
    const appointmentDate = new Date(data.dateTime)
    const isUpcoming = appointmentDate >= now && appointmentDate <= in30Days

    console.log(`📋 Appointment:`)
    console.log(`   ID: ${doc.id}`)
    console.log(`   Patient: ${data.patientName}`)
    console.log(`   Provider: ${data.providerName}`)
    console.log(`   DateTime: ${data.dateTime}`)
    console.log(`   Parsed Date: ${appointmentDate.toLocaleString()}`)
    console.log(`   Is Future: ${appointmentDate >= now}`)
    console.log(`   Within 30 days: ${appointmentDate <= in30Days}`)
    console.log(`   ✅ Upcoming: ${isUpcoming}`)
    console.log()
  })

  console.log(`📊 Summary:`)
  console.log(`   Now: ${now.toISOString()}`)
  console.log(`   30 days from now: ${in30Days.toISOString()}`)
}

checkAppointments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Error:', error)
    process.exit(1)
  })
