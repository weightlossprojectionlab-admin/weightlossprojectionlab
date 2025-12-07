/**
 * Family Role Management Page
 * Family Admin Route: /family-admin/roles
 *
 * Manage family member roles and permissions
 * - Display role hierarchy (Account Owner > Co-Admins > Caregivers > Viewers)
 * - Change member roles (if permitted)
 * - Transfer ownership
 * - View role capabilities and permissions
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
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
  PencilSquareIcon,
  ArrowLeftIcon
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

  const handleEditMember = (member: FamilyMember) => {
    setEditingMember(member)
    setShowEditModal(true)
  }

  const handleSaveMemberEdit = async (data: MemberUpdateData) => {
    if (!editingMember) return

    try {
      await updateMember(editingMember.userId, data)
      await refetch()
      setShowEditModal(false)
      setEditingMember(null)
    } catch (err) {
      console.error('Failed to update member:', err)
      throw err
    }
  }

  const toggleExpanded = (memberId: string) => {
    setExpandedMemberId(expandedMemberId === memberId ? null : memberId)
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Role Management"
        subtitle="Manage family member permissions and access"
        actions={
          <div className="flex gap-2">
            <Link
              href="/family-admin/dashboard"
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Dashboard
            </Link>
            {currentUserRole === 'account_owner' && (
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
              >
                Transfer Ownership
              </button>
            )}
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading family members...</p>
          </div>
        ) : error ? (
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-error-dark font-medium">Error: {error}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Role Hierarchy Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <InformationCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Family Role Hierarchy
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Account Owner</strong> → <strong>Co-Admins</strong> → <strong>Caregivers</strong> → <strong>Viewers</strong>
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                    Higher roles can manage lower roles. Only the Account Owner can transfer ownership or delete the family account.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Owner Section */}
            {accountOwner && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <ShieldCheckIcon className="w-5 h-5 text-amber-500" />
                  Account Owner
                </h2>
                <MemberCard
                  member={accountOwner}
                  currentUserRole={currentUserRole}
                  patients={patients || []}
                  onRoleChange={handleRoleChange}
                  onEdit={handleEditMember}
                  canEdit={canUserEditMember(user?.uid || '', accountOwner.userId)}
                  isExpanded={expandedMemberId === accountOwner.userId}
                  onToggleExpand={() => toggleExpanded(accountOwner.userId)}
                />
              </section>
            )}

            {/* Co-Admins Section */}
            {coAdmins.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-purple-500" />
                  Co-Admins ({coAdmins.length})
                </h2>
                <div className="space-y-3">
                  {coAdmins.map(member => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      currentUserRole={currentUserRole}
                      patients={patients || []}
                      onRoleChange={handleRoleChange}
                      onEdit={handleEditMember}
                      canEdit={canUserEditMember(user?.uid || '', member.userId)}
                      isExpanded={expandedMemberId === member.userId}
                      onToggleExpand={() => toggleExpanded(member.userId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Caregivers Section */}
            {caregivers.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <UserGroupIcon className="w-5 h-5 text-blue-500" />
                  Caregivers ({caregivers.length})
                </h2>
                <div className="space-y-3">
                  {caregivers.map(member => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      currentUserRole={currentUserRole}
                      patients={patients || []}
                      onRoleChange={handleRoleChange}
                      onEdit={handleEditMember}
                      canEdit={canUserEditMember(user?.uid || '', member.userId)}
                      isExpanded={expandedMemberId === member.userId}
                      onToggleExpand={() => toggleExpanded(member.userId)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Viewers Section */}
            {viewers.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <EyeIcon className="w-5 h-5 text-gray-500" />
                  Viewers ({viewers.length})
                </h2>
                <div className="space-y-3">
                  {viewers.map(member => (
                    <MemberCard
                      key={member.userId}
                      member={member}
                      currentUserRole={currentUserRole}
                      patients={patients || []}
                      onRoleChange={handleRoleChange}
                      onEdit={handleEditMember}
                      canEdit={canUserEditMember(user?.uid || '', member.userId)}
                      isExpanded={expandedMemberId === member.userId}
                      onToggleExpand={() => toggleExpanded(member.userId)}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Modals */}
      {showTransferModal && (
        <TransferOwnershipModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          eligibleMembers={eligibleForTransfer}
          onTransfer={handleTransferOwnership}
        />
      )}

      {showEditModal && editingMember && (
        <EditMemberModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setEditingMember(null)
          }}
          member={editingMember}
          onSave={handleSaveMemberEdit}
        />
      )}
    </div>
  )
}

// Member Card Component
interface MemberCardProps {
  member: FamilyMember
  currentUserRole: FamilyRole | null
  patients: any[]
  onRoleChange: (memberId: string, newRole: FamilyRole) => void
  onEdit: (member: FamilyMember) => void
  canEdit: boolean
  isExpanded: boolean
  onToggleExpand: () => void
}

function MemberCard({
  member,
  currentUserRole,
  patients,
  onRoleChange,
  onEdit,
  canEdit,
  isExpanded,
  onToggleExpand
}: MemberCardProps) {
  const roleCapabilitiesObj = ROLE_CAPABILITIES[member.familyRole] || {}

  // Convert capabilities object to array of readable strings
  const roleCapabilities = Object.entries(roleCapabilitiesObj)
    .filter(([_, value]) => value === true)
    .map(([key]) => {
      // Convert camelCase to readable text
      return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase())
        .replace('Can ', '')
    })

  return (
    <div className="bg-card rounded-lg border-2 border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-bold text-foreground truncate">{member.name}</h3>
            {member.familyRole === 'account_owner' ? (
              <AccountOwnerBadge />
            ) : (
              <RoleBadge role={member.familyRole} />
            )}
          </div>
          <p className="text-sm text-muted-foreground">{member.email}</p>

          {/* Patient Access */}
          {member.patientIds && member.patientIds.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground mb-1">
                Access to {member.patientIds.length} family member(s)
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => onEdit(member)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
              title="Edit member"
            >
              <PencilSquareIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={onToggleExpand}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUpIcon className="w-5 h-5" />
            ) : (
              <ChevronDownIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-border space-y-4">
          {/* Role Selector */}
          {canEdit && currentUserRole && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Change Role
              </label>
              <RoleSelector
                currentRole={member.familyRole}
                userRole={currentUserRole}
                memberId={member.userId}
                onRoleChange={onRoleChange}
              />
            </div>
          )}

          {/* Capabilities */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-2">Permissions</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {roleCapabilities.map((capability, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-success">✓</span>
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
