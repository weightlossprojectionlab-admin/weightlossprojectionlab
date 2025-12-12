/**
 * Family Management Page
 *
 * Manage family members and invitations
 * View sent/received invitations and family member access
 */

'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useInvitations } from '@/hooks/useInvitations'
import { PageHeader } from '@/components/ui/PageHeader'
import { InviteModal } from '@/components/family/InviteModal'
import AuthGuard from '@/components/auth/AuthGuard'
import ConfirmModal from '@/components/ui/ConfirmModal'
import type { FamilyInvitation } from '@/types/medical'

export default function FamilyPage() {
  return (
    <AuthGuard>
      <FamilyContent />
    </AuthGuard>
  )
}

function FamilyContent() {
  const {
    sentInvitations,
    receivedInvitations,
    loading,
    acceptInvitation,
    declineInvitation,
    revokeInvitation,
    resendInvitation,
    refetch
  } = useInvitations()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'accept' | 'decline' | 'revoke' | 'resend'
    invitationId: string
  }>({ isOpen: false, type: 'accept', invitationId: '' })

  const handleAccept = async (invitationId: string) => {
    setConfirmModal({ isOpen: true, type: 'accept', invitationId })
  }

  const handleDecline = async (invitationId: string) => {
    setConfirmModal({ isOpen: true, type: 'decline', invitationId })
  }

  const handleRevoke = async (invitationId: string) => {
    setConfirmModal({ isOpen: true, type: 'revoke', invitationId })
  }

  const handleResend = async (invitationId: string) => {
    setConfirmModal({ isOpen: true, type: 'resend', invitationId })
  }

  const handleConfirmAction = async () => {
    const { type, invitationId } = confirmModal

    switch (type) {
      case 'accept':
        await acceptInvitation(invitationId)
        break
      case 'decline':
        await declineInvitation(invitationId)
        break
      case 'revoke':
        await revokeInvitation(invitationId)
        break
      case 'resend':
        await resendInvitation(invitationId)
        break
    }
  }

  const getConfirmModalContent = () => {
    switch (confirmModal.type) {
      case 'accept':
        return {
          title: 'Accept Invitation',
          message: 'Are you sure you want to accept this invitation? You will gain access to the shared patient records.',
          confirmText: 'Accept',
          variant: 'info' as const
        }
      case 'decline':
        return {
          title: 'Decline Invitation',
          message: 'Are you sure you want to decline this invitation? This action cannot be undone.',
          confirmText: 'Decline',
          variant: 'danger' as const
        }
      case 'revoke':
        return {
          title: 'Revoke Invitation',
          message: 'Are you sure you want to revoke this invitation? The recipient will no longer be able to accept it.',
          confirmText: 'Revoke',
          variant: 'danger' as const
        }
      case 'resend':
        return {
          title: 'Resend Invitation',
          message: 'Resend the invitation email to the recipient?',
          confirmText: 'Resend Email',
          variant: 'info' as const
        }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'accepted':
        return 'bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400'
      case 'declined':
        return 'bg-red-100 text-error-dark dark:bg-red-900/20'
      case 'expired':
        return 'bg-muted text-foreground dark:text-muted-foreground'
      case 'revoked':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-muted text-foreground dark:text-muted-foreground'
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Family & Invitations"
        subtitle="Manage family access to patient records"
        actions={
          <div className="flex gap-2">
            <Link
              href="/family/manage-roles"
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors"
            >
              Manage Roles
            </Link>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              + Invite Caregiver
            </button>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {/* Family Dashboard Link - Prominent */}
        <div className="mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold mb-1">Caregivers</h3>
              <p className="text-sm text-purple-100">
                View all family members, manage roles, and track patient access in one place
              </p>
            </div>
            <Link
              href="/family/dashboard"
              className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
            >
              <span>Go to Dashboard</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-border">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sent'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Sent Invitations ({sentInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'received'
                ? 'border-primary text-primary dark:text-purple-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
            }`}
          >
            Received Invitations ({receivedInvitations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground dark:text-muted-foreground">Loading invitations...</p>
          </div>
        ) : (
          <>
            {/* Sent Invitations */}
            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentInvitations.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
                    <p className="text-muted-foreground dark:text-muted-foreground mb-4">
                      No sent invitations yet
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                    >
                      Send Your First Invitation
                    </button>
                  </div>
                ) : (
                  sentInvitations.map(invitation => (
                    <InvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      type="sent"
                      onRevoke={() => handleRevoke(invitation.id)}
                      onResend={() => handleResend(invitation.id)}
                      getStatusColor={getStatusColor}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            )}

            {/* Received Invitations */}
            {activeTab === 'received' && (
              <div className="space-y-4">
                {receivedInvitations.length === 0 ? (
                  <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
                    <p className="text-muted-foreground dark:text-muted-foreground">
                      No pending invitations
                    </p>
                  </div>
                ) : (
                  receivedInvitations.map(invitation => (
                    <InvitationCard
                      key={invitation.id}
                      invitation={invitation}
                      type="received"
                      onAccept={() => handleAccept(invitation.id)}
                      onDecline={() => handleDecline(invitation.id)}
                      getStatusColor={getStatusColor}
                      formatDate={formatDate}
                    />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </main>

      {/* Invite Modal */}
      <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        onConfirm={handleConfirmAction}
        {...getConfirmModalContent()}
      />
    </div>
  )
}

interface InvitationCardProps {
  invitation: FamilyInvitation
  type: 'sent' | 'received'
  onAccept?: () => void
  onDecline?: () => void
  onRevoke?: () => void
  onResend?: () => void
  getStatusColor: (status: string) => string
  formatDate: (date: string) => string
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
        <div>
          <h3 className="font-semibold text-foreground">
            {type === 'sent' ? invitation.recipientEmail : invitation.invitedByName}
          </h3>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {type === 'sent' ? `Sent by you` : `From ${invitation.invitedByName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
        </span>
      </div>

      {/* Invite Code */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">Invite Code: </span>
        <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
          {invitation.inviteCode}
        </code>
      </div>

      {/* Patients Shared */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">
          Patients shared: {invitation.patientsShared.length}
        </span>
      </div>

      {/* Permissions */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground dark:text-muted-foreground">
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
      <div className="flex items-center gap-4 text-xs text-muted-foreground dark:text-muted-foreground mb-4">
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
