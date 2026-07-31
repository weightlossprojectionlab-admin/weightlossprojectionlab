/**
 * Client Detail Page — thin server shell.
 *
 * SECURITY: this page does NOT load the client's PII/PHI server-side. It only
 * resolves the tenant id (non-sensitive) from the subdomain and renders the
 * client-side auth guard + ClientWorkspace, which fetches the sensitive data
 * from the gated GET /api/tenant/[tenantId]/clients/[userId] AFTER the viewer
 * is authorized. Previously this server component loaded loadClientDetail (name,
 * email, phone, practiceNotes, per-patient health) and rendered it inside the
 * client guard, which serialized that PII/PHI into the RSC payload reachable by
 * anyone who requested the URL.
 *
 * Route: {slug}.wellnessprojectionlab.com/dashboard/families/{userId}
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import FamiliesAuthGuard from '../FamiliesAuthGuard'
import ClientWorkspace from '@/components/tenant/ClientWorkspace'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ userId: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const { userId } = await params
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
      <ClientWorkspace tenantId={tenant.id} userId={userId} />
    </FamiliesAuthGuard>
  )
}
