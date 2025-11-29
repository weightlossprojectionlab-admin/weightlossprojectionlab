/**
 * usePatientPermissions Hook
 *
 * Hook to get the current user's role and permissions for a specific patient
 * Returns owner status and permission flags for UI guards
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { adminDb } from '@/lib/firebase-admin'
import type { FamilyMemberPermissions, UserRole } from '@/types/medical'

interface PatientPermissionsResult {
  loading: boolean
  role: UserRole | null
  isOwner: boolean
  permissions: FamilyMemberPermissions | null
  canView: boolean
  canEdit: boolean
  canDelete: boolean
  canLogVitals: boolean
  canViewVitals: boolean
  canScheduleAppointments: boolean
  canEditAppointments: boolean
  canDeleteAppointments: boolean
  canEditProfile: boolean
  canEditMedications: boolean
  canUploadDocuments: boolean
  canDeleteDocuments: boolean
}

const DEFAULT_PERMISSIONS: FamilyMemberPermissions = {
  viewPatientProfile: false,
  viewMedicalRecords: false,
  editMedications: false,
  scheduleAppointments: false,
  editAppointments: false,
  deleteAppointments: false,
  uploadDocuments: false,
  deleteDocuments: false,
  logVitals: false,
  viewVitals: false,
  chatAccess: false,
  inviteOthers: false,
  viewSensitiveInfo: false,
  editPatientProfile: false,
  deletePatient: false
}

export function usePatientPermissions(patientId: string | undefined): PatientPermissionsResult {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<FamilyMemberPermissions | null>(null)

  useEffect(() => {
    async function checkPermissions() {
      if (!user || !patientId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Check if user is the patient owner (stored in client-side Firestore)
        // Note: This is a simplified check - server-side RBAC is the source of truth
        const { getFirestore } = await import('firebase/firestore')
        const { collection, query, where, getDocs, doc, getDoc } = await import('firebase/firestore')
        const db = getFirestore()

        // Check if patient exists under user's collection
        const patientRef = doc(db, 'users', user.uid, 'patients', patientId)
        const patientDoc = await getDoc(patientRef)

        if (patientDoc.exists()) {
          // User is the owner
          setRole('owner')
          setPermissions(null) // Owners have all permissions
          setLoading(false)
          return
        }

        // Check if user is a family member with access
        const familyMembersRef = collection(db, 'users', user.uid, 'familyMembers')
        const familyQuery = query(
          familyMembersRef,
          where('patientsAccess', 'array-contains', patientId),
          where('status', '==', 'accepted')
        )

        const familySnapshot = await getDocs(familyQuery)

        if (!familySnapshot.empty) {
          const familyMemberDoc = familySnapshot.docs[0]
          const familyMemberData = familyMemberDoc.data()

          setRole('family')
          setPermissions(familyMemberData.permissions as FamilyMemberPermissions || DEFAULT_PERMISSIONS)
        } else {
          // No access
          setRole(null)
          setPermissions(null)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error checking patient permissions:', error)
        setRole(null)
        setPermissions(null)
        setLoading(false)
      }
    }

    checkPermissions()
  }, [user, patientId])

  const isOwner = role === 'owner'

  return {
    loading,
    role,
    isOwner,
    permissions,
    // Convenience flags
    canView: isOwner || !!permissions?.viewMedicalRecords,
    canEdit: isOwner,
    canDelete: isOwner,
    canLogVitals: isOwner || !!permissions?.logVitals,
    canViewVitals: isOwner || !!permissions?.viewVitals,
    canScheduleAppointments: isOwner || !!permissions?.scheduleAppointments,
    canEditAppointments: isOwner || !!permissions?.editAppointments,
    canDeleteAppointments: isOwner || !!permissions?.deleteAppointments,
    canEditProfile: isOwner || !!permissions?.editPatientProfile,
    canEditMedications: isOwner || !!permissions?.editMedications,
    canUploadDocuments: isOwner || !!permissions?.uploadDocuments,
    canDeleteDocuments: isOwner || !!permissions?.deleteDocuments
  }
}
