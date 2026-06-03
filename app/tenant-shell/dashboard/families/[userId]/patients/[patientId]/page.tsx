/**
 * Patient Detail Page (deep per-person view)
 *
 * The white-label equivalent of the consumer per-patient screen. Reached
 * by clicking a family-member card on /dashboard/families/[userId].
 *
 * Shows trend charts (weight + vitals like blood pressure, glucose) and
 * the active medication list for ONE patient — the "monitor one person"
 * altitude, distinct from the roster views above it.
 *
 * Reuses the consumer chart primitives (WeightTrendChart, VitalTrendChart)
 * rather than re-implementing them (DRY). Data is loaded server-side via
 * the tenant Admin SDK path with a franchise-ownership gate — the consumer
 * /patients/[id] route is NOT reachable on a tenant subdomain (the proxy
 * only rewrites /, /dashboard*, /about), so this view has to live here.
 *
 * Route: {slug}.wellnessprojectionlab.com/dashboard/families/{userId}/patients/{patientId}
 * Proxy rewrites to: /tenant-shell/dashboard/families/[userId]/patients/[patientId]
 */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { loadPatientDetail } from '../../../../_lib/load-families'
import FamiliesAuthGuard from '../../../FamiliesAuthGuard'
import { WeightTrendChart } from '@/components/charts/WeightTrendChart'
import { VitalTrendChart } from '@/components/vitals/VitalTrendChart'
import type { VitalType } from '@/types/medical'
import { ChartBarIcon } from '@heroicons/react/24/outline'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ userId: string; patientId: string }>
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

export default async function PatientDetailPage({ params }: PageProps) {
  const { userId, patientId } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const patient = await loadPatientDetail(tenant.id, userId, patientId)
  if (!patient) notFound()

  // Which vital types actually have data, in our preferred render order.
  const presentTypes = (Object.keys(VITAL_CHART_LABELS) as VitalType[]).filter(
    type => patient.vitals.some(v => v.type === type)
  )

  const hasWeight = patient.weightSeries.length > 0
  const hasVitals = presentTypes.length > 0
  const hasMeds = patient.medications.length > 0

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
      <div className="space-y-6">
        {/* Back link */}
        <Link
          href={`/dashboard/families/${userId}`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; Back to {patient.clientName}
        </Link>

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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {patient.name}
              </h2>
              {patient.relationship && (
                <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {patient.relationship}
                </p>
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
                <div
                  key={type}
                  className="rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
                >
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

        {/* Empty state when nothing has been logged yet */}
        {!hasWeight && !hasVitals && !hasMeds && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 p-8 text-center">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No health data yet</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Weight, vitals, and medications will appear here once they&rsquo;re logged.
            </p>
          </div>
        )}
      </div>
    </FamiliesAuthGuard>
  )
}
