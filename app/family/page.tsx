/**
 * Family Management Page
 *
 * Manage family members and invitations
 * View sent/received invitations and family member access
 */

'use client'

import { useState } from 'react'
import { useInvitations } from '@/hooks/useInvitations'
import { PageHeader } from '@/components/ui/PageHeader'
import { InviteModal } from '@/components/family/InviteModal'
import AuthGuard from '@/components/auth/AuthGuard'
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
    revokeInvitation
  } = useInvitations()

  const [showInviteModal, setShowInviteModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent')

  const handleAccept = async (invitationId: string) => {
    if (confirm('Accept this invitation?')) {
      await acceptInvitation(invitationId)
    }
  }

  const handleDecline = async (invitationId: string) => {
    if (confirm('Decline this invitation?')) {
      await declineInvitation(invitationId)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (confirm('Revoke this invitation? The recipient will no longer be able to accept it.')) {
      await revokeInvitation(invitationId)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400'
      case 'accepted':
        return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
      case 'declined':
        return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
      case 'revoked':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PageHeader
        title="Family & Invitations"
        subtitle="Manage family access to patient records"
        actions={
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            + Invite Family Member
          </button>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('sent')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'sent'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Sent Invitations ({sentInvitations.length})
          </button>
          <button
            onClick={() => setActiveTab('received')}
            className={`px-4 py-2 font-medium transition-colors border-b-2 ${
              activeTab === 'received'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Received Invitations ({receivedInvitations.length})
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Loading invitations...</p>
          </div>
        ) : (
          <>
            {/* Sent Invitations */}
            {activeTab === 'sent' && (
              <div className="space-y-4">
                {sentInvitations.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">
                      No sent invitations yet
                    </p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                  <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700">
                    <p className="text-gray-500 dark:text-gray-400">
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
    </div>
  )
}

interface InvitationCardProps {
  invitation: FamilyInvitation
  type: 'sent' | 'received'
  onAccept?: () => void
  onDecline?: () => void
  onRevoke?: () => void
  getStatusColor: (status: string) => string
  formatDate: (date: string) => string
}

function InvitationCard({
  invitation,
  type,
  onAccept,
  onDecline,
  onRevoke,
  getStatusColor,
  formatDate
}: InvitationCardProps) {
  const permissionCount = Object.values(invitation.permissions).filter(Boolean).length

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border-2 border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {type === 'sent' ? invitation.recipientEmail : invitation.invitedByName}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {type === 'sent' ? `Sent by you` : `From ${invitation.invitedByName}`}
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invitation.status)}`}>
          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
        </span>
      </div>

      {/* Invite Code */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">Invite Code: </span>
        <code className="text-sm font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
          {invitation.inviteCode}
        </code>
      </div>

      {/* Patients Shared */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Patients shared: {invitation.patientsShared.length}
        </span>
      </div>

      {/* Permissions */}
      <div className="mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Permissions granted: {permissionCount} of {Object.keys(invitation.permissions).length}
        </span>
      </div>

      {/* Personal Message */}
      {invitation.message && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 italic">
            "{invitation.message}"
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span>Created: {formatDate(invitation.createdAt)}</span>
        <span>Expires: {formatDate(invitation.expiresAt)}</span>
      </div>

      {/* Actions */}
      {invitation.status === 'pending' && (
        <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
          {type === 'received' && (
            <>
              <button
                onClick={onAccept}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Accept
              </button>
              <button
                onClick={onDecline}
                className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors text-sm"
              >
                Decline
              </button>
            </>
          )}
          {type === 'sent' && (
            <button
              onClick={onRevoke}
              className="px-4 py-2 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors text-sm"
            >
              Revoke
            </button>
          )}
        </div>
      )}
    </div>
  )
}
