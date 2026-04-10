/**
 * Tenant Public Profile (/about)
 *
 * Phase B slice 8: rendered at {slug}.wellnessprojectionlab.com/about
 * via the proxy rewrite to /tenant-shell/about. The /find-a-provider
 * directory cards (slice 6) link here so prospective families can read
 * a richer profile before visiting the sign-in page or submitting a
 * management request.
 *
 * Server component. Reads the tenant via lib/tenant-server (Admin SDK)
 * so it works even though firestore.rules now restricts client-side
 * tenant doc reads (slice 8).
 *
 * Public-facing — never reveals fields the family shouldn't see (no
 * billing, no contact email, no internal flags). Only the branding
 * fields, practice type, location, and tagline.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  try {
    const headersList = await headers()
    const slug = headersList.get('x-tenant-slug')
    if (!slug) return { title: 'About — Wellness Projection Lab' }
    const tenant = await getTenantBySlug(slug)
    if (!tenant) return { title: 'About — Wellness Projection Lab' }
    const name = tenant.branding?.companyName || tenant.name
    return {
      title: `About ${name} — Wellness Projection Lab`,
      description:
        tenant.branding?.tagline ||
        `Learn about ${name}, an independent care practice powered by Wellness Projection Lab.`,
    }
  } catch {
    return { title: 'About — Wellness Projection Lab' }
  }
}

function toCss(color: string): string {
  return /^\d/.test(color) ? `hsl(${color})` : color
}

export default async function TenantAboutPage() {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  const branding = tenant.branding
  const accent = toCss(branding?.primaryColor || '#2563eb')
  const companyName = branding?.companyName || tenant.name
  const tagline = branding?.tagline
  const location = [tenant.contact?.city, tenant.contact?.state]
    .filter(Boolean)
    .join(', ')
  const subdomainUrl = `https://${tenant.slug}.wellnessprojectionlab.com`

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center space-y-6">
          {branding?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={branding.logoUrl}
              alt={`${companyName} logo`}
              className="mx-auto h-28 w-auto rounded-lg bg-white border border-gray-200 dark:border-gray-700 p-2"
            />
          ) : (
            <div
              className="mx-auto flex h-28 w-28 items-center justify-center rounded-lg text-4xl font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {companyName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              {companyName}
            </h1>
            {tenant.practiceType && (
              <p
                className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
                style={{ backgroundColor: `${accent}1a`, color: accent }}
              >
                {tenant.practiceType}
              </p>
            )}
            {tagline && (
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                {tagline}
              </p>
            )}
          </div>
        </header>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              About this practice
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {companyName} is an independent care practice powered by
              Wellness Projection Lab. They use the same HIPAA-compliant
              platform to track families, coordinate care, and surface
              health insights — under their own brand and on their own
              terms.
            </p>
          </div>

          {location && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Location
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 inline-flex items-center gap-1.5">
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                {location}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
              Where to find them
            </h3>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <a
                href={subdomainUrl}
                className="font-medium hover:underline"
                style={{ color: accent }}
              >
                {tenant.slug}.wellnessprojectionlab.com
              </a>
            </p>
          </div>

          {branding?.supportEmail && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">
                Contact
              </h3>
              <a
                href={`mailto:${branding.supportEmail}`}
                className="text-sm font-medium hover:underline"
                style={{ color: accent }}
              >
                {branding.supportEmail}
              </a>
            </div>
          )}
        </section>

        <div className="flex justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            Sign in to {companyName}
          </Link>
        </div>

        <footer className="text-center pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Looking for a different provider?{' '}
            <a
              href="https://www.wellnessprojectionlab.com/find-a-provider"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Browse all providers →
            </a>
          </p>
        </footer>
      </div>
    </main>
  )
}
