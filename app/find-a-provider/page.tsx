/**
 * Find a Provider
 *
 * Phase B slice 6: family-side directory of active franchise tenants.
 * Lives at the apex (`/find-a-provider`) so consumer end-users can
 * discover practices without needing to know any subdomain.
 *
 * Server component. Loads the active tenants once via lib/tenant-server,
 * then filters by the searchParams the client filter component writes
 * to the URL. Filtering is intentionally server-side so deep links
 * (`/find-a-provider?type=Wellness%20Coach&q=NJ`) render correctly on
 * first paint without a client hydration step.
 *
 * Slice 7 will add the "Request to be managed by {Company}" CTA. For
 * now this slice ships the directory itself — discovery without a
 * call to action is the foundation; the CTA is the next layer.
 */

import type { Metadata } from 'next'
import Link from 'next/link'
import { listPublicTenants } from '@/lib/tenant-server'
import ProviderDirectoryFilters from './ProviderDirectoryFilters'
import RequestToBeManagedButton from './RequestToBeManagedButton'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Find a Provider — Wellness Projection Lab',
  description:
    'Browse independent care providers — solo nurses, wellness coaches, concierge doctors, and home care agencies — building their practices on Wellness Projection Lab.',
}

interface PageProps {
  searchParams: Promise<{ q?: string; type?: string }>
}

interface ProviderRow {
  id: string
  slug: string
  displayName: string
  practiceType: string
  city: string
  state: string
  tagline: string
  primaryColor: string
  logoUrl: string
}

function shapeRow(t: any): ProviderRow {
  const branding = t.branding || {}
  return {
    id: t.id,
    slug: t.slug,
    displayName: branding.companyName || t.name || t.slug,
    practiceType: t.practiceType || '',
    city: t.contact?.city || '',
    state: t.contact?.state || '',
    tagline: branding.tagline || '',
    primaryColor: branding.primaryColor || '262 83% 58%',
    logoUrl: branding.logoUrl || '',
  }
}

function toCss(color: string): string {
  return /^\d/.test(color) ? `hsl(${color})` : color
}

export default async function FindAProviderPage({ searchParams }: PageProps) {
  const params = await searchParams
  const queryRaw = (params.q ?? '').trim().toLowerCase()
  const typeFilter = (params.type ?? '').trim()

  const allTenants = await listPublicTenants()
  const allRows = allTenants.map(shapeRow)

  // Apply filters in order: type → free-text. Both filters are
  // case-insensitive substring matches against shaped fields.
  let rows = allRows
  if (typeFilter) {
    rows = rows.filter(r => r.practiceType === typeFilter)
  }
  if (queryRaw) {
    rows = rows.filter(r => {
      const haystack = [r.displayName, r.slug, r.city, r.state, r.tagline]
        .join(' ')
        .toLowerCase()
      return haystack.includes(queryRaw)
    })
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Find a Care Provider
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Independent nurses, wellness coaches, doctors, and care agencies
            building their practices on Wellness Projection Lab. Pick the one
            that fits your family.
          </p>
        </header>

        <section className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6">
          <ProviderDirectoryFilters />
        </section>

        <section>
          {rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-12 text-center">
              <p className="text-base font-medium text-gray-900 dark:text-gray-100">
                No providers match those filters.
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Try clearing your search, or browse all providers below.
              </p>
              <Link
                href="/find-a-provider"
                className="mt-4 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Clear filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {rows.map(row => {
                const accent = toCss(row.primaryColor)
                const subdomainUrl = `https://${row.slug}.wellnessprojectionlab.com/about`
                return (
                  <div
                    key={row.id}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition"
                  >
                    <a href={subdomainUrl} className="block group">
                      <div className="flex items-center gap-3 mb-3">
                        {row.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.logoUrl}
                            alt={`${row.displayName} logo`}
                            className="h-12 w-12 object-contain rounded bg-white border border-gray-200 dark:border-gray-700"
                          />
                        ) : (
                          <div
                            className="h-12 w-12 rounded flex items-center justify-center text-white text-lg font-bold"
                            style={{ backgroundColor: accent }}
                          >
                            {row.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate group-hover:underline">
                            {row.displayName}
                          </h2>
                          {row.practiceType && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {row.practiceType}
                            </p>
                          )}
                        </div>
                      </div>
                      {row.tagline && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                          {row.tagline}
                        </p>
                      )}
                      {(row.city || row.state) && (
                        <p className="mt-3 text-xs text-gray-500 dark:text-gray-500 inline-flex items-center gap-1">
                          <svg
                            className="h-3.5 w-3.5"
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
                          {[row.city, row.state].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </a>
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex items-start justify-between gap-3">
                      <RequestToBeManagedButton
                        tenantId={row.id}
                        tenantName={row.displayName}
                      />
                      <a
                        href={subdomainUrl}
                        className="text-xs font-semibold whitespace-nowrap"
                        style={{ color: accent }}
                      >
                        Visit →
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <p className="text-center text-xs text-gray-500 dark:text-gray-400 pt-4">
          Showing {rows.length} of {allRows.length}{' '}
          {allRows.length === 1 ? 'provider' : 'providers'}.
        </p>

        <footer className="text-center pt-8 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Are you a care provider?{' '}
            <Link
              href="/franchise"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Build your own practice on Wellness Projection Lab →
            </Link>
          </p>
        </footer>
      </div>
    </main>
  )
}
