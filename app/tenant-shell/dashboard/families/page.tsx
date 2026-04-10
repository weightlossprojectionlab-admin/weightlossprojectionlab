/**
 * Franchise Owner Dashboard — Families tab
 *
 * Management-focused view: AddFamilyForm at top for attaching families,
 * pending requests panel (if any), and the family snapshot card grid.
 * Shares data-loading with the Overview page via _lib/load-families.ts.
 *
 * The key difference between Overview and Families:
 * - Overview leads with stat cards (at-a-glance, read-heavy)
 * - Families leads with the AddFamilyForm (management, write-heavy)
 */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { loadManagedFamilies, loadPendingRequests, formatDate } from '../_lib/load-families'
import FamiliesAuthGuard from './FamiliesAuthGuard'
import AddFamilyForm from './AddFamilyForm'
import PendingRequestActions from './PendingRequestActions'
import FamilySnapshotCard from '../FamilySnapshotCard'

export const dynamic = 'force-dynamic'

export default async function FamiliesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const [families, pendingRequests] = await Promise.all([
    loadManagedFamilies(tenant.id),
    loadPendingRequests(tenant.id),
  ])

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
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
              These families found you on the directory and asked to be managed
              by your practice. Approving consumes one family seat.
            </p>
          </header>

          <ul className="space-y-3">
            {pendingRequests.map(req => (
              <li
                key={req.id}
                className="rounded-lg border border-amber-200 dark:border-amber-800 bg-white dark:bg-gray-800 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {req.familyName}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {req.familyEmail}
                    </p>
                    {req.message && (
                      <p className="mt-2 text-sm text-gray-700 dark:text-gray-300 italic">
                        &ldquo;{req.message}&rdquo;
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      Submitted {formatDate(req.submittedAt)}
                    </p>
                  </div>
                  <PendingRequestActions tenantId={tenant.id} requestId={req.id} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Add family form */}
      <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8">
        <header className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Managed Clients
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Your practice&rsquo;s active clients. Add new clients with the full
              intake form, or use the quick-add below for existing WPL families.
            </p>
          </div>
          <Link
            href="/dashboard/families/new"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm shrink-0"
          >
            + New Client Intake
          </Link>
        </header>

        <AddFamilyForm tenantId={tenant.id} />

        {/* Family snapshot cards */}
        {families.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-900 dark:text-gray-100">
              No families yet
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Use the form above to add your first family by email. Their card
              will appear here immediately.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {families.map(family => (
              <FamilySnapshotCard
                key={family.id}
                family={family}
                tenantId={tenant.id}
              />
            ))}
          </div>
        )}
      </section>
    </FamiliesAuthGuard>
  )
}
