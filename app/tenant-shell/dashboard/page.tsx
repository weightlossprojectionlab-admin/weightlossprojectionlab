/**
 * Franchise Owner Dashboard
 *
 * Lives at {slug}.wellnessprojectionlab.com/dashboard via the proxy.ts rewrite
 * to /tenant-shell/dashboard. Inherits the branded tenant-shell layout.
 *
 * Auth gating happens client-side in the BrandingEditor + API route — the
 * server component just renders the shell. We don't have a server-side
 * session cookie pattern in this codebase yet, so the BrandingEditor
 * checks the Firebase client user on mount and redirects if claims don't match.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import BrandingEditor from './BrandingEditor'

export const dynamic = 'force-dynamic'

export default async function TenantDashboardPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {tenant.branding?.companyName || tenant.name} Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {tenant.slug}.wellnessprojectionlab.com
          </p>
        </header>

        <BrandingEditor
          tenantId={tenant.id}
          initial={{
            logoUrl: tenant.branding?.logoUrl || '',
            primaryColor: tenant.branding?.primaryColor || '262 83% 58%',
            companyName: tenant.branding?.companyName || tenant.name,
            supportEmail: tenant.branding?.supportEmail || tenant.contact?.adminEmail || '',
          }}
        />

        <p className="text-xs text-gray-400 dark:text-gray-500">
          More tools coming soon: staff invitations, managed families, billing.
        </p>
      </div>
    </main>
  )
}
