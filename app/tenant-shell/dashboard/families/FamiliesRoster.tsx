'use client'

/**
 * Families roster (white-label CRM) — pending requests + managed-client roster.
 *
 * SECURITY: fetches the roster PII (family names/emails, care-recipient names,
 * pending-request emails + messages) CLIENT-side from the gated
 * GET /api/tenant/[tenantId]/managed-families (verifyTenantStaffOrAdminAuth), so
 * none of it is server-rendered into the route payload — the page is a thin
 * server shell + the client FamiliesAuthGuard. Owns the list + refetch, passed to
 * the add/approve/remove mutations (they can't router.refresh() a client fetch).
 *
 * Only TYPES are imported from the server-only loader module.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import AddFamilyForm from './AddFamilyForm'
import PendingRequestActions from './PendingRequestActions'
import FamilySnapshotCard from '../FamilySnapshotCard'
import ClientRoster from '@/components/tenant/ClientRoster'
import type { ManagedFamily, PendingRequest } from '../_lib/load-families'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}

export default function FamiliesRoster({ tenantId }: { tenantId: string }) {
  const [families, setFamilies] = useState<ManagedFamily[]>([])
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setError(null)
    try {
      if (!auth?.currentUser) throw new Error('You are not signed in.')
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/tenant/${tenantId}/managed-families`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || `Could not load families (${res.status})`)
      setFamilies(Array.isArray(json?.families) ? (json.families as ManagedFamily[]) : [])
      setPendingRequests(Array.isArray(json?.pendingRequests) ? (json.pendingRequests as PendingRequest[]) : [])
    } catch (err) {
      logger.error('[FamiliesRoster] load failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not load families.')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    void refetch()
  }, [refetch])

  return (
    <>
      {error && (
        <div role="alert" className="mb-6 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <section className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 sm:p-8 mb-6">
          <header className="mb-4">
            <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
              Pending Requests
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                {pendingRequests.length}
              </span>
            </h2>
            <p className="text-sm text-amber-800 dark:text-amber-200 mt-1">
              These families found you on the directory and asked to be managed by your practice.
              Approving consumes one family seat.
            </p>
          </header>

          <ul className="space-y-3">
            {pendingRequests.map(req => (
              <li key={req.id} className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">{req.familyName}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{req.familyEmail}</p>
                    {req.message && (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 italic">&ldquo;{req.message}&rdquo;</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      Submitted {formatDate(req.submittedAt)}
                    </p>
                  </div>
                  <PendingRequestActions tenantId={tenantId} requestId={req.id} onActed={refetch} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add family form + roster */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Managed Clients</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your practice&rsquo;s active clients. Add new clients with the full intake form, or use
              the quick-add below for existing WPL families.
            </p>
          </div>
          <Link
            href="/dashboard/families/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shrink-0"
          >
            + New Client Intake
          </Link>
        </header>

        <AddFamilyForm tenantId={tenantId} onAdded={refetch} />

        {loading ? (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
            Loading clients&hellip;
          </div>
        ) : (
          <ClientRoster
            items={families.map(family => ({
              id: family.id,
              name: family.name,
              email: family.email,
              lastActiveAt: family.lastActiveAt,
              joinedPlatformAt: family.joinedPlatformAt,
              card: <FamilySnapshotCard key={family.id} family={family} tenantId={tenantId} onRemoved={refetch} />,
            }))}
          />
        )}
      </section>
    </>
  )
}
