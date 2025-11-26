/**
 * Family Roles Management Hook
 *
 * React hook for managing family member roles and hierarchy
 * Handles role assignment, ownership transfer, and family structure
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { FamilyMember, FamilyRole } from '@/types/medical'
import {
  canAssignRole,
  canEditMember,
  validateRoleAssignment,
  getRoleLabel,
  hasAdminPrivileges,
  isAccountOwner
} from '@/lib/family-roles'
import toast from 'react-hot-toast'

interface UseFamilyRolesOptions {
  autoFetch?: boolean
}

interface UseFamilyRolesReturn {
  familyMembers: FamilyMember[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  assignRole: (memberId: string, newRole: FamilyRole) => Promise<FamilyMember>
  transferOwnership: (newOwnerId: string) => Promise<void>
  getFamilyHierarchy: () => FamilyMember[]
  canUserAssignRole: (targetRole: FamilyRole, currentUserRole?: FamilyRole) => boolean
  canUserEditMember: (targetMember: FamilyMember, currentUserRole?: FamilyRole) => boolean
}

export function useFamilyRoles({
  autoFetch = true
}: UseFamilyRolesOptions = {}): UseFamilyRolesReturn {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch all family members across the account
   */
  const fetchFamilyHierarchy = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await medicalOperations.family.getFamilyHierarchy()
      setFamilyMembers(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch family hierarchy'
      setError(errorMsg)
      console.error('[useFamilyRoles] Error fetching family hierarchy:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchFamilyHierarchy()
    }
  }, [autoFetch, fetchFamilyHierarchy])

  /**
   * Assign a new role to a family member
   */
  const assignRole = useCallback(
    async (memberId: string, newRole: FamilyRole): Promise<FamilyMember> => {
      try {
        // Find the target member
        const targetMember = familyMembers.find(m => m.id === memberId)
        if (!targetMember) {
          throw new Error('Family member not found')
        }

        // Find current user (account owner)
        const currentUser = familyMembers.find(m => m.familyRole === 'account_owner')
        if (!currentUser) {
          throw new Error('Account owner not found')
        }

        // Validate role assignment
        const validation = validateRoleAssignment(
          currentUser.familyRole,
          targetMember.familyRole,
          newRole
        )

        if (!validation.valid) {
          throw new Error(validation.error)
        }

        // Optimistic update
        setFamilyMembers(prev =>
          prev.map(member =>
            member.id === memberId
              ? {
                  ...member,
                  familyRole: newRole,
                  roleAssignedAt: new Date().toISOString(),
                  roleAssignedBy: currentUser.userId
                }
              : member
          )
        )

        const updatedMember = await medicalOperations.family.assignRole(
          memberId,
          newRole
        )

        // Update with server response
        setFamilyMembers(prev =>
          prev.map(member =>
            member.id === memberId ? updatedMember : member
          )
        )

        toast.success(
          `Role updated to ${getRoleLabel(newRole)} for ${targetMember.name}`
        )
        return updatedMember
      } catch (err: any) {
        // Revert optimistic update
        await fetchFamilyHierarchy()
        const errorMsg = err.message || 'Failed to assign role'
        toast.error(errorMsg)
        throw err
      }
    },
    [familyMembers, fetchFamilyHierarchy]
  )

  /**
   * Transfer Account Owner status to another family member
   */
  const transferOwnership = useCallback(
    async (newOwnerId: string): Promise<void> => {
      try {
        // Find the new owner
        const newOwner = familyMembers.find(m => m.userId === newOwnerId)
        if (!newOwner) {
          throw new Error('New owner not found')
        }

        // Confirm transfer with user (should be done in UI before calling this)
        const result = await medicalOperations.family.transferOwnership(
          newOwnerId
        )

        // Update local state with both changes
        setFamilyMembers(prev =>
          prev.map(member => {
            if (member.id === result.newOwner.id) {
              return result.newOwner
            }
            if (member.id === result.oldOwner.id) {
              return result.oldOwner
            }
            return member
          })
        )

        toast.success(
          `Account ownership transferred to ${newOwner.name}`,
          {
            duration: 5000,
            icon: '👑'
          }
        )
      } catch (err: any) {
        // Revert by refetching
        await fetchFamilyHierarchy()
        const errorMsg = err.message || 'Failed to transfer ownership'
        toast.error(errorMsg)
        throw err
      }
    },
    [familyMembers, fetchFamilyHierarchy]
  )

  /**
   * Get family hierarchy sorted by role authority
   */
  const getFamilyHierarchy = useCallback((): FamilyMember[] => {
    const roleOrder: Record<FamilyRole, number> = {
      account_owner: 0,
      co_admin: 1,
      caregiver: 2,
      viewer: 3
    }

    return [...familyMembers].sort((a, b) => {
      const aRole = a.familyRole || 'caregiver'
      const bRole = b.familyRole || 'caregiver'
      return roleOrder[aRole] - roleOrder[bRole]
    })
  }, [familyMembers])

  /**
   * Check if current user can assign a specific role
   */
  const canUserAssignRole = useCallback(
    (targetRole: FamilyRole, currentUserRole?: FamilyRole): boolean => {
      if (!currentUserRole) {
        const currentUser = familyMembers.find(
          m => m.familyRole === 'account_owner'
        )
        if (!currentUser) return false
        currentUserRole = currentUser.familyRole
      }

      return canAssignRole(currentUserRole, targetRole)
    },
    [familyMembers]
  )

  /**
   * Check if current user can edit a specific member
   */
  const canUserEditMember = useCallback(
    (targetMember: FamilyMember, currentUserRole?: FamilyRole): boolean => {
      if (!currentUserRole) {
        const currentUser = familyMembers.find(
          m => m.familyRole === 'account_owner'
        )
        if (!currentUser) return false
        currentUserRole = currentUser.familyRole
      }

      const targetRole = targetMember.familyRole || 'caregiver'
      return canEditMember(currentUserRole, targetRole)
    },
    [familyMembers]
  )

  return {
    familyMembers,
    loading,
    error,
    refetch: fetchFamilyHierarchy,
    assignRole,
    transferOwnership,
    getFamilyHierarchy,
    canUserAssignRole,
    canUserEditMember
  }
}

/**
 * Helper function to get current user's role from family members list
 */
export function getCurrentUserRole(
  familyMembers: FamilyMember[],
  currentUserId: string
): FamilyRole | null {
  const currentUser = familyMembers.find(m => m.userId === currentUserId)
  return currentUser?.familyRole || null
}

/**
 * Helper function to check if current user has admin privileges
 */
export function useIsAdmin(
  familyMembers: FamilyMember[],
  currentUserId: string
): boolean {
  const role = getCurrentUserRole(familyMembers, currentUserId)
  return hasAdminPrivileges(role)
}

/**
 * Helper function to check if current user is account owner
 */
export function useIsAccountOwner(
  familyMembers: FamilyMember[],
  currentUserId: string
): boolean {
  const role = getCurrentUserRole(familyMembers, currentUserId)
  return isAccountOwner(role)
}
