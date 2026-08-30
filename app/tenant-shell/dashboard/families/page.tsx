/**
 * Franchise Owner Dashboard — Families tab (thin server shell).
 *
 * SECURITY: does NOT load the roster server-side. Resolves the tenant id
 * (non-sensitive) from the subdomain and renders the client-side auth guard +
 * FamiliesRoster, which fetches the roster PII (family names/emails, care-
 * recipient names, pending-request emails + messages) from the gated
 * GET /api/tenant/[tenantId]/managed-families AFTER the viewer is authorized.
 * Previously this server component loaded loadManagedFamilies/loadPendingRequests
 * and rendered them inside the client guard, serializing the PII into the RSC
 * payload reachable by anyone who requested the URL.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import FamiliesAuthGuard from './FamiliesAuthGuard'
import FamiliesRoster from './FamiliesRoster'

export const dynamic = 'force-dynamic'

export default async function FamiliesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <FamiliesAuthGuard tenantId={tenant.id}>
      <FamiliesRoster tenantId={tenant.id} />
    </FamiliesAuthGuard>
  )
}
