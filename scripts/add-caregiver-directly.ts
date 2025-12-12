/**
 * Add Darlene Rice as Caregiver Directly
 *
 * Bypasses invitation flow and directly adds as accepted caregiver
 */

import { adminDb } from '../lib/firebase-admin'

const ACCOUNT_OWNER_ID = 'Y8wSTgymg3YXWU94iJVjzoGxsMI2' // weiweightlossprojectionlab@gmail.com
const ACCOUNT_OWNER_EMAIL = 'weiweightlossprojectionlab@gmail.com'
const CAREGIVER_USER_ID = 'wDwaRmR3nKXNVmNy8YeF249bChG3' // Darlene Rice
const CAREGIVER_EMAIL = 'Drice881@gmail.com'
const CAREGIVER_NAME = 'Darlene Rice'

const PATIENT_IDS = [
  '5a53d109-b19b-4c20-8237-0156f0809b28', // Barbara Rice
  'ok9MHMqXskQPV83Na0PU' // Darlene Rice (patient)
]

async function addCaregiverDirectly() {
  try {
    console.log('Adding Darlene Rice as caregiver...\n')

    const acceptedAt = new Date().toISOString()

    // Full permissions
    const fullPermissions = {
      viewRecords: true,
      editRecords: true,
      viewVitals: true,
      editVitals: true,
      viewMedications: true,
      editMedications: true,
      viewAppointments: true,
      editAppointments: true,
      viewDocuments: true,
      uploadDocuments: true,
      manageFamily: true,
      viewBilling: true
    }

    // 1. Create family member record in account owner's familyMembers collection
    const familyMemberData = {
      userId: CAREGIVER_USER_ID,
      email: CAREGIVER_EMAIL,
      name: CAREGIVER_NAME,
      relationship: 'family',
      invitedBy: ACCOUNT_OWNER_ID,
      invitedAt: acceptedAt,
      acceptedAt,
      status: 'accepted',
      permissions: fullPermissions,
      notificationPreferences: {
        appointmentReminders: true,
        appointmentUpdates: true,
        vitalAlerts: true,
        medicationReminders: true,
        documentUploads: true,
        aiRecommendations: true,
        chatMessages: true,
        urgentAlerts: true,
        driverAssignmentNotifications: true,
        driverReminderDaysBefore: [7, 3, 1]
      },
      patientsAccess: PATIENT_IDS,
      lastActive: acceptedAt,
      familyRole: 'caregiver',
      managedBy: ACCOUNT_OWNER_ID,
      canBeEditedBy: [ACCOUNT_OWNER_ID],
      roleAssignedAt: acceptedAt,
      roleAssignedBy: ACCOUNT_OWNER_ID
    }

    const memberRef = await adminDb
      .collection('users')
      .doc(ACCOUNT_OWNER_ID)
      .collection('familyMembers')
      .add(familyMemberData)

    console.log(`✅ Created family member record: ${memberRef.id}`)

    // 2. Create patient-level family member records
    const batch = adminDb.batch()

    for (const patientId of PATIENT_IDS) {
      const patientFamilyMemberRef = adminDb
        .collection('users')
        .doc(ACCOUNT_OWNER_ID)
        .collection('patients')
        .doc(patientId)
        .collection('familyMembers')
        .doc(memberRef.id)

      batch.set(patientFamilyMemberRef, {
        userId: CAREGIVER_USER_ID,
        email: CAREGIVER_EMAIL,
        name: CAREGIVER_NAME,
        relationship: 'family',
        permissions: fullPermissions,
        status: 'accepted',
        addedAt: acceptedAt,
        addedBy: ACCOUNT_OWNER_ID,
        lastModified: acceptedAt
      })
    }

    await batch.commit()
    console.log(`✅ Created ${PATIENT_IDS.length} patient-level family member records`)

    // 3. Add caregiverOf context to Darlene's user profile
    const caregiverUserRef = adminDb.collection('users').doc(CAREGIVER_USER_ID)
    const caregiverDoc = await caregiverUserRef.get()
    const caregiverData = caregiverDoc.data()

    // Get account owner name
    const ownerDoc = await adminDb.collection('users').doc(ACCOUNT_OWNER_ID).get()
    const ownerData = ownerDoc.data()
    const ownerName = ownerData?.name || ownerData?.displayName || ACCOUNT_OWNER_EMAIL

    const caregiverContext = {
      accountOwnerId: ACCOUNT_OWNER_ID,
      accountOwnerName: ownerName,
      accountOwnerEmail: ACCOUNT_OWNER_EMAIL,
      role: 'caregiver',
      patientsAccess: PATIENT_IDS,
      permissions: fullPermissions,
      addedAt: acceptedAt,
      familyPlan: true
    }

    const existingCaregiverOf = caregiverData?.caregiverOf || []

    await caregiverUserRef.set({
      caregiverOf: [...existingCaregiverOf, caregiverContext]
    }, { merge: true })

    console.log(`✅ Added caregiverOf context to Darlene's profile`)

    console.log('\n' + '='.repeat(60))
    console.log('✅ SUCCESS!')
    console.log('='.repeat(60))
    console.log(`\nDarlene Rice (${CAREGIVER_EMAIL}) is now a caregiver for:`)
    console.log(`  Account Owner: ${ownerName} (${ACCOUNT_OWNER_EMAIL})`)
    console.log(`  Patients: ${PATIENT_IDS.length}`)
    console.log(`    - Barbara Rice`)
    console.log(`    - Darlene Rice`)
    console.log(`\nPermissions: FULL ACCESS (all permissions granted)`)
    console.log(`\nDarlene can now:`)
    console.log(`  - View at: /caregiver/${ACCOUNT_OWNER_ID}`)
    console.log(`  - Access patient records`)
    console.log(`  - Manage medications, appointments, vitals, etc.`)

  } catch (error) {
    console.error('\n❌ Error:', error)
    throw error
  }
}

addCaregiverDirectly()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
