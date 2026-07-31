/**
 * Patient Detail Page — thin server shell.
 *
 * SECURITY: does NOT load PHI server-side. Resolves the tenant id (non-sensitive)
 * from the subdomain and renders the client-side auth guard + PatientDetailView,
 * which fetches the PHI (weight series, vitals, meds + dosage) from the gated
 * GET /api/tenant/[tenantId]/clients/[userId]/patients/[patientId] AFTER the
 * viewer is authorized. Previously this server component loaded loadPatientDetail
 * and rendered the PHI inside the client guard, serializing it into the RSC
 * payload reachable by anyone who requested the URL.
 *
 * Route: {slug}.wellnessprojectionlab.com/dashboard/families/{userId}/patients/{patientId}
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import FamiliesAuthGuard from '../../../FamiliesAuthGuard'
import PatientDetailView from '@/components/tenant/PatientDetailView'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ userId: string; patientId: string }>
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { userId, patientId } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
      <PatientDetailView tenantId={tenant.id} userId={userId} patientId={patientId} />
    </FamiliesAuthGuard>
  )
}
