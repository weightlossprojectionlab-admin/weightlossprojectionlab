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

  // Branding is public config (logo/color/company name are shown to every
  // visitor on the branded pages), so server-rendering it is fine. The only
  // sensitive value was the tenant.contact.adminEmail FALLBACK for supportEmail
  // — the owner's account email — which must not be server-rendered into the
  // payload. Drop it: supportEmail defaults to empty (the owner sets it here).
  return (
    <BrandingEditor
      tenantId={tenant.id}
      initial={{
        logoUrl: tenant.branding?.logoUrl || '',
        primaryColor: tenant.branding?.primaryColor || '262 83% 58%',
        companyName: tenant.branding?.companyName || tenant.name,
        supportEmail: tenant.branding?.supportEmail || '',
      }}
    />
  )
}
