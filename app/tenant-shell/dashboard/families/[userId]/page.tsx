/**
 * Client Detail Page
 *
 * Shows a single managed client's full profile + their family members
 * (patients) with per-patient health snapshots. This is the "click into
 * a client card" view from the franchise dashboard overview.
 *
 * Server component — loads data via Admin SDK. Auth gating is handled
 * by the FamiliesAuthGuard client component wrapping the content.
 *
 * Route: {slug}.wellnessprojectionlab.com/dashboard/families/{userId}
 * Proxy rewrites to: /tenant-shell/dashboard/families/[userId]
 */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { loadClientDetail, formatDate, isActive } from '../../_lib/load-families'
import FamiliesAuthGuard from '../FamiliesAuthGuard'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ userId: string }>
}

function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days}d ago`
    return formatDate(iso)
  } catch {
    return '—'
  }
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { userId } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const client = await loadClientDetail(tenant.id, userId)
  if (!client) notFound()

  const clientActive = isActive(client.lastActiveAt)
  const hasPatients = client.patients.length > 0

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to Overview
        </Link>

        {/* Client header */}
        <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold shrink-0">
                {(client.name.charAt(0) || '?').toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {client.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
                {client.phone && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  clientActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${clientActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                {clientActive ? 'Active' : 'Inactive'}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Client since {formatDate(client.joinedPlatformAt)}
              </span>
            </div>
          </div>

          {client.practiceNotes && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Practice Notes
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {client.practiceNotes}
              </p>
            </div>
          )}
        </div>

        {/* Family Members / Patients */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Family Members
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {hasPatients ? `${client.patients.length} member${client.patients.length !== 1 ? 's' : ''}` : ''}
            </span>
          </div>

          {!hasPatients ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center">
              {/* Show own health data if no patients */}
              {client.ownHealth.lastMealAt || client.ownHealth.lastWeightAt ? (
                <div className="max-w-md mx-auto">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                    This client tracks their own health directly
                  </p>
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 text-left space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Meal</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {client.ownHealth.lastMealAt
                          ? `${relativeTime(client.ownHealth.lastMealAt)}${client.ownHealth.lastMealName ? ` · ${client.ownHealth.lastMealName}` : ''}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Weight</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {client.ownHealth.lastWeightValue !== null
                          ? `${client.ownHealth.lastWeightValue} ${client.ownHealth.lastWeightUnit}`
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Vital</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {client.ownHealth.lastVitalAt ? relativeTime(client.ownHealth.lastVitalAt) : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Medications</span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {client.ownHealth.activeMedicationsCount > 0
                          ? `${client.ownHealth.activeMedicationsCount} active`
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    No family members yet
                  </p>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Family members added by this client will appear here.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.patients.map(patient => (
                <div
                  key={patient.id}
                  className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold shrink-0 ${
                      patient.type === 'pet'
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                        : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    }`}>
                      {(patient.name.charAt(0) || '?').toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">
                        {patient.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {patient.relationship || patient.type}
                      </p>
                      <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        patient.type === 'pet'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                          : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      }`}>
                        {patient.type === 'pet' ? 'Pet' : 'Human'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Active Medications:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.health.activeMedicationsCount}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last Meal:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.health.lastMealAt ? relativeTime(patient.health.lastMealAt) : 'Never'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last Vital Check:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {patient.health.lastVitalAt ? relativeTime(patient.health.lastVitalAt) : 'Never'}
                      </span>
                    </div>
                    {patient.health.lastWeightValue !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Latest Weight:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {patient.health.lastWeightValue} {patient.health.lastWeightUnit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </FamiliesAuthGuard>
  )
}
