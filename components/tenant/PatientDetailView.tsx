'use client'

/**
 * Patient detail view (white-label CRM) — one care recipient's trends + meds.
 *
 * SECURITY: fetches PHI (weight series, vitals, medications + dosage) CLIENT-side
 * from the gated GET /api/tenant/[tenantId]/clients/[userId]/patients/[patientId]
 * (verifyTenantStaffOrAdminAuth + managedBy + patient-under-user). Nothing
 * sensitive is server-rendered into the route payload — the page is a thin server
 * shell + the client-side FamiliesAuthGuard.
 *
 * Reuses the consumer chart primitives (WeightTrendChart, VitalTrendChart). Only
 * the PatientDetail TYPE is imported from the server-only loader module.
 */

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { auth } from '@/lib/firebase'
import { logger } from '@/lib/logger'
import { WeightTrendChart } from '@/components/charts/WeightTrendChart'
import { VitalTrendChart } from '@/components/vitals/VitalTrendChart'
import { ChartBarIcon } from '@heroicons/react/24/outline'
import type { VitalType } from '@/types/medical'
import type { PatientDetail } from '@/app/tenant-shell/dashboard/_lib/load-families'

interface Props {
  tenantId: string
  userId: string
  patientId: string
}

/** Friendly labels for the vital types we chart. Order here = render order. */
const VITAL_CHART_LABELS: Partial<Record<VitalType, string>> = {
  blood_pressure: 'Blood Pressure (mmHg)',
  blood_sugar: 'Glucose (mg/dL)',
  pulse_oximeter: 'Pulse Oximetry',
  temperature: 'Temperature (°F)',
  heartRate: 'Heart Rate (bpm)',
  respiratoryRate: 'Respiratory Rate',
}

export default function PatientDetailView({ tenantId, userId, patientId }: Props) {
  const [patient, setPatient] = useState<PatientDetail | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'notfound' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      if (!auth?.currentUser) throw new Error('You are not signed in.')
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(
        `/api/tenant/${tenantId}/clients/${userId}/patients/${patientId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.status === 404) {
        setState('notfound')
        return
      }
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.data?.patient) {
        throw new Error(json?.error || `Could not load patient (${res.status})`)
      }
      setPatient(json.data.patient as PatientDetail)
      setState('ready')
    } catch (err) {
      logger.error('[PatientDetailView] load failed', err as Error)
      setError(err instanceof Error ? err.message : 'Could not load this patient.')
      setState('error')
    }
  }, [tenantId, userId, patientId])

  useEffect(() => {
    void load()
  }, [load])

  const backLink = (label: string) => (
    <Link
      href={`/dashboard/families/${userId}`}
      className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
    >
      &larr; {label}
    </Link>
  )

  if (state === 'loading') {
    return (
      <div className="space-y-6">
        {backLink('Back')}
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading patient&hellip;
        </div>
      </div>
    )
  }
  if (state === 'notfound') {
    return (
      <div className="space-y-6">
        {backLink('Back')}
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center text-sm text-gray-600 dark:text-gray-300">
          This care recipient isn&rsquo;t on your roster.
        </div>
      </div>
    )
  }
  if (state === 'error' || !patient) {
    return (
      <div className="space-y-6">
        {backLink('Back')}
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error || 'Could not load this patient.'}
        </div>
      </div>
    )
  }

  const presentTypes = (Object.keys(VITAL_CHART_LABELS) as VitalType[]).filter(type =>
    patient.vitals.some(v => v.type === type)
  )
  const hasWeight = patient.weightSeries.length > 0
  const hasVitals = presentTypes.length > 0
  const hasMeds = patient.medications.length > 0

  return (
    <div className="space-y-6">
      {backLink(`Back to ${patient.clientName}`)}

      {/* Patient header */}
      <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center gap-4">
          <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 ${
            patient.type === 'pet'
              ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
          }`}>
            {(patient.name.charAt(0) || '?').toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{patient.name}</h2>
            {patient.relationship && (
              <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{patient.relationship}</p>
            )}
          </div>
        </div>
      </div>

      {/* Weight trend */}
      {hasWeight && (
        <section className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <ChartBarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Weight Trend</h3>
          </div>
          <WeightTrendChart data={patient.weightSeries} />
        </section>
      )}

      {/* Vital trends — one card per type with data */}
      {hasVitals && (
        <section className="space-y-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">Vital Trends</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {presentTypes.map(type => (
              <div key={type} className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
                <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  {VITAL_CHART_LABELS[type]}
                </h4>
                <VitalTrendChart vitals={patient.vitals} type={type} height={220} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Medications */}
      <section className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">💊</span>
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Medications</h3>
        </div>
        {hasMeds ? (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {patient.medications.map(med => (
              <li key={med.id} className="py-3 flex items-center justify-between gap-4">
                <span className="font-medium text-gray-900 dark:text-gray-100">{med.name}</span>
                <span className="text-sm text-gray-500 dark:text-gray-400 text-right">
                  {[med.dosage, med.frequency].filter(Boolean).join(' · ') || '—'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">No active medications.</p>
        )}
      </section>

      {/* Empty state */}
      {!hasWeight && !hasVitals && !hasMeds && (
        <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No health data yet</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Weight, vitals, and medications will appear here once they&rsquo;re logged.
          </p>
        </div>
      )}
    </div>
  )
}
