/**
 * Family Member Card
 *
 * Displays a family member with their permissions and access level
 * Includes edit and remove actions
 */

'use client'

import type { FamilyMember } from '@/types/medical'
import { PERMISSION_LABELS } from '@/lib/family-permissions'

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
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'declined':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
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

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6 hover:border-purple-300 dark:hover:border-purple-700 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {member.photo ? (
            <img
              src={member.photo}
              alt={member.name}
              className="w-12 h-12 rounded-full object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
              <span className="text-purple-600 dark:text-purple-400 font-semibold text-lg">
                {member.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {member.name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
          </div>
        </div>

        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(member.status)}`}>
          {member.status.charAt(0).toUpperCase() + member.status.slice(1)}
        </span>
      </div>

      {/* Relationship */}
      {member.relationship && (
        <div className="mb-3">
          <span className="text-xs text-gray-500 dark:text-gray-400">Relationship: </span>
          <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
            {member.relationship}
          </span>
        </div>
      )}

      {/* Permission Level */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Access Level: </span>
        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
          {getPermissionLevel(member.permissions)}
        </span>
      </div>

      {/* Granted Permissions */}
      <div className="mb-4">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Permissions ({grantedPermissions.length}):
        </p>
        <div className="flex flex-wrap gap-2">
          {grantedPermissions.slice(0, 3).map(permission => (
            <span
              key={permission}
              className="px-2 py-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded text-xs"
            >
              {permission}
            </span>
          ))}
          {grantedPermissions.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded text-xs">
              +{grantedPermissions.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Last Active */}
      {member.lastActive && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Last active: {new Date(member.lastActive).toLocaleDateString()}
        </p>
      )}

      {/* Actions */}
      {showActions && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {onEdit && (
            <button
              onClick={() => onEdit(member)}
              className="flex-1 px-3 py-2 text-sm bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              Edit Permissions
            </button>
          )}
          {onRemove && (
            <button
              onClick={() => onRemove(member)}
              className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      )}
    </div>
  )
}
