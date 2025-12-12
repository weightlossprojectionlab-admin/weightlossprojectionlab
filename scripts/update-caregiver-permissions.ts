/**
 * Update Caregiver Account with Full Permissions
 *
 * This script updates a specific user account to have full caregiver/family member permissions
 */

import { adminDb } from '../lib/firebase-admin'

const USER_ID = 'wDwaRmR3nKXNVmNy8YeF249bChG3'

async function updateCaregiverPermissions() {
  try {
    console.log(`Updating user: ${USER_ID}`)

    // Get current user data
    const userRef = adminDb.collection('users').doc(USER_ID)
    const userDoc = await userRef.get()

    if (!userDoc.exists) {
      console.error('❌ User document not found')
      return
    }

    const userData = userDoc.data()
    console.log('\n📋 Current user data:')
    console.log(JSON.stringify(userData, null, 2))

    // Full permissions object
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

    // Check if user has caregiverOf array
    if (userData?.caregiverOf && Array.isArray(userData.caregiverOf) && userData.caregiverOf.length > 0) {
      console.log('\n✅ User has caregiverOf contexts')

      // Update permissions for all caregiver contexts
      const updatedCaregiverOf = userData.caregiverOf.map((context: any) => {
        console.log(`  - Updating permissions for account: ${context.accountOwnerName}`)
        return {
          ...context,
          permissions: fullPermissions
        }
      })

      await userRef.update({
        caregiverOf: updatedCaregiverOf
      })

      console.log('\n✅ Updated caregiverOf contexts with full permissions')

      // Also need to update the family member records in each account owner's collection
      for (const context of userData.caregiverOf) {
        const accountOwnerId = context.accountOwnerId

        // Find the family member record
        const familyMembersSnapshot = await adminDb
          .collection('users')
          .doc(accountOwnerId)
          .collection('familyMembers')
          .where('userId', '==', USER_ID)
          .get()

        if (!familyMembersSnapshot.empty) {
          const memberDoc = familyMembersSnapshot.docs[0]
          await memberDoc.ref.update({
            permissions: fullPermissions
          })
          console.log(`  ✅ Updated family member record in ${context.accountOwnerName}'s account`)

          // Also update patient-level family member records
          const patientsAccess = context.patientsAccess || []
          for (const patientId of patientsAccess) {
            const patientFamilyMemberRef = adminDb
              .collection('users')
              .doc(accountOwnerId)
              .collection('patients')
              .doc(patientId)
              .collection('familyMembers')
              .doc(memberDoc.id)

            await patientFamilyMemberRef.set({
              userId: USER_ID,
              email: userData.email || '',
              name: userData.displayName || userData.name || 'Family Member',
              relationship: 'family',
              permissions: fullPermissions,
              status: 'accepted',
              addedAt: new Date().toISOString(),
              addedBy: accountOwnerId,
              lastModified: new Date().toISOString()
            }, { merge: true })
          }

          console.log(`  ✅ Updated ${patientsAccess.length} patient-level records`)
        }
      }

    } else {
      console.log('\n⚠️ User does not have caregiverOf contexts')
      console.log('This might be a standalone account owner or needs to accept an invitation first')
    }

    // Check if this user is also an account owner with preferences
    if (userData?.preferences) {
      console.log('\n📝 User has preferences - updating family role settings')

      await userRef.update({
        'preferences.isAccountOwner': true,
        'preferences.accountOwnerSince': userData.preferences.accountOwnerSince || new Date().toISOString()
      })

      console.log('✅ Updated account owner settings')
    }

    // Verify updates
    const updatedDoc = await userRef.get()
    const updatedData = updatedDoc.data()

    console.log('\n✅ VERIFICATION - Updated user data:')
    console.log(JSON.stringify(updatedData, null, 2))

    console.log('\n✅ All permissions updated successfully!')

  } catch (error) {
    console.error('❌ Error updating permissions:', error)
    throw error
  }
}

// Run the update
updateCaregiverPermissions()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
