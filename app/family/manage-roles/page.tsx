/**
 * Family Role Management Page
 *
 * Manage family member roles and permissions
 * - Display role hierarchy (Account Owner > Co-Admins > Caregivers > Viewers)
 * - Change member roles (if permitted)
 * - Transfer ownership
 * - View role capabilities and permissions
 */

'use client'

import { useState } from 'react'
import { useFamilyRoles, getCurrentUserRole } from '@/hooks/useFamilyRoles'
import { useAuth } from '@/hooks/useAuth'
import { usePatients } from '@/hooks/usePatients'
import { PageHeader } from '@/components/ui/PageHeader'
import AuthGuard from '@/components/auth/AuthGuard'
import { AccountOwnerBadge, RoleBadge } from '@/components/family/AccountOwnerBadge'
import { RoleSelector } from '@/components/family/RoleSelector'
import { TransferOwnershipModal } from '@/components/family/TransferOwnershipModal'
import { EditMemberModal, type MemberUpdateData } from '@/components/family/EditMemberModal'
import {
  ROLE_DESCRIPTIONS,
  ROLE_CAPABILITIES,
  getRoleLabel
} from '@/lib/family-roles'
import type { FamilyMember, FamilyRole } from '@/types/medical'
import {
  UserGroupIcon,
  ShieldCheckIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline'

export default function ManageRolesPage() {
  return (
    <AuthGuard>
      <ManageRolesContent />
    </AuthGuard>
  )
}

function ManageRolesContent() {
  const { user } = useAuth()
  const {
    familyMembers,
    loading,
    error,
    assignRole,
    transferOwnership,
    updateMember,
    removeMember,
    getFamilyHierarchy,
    canUserEditMember,
    refetch
  } = useFamilyRoles()
  const { patients } = usePatients()

  const [showTransferModal, setShowTransferModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null)
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null)
  const [migrating, setMigrating] = useState(false)

  const currentUserRole = getCurrentUserRole(familyMembers, user?.uid || '')
  const hierarchicalMembers = getFamilyHierarchy()
  const accountOwner = hierarchicalMembers.find(m => m.familyRole === 'account_owner')
  const coAdmins = hierarchicalMembers.filter(m => m.familyRole === 'co_admin')
  const caregivers = hierarchicalMembers.filter(m => m.familyRole === 'caregiver')
  const viewers = hierarchicalMembers.filter(m => m.familyRole === 'viewer')

  // Eligible members for ownership transfer (exclude current owner)
  const eligibleForTransfer = familyMembers.filter(
    m => m.familyRole !== 'account_owner'
  )

  const handleRoleChange = async (memberId: string, newRole: FamilyRole) => {
    try {
      await assignRole(memberId, newRole)
      await refetch()
    } catch (err) {
      console.error('Failed to change role:', err)
    }
  }

  const handleTransferOwnership = async (newOwnerId: string) => {
    try {
      await transferOwnership(newOwnerId)
      await refetch()
      setShowTransferModal(false)
    } catch (err) {
      console.error('Failed to transfer ownership:', err)
      throw err
    }
  }

  const toggleExpandMember = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId)
  }

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member)
    setShowEditModal(true)
  }

  const handleSaveMember = async (updates: MemberUpdateData) => {
    await updateMember(updates.memberId, {
      role: updates.role,
      patientsAccess: updates.patientsAccess,
      patientPermissions: updates.patientPermissions
    })
    await refetch()
  }

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (confirm(`Are you sure you want to remove ${memberName} from your family account? This will revoke their access to all patient records.`)) {
      await removeMember(memberId)
      await refetch()
    }
  }

  const handleMigration = async () => {
    if (!confirm('This will backfill patient-level records for all family members. This is a one-time fix for the patient visibility issue. Continue?')) {
      return
    }

    setMigrating(true)
    try {
      const { medicalOperations } = await import('@/lib/medical-operations')
      const result = await medicalOperations.family.migratePatientRecords()

      alert(`Migration completed!\n\nRecords created: ${result.recordsCreated}\nRecords skipped: ${result.recordsSkipped}\nFamily members processed: ${result.totalFamilyMembers}\n\n${result.errors.length > 0 ? `Errors: ${result.errors.join(', ')}` : 'No errors'}`)

      await refetch()
    } catch (error: any) {
      alert(`Migration failed: ${error.message}`)
    } finally {
      setMigrating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Manage Family Roles"
          subtitle="Loading family members..."
          backHref="/family"
        />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Manage Family Roles"
          subtitle="Error loading family members"
          backHref="/family"
        />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-error rounded-lg p-6">
            <p className="font-medium text-error-dark">Error loading family members</p>
            <p className="text-sm text-error-dark mt-1">{error}</p>
            <button
              onClick={refetch}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  const isAccountOwner = currentUserRole === 'account_owner'

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Manage Family Roles"
        subtitle="Control access and permissions for family members"
        backHref="/family"
        actions={
          isAccountOwner && (
            <div className="flex gap-2">
              <button
                onClick={handleMigration}
                disabled={migrating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {migrating ? '⏳ Migrating...' : '🔧 Fix Patient Access'}
              </button>
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium flex items-center gap-2"
              >
                <span className="text-lg">👑</span>
                Transfer Ownership
              </button>
            </div>
          )
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Info Banner */}
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 border-2 border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">Role Hierarchy</p>
              <p>
                Family members are organized by authority level. Higher roles can
                manage lower roles. Only the Account Owner can transfer ownership.
              </p>
            </div>
          </div>
        </div>

        {/* Account Owner Section */}
        {accountOwner && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">👑</span>
              <h2 className="text-xl font-bold text-foreground">Account Owner</h2>
            </div>
            <FamilyMemberCard
              member={accountOwner}
              currentUserRole={currentUserRole}
              isExpanded={expandedMemberId === accountOwner.id}
              onToggleExpand={() => toggleExpandMember(accountOwner.id)}
              onRoleChange={handleRoleChange}
              canEdit={false}
              isCurrentUser={accountOwner.userId === user?.uid}
            />
          </section>
        )}

        {/* Co-Admins Section */}
        {coAdmins.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheckIcon className="w-6 h-6 text-purple-600" />
              <h2 className="text-xl font-bold text-foreground">
                Co-Admins ({coAdmins.length})
              </h2>
            </div>
            <div className="space-y-3">
              {coAdmins.map(member => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  currentUserRole={currentUserRole}
                  isExpanded={expandedMemberId === member.id}
                  onToggleExpand={() => toggleExpandMember(member.id)}
                  onRoleChange={handleRoleChange}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  canEdit={canUserEditMember(member, currentUserRole ?? undefined)}
                  isCurrentUser={member.userId === user?.uid}
                />
              ))}
            </div>
          </section>
        )}

        {/* Caregivers Section */}
        {caregivers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <UserGroupIcon className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold text-foreground">
                Caregivers ({caregivers.length})
              </h2>
            </div>
            <div className="space-y-3">
              {caregivers.map(member => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  currentUserRole={currentUserRole}
                  isExpanded={expandedMemberId === member.id}
                  onToggleExpand={() => toggleExpandMember(member.id)}
                  onRoleChange={handleRoleChange}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  canEdit={canUserEditMember(member, currentUserRole ?? undefined)}
                  isCurrentUser={member.userId === user?.uid}
                />
              ))}
            </div>
          </section>
        )}

        {/* Viewers Section */}
        {viewers.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <EyeIcon className="w-6 h-6 text-gray-600" />
              <h2 className="text-xl font-bold text-foreground">
                Viewers ({viewers.length})
              </h2>
            </div>
            <div className="space-y-3">
              {viewers.map(member => (
                <FamilyMemberCard
                  key={member.id}
                  member={member}
                  currentUserRole={currentUserRole}
                  isExpanded={expandedMemberId === member.id}
                  onToggleExpand={() => toggleExpandMember(member.id)}
                  onRoleChange={handleRoleChange}
                  onEdit={handleEditMember}
                  onRemove={handleRemoveMember}
                  canEdit={canUserEditMember(member, currentUserRole ?? undefined)}
                  isCurrentUser={member.userId === user?.uid}
                />
              ))}
            </div>
          </section>
        )}

        {/* Empty State */}
        {familyMembers.length === 0 && (
          <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
            <UserGroupIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-xl font-bold text-foreground mb-2">
              No Family Members Yet
            </p>
            <p className="text-muted-foreground mb-6">
              Invite family members to collaborate on patient care
            </p>
          </div>
        )}
      </main>

      {/* Transfer Ownership Modal */}
      {accountOwner && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransferOwnership}
          currentOwner={accountOwner}
          familyMembers={eligibleForTransfer}
        />
      )}

      {/* Edit Member Modal */}
      <EditMemberModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setEditingMember(null)
        }}
        member={editingMember}
        currentUserRole={currentUserRole || 'caregiver'}
        patients={patients}
        onSave={handleSaveMember}
      />
    </div>
  )
}

interface FamilyMemberCardProps {
  member: FamilyMember
  currentUserRole: FamilyRole | null
  isExpanded: boolean
  onToggleExpand: () => void
  onRoleChange: (memberId: string, newRole: FamilyRole) => Promise<void>
  onEdit?: (member: FamilyMember) => void
  onRemove?: (memberId: string, memberName: string) => void
  canEdit: boolean
  isCurrentUser: boolean
}

function FamilyMemberCard({
  member,
  currentUserRole,
  isExpanded,
  onToggleExpand,
  onRoleChange,
  onEdit,
  onRemove,
  canEdit,
  isCurrentUser
}: FamilyMemberCardProps) {
  const role = member.familyRole || 'caregiver'
  const capabilities = ROLE_CAPABILITIES[role]
  const managedByMember = member.managedBy // In real app, look up the actual member

  return (
    <div className="bg-card rounded-lg border-2 border-border overflow-hidden transition-all">
      {/* Member Header */}
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {/* Avatar */}
            {member.photo ? (
              <img
                src={member.photo}
                alt={member.name}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  {member.name}
                  {isCurrentUser && (
                    <span className="ml-2 text-xs text-primary">(You)</span>
                  )}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {member.email}
              </p>
              {member.relationship && (
                <p className="text-xs text-muted-foreground capitalize">
                  {member.relationship}
                </p>
              )}
            </div>
          </div>

          {/* Role Badge or Selector */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {role === 'account_owner' ? (
              <AccountOwnerBadge role="account_owner" />
            ) : canEdit && currentUserRole ? (
              <RoleSelector
                value={role}
                currentUserRole={currentUserRole}
                onChange={newRole => onRoleChange(member.id, newRole)}
              />
            ) : (
              <RoleBadge role={role} />
            )}

            {/* Edit Button */}
            {!isCurrentUser && canEdit && role !== 'account_owner' && onEdit && (
              <button
                onClick={() => onEdit(member)}
                className="p-2 hover:bg-primary/10 rounded-lg transition-colors group"
                title="Edit member"
              >
                <PencilSquareIcon className="w-5 h-5 text-primary group-hover:text-primary-hover" />
              </button>
            )}

            {/* Expand Button */}
            <button
              onClick={onToggleExpand}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5 text-foreground" />
              ) : (
                <ChevronDownIcon className="w-5 h-5 text-foreground" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t-2 border-border bg-muted/50 p-4">
          {/* Role Description */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Role Description
            </h4>
            <p className="text-sm text-muted-foreground">
              {ROLE_DESCRIPTIONS[role]}
            </p>
          </div>

          {/* Managed By */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Managed By
            </h4>
            <p className="text-sm text-muted-foreground">
              {managedByMember || 'Account Owner'}
            </p>
          </div>

          {/* Role Assigned Info */}
          {member.roleAssignedAt && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Role Assigned
              </h4>
              <p className="text-sm text-muted-foreground">
                {new Date(member.roleAssignedAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {/* Capabilities */}
          <div className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Role Capabilities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(capabilities).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      value ? 'bg-success' : 'bg-muted-dark'
                    }`}
                  />
                  <span
                    className={
                      value ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Permissions */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">
              Patient Permissions
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(member.permissions).map(([key, value]) => (
                <div
                  key={key}
                  className="flex items-center gap-2 text-sm"
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      value ? 'bg-success' : 'bg-muted-dark'
                    }`}
                  />
                  <span
                    className={
                      value ? 'text-foreground' : 'text-muted-foreground'
                    }
                  >
                    {key.split(/(?=[A-Z])/).join(' ').replace(/^./, str => str.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Patients Access */}
          {member.patientsAccess.length > 0 && (
            <div className="mt-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">
                Patient Access
              </h4>
              <p className="text-sm text-muted-foreground">
                Has access to {member.patientsAccess.length} patient(s)
              </p>
            </div>
          )}

          {/* Remove Access Button */}
          {!isCurrentUser && canEdit && role !== 'account_owner' && onRemove && (
            <div className="mt-6 pt-4 border-t-2 border-border">
              <button
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                onClick={() => onRemove(member.id, member.name)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Remove Access
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
