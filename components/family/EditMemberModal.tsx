/**
 * Edit Member Modal
 *
 * Comprehensive modal for editing family member:
 * - Role assignment
 * - Patient access (which patients they can see)
 * - Per-patient permissions
 */

'use client'

import { useState, useEffect } from 'react'
import type { FamilyMember, FamilyRole, PatientProfile, FamilyMemberPermissions } from '@/types/medical'
import { RoleSelector } from './RoleSelector'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '@/lib/family-roles'
import { XMarkIcon, UserGroupIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'

interface EditMemberModalProps {
  isOpen: boolean
  onClose: () => void
  member: FamilyMember | null
  currentUserRole: FamilyRole
  patients: PatientProfile[]
  onSave: (updates: MemberUpdateData) => Promise<void>
}

export interface MemberUpdateData {
  memberId: string
  role?: FamilyRole
  patientsAccess: string[]
  patientPermissions: {
    [patientId: string]: FamilyMemberPermissions
  }
}

/**
 * Default permissions when adding patient access to a family member
 * Uses CAREGIVER preset as sensible default for family caregiving use cases
 *
 * IMPORTANT: Caregivers need logVitals: true by default for basic caregiving functions
 */
const DEFAULT_PERMISSIONS: FamilyMemberPermissions = {
  viewPatientProfile: true,
  viewMedicalRecords: true,
  editMedications: true,
  scheduleAppointments: true,
  editAppointments: true,
  deleteAppointments: true,
  uploadDocuments: true,
  deleteDocuments: true,
  logVitals: true, // CRITICAL: Caregivers must be able to log vitals by default
  viewVitals: true,
  chatAccess: true,
  inviteOthers: false,
  viewSensitiveInfo: false, // No sensitive info access by default
  editPatientProfile: true,
  deletePatient: false
}

export function EditMemberModal({
  isOpen,
  onClose,
  member,
  currentUserRole,
  patients,
  onSave
}: EditMemberModalProps) {
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('caregiver')
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set())
  const [patientPermissions, setPatientPermissions] = useState<{
    [patientId: string]: FamilyMemberPermissions
  }>({})
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Initialize state when member changes
  useEffect(() => {
    if (member) {
      setSelectedRole(member.familyRole || 'caregiver')
      setSelectedPatients(new Set(member.patientsAccess))

      // Initialize permissions for each patient
      const permissions: { [patientId: string]: FamilyMemberPermissions } = {}
      member.patientsAccess.forEach(patientId => {
        permissions[patientId] = { ...member.permissions }
      })
      setPatientPermissions(permissions)
    }
  }, [member])

  if (!isOpen || !member) return null

  const handleRoleChange = (newRole: FamilyRole) => {
    setSelectedRole(newRole)
  }

  const handlePatientToggle = (patientId: string) => {
    const newSelected = new Set(selectedPatients)
    if (newSelected.has(patientId)) {
      newSelected.delete(patientId)
      // Remove permissions for this patient
      const newPermissions = { ...patientPermissions }
      delete newPermissions[patientId]
      setPatientPermissions(newPermissions)
    } else {
      newSelected.add(patientId)
      // Add default permissions for this patient
      setPatientPermissions({
        ...patientPermissions,
        [patientId]: { ...DEFAULT_PERMISSIONS }
      })
    }
    setSelectedPatients(newSelected)
  }

  const handlePermissionToggle = (patientId: string, permission: keyof FamilyMemberPermissions) => {
    setPatientPermissions({
      ...patientPermissions,
      [patientId]: {
        ...patientPermissions[patientId],
        [permission]: !patientPermissions[patientId]?.[permission]
      }
    })
  }

  const handleSelectAllPermissions = (patientId: string) => {
    const allSelected = Object.values(patientPermissions[patientId] || {}).every(v => v)
    const newPermissions = { ...DEFAULT_PERMISSIONS }
    Object.keys(newPermissions).forEach(key => {
      newPermissions[key as keyof FamilyMemberPermissions] = !allSelected
    })
    setPatientPermissions({
      ...patientPermissions,
      [patientId]: newPermissions
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave({
        memberId: member.id,
        role: selectedRole,
        patientsAccess: Array.from(selectedPatients),
        patientPermissions
      })
      onClose()
    } catch (error) {
      console.error('Failed to save member updates:', error)
    } finally {
      setSaving(false)
    }
  }

  const permissionLabels: { [K in keyof FamilyMemberPermissions]: string } = {
    viewPatientProfile: 'View Patient Profile',
    viewMedicalRecords: 'View Medical Records',
    editMedications: 'Edit Medications',
    scheduleAppointments: 'Schedule Appointments',
    editAppointments: 'Edit Appointments',
    deleteAppointments: 'Delete Appointments',
    uploadDocuments: 'Upload Documents',
    deleteDocuments: 'Delete Documents',
    logVitals: 'Log Vitals',
    viewVitals: 'View Vitals',
    chatAccess: 'Chat Access',
    inviteOthers: 'Invite Others',
    viewSensitiveInfo: 'View Sensitive Info',
    editPatientProfile: 'Edit Patient Profile',
    deletePatient: 'Delete Patient'
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-card shadow-xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b-2 border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">Edit Member</h3>
                <p className="text-sm text-muted-foreground">{member.name} ({member.email})</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <XMarkIcon className="w-6 h-6 text-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            {/* Role Section */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheckIcon className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">Family Role</h4>
              </div>
              <div className="bg-muted/50 rounded-lg p-4">
                <RoleSelector
                  value={selectedRole}
                  currentUserRole={currentUserRole}
                  onChange={handleRoleChange}
                />
                <p className="text-sm text-muted-foreground mt-2">
                  {ROLE_DESCRIPTIONS[selectedRole]}
                </p>
              </div>
            </section>

            {/* Patient Access Section */}
            <section className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <UserGroupIcon className="w-5 h-5 text-primary" />
                <h4 className="font-semibold text-foreground">Patient Access</h4>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Select which patients this member can access and configure their permissions
              </p>

              {patients.length === 0 ? (
                <div className="text-center py-8 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">No patients available</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patients.map(patient => {
                    const hasAccess = selectedPatients.has(patient.id)
                    const isExpanded = expandedPatient === patient.id
                    const permissions = patientPermissions[patient.id] || { ...DEFAULT_PERMISSIONS }
                    const grantedCount = Object.values(permissions).filter(Boolean).length

                    return (
                      <div
                        key={patient.id}
                        className="bg-card rounded-lg border-2 border-border overflow-hidden"
                      >
                        {/* Patient Header */}
                        <div className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={() => handlePatientToggle(patient.id)}
                                className="w-5 h-5 text-primary rounded focus:ring-primary"
                              />
                              <div>
                                <h5 className="font-semibold text-foreground">{patient.name}</h5>
                                <p className="text-sm text-muted-foreground capitalize">
                                  {patient.relationship || patient.type}
                                </p>
                              </div>
                            </div>

                            {hasAccess && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                  {grantedCount}/12 permissions
                                </span>
                                <button
                                  onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                                  className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary-hover transition-colors"
                                >
                                  {isExpanded ? 'Hide' : 'Edit'} Permissions
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Permissions */}
                        {hasAccess && isExpanded && (
                          <div className="border-t-2 border-border bg-muted/30 p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h6 className="text-sm font-semibold text-foreground">Permissions</h6>
                              <button
                                onClick={() => handleSelectAllPermissions(patient.id)}
                                className="text-xs text-primary hover:underline"
                              >
                                {Object.values(permissions).every(v => v) ? 'Deselect' : 'Select'} All
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {(Object.keys(permissions) as Array<keyof FamilyMemberPermissions>).map(permission => (
                                <label
                                  key={permission}
                                  className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                                >
                                  <input
                                    type="checkbox"
                                    checked={permissions[permission]}
                                    onChange={() => handlePermissionToggle(patient.id, permission)}
                                    className="w-4 h-4 text-primary rounded focus:ring-primary"
                                  />
                                  <span className="text-sm text-foreground">
                                    {permissionLabels[permission]}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t-2 border-border bg-muted/30">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
