/**
 * Usage Examples for useFamilyRoles Hook
 *
 * This file demonstrates how to use the useFamilyRoles hook
 * for managing family member roles and permissions
 */

import React from 'react'
import { useFamilyRoles, getCurrentUserRole, useIsAdmin } from './useFamilyRoles'
import { useAuth } from './useAuth'
import type { FamilyRole } from '@/types/medical'
import { getRoleLabel, getRoleBadgeColor } from '@/lib/family-roles'

/**
 * Example 1: Basic Family Roles Management Component
 */
export function FamilyRolesManager() {
  const { user } = useAuth()
  const {
    familyMembers,
    loading,
    error,
    assignRole,
    transferOwnership,
    getFamilyHierarchy,
    canUserAssignRole,
    canUserEditMember
  } = useFamilyRoles({ autoFetch: true })

  if (loading) return <div>Loading family members...</div>
  if (error) return <div>Error: {error}</div>

  const currentUserRole = getCurrentUserRole(familyMembers, user?.uid || '')
  const isAdmin = useIsAdmin(familyMembers, user?.uid || '')
  const hierarchy = getFamilyHierarchy()

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Family Roles Management</h2>

      {isAdmin && (
        <div className="bg-blue-50 p-4 rounded">
          <p className="text-sm text-blue-800">
            You have admin privileges and can manage family member roles
          </p>
        </div>
      )}

      <div className="space-y-2">
        {hierarchy.map(member => {
          const canEdit = canUserEditMember(member, currentUserRole || undefined)

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-white rounded shadow"
            >
              <div className="flex items-center space-x-4">
                <img
                  src={member.photo || '/default-avatar.png'}
                  alt={member.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
                    member.familyRole || 'caregiver'
                  )}`}
                >
                  {getRoleLabel(member.familyRole || 'caregiver')}
                </span>

                {canEdit && member.familyRole !== 'account_owner' && (
                  <button
                    onClick={() => handleRoleChange(member.id)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Change Role
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  async function handleRoleChange(memberId: string) {
    // In a real app, show a modal to select new role
    const newRole: FamilyRole = 'co_admin' // Example
    try {
      await assignRole(memberId, newRole)
    } catch (err) {
      console.error('Failed to change role:', err)
    }
  }
}

/**
 * Example 2: Role Assignment Modal
 */
export function RoleAssignmentModal({
  memberId,
  currentRole,
  onClose
}: {
  memberId: string
  currentRole: FamilyRole
  onClose: () => void
}) {
  const { user } = useAuth()
  const { familyMembers, assignRole, canUserAssignRole } = useFamilyRoles()

  const currentUserRole = getCurrentUserRole(familyMembers, user?.uid || '')
  const availableRoles: FamilyRole[] = ['co_admin', 'caregiver', 'viewer']

  const handleAssign = async (newRole: FamilyRole) => {
    try {
      await assignRole(memberId, newRole)
      onClose()
    } catch (err) {
      console.error('Failed to assign role:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4">Assign Role</h3>

        <div className="space-y-2">
          {availableRoles.map(role => {
            const canAssign = canUserAssignRole(role, currentUserRole || undefined)

            return (
              <button
                key={role}
                onClick={() => handleAssign(role)}
                disabled={!canAssign || role === currentRole}
                className={`w-full p-3 text-left rounded border ${
                  role === currentRole
                    ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                    : canAssign
                    ? 'border-gray-300 hover:bg-blue-50 hover:border-blue-500'
                    : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="font-medium">{getRoleLabel(role)}</div>
                {role === currentRole && (
                  <div className="text-sm text-gray-500">Current role</div>
                )}
                {!canAssign && role !== currentRole && (
                  <div className="text-sm text-red-500">
                    You don't have permission to assign this role
                  </div>
                )}
              </button>
            )
          })}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full py-2 border border-gray-300 rounded hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

/**
 * Example 3: Transfer Ownership Component
 */
export function TransferOwnershipModal({
  onClose
}: {
  onClose: () => void
}) {
  const { user } = useAuth()
  const { familyMembers, transferOwnership } = useFamilyRoles()
  const [selectedMember, setSelectedMember] = React.useState<string>('')
  const [confirming, setConfirming] = React.useState(false)

  // Only show co-admins as eligible for ownership transfer
  const eligibleMembers = familyMembers.filter(
    m => m.familyRole === 'co_admin' && m.userId !== user?.uid
  )

  const handleTransfer = async () => {
    if (!selectedMember) return

    try {
      await transferOwnership(selectedMember)
      onClose()
    } catch (err) {
      console.error('Failed to transfer ownership:', err)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-bold mb-4 text-red-600">
          ⚠️ Transfer Account Ownership
        </h3>

        {!confirming ? (
          <>
            <p className="text-gray-700 mb-4">
              Transfer account ownership to another Co-Admin. This action will
              demote you from Account Owner to Co-Admin.
            </p>

            {eligibleMembers.length === 0 ? (
              <div className="bg-yellow-50 p-4 rounded mb-4">
                <p className="text-sm text-yellow-800">
                  You must have at least one Co-Admin to transfer ownership.
                  Promote a family member to Co-Admin first.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-4">
                {eligibleMembers.map(member => (
                  <button
                    key={member.id}
                    onClick={() => setSelectedMember(member.userId)}
                    className={`w-full p-3 text-left rounded border ${
                      selectedMember === member.userId
                        ? 'bg-blue-50 border-blue-500'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.email}</div>
                  </button>
                ))}
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              {eligibleMembers.length > 0 && (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={!selectedMember}
                  className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-gray-700 mb-4">
              Are you absolutely sure you want to transfer ownership to{' '}
              <strong>
                {eligibleMembers.find(m => m.userId === selectedMember)?.name}
              </strong>
              ? This cannot be undone without their consent.
            </p>

            <div className="flex space-x-2">
              <button
                onClick={() => setConfirming(false)}
                className="flex-1 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={handleTransfer}
                className="flex-1 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirm Transfer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Example 4: Simple Role Badge Component
 */
export function RoleBadge({ role }: { role: FamilyRole }) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(
        role
      )}`}
    >
      {getRoleLabel(role)}
    </span>
  )
}
