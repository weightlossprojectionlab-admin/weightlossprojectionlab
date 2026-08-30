'use client'

/**
 * Staff manager (client) — invitations list + invite/revoke.
 *
 * SECURITY: the invitation PII (staff emails, invitedByEmail) is fetched
 * CLIENT-side here via the admin-only GET /api/tenant/[tenantId]/invitations
 * (verifyTenantAdminAuth) — NOT server-rendered on the page. Previously the
 * page fetched it with the admin SDK and passed the rendered table as children
 * to the client StaffAuthGuard, which serialized the PII into the RSC payload
 * reachable by franchise_staff even though the guard blanked the DOM. Fetching
 * it here means staff never receive it: the guard bounces them, and the API
 * 403s any non-admin.
 *
 * Owns the invitations state + refetch, passed to the invite form and each
 * revoke button so mutations refresh the list (they can't router.refresh() a
 * client-fetched list).
 */

import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import InviteStaffForm from './InviteStaffForm'
import RevokeStaffButton from './RevokeStaffButton'

interface StaffInvitation {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'revoked'
  invitedAt: string | null
  acceptedAt: string | null
  expiresAt: string | null
  invitedByEmail: string
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

function StatusBadge({ status }: { status: StaffInvitation['status'] }) {
  const styles: Record<StaffInvitation['status'], string> = {
    pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
    accepted: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
    revoked: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  }
  const labels: Record<StaffInvitation['status'], string> = {
    pending: 'Pending',
    accepted: 'Active',
    revoked: 'Revoked',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function StaffManager({ tenantId }: { tenantId: string }) {
  const [invitations, setInvitations] = useState<StaffInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setError(null)
    try {
      if (!auth?.currentUser) throw new Error('You are not signed in.')
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/tenant/${tenantId}/invitations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Could not load staff (${res.status})`)
      setInvitations(Array.isArray(json?.invitations) ? (json.invitations as StaffInvitation[]) : [])
    } catch (err) {
      logger.error('[StaffManager] load failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not load staff.')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Staff</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Invite the people who help you care for the families on your roster. Staff can view and
          manage families but cannot edit branding or invite more staff.
        </p>
      </header>

      <InviteStaffForm tenantId={tenantId} onInvited={refetch} />

      {error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading staff&hellip;
        </div>
      ) : invitations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-12 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No staff yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
            Use the form above to invite staff. Once they accept, they&rsquo;ll appear here with full
            access to your managed families.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Email</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Status</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Invited</th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">Accepted</th>
                <th scope="col" className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {invitations.map(inv => (
                <tr key={inv.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{inv.email}</td>
                  <td className="px-4 py-3 text-sm"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(inv.invitedAt)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(inv.acceptedAt)}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    {inv.status === 'pending' || inv.status === 'accepted' ? (
                      <RevokeStaffButton
                        tenantId={tenantId}
                        invitationId={inv.id}
                        invitedEmail={inv.email}
                        status={inv.status}
                        onRevoked={refetch}
                      />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {invitations.length} {invitations.length === 1 ? 'invitation' : 'invitations'} total
          </div>
        </div>
      )}
    </section>
  )
}
