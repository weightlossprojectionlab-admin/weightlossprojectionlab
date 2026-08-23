'use client'

/**
 * Client workspace (white-label CRM) — a managed client's full detail.
 *
 * SECURITY: fetches the client's PII/PHI CLIENT-side from the gated
 * GET /api/tenant/[tenantId]/clients/[userId] (verifyTenantStaffOrAdminAuth +
 * managedBy). Nothing sensitive is server-rendered into the route's payload —
 * the page is only a thin server shell + the client-side FamiliesAuthGuard.
 *
 * Helpers (formatDate/relativeTime/isActive) are inlined because the loader
 * module (_lib/load-families) imports the Admin SDK at top level and would
 * poison the client bundle; only its TYPES are imported (erased at compile).
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { getPatientBadgeLabel } from '@/lib/life-stage-utils'
import ClientAppointments from '@/components/tenant/ClientAppointments'
import ClientCareTasks from '@/components/tenant/ClientCareTasks'
import type {
  ClientDetail,
  ClientAppointment,
  ClientDutyTask,
} from '@/app/tenant-shell/dashboard/_lib/load-families'

interface Props {
  tenantId: string
  userId: string
}

interface WorkspaceData {
  client: ClientDetail
  appointments: ClientAppointment[]
  careTasks: ClientDutyTask[]
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  } catch {
    return '—'
  }
}
function relativeTime(iso: string | null): string {
  if (!iso) return 'Never'
  try {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
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
function isActive(iso: string | null): boolean {
  if (!iso) return false
  try {
    return Date.now() - new Date(iso).getTime() < 30 * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

export default function ClientWorkspace({ tenantId, userId }: Props) {
  const [data, setData] = useState<WorkspaceData | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      if (!auth?.currentUser) throw new Error('You are not signed in.')
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(`/api/tenant/${tenantId}/clients/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        setStatus('notfound')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.data?.client) {
        throw new Error(json?.error || `Could not load client (${res.status})`)
      }
      setData(json.data as WorkspaceData)
      setStatus('ready')
    } catch (err) {
      logger.error('[ClientWorkspace] load failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not load this client.')
      setStatus('error')
    }
  }, [tenantId, userId])

  useEffect(() => {
    void load()
  }, [load])

  const backLink = (
    <Link
      href="/dashboard"
      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      &larr; Back to Overview
    </Link>
  )

  if (status === 'loading') {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading client&hellip;
        </div>
      </div>
    )
  }
  if (status === 'notfound') {
    return (
      <div className="space-y-6">
        {backLink}
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center text-sm text-gray-600 dark:text-gray-300">
          This client isn&rsquo;t on your roster.
        </div>
      </div>
    )
  }
  if (status === 'error' || !data) {
    return (
      <div className="space-y-6">
        {backLink}
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error || 'Could not load this client.'}
        </div>
      </div>
    )
  }

  const { client, appointments, careTasks } = data
  const clientActive = isActive(client.lastActiveAt)
  const hasPatients = client.patients.length > 0
  const members = client.patients
  const humans = members.filter(p => p.type !== 'pet').length
  const pets = members.filter(p => p.type === 'pet').length
  const totalActiveMeds = members.reduce((n, p) => n + (p.health.activeMedicationsCount || 0), 0)
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
  const memberLastMs = (p: (typeof members)[number]) =>
    [p.health.lastMealAt, p.health.lastWeightAt, p.health.lastVitalAt]
      .map(d => (d ? new Date(d).getTime() : 0))
      .reduce((a, b) => Math.max(a, b), 0)
  const activeMembers = members.filter(p => {
    const t = memberLastMs(p)
    return t > 0 && Date.now() - t < THIRTY_DAYS
  }).length

  return (
    <div className="space-y-6">
      {backLink}

      {/* Client header */}
      <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 text-2xl font-bold shrink-0">
              {(client.name.charAt(0) || '?').toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{client.email}</p>
              {client.phone && <p className="text-sm text-gray-500 dark:text-gray-400">{client.phone}</p>}
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

      {/* Client overview — at-a-glance household summary. */}
      {hasPatients && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Care recipients</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{members.length}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {humans} human{humans !== 1 ? 's' : ''}
              {pets > 0 ? ` · ${pets} pet${pets !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Active medications</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalActiveMeds}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">across the household</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Active members</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {activeMembers}
              <span className="text-base font-normal text-gray-400"> of {members.length}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">logged in last 30 days</p>
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">Last activity</p>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {relativeTime(client.lastActiveAt)}
            </p>
            <p className={`text-xs ${clientActive ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
              {clientActive ? 'Active' : 'Inactive'}
            </p>
          </div>
        </div>
      )}

      <ClientAppointments tenantId={tenantId} userId={userId} appointments={appointments} />

      <ClientCareTasks tenantId={tenantId} userId={userId} tasks={careTasks} />

      {/* Family Members / Patients */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Family Members</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {hasPatients ? `${client.patients.length} member${client.patients.length !== 1 ? 's' : ''}` : ''}
          </span>
        </div>

        {!hasPatients ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center">
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
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No family members yet</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Family members added by this client will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {client.patients.map(patient => (
              <Link
                key={patient.id}
                href={`/dashboard/families/${userId}/patients/${patient.id}`}
                className="block rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600 transition-all"
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
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 truncate">{patient.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getPatientBadgeLabel(patient, { isSelf: false }) || patient.type}
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
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
