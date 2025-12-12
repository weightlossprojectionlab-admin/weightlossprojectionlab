/**
 * Check Family Structure for Account Owner
 */

import { adminDb } from '../lib/firebase-admin'

const USER_ID = 'wDwaRmR3nKXNVmNy8YeF249bChG3'

async function checkFamilyStructure() {
  try {
    console.log(`Checking family structure for user: ${USER_ID}\n`)

    // Check patients (family members this user manages)
    const patientsSnapshot = await adminDb
      .collection('users')
      .doc(USER_ID)
      .collection('patients')
      .get()

    console.log(`📋 Patients (Family Members): ${patientsSnapshot.size}`)
    patientsSnapshot.forEach((doc) => {
      const patient = doc.data()
      console.log(`  - ${patient.name} (${patient.relationship})`)
    })

    // Check family members (caregivers helping this user)
    const familyMembersSnapshot = await adminDb
      .collection('users')
      .doc(USER_ID)
      .collection('familyMembers')
      .get()

    console.log(`\n👥 Family Members (Caregivers): ${familyMembersSnapshot.size}`)
    familyMembersSnapshot.forEach((doc) => {
      const member = doc.data()
      console.log(`  - ${member.name} (${member.email}) - Role: ${member.familyRole || 'N/A'}`)
      console.log(`    Permissions:`, Object.entries(member.permissions || {})
        .filter(([_, v]) => v)
        .map(([k, _]) => k)
        .join(', '))
    })

    // Check if this user is a caregiver for anyone else
    const userDoc = await adminDb.collection('users').doc(USER_ID).get()
    const userData = userDoc.data()

    if (userData?.caregiverOf && userData.caregiverOf.length > 0) {
      console.log(`\n🏥 Caregiver For: ${userData.caregiverOf.length} accounts`)
      userData.caregiverOf.forEach((ctx: any) => {
        console.log(`  - ${ctx.accountOwnerName}'s family`)
      })
    } else {
      console.log(`\n🏥 Caregiver For: None (This is a standalone account owner)`)
    }

    console.log(`\n✅ Analysis complete`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  }
}

checkFamilyStructure()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
