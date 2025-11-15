/**
 * Family Invitations Hook
 *
 * React hook for managing family invitations (sent and received)
 * Handles invitation lifecycle: send, accept, decline, revoke
 */

import { useState, useEffect, useCallback } from 'react'
import { medicalOperations } from '@/lib/medical-operations'
import type { FamilyInvitation, FamilyInvitationForm, FamilyMember } from '@/types/medical'
import toast from 'react-hot-toast'

interface UseInvitationsReturn {
  sentInvitations: FamilyInvitation[]
  receivedInvitations: FamilyInvitation[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  sendInvitation: (data: FamilyInvitationForm) => Promise<FamilyInvitation>
  acceptInvitation: (invitationId: string) => Promise<FamilyMember>
  declineInvitation: (invitationId: string) => Promise<void>
  revokeInvitation: (invitationId: string) => Promise<void>
}

export function useInvitations(autoFetch = true): UseInvitationsReturn {
  const [sentInvitations, setSentInvitations] = useState<FamilyInvitation[]>([])
  const [receivedInvitations, setReceivedInvitations] = useState<FamilyInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await medicalOperations.family.getInvitations()
      setSentInvitations(data.sent)
      setReceivedInvitations(data.received)
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch invitations'
      setError(errorMsg)
      console.error('Error fetching invitations:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) {
      fetchInvitations()
    }
  }, [autoFetch, fetchInvitations])

  const sendInvitation = useCallback(
    async (data: FamilyInvitationForm): Promise<FamilyInvitation> => {
      try {
        const newInvitation = await medicalOperations.family.sendInvitation(data)

        // Add to sent invitations
        setSentInvitations(prev => [newInvitation, ...prev])

        toast.success(`Invitation sent to ${data.recipientEmail}`)
        return newInvitation
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to send invitation'
        toast.error(errorMsg)
        throw err
      }
    },
    []
  )

  const acceptInvitation = useCallback(
    async (invitationId: string): Promise<FamilyMember> => {
      try {
        // Optimistic update - remove from received
        setReceivedInvitations(prev =>
          prev.filter(inv => inv.id !== invitationId)
        )

        const familyMember = await medicalOperations.family.acceptInvitation(invitationId)

        toast.success('Invitation accepted!')
        return familyMember
      } catch (err: any) {
        // Revert optimistic update
        await fetchInvitations()
        const errorMsg = err.message || 'Failed to accept invitation'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchInvitations]
  )

  const declineInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      try {
        // Optimistic update
        setReceivedInvitations(prev =>
          prev.filter(inv => inv.id !== invitationId)
        )

        await medicalOperations.family.declineInvitation(invitationId)

        toast.success('Invitation declined')
      } catch (err: any) {
        // Revert optimistic update
        await fetchInvitations()
        const errorMsg = err.message || 'Failed to decline invitation'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchInvitations]
  )

  const revokeInvitation = useCallback(
    async (invitationId: string): Promise<void> => {
      try {
        // Optimistic update
        setSentInvitations(prev =>
          prev.map(inv =>
            inv.id === invitationId
              ? { ...inv, status: 'revoked' as const }
              : inv
          )
        )

        await medicalOperations.family.revokeInvitation(invitationId)

        toast.success('Invitation revoked')
      } catch (err: any) {
        // Revert optimistic update
        await fetchInvitations()
        const errorMsg = err.message || 'Failed to revoke invitation'
        toast.error(errorMsg)
        throw err
      }
    },
    [fetchInvitations]
  )

  return {
    sentInvitations,
    receivedInvitations,
    loading,
    error,
    refetch: fetchInvitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation
  }
}
