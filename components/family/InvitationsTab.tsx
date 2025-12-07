/**
 * Invitations Tab
 *
 * Displays sent and received family invitations
 * Shows status, dates, permissions, and action buttons
 */

'use client'

import { useState } from 'react'
import type { FamilyInvitation } from '@/types/medical'

interface InvitationsTabProps {
  sentInvitations: FamilyInvitation[]
  receivedInvitations: FamilyInvitation[]
  onAccept: (invitationId: string) => Promise<void>
  onDecline: (invitationId: string) => Promise<void>
  onResend: (invitationId: string) => Promise<void>
  onRevoke: (invitationId: string) => Promise<void>
  loading?: boolean
}

export function InvitationsTab({
  sentInvitations,
  receivedInvitations,
  onAccept,
  onDecline,
  onResend,
  onRevoke,
  loading = false
}: InvitationsTabProps) {
  const [activeSection, setActiveSection] = useState<'sent' | 'received'>('sent')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300'
      case 'accepted':
        return 'bg-green-100 text-success-dark dark:bg-green-900/20 dark:text-green-400'
      case 'declined':
        return 'bg-red-100 text-error-dark dark:bg-red-900/20 dark:text-red-400'
      case 'expired':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400'
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

  const handleAction = async (
    action: 'accept' | 'decline' | 'resend' | 'revoke',
    invitationId: string
  ) => {
    setProcessingId(invitationId)
    try {
      switch (action) {
        case 'accept':
          await onAccept(invitationId)
          break
        case 'decline':
          await onDecline(invitationId)
          break
        case 'resend':
          await onResend(invitationId)
          break
        case 'revoke':
          await onRevoke(invitationId)
          break
      }
    } finally {
      setProcessingId(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
        <p className="mt-4 text-muted-foreground">Loading invitations...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Section Toggle */}
      <div className="flex items-center gap-4 border-b border-border">
        <button
          onClick={() => setActiveSection('sent')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === 'sent'
              ? 'border-primary text-primary dark:text-purple-400'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
          }`}
        >
          Sent ({sentInvitations.length})
        </button>
        <button
          onClick={() => setActiveSection('received')}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === 'received'
              ? 'border-primary text-primary dark:text-purple-400'
              : 'border-transparent text-muted-foreground hover:text-foreground dark:hover:text-gray-200'
          }`}
        >
          Received ({receivedInvitations.length})
        </button>
      </div>

      {/* Sent Invitations Section */}
      {activeSection === 'sent' && (
        <div className="space-y-4">
          {sentInvitations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              <p className="mt-4 text-muted-foreground">No sent invitations</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Invite family members to collaborate on patient care
              </p>
            </div>
          ) : (
            sentInvitations.map(invitation => {
              const permissionCount = Object.values(invitation.permissions).filter(Boolean).length
              const isProcessing = processingId === invitation.id
              const isPending = invitation.status === 'pending'

              return (
                <div
                  key={invitation.id}
                  className="bg-card rounded-lg border-2 border-border p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {invitation.recipientEmail}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Sent by you
                        {invitation.familyRole && (
                          <span className="ml-2 text-primary dark:text-purple-400">
                            as {invitation.familyRole.replace('_', ' ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        invitation.status
                      )}`}
                    >
                      {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                    </span>
                  </div>

                  {/* Invite Code */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Invite Code:</span>
                    <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                      {invitation.inviteCode}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invitation.inviteCode)
                        alert('Invite code copied to clipboard!')
                      }}
                      className="text-xs text-primary hover:underline"
                      title="Copy invite code"
                    >
                      Copy
                    </button>
                  </div>

                  {/* Email Delivery Warning */}
                  {!invitation.emailSentAt && (
                    <div className="mb-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 rounded">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        ⚠️ Email may not have been delivered. Share the invite code manually.
                      </p>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Patients: </span>
                      <span className="text-sm font-medium text-foreground">
                        {invitation.patientsShared.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Permissions: </span>
                      <span className="text-sm font-medium text-foreground">
                        {permissionCount}/{Object.keys(invitation.permissions).length}
                      </span>
                    </div>
                  </div>

                  {/* Personal Message */}
                  {invitation.message && (
                    <div className="mb-4 p-3 bg-background rounded-lg">
                      <p className="text-sm text-foreground italic">"{invitation.message}"</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>Sent: {formatDate(invitation.createdAt)}</span>
                    <span>Expires: {formatDate(invitation.expiresAt)}</span>
                    {invitation.emailSentAt && (
                      <span>Email sent: {formatDate(invitation.emailSentAt)}</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAction('resend', invitation.id)}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {isProcessing ? 'Processing...' : 'Resend Email'}
                        </button>
                        <button
                          onClick={() => handleAction('revoke', invitation.id)}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          Revoke
                        </button>
                      </>
                    )}
                    {!isPending && (
                      <div className="text-sm text-muted-foreground italic">
                        This invitation has been {invitation.status}
                        {invitation.acceptedAt && ` on ${formatDate(invitation.acceptedAt)}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Received Invitations Section */}
      {activeSection === 'received' && (
        <div className="space-y-4">
          {receivedInvitations.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-lg border-2 border-border">
              <svg
                className="mx-auto h-12 w-12 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <p className="mt-4 text-muted-foreground">No pending invitations</p>
              <p className="mt-2 text-sm text-muted-foreground">
                You'll see invitations from family members here
              </p>
            </div>
          ) : (
            receivedInvitations.map(invitation => {
              const permissionCount = Object.values(invitation.permissions).filter(Boolean).length
              const isProcessing = processingId === invitation.id
              const isPending = invitation.status === 'pending'

              return (
                <div
                  key={invitation.id}
                  className="bg-card rounded-lg border-2 border-border p-6"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {invitation.invitedByName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Invited you to collaborate
                        {invitation.familyRole && (
                          <span className="ml-2 text-primary dark:text-purple-400">
                            as {invitation.familyRole.replace('_', ' ')}
                          </span>
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        invitation.status
                      )}`}
                    >
                      {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <span className="text-xs text-muted-foreground">Patients: </span>
                      <span className="text-sm font-medium text-foreground">
                        {invitation.patientsShared.length}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Permissions: </span>
                      <span className="text-sm font-medium text-foreground">
                        {permissionCount}/{Object.keys(invitation.permissions).length}
                      </span>
                    </div>
                  </div>

                  {/* Personal Message */}
                  {invitation.message && (
                    <div className="mb-4 p-3 bg-primary-light dark:bg-purple-900/20 rounded-lg border-l-4 border-primary">
                      <p className="text-sm text-foreground">"{invitation.message}"</p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                    <span>Received: {formatDate(invitation.createdAt)}</span>
                    <span>Expires: {formatDate(invitation.expiresAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t border-border">
                    {isPending && (
                      <>
                        <button
                          onClick={() => handleAction('accept', invitation.id)}
                          disabled={isProcessing}
                          className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                          {isProcessing ? 'Processing...' : 'Accept Invitation'}
                        </button>
                        <button
                          onClick={() => handleAction('decline', invitation.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 text-error hover:bg-error-light dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors text-sm"
                        >
                          Decline
                        </button>
                      </>
                    )}
                    {!isPending && (
                      <div className="text-sm text-muted-foreground italic">
                        You {invitation.status} this invitation
                        {invitation.acceptedAt && ` on ${formatDate(invitation.acceptedAt)}`}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
