/**
 * Family Admin Invites Page
 *
 * Dedicated page for managing family invitations
 * View and manage sent and received invitations
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AuthGuard from '@/components/auth/AuthGuard'
import { PageHeader } from '@/components/ui/PageHeader'
import { InvitationsTab } from '@/components/family/InvitationsTab'
import { useAuth } from '@/hooks/useAuth'
import type { FamilyInvitation } from '@/types/medical'
import { PlusIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

export default function FamilyAdminInvitesPage() {
  return (
    <AuthGuard>
      <FamilyAdminInvitesContent />
    </AuthGuard>
  )
}

function FamilyAdminInvitesContent() {
  const router = useRouter()
  const { user } = useAuth()
  const [invitations, setInvitations] = useState<{ sent: FamilyInvitation[]; received: FamilyInvitation[] }>({
    sent: [],
    received: []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const token = await user.getIdToken()
      const response = await fetch('/api/invitations', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || `Failed to fetch invitations (${response.status})`)
      }
      if (result.success) {
        setInvitations(result.data)
      } else {
        throw new Error(result.error || 'Failed to fetch invitations')
      }
    } catch (err: any) {
      console.error('Error fetching invitations:', err)
      setError(err.message || 'Failed to load invitations')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchInvitations()
  }, [fetchInvitations])

  const handleAcceptInvite = async (invitationId: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        await fetchInvitations()
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to accept invitation')
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      alert(error.message || 'Failed to accept invitation')
    }
  }

  const handleDeclineInvite = async (invitationId: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/invitations/${invitationId}/accept`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        await fetchInvitations()
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to decline invitation')
      }
    } catch (error: any) {
      console.error('Error declining invitation:', error)
      alert(error.message || 'Failed to decline invitation')
    }
  }

  const handleResendInvite = async (invitationId: string) => {
    if (!user) return
    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/invitations/${invitationId}/resend`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        await fetchInvitations()
        alert('Invitation resent successfully')
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to resend invitation')
      }
    } catch (error: any) {
      console.error('Error resending invitation:', error)
      alert(error.message || 'Failed to resend invitation')
    }
  }

  const handleRevokeInvite = async (invitationId: string) => {
    if (!user) return

    if (!confirm('Are you sure you want to revoke this invitation?')) {
      return
    }

    try {
      const token = await user.getIdToken()
      const response = await fetch(`/api/invitations/${invitationId}/revoke`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      if (response.ok) {
        await fetchInvitations()
      } else {
        const result = await response.json()
        throw new Error(result.error || 'Failed to revoke invitation')
      }
    } catch (error: any) {
      console.error('Error revoking invitation:', error)
      alert(error.message || 'Failed to revoke invitation')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader
          title="Family Invitations"
          subtitle="Manage family member invitations"
        />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-error-light dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-lg p-8 text-center">
            <ExclamationTriangleIcon className="w-16 h-16 text-error mx-auto mb-4" />
            <h3 className="text-xl font-bold text-error-dark mb-2">Error Loading Invitations</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => fetchInvitations()}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  const pendingReceived = invitations.received.filter(inv => inv.status === 'pending').length
  const pendingSent = invitations.sent.filter(inv => inv.status === 'pending').length

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Family Invitations"
        subtitle={`${pendingReceived} pending invite${pendingReceived !== 1 ? 's' : ''} received • ${pendingSent} sent`}
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/family/dashboard')}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium inline-flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Send Invitation
            </button>
            <button
              onClick={() => fetchInvitations()}
              className="px-4 py-2 bg-secondary text-white rounded-lg hover:bg-secondary-dark transition-colors font-medium"
            >
              Refresh
            </button>
          </div>
        }
      />

      <main className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading invitations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-card rounded-lg border-2 border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">Invitations Received</h3>
                  <span className="text-3xl font-bold text-primary dark:text-purple-400">
                    {invitations.received.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pendingReceived} pending • {invitations.received.length - pendingReceived} resolved
                </p>
              </div>

              <div className="bg-card rounded-lg border-2 border-border p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-foreground">Invitations Sent</h3>
                  <span className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {invitations.sent.length}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {pendingSent} pending • {invitations.sent.filter(inv => inv.status === 'accepted').length} accepted
                </p>
              </div>
            </div>

            {/* Invitations List */}
            <InvitationsTab
              sentInvitations={invitations.sent}
              receivedInvitations={invitations.received}
              onAccept={handleAcceptInvite}
              onDecline={handleDeclineInvite}
              onResend={handleResendInvite}
              onRevoke={handleRevokeInvite}
              loading={false}
            />
          </div>
        )}
      </main>
    </div>
  )
}
