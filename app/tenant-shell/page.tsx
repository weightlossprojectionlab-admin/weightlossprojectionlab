/**
 * Tenant Landing Page
 *
 * Rendered at the root of every tenant subdomain
 * (e.g. demo.wellnessprojectionlab.com/). Internally served from
 * /tenant-shell via the rewrite in proxy.ts.
 */

import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'

export const dynamic = 'force-dynamic'

export default async function TenantLandingPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const branding = tenant.branding
  const rawPrimary = branding?.primaryColor || '#2563eb'
  // Tenant primaryColor is stored as a bare HSL triplet like "262 83% 58%"
  // (see types/tenant.ts). Detect that and wrap with hsl(...) so it's a valid CSS color.
  // Fall back to the raw value (e.g. hex) otherwise.
  const primary = /^\d/.test(rawPrimary) ? `hsl(${rawPrimary})` : rawPrimary
  const companyName = branding?.companyName || tenant.name

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-2xl text-center space-y-8">
        {branding?.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={branding.logoUrl} alt={`${companyName} logo`} className="mx-auto h-24 w-auto" />
        ) : (
          <div
            className="mx-auto flex h-24 w-24 items-center justify-center rounded-full text-3xl font-bold text-white"
            style={{ backgroundColor: primary }}
          >
            {companyName.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Welcome to {companyName}
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Family health tracking for caregivers — powered by Wellness Projection Lab.
          </p>
        </div>

        <div className="flex justify-center pt-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: primary }}
          >
            Sign in to {companyName}
          </Link>
        </div>

        {branding?.supportEmail && (
          <p className="text-sm text-gray-500 dark:text-gray-400 pt-6">
            Need help? Contact{' '}
            <a href={`mailto:${branding.supportEmail}`} className="underline">
              {branding.supportEmail}
            </a>
          </p>
        )}

        {/* Wrong door — point families at the WPL front door where they
            can sign up and (eventually) browse providers from inside their account. */}
        <p className="text-xs text-gray-400 dark:text-gray-500 pt-8 border-t border-gray-200 dark:border-gray-700 mt-8">
          Are you a family looking for a care provider?{' '}
          <a
            href="https://www.wellnessprojectionlab.com"
            className="underline hover:text-gray-600 dark:hover:text-gray-300"
          >
            Visit Wellness Projection Lab &rarr;
          </a>
        </p>
      </div>
    </main>
  )
}
