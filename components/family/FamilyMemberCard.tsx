/**
 * Family Member Card
 *
 * Displays a family member with their permissions and access level
 * Includes edit and remove actions
 */

'use client'

import type { FamilyMember } from '@/types/medical'
import { PERMISSION_LABELS } from '@/lib/family-permissions'
import { AccountOwnerBadge } from './AccountOwnerBadge'
import { getRoleLabel } from '@/lib/family-roles'

interface FamilyMemberCardProps {
  member: FamilyMember
  onEdit?: (member: FamilyMember) => void
  onRemove?: (member: FamilyMember) => void
  showActions?: boolean
}

export function FamilyMemberCard({
  member,
  onEdit,
  onRemove,
  showActions = true
}: FamilyMemberCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'declined':
        return 'bg-red-100 text-error-dark dark:bg-red-900/20'
      default:
        return 'bg-muted text-foreground dark:text-muted-foreground'
    }
  }

  const getPermissionLevel = (permissions: typeof member.permissions): string => {
    const grantedCount = Object.values(permissions).filter(Boolean).length
    const totalCount = Object.keys(permissions).length

    if (grantedCount === totalCount) return 'Full Access'
    if (grantedCount === 0) return 'No Access'
    if (grantedCount <= 3) return 'View Only'
    if (grantedCount <= 7) return 'Limited Access'
    return 'Full Access'
  }

  const getGrantedPermissions = () => {
    return Object.entries(member.permissions)
      .filter(([_, granted]) => granted)
      .map(([key]) => PERMISSION_LABELS[key as keyof typeof PERMISSION_LABELS])
  }

  const grantedPermissions = getGrantedPermissions()

  // Check if this is the Account Owner (add gold border)
  const isAccountOwner = member.familyRole === 'account_owner'
  const borderClass = isAccountOwner
    ? 'border-amber-400 dark:border-amber-500'
    : 'border-border hover:border-purple-300 dark:hover:border-purple-700'

  return (
    <div className={`bg-card rounded-lg border-2 p-6 transition-colors ${borderClass}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {member.photo ? (
            <img
              src={member.photo}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-primary-light dark:bg-purple-900/20 flex items-center justify-center">
              <span className="text-primary dark:text-purple-400 font-semibold text-lg">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">
              {member.name}
            </h3>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground">{member.email}</p>

            {/* Role Badge */}
            <div className="mt-1">
              <AccountOwnerBadge role={member.familyRole || 'caregiver'} />
            </div>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
        </span>
      </div>

      {/* Relationship */}
      {member.relationship && (
        <div className="mb-3">
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">Relationship: </span>
          <span className="text-sm text-foreground capitalize">
            {member.relationship}
          </span>
        </div>
      )}

      {/* Managed By (for non-Account Owners) */}
      {!isAccountOwner && member.managedBy && (
        <div className="mb-3">
          <span className="text-xs text-muted-foreground dark:text-muted-foreground">Managed by: </span>
          <span className="text-sm text-foreground">
            {member.managedBy === 'self' ? 'Account Owner' : 'Family Administrator'}
          </span>
        </div>
      )}

      {/* Permission Level */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">Access Level: </span>
        <span className="text-sm font-medium text-primary dark:text-purple-400">
          {getPermissionLevel(member.permissions)}
        </span>
      </div>

      {/* Granted Permissions */}
      <div className="mb-4">
        <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
          Permissions ({grantedPermissions.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {grantedPermissions.slice(0, 3).map(permission => (
            <span
              key={permission}
              className="px-2 py-1 bg-primary-light text-primary-dark rounded text-xs"
            >
              {permission}
            </span>
          ))}
          {grantedPermissions.length > 3 && (
            <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
              +{grantedPermissions.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Last Active */}
      {member.lastActive && (
        <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-4">
          Last active: {new Date(member.lastActive).toLocaleDateString()}
        </p>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-border">
          {onEdit && (
            <button
              onClick={() => onEdit(member)}
              className="flex-1 px-3 py-2 text-sm bg-primary-light text-primary-dark rounded-lg hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors"
            >
              Edit Permissions
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(member)}
              className="px-3 py-2 text-sm text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
