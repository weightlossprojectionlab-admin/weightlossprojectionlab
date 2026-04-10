/**
 * Franchise Owner Dashboard — Branding tab
 *
 * Moved from /dashboard to /dashboard/branding so the root /dashboard
 * can serve as the Overview page with family snapshot cards.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import BrandingEditor from '../BrandingEditor'

export const dynamic = 'force-dynamic'

export default async function BrandingPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <BrandingEditor
      tenantId={tenant.id}
      initial={{
        logoUrl: tenant.branding?.logoUrl || '',
        primaryColor: tenant.branding?.primaryColor || '262 83% 58%',
        companyName: tenant.branding?.companyName || tenant.name,
        supportEmail: tenant.branding?.supportEmail || tenant.contact?.adminEmail || '',
      }}
    />
  )
}
