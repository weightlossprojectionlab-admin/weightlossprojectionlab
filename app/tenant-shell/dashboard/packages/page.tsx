/**
 * Franchise Owner Dashboard — Care Packages tab.
 *
 * Server component: resolves the tenant from the x-tenant-slug header (set by
 * proxy.ts subdomain detection), loads the tenant's care packages via the
 * admin SDK for instant first paint, and hands off to the client builder. The
 * client-side auth wall is <TenantAuthGuard> (owner-level).
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { getAdminDb } from '@/lib/firebase-admin'
import { sortPackages } from '@/lib/care-packages'
import TenantAuthGuard from '@/components/tenant/TenantAuthGuard'
import CarePackageBuilder from '@/components/tenant/CarePackageBuilder'
import type { CarePackage } from '@/types/tenant'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  let initialPackages: CarePackage[] = []
  try {
    const snap = await getAdminDb()
      .collection('tenants')
      .doc(tenant.id)
      .collection('carePackages')
      .get()
    initialPackages = sortPackages(
      snap.docs.map(d => ({ ...(d.data() as Omit<CarePackage, 'id'>), id: d.id })),
    )
  } catch {
    // Soft-fail to an empty list; the client builder refetches after mutations.
    initialPackages = []
  }

  return (
    <TenantAuthGuard tenantId={tenant.id} nextPath="/dashboard/packages">
      <CarePackageBuilder tenantId={tenant.id} initialPackages={initialPackages} />
    </TenantAuthGuard>
  )
}
