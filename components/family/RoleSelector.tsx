/**
 * Role Selector Component
 *
 * Dropdown for selecting family member roles
 * Only shows roles that the current user can assign
 */

'use client'

import { FamilyRole } from '@/types/medical'
import {
  getRoleLabel,
  getRoleDescription,
  getRoleAssignmentWarning,
  getAssignableRoles
} from '@/lib/family-roles'

interface RoleSelectorProps {
  value: FamilyRole
  onChange: (role: FamilyRole) => void
  currentUserRole: FamilyRole
  disabled?: boolean
  className?: string
}

export function RoleSelector({
  value,
  onChange,
  currentUserRole,
  disabled = false,
  className = ''
}: RoleSelectorProps) {
  const assignableRoles = getAssignableRoles(currentUserRole)
  const selectedWarning = getRoleAssignmentWarning(value)
  const selectedDescription = getRoleDescription(value)

  // If user cannot assign roles, don't show the selector
  if (assignableRoles.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-foreground mb-2">
        Family Role
      </label>

      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FamilyRole)}
        disabled={disabled}
        className="w-full px-4 py-2 border-2 border-border rounded-lg bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {assignableRoles.map((role) => (
          <option key={role} value={role}>
            {getRoleLabel(role)}
          </option>
        ))}
      </select>

      {/* Role Description */}
      {selectedDescription && (
        <p className="mt-2 text-xs text-muted-foreground">
          {selectedDescription}
        </p>
      )}

      {/* Role Warning */}
      {selectedWarning && (
        <div className="mt-2 bg-warning-light border border-warning-light rounded-lg p-3">
          <p className="text-xs text-warning-dark">
            ⚠️ {selectedWarning}
          </p>
        </div>
      )}
    </div>
  )
}
