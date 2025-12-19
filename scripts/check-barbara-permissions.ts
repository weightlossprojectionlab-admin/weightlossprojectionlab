/**
 * Script to check Barbara Rice's family member permissions
 *
 * Run: npx tsx scripts/check-barbara-permissions.ts
 */

import { adminDb } from '@/lib/firebase-admin'
import { logger } from '@/lib/logger'

async function checkBarbaraPermissions() {
  try {
    console.log('🔍 Searching for Barbara Rice in family members...\n')

    // Search for Barbara Rice in all family member records
    const familyMembersSnapshot = await adminDb
      .collectionGroup('familyMembers')
      .where('name', '==', 'Barbara Rice')
      .get()

    if (familyMembersSnapshot.empty) {
      console.log('❌ Barbara Rice not found in family members collection')
      console.log('   Trying case-insensitive search...\n')

      // Try searching all family members and filter
      const allFamilyMembers = await adminDb
        .collectionGroup('familyMembers')
        .get()

      const barbaraMembers = allFamilyMembers.docs.filter(doc => {
        const name = doc.data().name?.toLowerCase()
        return name && (name.includes('barbara') || name.includes('rice'))
      })

      if (barbaraMembers.length === 0) {
        console.log('❌ No family members found with "Barbara" or "Rice" in name\n')
        console.log('📋 All family members:')
        allFamilyMembers.docs.forEach(doc => {
          const data = doc.data()
          console.log(`   - ${data.name} (${data.email}) - Status: ${data.status}`)
        })
        return
      }

      console.log(`✅ Found ${barbaraMembers.length} matching member(s):\n`)
      barbaraMembers.forEach(doc => {
        const data = doc.data()
        console.log(`   Name: ${data.name}`)
        console.log(`   Email: ${data.email}`)
        console.log(`   User ID: ${data.userId}`)
        console.log(`   Status: ${data.status}`)
        console.log(`   Path: ${doc.ref.path}`)
        console.log('')
      })

      return
    }

    console.log(`✅ Found ${familyMembersSnapshot.docs.length} family member record(s) for Barbara Rice\n`)

    for (const doc of familyMembersSnapshot.docs) {
      const data = doc.data()
      const ownerUserId = doc.ref.parent.parent?.id

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('📋 FAMILY MEMBER RECORD')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`Name:              ${data.name}`)
      console.log(`Email:             ${data.email}`)
      console.log(`User ID:           ${data.userId}`)
      console.log(`Status:            ${data.status}`)
      console.log(`Family Role:       ${data.familyRole || 'caregiver (default)'}`)
      console.log(`Relationship:      ${data.relationship || 'N/A'}`)
      console.log(`Owner User ID:     ${ownerUserId}`)
      console.log(`Document Path:     ${doc.ref.path}`)
      console.log(`Patients Access:   ${data.patientsAccess?.join(', ') || 'None'}`)
      console.log('')
      console.log('📜 PERMISSIONS:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

      const permissions = data.permissions || {}
      const permissionsList = [
        { key: 'viewMedicalRecords', label: 'View Medical Records' },
        { key: 'editPatientProfile', label: 'Edit Patient Profile' },
        { key: 'editMedications', label: 'Edit Medications' },
        { key: 'viewSensitiveInfo', label: 'View Sensitive Info' },
        { key: 'scheduleAppointments', label: 'Schedule Appointments' },
        { key: 'editAppointments', label: 'Edit Appointments' },
        { key: 'deleteAppointments', label: 'Delete Appointments' },
        { key: 'uploadDocuments', label: 'Upload Documents' },
        { key: 'deleteDocuments', label: 'Delete Documents' },
        { key: 'logVitals', label: '🩺 Log Vitals (CRITICAL)' },
        { key: 'viewVitals', label: 'View Vitals' },
        { key: 'chatAccess', label: 'Chat Access' },
        { key: 'inviteOthers', label: 'Invite Others' },
      ]

      permissionsList.forEach(({ key, label }) => {
        const hasPermission = permissions[key] === true
        const icon = hasPermission ? '✅' : '❌'
        console.log(`${icon} ${label.padEnd(30)} ${hasPermission ? 'ENABLED' : 'DISABLED'}`)
      })

      console.log('')

      // Critical check
      if (permissions.logVitals === true) {
        console.log('✅ DIAGNOSIS: Barbara HAS logVitals permission')
        console.log('   The issue is likely:')
        console.log('   1. Client-side error (check browser console)')
        console.log('   2. Network issue')
        console.log('   3. Wizard not using correct API endpoint')
        console.log('')
      } else {
        console.log('❌ PROBLEM FOUND: Barbara DOES NOT have logVitals permission!')
        console.log('   SOLUTION: Grant logVitals permission to Barbara Rice')
        console.log('')
        console.log('   Update command:')
        console.log(`   firebase firestore:update "users/${ownerUserId}/familyMembers/${doc.id}" --data permissions.logVitals=true`)
        console.log('')
        console.log('   Or use the Family Settings page to enable "Log Vitals" permission')
        console.log('')
      }

      // Get patient info
      if (ownerUserId && data.patientsAccess && data.patientsAccess.length > 0) {
        console.log('👥 ACCESSIBLE PATIENTS:')
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

        for (const patientId of data.patientsAccess) {
          try {
            const patientDoc = await adminDb
              .collection('users')
              .doc(ownerUserId)
              .collection('patients')
              .doc(patientId)
              .get()

            if (patientDoc.exists) {
              const patientData = patientDoc.data()
              console.log(`   - ${patientData?.name || 'Unknown'} (ID: ${patientId})`)
            } else {
              console.log(`   - Patient ID: ${patientId} (NOT FOUND)`)
            }
          } catch (err) {
            console.log(`   - Patient ID: ${patientId} (ERROR: ${err})`)
          }
        }
        console.log('')
      }
    }

  } catch (error) {
    logger.error('[Script] Error checking Barbara permissions', error as Error)
    console.error('Error:', error)
  } finally {
    process.exit(0)
  }
}

// Run the script
checkBarbaraPermissions()
