/**
 * InviteePermissionFields — the per-invitee permission editor.
 *
 * Extracted from InviteModal so it can be rendered once per invitee in a batch
 * invite (each person can differ). Single source for: family-member selection,
 * role, permission presets, detailed permissions, sensitive-permission warnings,
 * and the personal message. Fully controlled — it owns no state, just renders
 * the given InviteeDraft and reports edits via onChange(patch).
 */

'use client'

import { PERMISSION_PRESETS, PERMISSION_LABELS, getSensitivePermissionWarnings } from '@/lib/family-permissions'
import { getDefaultPermissionsForRole } from '@/lib/family-roles'
import { getPatientBadgeLabel } from '@/lib/life-stage-utils'
import { RoleSelector } from './RoleSelector'
import type { FamilyMemberPermissions, PatientProfile, FamilyRole } from '@/types/medical'

export type PermissionPreset = 'FULL_ACCESS' | 'VIEW_ONLY' | 'LIMITED_EDIT' | 'CAREGIVER' | 'CUSTOM'

/** One pending invitee in the batch-invite form. */
export interface InviteeDraft {
  id: string
  email: string
  phone: string
  patientsShared: string[]
  role: FamilyRole
  permissionPreset: PermissionPreset
  customPermissions: FamilyMemberPermissions
  message: string
  collapsed: boolean
  /** Set after a failed send (validation or API), shown inline. */
  error?: string
  /** Set when the API reports a pending invite already exists for this email. */
  existingInvitationId?: string
}

/** Effective permissions for an invitee (preset, or custom overrides). */
export function invitePermissions(inv: InviteeDraft): FamilyMemberPermissions {
  return inv.permissionPreset === 'CUSTOM' ? inv.customPermissions : PERMISSION_PRESETS[inv.permissionPreset]
}

const PRESETS: Array<[PermissionPreset, string]> = [
  ['VIEW_ONLY', 'View only'],
  ['LIMITED_EDIT', 'Limited edit'],
  ['CAREGIVER', 'Caregiver'],
  ['FULL_ACCESS', 'Full access'],
]

export const PRESET_LABEL: Record<PermissionPreset, string> = {
  VIEW_ONLY: 'View only',
  LIMITED_EDIT: 'Limited edit',
  CAREGIVER: 'Caregiver',
  FULL_ACCESS: 'Full access',
  CUSTOM: 'Custom',
}

export function InviteePermissionFields({
  invitee,
  patients,
  canAssignRoles,
  currentUserRole,
  preSelectedPatient,
  onChange,
}: {
  invitee: InviteeDraft
  patients: PatientProfile[]
  canAssignRoles: boolean
  currentUserRole: FamilyRole
  preSelectedPatient: PatientProfile | null
  onChange: (patch: Partial<InviteeDraft>) => void
}) {
  const active = invitePermissions(invitee)
  const warnings = getSensitivePermissionWarnings(active)

  const setPreset = (preset: PermissionPreset) =>
    onChange(
      preset === 'CUSTOM'
        ? { permissionPreset: 'CUSTOM' }
        : { permissionPreset: preset, customPermissions: PERMISSION_PRESETS[preset] },
    )

  const setRole = (role: FamilyRole) => {
    const preset: PermissionPreset =
      role === 'viewer' ? 'VIEW_ONLY' : role === 'caregiver' ? 'CAREGIVER' : 'FULL_ACCESS'
    onChange({ role, customPermissions: getDefaultPermissionsForRole(role), permissionPreset: preset })
  }

  const togglePerm = (key: keyof FamilyMemberPermissions) =>
    onChange({ permissionPreset: 'CUSTOM', customPermissions: { ...active, [key]: !active[key] } })

  const togglePatient = (pid: string) =>
    onChange({
      patientsShared: invitee.patientsShared.includes(pid)
        ? invitee.patientsShared.filter((id) => id !== pid)
        : [...invitee.patientsShared, pid],
    })

  return (
    <div className="space-y-6">
      {canAssignRoles && (
        <RoleSelector value={invitee.role} onChange={setRole} currentUserRole={currentUserRole} />
      )}

      {/* Family members to share */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {preSelectedPatient ? 'Sharing access to' : 'Select family members to share *'}
        </label>
        {preSelectedPatient ? (
          <div className="px-4 py-3 bg-primary-light border-2 border-primary-light rounded-lg">
            <span className="text-primary-dark font-medium">{preSelectedPatient.name}</span>
            <span className="text-primary-dark text-sm ml-2">({preSelectedPatient.relationship})</span>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto border-2 border-border rounded-lg p-3">
            {patients.map((p) => (
              <label
                key={p.id}
                className="flex items-center gap-3 p-2 hover:bg-background rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={invitee.patientsShared.includes(p.id)}
                  onChange={() => togglePatient(p.id)}
                  className="w-4 h-4 text-primary rounded focus:ring-purple-500"
                />
                <span className="text-foreground">
                  {p.name} ({getPatientBadgeLabel(p)})
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Permission presets */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Permission level</label>
        <div className="grid grid-cols-2 gap-3">
          {PRESETS.map(([preset, label]) => (
            <button
              key={preset}
              type="button"
              onClick={() => setPreset(preset)}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                invitee.permissionPreset === preset
                  ? 'border-primary bg-primary-light text-primary-dark'
                  : 'border-border hover:border-border'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Detailed permissions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-foreground">Detailed permissions</label>
          {invitee.permissionPreset === 'CUSTOM' && (
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
                checked={active[key as keyof FamilyMemberPermissions]}
                onChange={() => togglePerm(key as keyof FamilyMemberPermissions)}
                className="w-4 h-4 text-primary rounded focus:ring-purple-500"
              />
              <span className="text-sm text-foreground">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sensitive-permission warnings */}
      {warnings.length > 0 && (
        <div className="bg-warning-light border-2 border-warning-light rounded-lg p-4">
          <p className="text-sm font-medium text-warning-dark dark:text-yellow-300 mb-2">
            ⚠️ Security warning
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

      {/* Personal message */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Personal message (optional)
        </label>
        <textarea
          value={invitee.message}
          onChange={(e) => onChange({ message: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20"
          placeholder="Add a personal note to this invitation..."
        />
      </div>
    </div>
  )
}
