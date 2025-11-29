/**
 * Family Members Tab
 *
 * Displays list of active family members with permissions management
 * Shows member cards with avatars, roles, and patient access
 */

'use client'

import { useState } from 'react'
import type { FamilyMember, PatientProfile, FamilyRole } from '@/types/medical'
import { FamilyMemberCard } from './FamilyMemberCard'
import { RoleSelector } from './RoleSelector'
import { getRoleLabel, canEditMember } from '@/lib/family-roles'
import { getPermissionLevelName } from '@/lib/family-permissions'

interface FamilyMembersTabProps {
  members: FamilyMember[]
  patients: PatientProfile[]
  currentUserRole: FamilyRole
  onEditPermissions: (member: FamilyMember) => void
  onRemoveMember: (member: FamilyMember) => void
  onUpdateRole?: (memberId: string, newRole: FamilyRole) => Promise<void>
  loading?: boolean
}

export function FamilyMembersTab({
  members,
  patients,
  currentUserRole,
  onEditPermissions,
  onRemoveMember,
  onUpdateRole,
  loading = false
}: FamilyMembersTabProps) {
  const [updatingRoleFor, setUpdatingRoleFor] = useState<string | null>(null)

  // Filter to only show accepted members
  const activeMembers = members.filter(m => m.status === 'accepted')

  // Get patient names that a member can access
  const getAccessiblePatients = (member: FamilyMember): string[] => {
    return patients
      .filter(p => member.patientsAccess.includes(p.id))
      .map(p => p.name)
  }

  const handleRoleChange = async (memberId: string, newRole: FamilyRole) => {
    if (!onUpdateRole) return

    setUpdatingRoleFor(memberId)
    try {
      await onUpdateRole(memberId, newRole)
    } finally {
      setUpdatingRoleFor(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Loading family members...</p>
      </div>
    )
  }

  if (activeMembers.length === 0) {
    return (
      <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
        <div className="max-w-md mx-auto">
          <svg
            className="mx-auto h-12 w-12 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
          <p className="mt-4 text-muted-foreground">No active family members yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Invite family members to collaborate on patient care
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Total Members</p>
          <p className="text-2xl font-bold text-foreground">{activeMembers.length}</p>
        </div>
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Patients Shared</p>
          <p className="text-2xl font-bold text-foreground">{patients.length}</p>
        </div>
        <div className="bg-card rounded-lg border-2 border-border p-4">
          <p className="text-sm text-muted-foreground">Active Invitations</p>
          <p className="text-2xl font-bold text-foreground">
            {members.filter(m => m.status === 'pending').length}
          </p>
        </div>
      </div>

      {/* Members Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeMembers.map(member => {
          const accessiblePatients = getAccessiblePatients(member)
          const canEdit = canEditMember(currentUserRole, member.familyRole || 'caregiver')
          const isUpdatingRole = updatingRoleFor === member.id

          return (
            <div key={member.id} className="space-y-4">
              {/* Enhanced Member Card */}
              <div
                className={`bg-card rounded-lg border-2 p-6 transition-colors ${
                  member.familyRole === 'account_owner'
                    ? 'border-amber-400 dark:border-amber-500'
                    : 'border-border hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              >
                {/* Header: Avatar + Name + Status */}
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
                      <h3 className="font-semibold text-foreground">{member.name}</h3>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        {member.email}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400`}
                  >
                    Active
                  </span>
                </div>

                {/* Role Selector (if user has permission) */}
                {canEdit && onUpdateRole ? (
                  <div className="mb-4">
                    <label className="block text-xs text-muted-foreground mb-2">Role</label>
                    <select
                      value={member.familyRole || 'caregiver'}
                      onChange={e =>
                        handleRoleChange(member.id, e.target.value as FamilyRole)
                      }
                      disabled={isUpdatingRole || member.familyRole === 'account_owner'}
                      className="w-full px-3 py-2 border-2 border-border rounded-lg bg-background text-foreground text-sm focus:border-primary focus:ring-2 focus:ring-purple-600/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="account_owner" disabled>
                        Account Owner
                      </option>
                      <option value="co_admin">Co-Admin</option>
                      <option value="caregiver">Caregiver</option>
                      <option value="viewer">Viewer</option>
                    </select>
                    {isUpdatingRole && (
                      <p className="text-xs text-muted-foreground mt-1">Updating role...</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4">
                    <span className="text-xs text-muted-foreground">Role: </span>
                    <span className="text-sm font-medium text-primary dark:text-purple-400">
                      {getRoleLabel(member.familyRole || 'caregiver')}
                    </span>
                  </div>
                )}

                {/* Relationship */}
                {member.relationship && (
                  <div className="mb-3">
                    <span className="text-xs text-muted-foreground">Relationship: </span>
                    <span className="text-sm text-foreground capitalize">
                      {member.relationship}
                    </span>
                  </div>
                )}

                {/* Permission Level */}
                <div className="mb-3">
                  <span className="text-xs text-muted-foreground">Access Level: </span>
                  <span className="text-sm font-medium text-primary dark:text-purple-400">
                    {getPermissionLevelName(member.permissions)}
                  </span>
                </div>

                {/* Patients Access */}
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">
                    Can Access ({accessiblePatients.length} patient
                    {accessiblePatients.length !== 1 ? 's' : ''}):
                  </p>
                  {accessiblePatients.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {accessiblePatients.slice(0, 3).map(patientName => (
                        <span
                          key={patientName}
                          className="px-2 py-1 bg-secondary-light text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded text-xs"
                        >
                          {patientName}
                        </span>
                      ))}
                      {accessiblePatients.length > 3 && (
                        <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">
                          +{accessiblePatients.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No patients assigned</p>
                  )}
                </div>

                {/* Last Active */}
                {member.lastActive && (
                  <p className="text-xs text-muted-foreground mb-4">
                    Last active: {new Date(member.lastActive).toLocaleDateString()}
                  </p>
                )}

                {/* Actions */}
                {canEdit && (
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    <button
                      onClick={() => onEditPermissions(member)}
                      className="flex-1 px-3 py-2 text-sm bg-primary-light text-primary-dark rounded-lg hover:bg-primary-light dark:hover:bg-purple-900/30 transition-colors"
                    >
                      Edit Permissions
                    </button>
                    {member.familyRole !== 'account_owner' && (
                      <button
                        onClick={() => onRemoveMember(member)}
                        className="px-3 py-2 text-sm text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
