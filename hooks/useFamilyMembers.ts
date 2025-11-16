/**
 * Family Members Hook
 *
 * React hook for managing family members with access to patients
 * Provides real-time updates and optimistic UI
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { FamilyMember, FamilyMemberPermissions } from '@/types/medical'
import toast from 'react-hot-toast'

interface UseFamilyMembersOptions {
  patientId?: string
  autoFetch?: boolean
}

interface UseFamilyMembersReturn {
  familyMembers: FamilyMember[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  updateMemberPermissions: (
    memberId: string,
    permissions: FamilyMemberPermissions
  ) => Promise<FamilyMember>
  removeMember: (memberId: string) => Promise<void>
}

export function useFamilyMembers({
  patientId,
  autoFetch = true
}: UseFamilyMembersOptions = {}): UseFamilyMembersReturn {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFamilyMembers = useCallback(async () => {
    if (!patientId) {
      setFamilyMembers([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await medicalOperations.family.getFamilyMembers(patientId)
      setFamilyMembers(data)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch family members'
      setError(errorMsg)
      console.error('Error fetching family members:', err)
    } finally {
      setLoading(false)
    }
  }, [patientId])

  useEffect(() => {
    if (autoFetch) {
      fetchFamilyMembers()
    }
  }, [autoFetch, fetchFamilyMembers])

  const updateMemberPermissions = useCallback(
    async (
      memberId: string,
      permissions: FamilyMemberPermissions
    ): Promise<FamilyMember> => {
      if (!patientId) {
        throw new Error('Patient ID is required')
      }

      try {
        // Optimistic update
        setFamilyMembers(prev =>
          prev.map(member =>
            member.id === memberId ? { ...member, permissions } : member
          )
        )

        const updatedMember = await medicalOperations.family.updateMemberPermissions(
          patientId,
          memberId,
          { permissions }
        )

        // Update with server response
        setFamilyMembers(prev =>
          prev.map(member =>
            member.id === memberId ? updatedMember : member
          )
        )

        toast.success('Permissions updated')
        return updatedMember
      } catch (err: any) {
        // Revert optimistic update
        await fetchFamilyMembers()
        const errorMsg = err.message || 'Failed to update permissions'
        toast.error(errorMsg)
        throw err
      }
    },
    [patientId, fetchFamilyMembers]
  )

  const removeMember = useCallback(
    async (memberId: string): Promise<void> => {
      if (!patientId) {
        throw new Error('Patient ID is required')
      }

      try {
        // Optimistic update
        const previousMembers = familyMembers
        setFamilyMembers(prev => prev.filter(member => member.id !== memberId))

        await medicalOperations.family.removeFamilyMember(patientId, memberId)

        toast.success('Family member removed')
      } catch (err: any) {
        // Revert optimistic update
        await fetchFamilyMembers()
        const errorMsg = err.message || 'Failed to remove family member'
        toast.error(errorMsg)
        throw err
      }
    },
    [patientId, familyMembers, fetchFamilyMembers]
  )

  return {
    familyMembers,
    loading,
    error,
    refetch: fetchFamilyMembers,
    updateMemberPermissions,
    removeMember
  }
}
