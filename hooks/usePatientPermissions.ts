/**
 * usePatientPermissions Hook
 *
 * Hook to get the current user's role and permissions for a specific patient
 * Returns owner status and permission flags for UI guards
 */

'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { auth as firebaseAuth } from '@/lib/firebase'
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
  deletePatient: false,
  importPatients: false
}

export function usePatientPermissions(patientId: string | undefined): PatientPermissionsResult {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<FamilyMemberPermissions | null>(null)

  useEffect(() => {
    let cancelled = false

    async function checkPermissions() {
      if (!user || !patientId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Read the caller's effective role + permissions from the SERVER RBAC —
        // the same grant the write routes enforce with. The old client query
        // read users/{caller}/familyMembers, but the owner edits permissions on
        // users/{owner}/familyMembers, so a caregiver's UI never saw the grant.
        const token = await firebaseAuth.currentUser?.getIdToken()
        const res = await fetch(`/api/patients/${patientId}/access`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
        if (cancelled) return

        if (!res.ok) {
          setRole(null)
          setPermissions(null)
          setLoading(false)
          return
        }

        const data = await res.json()
        if (cancelled) return

        if (!data.authorized) {
          setRole(null)
          setPermissions(null)
        } else if (data.isOwner) {
          setRole('owner')
          setPermissions(null) // owners have all permissions implicitly
        } else {
          setRole((data.role as UserRole) ?? 'family')
          setPermissions((data.permissions as FamilyMemberPermissions) ?? DEFAULT_PERMISSIONS)
        }
        setLoading(false)
      } catch (error) {
        if (cancelled) return
        console.error('Error checking patient permissions:', error)
        setRole(null)
        setPermissions(null)
        setLoading(false)
      }
    }

    checkPermissions()
    return () => {
      cancelled = true
    }
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
