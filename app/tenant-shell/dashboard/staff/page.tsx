/**
 * Franchise Owner Dashboard — Staff tab
 *
 * Phase B slice 4: list staff invitations (pending, accepted, revoked) with
 * an inline invite form above and a per-row revoke button. Admin-only —
 * staff cannot manage other staff.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { getAdminDb } from '@/lib/firebase-admin'
import StaffAuthGuard from './StaffAuthGuard'
import InviteStaffForm from './InviteStaffForm'
import RevokeStaffButton from './RevokeStaffButton'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface StaffInvitation {
  id: string
  email: string
  status: 'pending' | 'accepted' | 'revoked'
  invitedAt: string | null
  acceptedAt: string | null
  expiresAt: string | null
  invitedByEmail: string
}

async function loadInvitations(tenantId: string): Promise<StaffInvitation[]> {
  try {
    const db = getAdminDb()
    const snap = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('invitations')
      .orderBy('invitedAt', 'desc')
      .limit(200)
      .get()

    return snap.docs.map(doc => {
      const d = doc.data() as any
      return {
        id: doc.id,
        email: d.email || '',
        status: (d.status as StaffInvitation['status']) || 'pending',
        invitedAt: typeof d.invitedAt === 'string' ? d.invitedAt : null,
        acceptedAt: typeof d.acceptedAt === 'string' ? d.acceptedAt : null,
        expiresAt: typeof d.expiresAt === 'string' ? d.expiresAt : null,
        invitedByEmail: d.invitedByEmail || '',
      }
    })
  } catch (err) {
    logger.error('[dashboard/staff] failed to load invitations', err as Error, { tenantId })
    return []
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
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
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  )
}

export default async function StaffPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const invitations = await loadInvitations(tenant.id)

  return (
    <StaffAuthGuard tenantId={tenant.id}>
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8">
        <header className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Staff</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invite the people who help you care for the families on your roster.
            Staff can view and manage families but cannot edit branding or
            invite more staff.
          </p>
        </header>

        <InviteStaffForm tenantId={tenant.id} />

        {invitations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-12 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              No staff yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Use the form above to invite staff. Once they accept, they&rsquo;ll
              appear here with full access to your managed families.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Invited
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    Accepted
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400"
                  >
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {invitations.map(inv => (
                  <tr key={inv.id}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {inv.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(inv.invitedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {formatDate(inv.acceptedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {inv.status === 'pending' || inv.status === 'accepted' ? (
                        <RevokeStaffButton
                          tenantId={tenant.id}
                          invitationId={inv.id}
                          invitedEmail={inv.email}
                          status={inv.status}
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
    </StaffAuthGuard>
  )
}
