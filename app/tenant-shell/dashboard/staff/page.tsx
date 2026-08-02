/**
 * Franchise Owner Dashboard — Staff tab
 *
 * Admin-only. Staff cannot manage other staff.
 *
 * SECURITY: this page does NOT fetch the invitation list server-side. The
 * invitation PII (emails) is loaded CLIENT-side inside StaffManager via the
 * admin-only GET /api/tenant/[tenantId]/invitations, so it never lands in the
 * RSC payload sent to a franchise_staff viewer (whom StaffAuthGuard bounces).
 * The page only resolves the tenant id (not sensitive) from the subdomain.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import StaffAuthGuard from './StaffAuthGuard'
import StaffManager from './StaffManager'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <StaffAuthGuard tenantId={tenant.id}>
      <StaffManager tenantId={tenant.id} />
    </StaffAuthGuard>
  )
}
