/**
 * Family Admin Dashboard Page
 *
 * Comprehensive family management interface with:
 * - Family Members tab (active/accepted members)
 * - Invitations tab (sent and received)
 * - Patient Access Matrix (members vs patients)
 */

'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useFamilyRoles, getCurrentUserRole, useIsAccountOwner } from '@/hooks/useFamilyRoles'
import { useInvitations } from '@/hooks/useInvitations'
import { usePatients } from '@/hooks/usePatients'
import { useHouseholds } from '@/hooks/useHouseholds'
import { useAuth } from '@/hooks/useAuth'
import { PageHeader } from '@/components/ui/PageHeader'
import { InviteModal } from '@/components/family/InviteModal'
import { TransferOwnershipModal } from '@/components/family/TransferOwnershipModal'
import { HouseholdManager } from '@/components/households/HouseholdManager'
import { DutyListView } from '@/components/household/DutyListView'
import AuthGuard from '@/components/auth/AuthGuard'
import { ROLE_LABELS } from '@/lib/family-roles'
import type { FamilyMember, FamilyInvitation } from '@/types/medical'
import type { CaregiverProfile } from '@/types/caregiver'

export default function FamilyDashboardPage() {
  return (
    <AuthGuard>
      <FamilyDashboardContent />
    </AuthGuard>
  )
}

function FamilyDashboardContent() {
  const { user } = useAuth()
  const { familyMembers, loading: familyLoading, transferOwnership } = useFamilyRoles()
  const { sentInvitations, receivedInvitations, loading: invitationsLoading, acceptInvitation, declineInvitation, revokeInvitation, resendInvitation } = useInvitations()
  const { patients, loading: patientsLoading } = usePatients()
  const { households, loading: householdsLoading } = useHouseholds()

  // Check URL for tab parameter
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialTab = (searchParams?.get('tab') as 'members' | 'invitations' | 'access' | 'households' | 'duties') || 'members'

  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'access' | 'households' | 'duties'>(initialTab)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [selectedHouseholdForDuties, setSelectedHouseholdForDuties] = useState<string | null>(null)

  // Get current user's role and permissions
  const currentUserRole = getCurrentUserRole(familyMembers, user?.uid || '')
  const isAccountOwner = useIsAccountOwner(familyMembers, user?.uid || '')
  const currentOwner = familyMembers.find(m => m.familyRole === 'account_owner')

  // Filter active family members (accepted status)
  const activeMembers = useMemo(() => {
    return familyMembers.filter(m => m.status === 'accepted')
  }, [familyMembers])

  const loading = familyLoading || invitationsLoading || patientsLoading || householdsLoading

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'accepted':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      case 'declined':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'revoked':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'account_owner':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white'
      case 'co_admin':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
      case 'caregiver':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
      case 'viewer':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
      default:
        return 'bg-muted text-muted-foreground'
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Caregivers"
        subtitle="Manage family members, invitations, and patient access"
        actions={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium"
            >
              + Invite Caregiver
            </button>
            <Link
              href="/family/manage-roles"
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors font-medium"
            >
              Manage Roles
            </Link>
            {isAccountOwner && currentOwner && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium"
              >
                Transfer Ownership
              </button>
            )}
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex items-center gap-4 mb-6 border-b border-border overflow-x-auto">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Family Members ({activeMembers.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'invitations'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Invitations ({sentInvitations.length + receivedInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'access'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Patient Access Matrix
          </button>
          <button
            onClick={() => setActiveTab('households')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'households'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Households
          </button>
          <button
            onClick={() => setActiveTab('duties')}
            className={`px-4 py-3 font-medium transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'duties'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            🏠 Household Duties
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading family data...</p>
          </div>
        ) : (
          <>
            {/* Family Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-4">
                {activeMembers.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
                    <p className="text-muted-foreground mb-4">
                      No active family members yet
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Invite Your First Caregiver
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {activeMembers.map(member => (
                      <FamilyMemberCard
                        key={member.id}
                        member={member}
                        patients={patients}
                        getRoleBadgeColor={getRoleBadgeColor}
                        formatDate={formatDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Invitations Tab */}
            {activeTab === 'invitations' && (
              <div className="space-y-6">
                {/* Received Invitations Section */}
                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Received Invitations ({receivedInvitations.length})
                  </h2>
                  {receivedInvitations.length === 0 ? (
                    <div className="bg-card rounded-lg border-2 border-border p-6 text-center">
                      <p className="text-muted-foreground">No pending invitations</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {receivedInvitations.map(invitation => (
                        <InvitationCard
                          key={invitation.id}
                          invitation={invitation}
                          type="received"
                          onAccept={() => acceptInvitation(invitation.id)}
                          onDecline={() => declineInvitation(invitation.id)}
                          getStatusColor={getStatusColor}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Sent Invitations Section */}
                <section>
                  <h2 className="text-xl font-semibold text-foreground mb-4">
                    Sent Invitations ({sentInvitations.length})
                  </h2>
                  {sentInvitations.length === 0 ? (
                    <div className="bg-card rounded-lg border-2 border-border p-6 text-center">
                      <p className="text-muted-foreground mb-4">
                        No sent invitations yet
                      </p>
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Invite Your First Caregiver
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {sentInvitations.map(invitation => (
                        <InvitationCard
                          key={invitation.id}
                          invitation={invitation}
                          type="sent"
                          onRevoke={() => revokeInvitation(invitation.id)}
                          onResend={() => resendInvitation(invitation.id)}
                          getStatusColor={getStatusColor}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* Patient Access Matrix Tab */}
            {activeTab === 'access' && (
              <div>
                {patients.length === 0 || activeMembers.length === 0 ? (
                  <div className="bg-card rounded-lg border-2 border-border p-8 text-center">
                    <p className="text-muted-foreground mb-4">
                      {patients.length === 0
                        ? 'No patients found. Create a patient profile to manage family access.'
                        : 'No active family members. Invite family members to share patient access.'}
                    </p>
                    {patients.length === 0 ? (
                      <Link
                        href="/patients/new"
                        className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Create Patient Profile
                      </Link>
                    ) : (
                      <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        Invite Caregiver
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-card rounded-lg border-2 border-border overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-foreground border-b border-border">
                            Family Member
                          </th>
                          {patients.map(patient => (
                            <th
                              key={patient.id}
                              className="px-4 py-3 text-center text-sm font-semibold text-foreground border-b border-border"
                            >
                              <div className="flex flex-col items-center gap-1">
                                <span>{patient.name}</span>
                                <span className="text-xs text-muted-foreground font-normal">
                                  ({patient.relationship})
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {activeMembers.map((member, idx) => (
                          <tr
                            key={member.id}
                            className={idx % 2 === 0 ? 'bg-background' : 'bg-card'}
                          >
                            <td className="px-4 py-4 border-b border-border">
                              <div className="flex items-center gap-3">
                                {member.photo ? (
                                  <img
                                    src={member.photo}
                                    alt={member.name}
                                    className="w-10 h-10 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-full bg-primary-light flex items-center justify-center">
                                    <span className="text-primary font-semibold">
                                      {member.name.charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-foreground">
                                    {member.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {member.familyRole && ROLE_LABELS[member.familyRole]}
                                  </div>
                                </div>
                              </div>
                            </td>
                            {patients.map(patient => {
                              const hasAccess = member.patientsAccess.includes(patient.id)
                              return (
                                <td
                                  key={patient.id}
                                  className="px-4 py-4 text-center border-b border-border"
                                >
                                  {hasAccess ? (
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                                      ✓
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-400">
                                      -
                                    </span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Households Tab */}
            {activeTab === 'households' && (
              <div>
                <HouseholdManager />
              </div>
            )}

            {/* Household Duties Tab */}
            {activeTab === 'duties' && (
              <div className="space-y-6">
                {/* Household Selector */}
                {households.length === 0 ? (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                    <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                      No Households Found
                    </h3>
                    <p className="text-yellow-800 mb-4">
                      You need to create a household before you can assign household duties.
                    </p>
                    <Link
                      href="/family-admin/households"
                      className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                    >
                      Create Household
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Household Selection */}
                    <div className="bg-card rounded-lg border border-border p-6">
                      <h3 className="text-lg font-semibold text-foreground mb-4">
                        Select Household to Manage Duties
                      </h3>
                      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {households.map(household => (
                          <button
                            key={household.id}
                            onClick={() => setSelectedHouseholdForDuties(household.id)}
                            className={`p-4 rounded-lg border-2 transition-all text-left ${
                              selectedHouseholdForDuties === household.id
                                ? 'border-primary bg-primary/5'
                                : 'border-border hover:border-primary/50'
                            }`}
                          >
                            <div className="font-semibold text-foreground">{household.name}</div>
                            {household.nickname && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {household.nickname}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground mt-2">
                              {household.memberIds?.length || 0} members
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Duties List */}
                    {selectedHouseholdForDuties && (
                      <div>
                        <DutyListView
                          householdId={selectedHouseholdForDuties}
                          householdName={households.find(h => h.id === selectedHouseholdForDuties)?.name || ''}
                          households={households}
                          onHouseholdChange={setSelectedHouseholdForDuties}
                          caregivers={activeMembers.map(member => ({
                            id: member.id,
                            userId: member.userId || member.id,
                            name: member.name,
                            email: member.email,
                            familyRole: member.familyRole,
                            patientsAccess: [],
                            patientRelationships: {},
                            permissions: member.permissions,
                            availabilityStatus: 'available' as const,
                            preferences: {
                              notificationMethods: ['email'],
                              language: 'en',
                              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
                            },
                            joinedAt: member.acceptedAt || new Date().toISOString(),
                            managedBy: user?.uid || '',
                            profileVisibility: 'family_only' as const,
                            shareContactInfo: true,
                            shareAvailability: true
                          } as CaregiverProfile))}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        currentUserRole={currentUserRole || 'caregiver'}
      />

      {isAccountOwner && currentOwner && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          currentOwner={currentOwner}
          familyMembers={familyMembers}
          onTransfer={async (newOwnerId: string) => {
            await transferOwnership(newOwnerId)
            setShowTransferModal(false)
          }}
        />
      )}
    </div>
  )
}

// Family Member Card Component
interface FamilyMemberCardProps {
  member: FamilyMember
  patients: any[]
  getRoleBadgeColor: (role: string) => string
  formatDate: (date?: string) => string
}

function FamilyMemberCard({ member, patients, getRoleBadgeColor, formatDate }: FamilyMemberCardProps) {
  const accessiblePatients = patients.filter(p => member.patientsAccess.includes(p.id))
  const permissionCount = Object.values(member.permissions).filter(Boolean).length

  return (
    <div className="bg-card rounded-lg border-2 border-border p-5 hover:border-primary-light transition-colors">
      <div className="flex items-start gap-4 mb-4">
        {member.photo ? (
          <img
            src={member.photo}
            alt={member.name}
            className="w-16 h-16 rounded-full object-cover"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center">
            <span className="text-primary font-semibold text-xl">
              {member.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{member.name}</h3>
          <p className="text-sm text-muted-foreground truncate">{member.email}</p>
          {member.familyRole && (
            <span className={`inline-block mt-2 px-2 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.familyRole)}`}>
              {ROLE_LABELS[member.familyRole]}
            </span>
          )}
        </div>
      </div>

      {/* Relationship */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">Relationship: </span>
        <span className="text-sm text-foreground font-medium">{member.relationship}</span>
      </div>

      {/* Patient Access */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">Patient Access: </span>
        <span className="text-sm text-foreground font-medium">
          {accessiblePatients.length} of {patients.length}
        </span>
        {accessiblePatients.length > 0 && (
          <div className="mt-1 text-xs text-muted-foreground">
            {accessiblePatients.map(p => p.name).join(', ')}
          </div>
        )}
      </div>

      {/* Permissions */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">Permissions: </span>
        <span className="text-sm text-foreground font-medium">
          {permissionCount} of {Object.keys(member.permissions).length}
        </span>
      </div>

      {/* Last Active */}
      {member.lastActive && (
        <div className="pt-3 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Last active: {formatDate(member.lastActive)}
          </span>
        </div>
      )}

      {/* Accepted Date */}
      {member.acceptedAt && (
        <div className="pt-2">
          <span className="text-xs text-muted-foreground">
            Joined: {formatDate(member.acceptedAt)}
          </span>
        </div>
      )}
    </div>
  )
}

// Invitation Card Component
interface InvitationCardProps {
  invitation: FamilyInvitation
  type: 'sent' | 'received'
  onAccept?: () => void
  onDecline?: () => void
  onRevoke?: () => void
  onResend?: () => void
  getStatusColor: (status: string) => string
  formatDate: (date?: string) => string
}

function InvitationCard({
  invitation,
  type,
  onAccept,
  onDecline,
  onRevoke,
  onResend,
  getStatusColor,
  formatDate
}: InvitationCardProps) {
  const permissionCount = Object.values(invitation.permissions).filter(Boolean).length

  return (
    <div className="bg-card rounded-lg border-2 border-border p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground">
            {type === 'sent' ? invitation.recipientEmail : invitation.invitedByName}
          </h3>
          <p className="text-sm text-muted-foreground">
            {type === 'sent' ? `Sent by you` : `From ${invitation.invitedByName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
        </span>
      </div>

      {/* Invite Code */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">Invite Code: </span>
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {invitation.inviteCode}
        </code>
      </div>

      {/* Role */}
      {invitation.familyRole && (
        <div className="mb-3">
          <span className="text-xs text-muted-foreground">Role: </span>
          <span className="text-sm text-foreground font-medium">
            {ROLE_LABELS[invitation.familyRole]}
          </span>
        </div>
      )}

      {/* Patients Shared */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">
          Patients shared: {invitation.patientsShared.length}
        </span>
      </div>

      {/* Permissions */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground">
          Permissions granted: {permissionCount} of {Object.keys(invitation.permissions).length}
        </span>
      </div>

      {/* Personal Message */}
      {invitation.message && (
        <div className="mb-4 p-3 bg-background rounded-lg">
          <p className="text-sm text-foreground italic">
            "{invitation.message}"
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
        <span>Created: {formatDate(invitation.createdAt)}</span>
        <span>Expires: {formatDate(invitation.expiresAt)}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        {invitation.status === 'pending' && type === 'received' && (
          <>
            <button
              onClick={onAccept}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              Accept
            </button>
            <button
              onClick={onDecline}
              className="px-4 py-2 text-error hover:bg-error-light dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
            >
              Decline
            </button>
          </>
        )}
        {invitation.status === 'pending' && type === 'sent' && (
          <>
            <button
              onClick={onResend}
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors text-sm font-medium"
            >
              Resend Email
            </button>
            <button
              onClick={onRevoke}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 transition-colors text-sm font-medium"
            >
              Revoke
            </button>
          </>
        )}
        {invitation.status !== 'pending' && (
          <div className="text-sm text-muted-foreground italic">
            This invitation has been {invitation.status}
            {invitation.acceptedAt && ` on ${formatDate(invitation.acceptedAt)}`}
          </div>
        )}
      </div>
    </div>
  )
}
