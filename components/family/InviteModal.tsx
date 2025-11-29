/**
 * Family Invitation Modal
 *
 * Modal component for inviting family members to access patient records
 * Includes permission selection with presets and patient selection
 */

'use client'

import { useState, useEffect } from 'react'
import { usePatients } from '@/hooks/usePatients'
import { useInvitations } from '@/hooks/useInvitations'
import { PERMISSION_PRESETS, PERMISSION_LABELS, getSensitivePermissionWarnings } from '@/lib/family-permissions'
import { RoleSelector } from './RoleSelector'
import { hasAdminPrivileges, getDefaultPermissionsForRole } from '@/lib/family-roles'
import type { FamilyMemberPermissions, PatientProfile, FamilyRole } from '@/types/medical'

interface InviteModalProps {
  isOpen: boolean
  onClose: () => void
  preSelectedPatientId?: string
  onSuccess?: () => void
  currentUserRole?: FamilyRole // Pass from parent to enable role assignment
}

type PermissionPreset = 'FULL_ACCESS' | 'VIEW_ONLY' | 'LIMITED_EDIT' | 'CAREGIVER' | 'CUSTOM'

export function InviteModal({
  isOpen,
  onClose,
  preSelectedPatientId,
  onSuccess,
  currentUserRole = 'caregiver' // Default to caregiver if not provided
}: InviteModalProps) {
  const { patients } = usePatients()
  const { sendInvitation, revokeInvitation } = useInvitations(false)

  const [recipientEmail, setRecipientEmail] = useState('')
  const [recipientPhone, setRecipientPhone] = useState('')
  const [selectedPatients, setSelectedPatients] = useState<string[]>(
    preSelectedPatientId ? [preSelectedPatientId] : []
  )
  const [permissionPreset, setPermissionPreset] = useState<PermissionPreset>('VIEW_ONLY')
  const [customPermissions, setCustomPermissions] = useState<FamilyMemberPermissions>(
    PERMISSION_PRESETS.VIEW_ONLY
  )
  const [selectedRole, setSelectedRole] = useState<FamilyRole>('caregiver')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [existingInvitationId, setExistingInvitationId] = useState<string | null>(null)

  // Check if user has admin privileges to assign roles
  const canAssignRoles = hasAdminPrivileges(currentUserRole)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setExistingInvitationId(null)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  const preSelectedPatient = preSelectedPatientId
    ? patients.find(p => p.id === preSelectedPatientId)
    : null

  const handlePresetChange = (preset: PermissionPreset) => {
    setPermissionPreset(preset)
    if (preset !== 'CUSTOM') {
      setCustomPermissions(PERMISSION_PRESETS[preset])
    }
  }

  const handleRoleChange = (role: FamilyRole) => {
    setSelectedRole(role)
    // Update permissions based on role
    const rolePermissions = getDefaultPermissionsForRole(role)
    setCustomPermissions(rolePermissions)
    // Update preset to match role
    if (role === 'viewer') {
      setPermissionPreset('VIEW_ONLY')
    } else if (role === 'caregiver') {
      setPermissionPreset('CAREGIVER')
    } else {
      setPermissionPreset('FULL_ACCESS')
    }
  }

  const handlePermissionToggle = (key: keyof FamilyMemberPermissions) => {
    setPermissionPreset('CUSTOM')
    setCustomPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const togglePatient = (patientId: string) => {
    setSelectedPatients(prev =>
      prev.includes(patientId)
        ? prev.filter(id => id !== patientId)
        : [...prev, patientId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedPatients.length === 0) {
      return
    }

    setLoading(true)
    try {
      await sendInvitation({
        recipientEmail,
        ...(recipientPhone && { recipientPhone }),
        patientsShared: selectedPatients,
        permissions: customPermissions,
        ...(message && { message })
      })

      // Reset form
      setRecipientEmail('')
      setRecipientPhone('')
      setSelectedPatients([])
      setPermissionPreset('VIEW_ONLY')
      setCustomPermissions(PERMISSION_PRESETS.VIEW_ONLY)
      setMessage('')
      setExistingInvitationId(null)
      onClose()
    } catch (error: any) {
      // Check if error contains existing invitation
      if (error.details?.existingInvitation) {
        setExistingInvitationId(error.details.existingInvitation.id)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeAndResend = async () => {
    if (!existingInvitationId) return

    setLoading(true)
    try {
      // Revoke existing invitation
      await revokeInvitation(existingInvitationId)
      setExistingInvitationId(null)

      // Resend with current form data
      await sendInvitation({
        recipientEmail,
        ...(recipientPhone && { recipientPhone }),
        patientsShared: selectedPatients,
        permissions: customPermissions,
        ...(message && { message })
      })

      // Reset form
      setRecipientEmail('')
      setRecipientPhone('')
      setSelectedPatients([])
      setPermissionPreset('VIEW_ONLY')
      setCustomPermissions(PERMISSION_PRESETS.VIEW_ONLY)
      setMessage('')
      setExistingInvitationId(null)
      onClose()
    } catch (error) {
      // Error handled by hook
    } finally {
      setLoading(false)
    }
  }

  const activePermissions = permissionPreset === 'CUSTOM' ? customPermissions : PERMISSION_PRESETS[permissionPreset]
  const warnings = getSensitivePermissionWarnings(activePermissions)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Invite Family Member
            </h2>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-muted-foreground dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                placeholder="family.member@example.com"
              />
            </div>

            {/* Phone (Optional) */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Role Selection - Only show for admins */}
            {canAssignRoles && (
              <RoleSelector
                value={selectedRole}
                onChange={handleRoleChange}
                currentUserRole={currentUserRole}
              />
            )}

            {/* Patient Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {preSelectedPatient ? 'Sharing Access To' : 'Select Family Members to Share *'}
              </label>
              {preSelectedPatient ? (
                <div className="px-4 py-3 bg-primary-light border-2 border-primary-light rounded-lg">
                  <span className="text-primary-dark font-medium">
                    {preSelectedPatient.name}
                  </span>
                  <span className="text-primary-dark text-sm ml-2">
                    ({preSelectedPatient.relationship})
                  </span>
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-border rounded-lg p-3">
                  {patients.map(patient => (
                    <label
                      key={patient.id}
                      className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPatients.includes(patient.id)}
                        onChange={() => togglePatient(patient.id)}
                        className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                      />
                      <span className="text-foreground">
                        {patient.name} ({patient.relationship})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Permission Presets */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Permission Level
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handlePresetChange('VIEW_ONLY')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'VIEW_ONLY'
                      ? 'border-primary bg-primary-light text-primary-dark'
                      : 'border-border hover:border-border'
                  }`}
                >
                  View Only
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('LIMITED_EDIT')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'LIMITED_EDIT'
                      ? 'border-primary bg-primary-light text-primary-dark'
                      : 'border-border hover:border-border'
                  }`}
                >
                  Limited Edit
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('CAREGIVER')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'CAREGIVER'
                      ? 'border-primary bg-primary-light text-primary-dark'
                      : 'border-border hover:border-border'
                  }`}
                >
                  Caregiver
                </button>
                <button
                  type="button"
                  onClick={() => handlePresetChange('FULL_ACCESS')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                    permissionPreset === 'FULL_ACCESS'
                      ? 'border-primary bg-primary-light text-primary-dark'
                      : 'border-border hover:border-border'
                  }`}
                >
                  Full Access
                </button>
              </div>
            </div>

            {/* Custom Permissions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-foreground">
                  Detailed Permissions
                </label>
                {permissionPreset === 'CUSTOM' && (
                  <span className="text-xs text-primary dark:text-purple-400">Custom</span>
                )}
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto border-2 border-border rounded-lg p-3">
                {Object.entries(PERMISSION_LABELS).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={activePermissions[key as keyof FamilyMemberPermissions]}
                      onChange={() => handlePermissionToggle(key as keyof FamilyMemberPermissions)}
                      className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Warnings */}
            {warnings.length > 0 && (
              <div className="bg-warning-light border-2 border-warning-light rounded-lg p-4">
                <p className="text-sm font-medium text-warning-dark dark:text-yellow-300 mb-2">
                  ⚠️ Security Warning
                </p>
                <ul className="space-y-1">
                  {warnings.map((warning, i) => (
                    <li key={i} className="text-xs text-yellow-700">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Duplicate Invitation Warning */}
            {existingInvitationId && (
              <div className="bg-warning-light border-2 border-warning rounded-lg p-4">
                <p className="text-sm font-medium text-warning-dark mb-3">
                  ⚠️ Pending Invitation Already Exists
                </p>
                <p className="text-xs text-warning-dark mb-4">
                  You already have a pending invitation to <strong>{recipientEmail}</strong>.
                  You can revoke the existing invitation and send a new one with updated settings.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleRevokeAndResend}
                    disabled={loading}
                    className="px-4 py-2 bg-warning text-white rounded-lg hover:bg-warning-dark disabled:opacity-50 text-sm font-medium transition-colors"
                  >
                    {loading ? 'Revoking & Resending...' : 'Revoke & Resend'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExistingInvitationId(null)}
                    className="px-4 py-2 text-warning-dark hover:bg-warning-light/50 rounded-lg text-sm transition-colors"
                  >
                    Keep Existing
                  </button>
                </div>
              </div>
            )}

            {/* Personal Message */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Personal Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
                placeholder="Add a personal note to your invitation..."
              />
            </div>

            {/* Submit */}
            {!existingInvitationId && (
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading || selectedPatients.length === 0}
                  className="flex-1 px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-3 text-muted-foreground hover:bg-muted rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            {existingInvitationId && (
              <div className="flex items-center gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 bg-muted text-foreground rounded-lg hover:bg-muted-dark transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
