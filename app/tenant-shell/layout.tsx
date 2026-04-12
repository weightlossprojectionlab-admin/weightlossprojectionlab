/**
 * Tenant Shell Layout
 *
 * Internal route group that proxy.ts rewrites to when a request arrives on a
 * tenant subdomain (e.g. demo.wellnessprojectionlab.com). The URL bar still
 * shows the tenant subdomain — this segment is never user-visible.
 *
 * Responsibilities:
 *  - Read x-tenant-slug from the request headers (set by proxy.ts)
 *  - Fetch the tenant document from Firestore via Admin SDK
 *  - 404 if tenant does not exist
 *  - Show "not active" message if status is not active/paid
 *  - Pass branding into the existing client TenantProvider for descendants
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'

export const dynamic = 'force-dynamic'

export default async function TenantShellLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')

  if (!tenantSlug) {
    // Direct hit on /tenant-shell without a subdomain — should never happen
    notFound()
  }

  const tenant = await getTenantBySlug(tenantSlug)

  if (!tenant) {
    notFound()
  }

  // Branded waiting page while Stripe webhook confirms the setup-fee payment.
  // Closes the few-second gap between checkout completion and webhook delivery,
  // and also covers declined-card / manual-review edge cases.
  if (tenant.status === 'pending_payment') {
    const primary = (() => { const r = tenant.branding?.primaryColor || '#2563eb'; return /^\d/.test(r) ? `hsl(${r})` : r })()
    const companyName = tenant.branding?.companyName || tenant.name
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md text-center space-y-6">
          {tenant.branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={tenant.branding.logoUrl} alt={`${companyName} logo`} className="mx-auto h-20 w-auto" />
          ) : (
            <div
              className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white"
              style={{ backgroundColor: primary }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {companyName}
          </h1>
          <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
            <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span>Confirming your payment&hellip;</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            We&apos;re waiting on confirmation from Stripe. This usually takes just a few seconds.
            You&apos;ll receive an email at the address you applied with as soon as your platform is live.
          </p>
        </div>
      </main>
    )
  }

  if (tenant.status !== 'active' && tenant.status !== 'paid') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {tenant.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            This organization is not currently active. Please contact your administrator.
          </p>
        </div>
      </main>
    )
  }

  const brandingColor = (() => { const r = tenant.branding?.primaryColor || '#2563eb'; return /^\d/.test(r) ? `hsl(${r})` : r })()

  return (
    <div
      data-tenant-slug={tenant.slug}
      data-tenant-id={tenant.id}
      data-practice-type={tenant.practiceType || ''}
      style={{ ['--tenant-primary' as string]: brandingColor }}
    >
      {children}
    </div>
  )
}
