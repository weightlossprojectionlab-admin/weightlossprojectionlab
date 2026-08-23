/**
 * Franchise Owner Dashboard — Care Packages tab (thin server shell).
 *
 * SECURITY: does NOT load the tenant's care packages server-side. It resolves
 * only the tenant id (non-sensitive) and renders the owner-only auth guard +
 * CarePackageBuilder, which fetches the packages from the gated
 * GET /api/tenant/[tenantId]/packages (verifyTenantAdminAuth) on mount. Care
 * packages are the agency's own pricing/drafts — business config, not personal
 * PII — but server-rendering them inside the client guard still put them in the
 * RSC payload for anyone who requested the URL; this closes that.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import TenantAuthGuard from '@/components/tenant/TenantAuthGuard'
import CarePackageBuilder from '@/components/tenant/CarePackageBuilder'
import RateCardEditor from '@/components/tenant/RateCardEditor'

export const dynamic = 'force-dynamic'

export default async function PackagesPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <TenantAuthGuard tenantId={tenant.id} nextPath="/dashboard/packages">
      <div className="space-y-8">
        <CarePackageBuilder tenantId={tenant.id} initialPackages={[]} />
        <RateCardEditor tenantId={tenant.id} />
      </div>
    </TenantAuthGuard>
  )
}
