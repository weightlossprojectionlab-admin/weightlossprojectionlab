/**
 * Family Dashboard Hook
 *
 * Consolidated hook that aggregates data from multiple family-related sources
 * Provides a unified interface for family members, invitations, patients, and permissions
 */

'use client'

import { useMemo, useCallback } from 'react'
import { useFamilyRoles } from './useFamilyRoles'
import { useInvitations } from './useInvitations'
import { usePatients } from './usePatients'
import { useAuth } from './useAuth'
import { medicalOperations } from '@/lib/medical-operations'
import { ROLE_CAPABILITIES } from '@/lib/family-roles'
import type {
  FamilyMember,
  FamilyInvitation,
  PatientProfile,
  FamilyRole,
  FamilyMemberPermissions,
  FamilyInvitationForm
} from '@/types/medical'

// ==================== TYPES ====================

/**
 * Patient Access Matrix Entry
 * Represents a single member's access to a single patient
 */
export interface PatientAccessEntry {
  memberId: string
  memberName: string
  memberEmail: string
  memberRole: FamilyRole
  patientId: string
  patientName: string
  hasAccess: boolean
  permissions: FamilyMemberPermissions
}

/**
 * Patient Access Matrix
 * Grid-like structure for visualizing member x patient access
 */
export interface PatientAccessMatrix {
  members: FamilyMember[]
  patients: PatientProfile[]
  entries: PatientAccessEntry[]
  getMemberPatients: (memberId: string) => PatientProfile[]
  getPatientMembers: (patientId: string) => FamilyMember[]
  hasAccess: (memberId: string, patientId: string) => boolean
}

/**
 * Computed Stats
 */
export interface FamilyDashboardStats {
  activeMembersCount: number
  pendingInvitationsCount: number
  totalPatientsCount: number
  sharedPatientsCount: number
}

/**
 * Action Functions Interface
 */
export interface FamilyDashboardActions {
  inviteMember: (data: FamilyInvitationForm) => Promise<FamilyInvitation>
  updateMemberRole: (memberId: string, newRole: FamilyRole) => Promise<FamilyMember>
  updateMemberPermissions: (
    patientId: string,
    memberId: string,
    permissions: Partial<FamilyMember>
  ) => Promise<FamilyMember>
  removeMemberAccess: (patientId: string, memberId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<FamilyMember>
  declineInvitation: (invitationId: string) => Promise<void>
  revokeInvitation: (invitationId: string) => Promise<void>
  resendInvitation: (invitationId: string) => Promise<void>
}

/**
 * Full Hook Return Type
 */
export interface UseFamilyDashboardReturn {
  // Raw data from underlying hooks
  familyMembers: FamilyMember[]
  sentInvitations: FamilyInvitation[]
  receivedInvitations: FamilyInvitation[]
  patients: PatientProfile[]
  currentUser: {
    uid: string
    email: string | null
  } | null

  // Computed values
  activeMembersCount: number
  pendingInvitationsCount: number
  patientAccessMatrix: PatientAccessMatrix
  currentUserRole: FamilyRole | null
  canManageRoles: boolean
  canInvite: boolean
  stats: FamilyDashboardStats

  // Loading and error states
  loading: boolean
  error: string | null

  // Action functions
  actions: FamilyDashboardActions

  // Refetch function
  refetch: () => Promise<void>
}

// ==================== HOOK ====================

export function useFamilyDashboard(): UseFamilyDashboardReturn {
  // Fetch data from all underlying hooks
  const {
    familyMembers,
    loading: familyLoading,
    error: familyError,
    refetch: refetchFamily,
    assignRole
  } = useFamilyRoles({ autoFetch: true })

  const {
    sentInvitations,
    receivedInvitations,
    loading: invitationsLoading,
    error: invitationsError,
    refetch: refetchInvitations,
    sendInvitation,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    resendInvitation
  } = useInvitations(true)

  const {
    patients,
    loading: patientsLoading,
    error: patientsError,
    refetch: refetchPatients
  } = usePatients()

  const { user, loading: authLoading } = useAuth()

  // ==================== COMPUTED VALUES ====================

  /**
   * Get current user's role
   */
  const currentUserRole = useMemo((): FamilyRole | null => {
    if (!user?.uid) return null
    const currentMember = familyMembers.find(m => m.userId === user.uid)
    return currentMember?.familyRole || null
  }, [familyMembers, user?.uid])

  /**
   * Count of active (accepted) family members
   */
  const activeMembersCount = useMemo(() => {
    return familyMembers.filter(m => m.status === 'accepted').length
  }, [familyMembers])

  /**
   * Count of pending invitations
   */
  const pendingInvitationsCount = useMemo(() => {
    return sentInvitations.filter(inv => inv.status === 'pending').length
  }, [sentInvitations])

  /**
   * Check if current user can manage roles
   */
  const canManageRoles = useMemo(() => {
    if (!currentUserRole) return false
    return ROLE_CAPABILITIES[currentUserRole]?.canManageRoles || false
  }, [currentUserRole])

  /**
   * Check if current user can invite others
   */
  const canInvite = useMemo(() => {
    if (!currentUserRole) return false
    return ROLE_CAPABILITIES[currentUserRole]?.canInviteMembers || false
  }, [currentUserRole])

  /**
   * Patient Access Matrix
   * Grid showing which members have access to which patients
   */
  const patientAccessMatrix = useMemo((): PatientAccessMatrix => {
    const entries: PatientAccessEntry[] = []

    // Build the grid
    familyMembers.forEach(member => {
      patients.forEach(patient => {
        const hasAccess = member.patientsAccess?.includes(patient.id) || false

        entries.push({
          memberId: member.id,
          memberName: member.name,
          memberEmail: member.email,
          memberRole: member.familyRole,
          patientId: patient.id,
          patientName: patient.name,
          hasAccess,
          permissions: member.permissions
        })
      })
    })

    return {
      members: familyMembers,
      patients,
      entries,

      // Helper: Get all patients accessible by a member
      getMemberPatients: (memberId: string) => {
        const member = familyMembers.find(m => m.id === memberId)
        if (!member) return []
        return patients.filter(p => member.patientsAccess?.includes(p.id))
      },

      // Helper: Get all members with access to a patient
      getPatientMembers: (patientId: string) => {
        return familyMembers.filter(m => m.patientsAccess?.includes(patientId))
      },

      // Helper: Check if a member has access to a patient
      hasAccess: (memberId: string, patientId: string) => {
        const member = familyMembers.find(m => m.id === memberId)
        return member?.patientsAccess?.includes(patientId) || false
      }
    }
  }, [familyMembers, patients])

  /**
   * Dashboard statistics
   */
  const stats = useMemo((): FamilyDashboardStats => {
    // Count how many patients are shared (have > 1 member with access)
    const sharedPatientsCount = patients.filter(patient => {
      const membersWithAccess = familyMembers.filter(m =>
        m.patientsAccess?.includes(patient.id)
      )
      return membersWithAccess.length > 1
    }).length

    return {
      activeMembersCount,
      pendingInvitationsCount,
      totalPatientsCount: patients.length,
      sharedPatientsCount
    }
  }, [activeMembersCount, pendingInvitationsCount, patients, familyMembers])

  // ==================== ACTION FUNCTIONS ====================

  /**
   * Invite a new family member
   */
  const inviteMember = useCallback(
    async (data: FamilyInvitationForm): Promise<FamilyInvitation> => {
      const invitation = await sendInvitation(data)
      return invitation
    },
    [sendInvitation]
  )

  /**
   * Update a member's role
   */
  const updateMemberRole = useCallback(
    async (memberId: string, newRole: FamilyRole): Promise<FamilyMember> => {
      const updatedMember = await assignRole(memberId, newRole)
      return updatedMember
    },
    [assignRole]
  )

  /**
   * Update a member's permissions for a specific patient
   */
  const updateMemberPermissions = useCallback(
    async (
      patientId: string,
      memberId: string,
      permissions: Partial<FamilyMember>
    ): Promise<FamilyMember> => {
      const updatedMember = await medicalOperations.family.updateMemberPermissions(
        patientId,
        memberId,
        permissions
      )

      // Refetch family data to sync state
      await refetchFamily()

      return updatedMember
    },
    [refetchFamily]
  )

  /**
   * Remove a member's access to a patient
   */
  const removeMemberAccess = useCallback(
    async (patientId: string, memberId: string): Promise<void> => {
      await medicalOperations.family.removeFamilyMember(patientId, memberId)

      // Refetch family data to sync state
      await refetchFamily()
    },
    [refetchFamily]
  )

  /**
   * Refetch all data
   */
  const refetch = useCallback(async () => {
    await Promise.all([
      refetchFamily(),
      refetchInvitations(),
      refetchPatients()
    ])
  }, [refetchFamily, refetchInvitations, refetchPatients])

  // ==================== LOADING & ERROR STATES ====================

  const loading = familyLoading || invitationsLoading || patientsLoading || authLoading
  const error = familyError || invitationsError || patientsError

  // ==================== RETURN ====================

  return {
    // Raw data
    familyMembers,
    sentInvitations,
    receivedInvitations,
    patients,
    currentUser: user
      ? {
          uid: user.uid,
          email: user.email
        }
      : null,

    // Computed values
    activeMembersCount,
    pendingInvitationsCount,
    patientAccessMatrix,
    currentUserRole,
    canManageRoles,
    canInvite,
    stats,

    // State
    loading,
    error,

    // Actions
    actions: {
      inviteMember,
      updateMemberRole,
      updateMemberPermissions,
      removeMemberAccess,
      acceptInvitation,
      declineInvitation,
      revokeInvitation,
      resendInvitation
    },

    // Refetch
    refetch
  }
}

// ==================== HELPER EXPORTS ====================

/**
 * Helper: Get a member's accessible patients
 */
export function getMemberPatients(
  member: FamilyMember,
  allPatients: PatientProfile[]
): PatientProfile[] {
  return allPatients.filter(p => member.patientsAccess?.includes(p.id))
}

/**
 * Helper: Get members with access to a patient
 */
export function getPatientMembers(
  patient: PatientProfile,
  allMembers: FamilyMember[]
): FamilyMember[] {
  return allMembers.filter(m => m.patientsAccess?.includes(patient.id))
}

/**
 * Helper: Check if member has access to patient
 */
export function memberHasPatientAccess(
  memberId: string,
  patientId: string,
  members: FamilyMember[]
): boolean {
  const member = members.find(m => m.id === memberId)
  return member?.patientsAccess?.includes(patientId) || false
}
