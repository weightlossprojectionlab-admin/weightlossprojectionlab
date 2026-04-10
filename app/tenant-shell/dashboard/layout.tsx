/**
 * Dashboard Layout
 *
 * Wraps every dashboard page (/dashboard, /dashboard/families, ...) with a
 * shared header (tenant name + subdomain) and tab nav. Server component:
 * fetches the tenant once for the header so child pages don't have to
 * re-render the same chrome.
 *
 * Auth gating is still per-page (in client components like BrandingEditor /
 * the families list) because we don't have a server-side session cookie
 * pattern in this codebase. The layout renders for anyone who can reach
 * the route — the actual auth wall is the Firebase claim check inside the
 * client components, which redirects unauthorized users to /login.
 */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTenantBySlug } from '@/lib/tenant-server'
import { getPlanLimits } from '@/lib/franchise-plans'
import DashboardTabs from './DashboardTabs'

export const dynamic = 'force-dynamic'

/**
 * Format a "X / Y resource" string with sensible handling of unlimited and
 * over-cap states. Phase B slice 5: powers the families/staff seat counters
 * in the dashboard header.
 *
 *   - limit === -1 → "X resources" (no cap shown — enterprise plan)
 *   - used > limit → "X / Y resources (over)" (rare, but possible if a plan
 *     downgrade happens after seats were consumed)
 *   - used < 0     → clamped to 0 (defensive against counter drift)
 */
function formatSeatLine(
  used: number | undefined,
  limit: number,
  noun: string,
  nounPlural: string
): string {
  const u = Math.max(0, used || 0)
  const word = u === 1 ? noun : nounPlural
  if (limit === -1) return `${u} ${word}`
  return `${u} / ${limit} ${word}`
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers()
  const tenantSlug = headersList.get('x-tenant-slug')
  if (!tenantSlug) notFound()

  const tenant = await getTenantBySlug(tenantSlug)
  if (!tenant) notFound()

  // Resolve effective seat limits — snapshotted on the tenant doc wins,
  // fall back to FRANCHISE_PLANS lookup for tenants created before slice 5.
  const planLimits = getPlanLimits(tenant.billing?.plan)
  const familyLimit =
    typeof tenant.billing?.maxFamilies === 'number' && tenant.billing.maxFamilies >= 0
      ? tenant.billing.maxFamilies
      : planLimits.maxFamilies
  const staffLimit =
    typeof tenant.billing?.maxSeats === 'number' && tenant.billing.maxSeats >= 0
      ? tenant.billing.maxSeats
      : planLimits.maxSeats

  const familyLine = formatSeatLine(
    tenant.billing?.currentFamilies,
    familyLimit,
    'family',
    'families'
  )
  const staffLine = formatSeatLine(
    tenant.billing?.currentSeats,
    staffLimit,
    'staff member',
    'staff'
  )

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {tenant.branding?.companyName || tenant.name} Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {tenant.slug}.wellnessprojectionlab.com
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {familyLine}
            </span>
            <span className="mx-2 text-gray-300 dark:text-gray-600">·</span>
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              {staffLine}
            </span>
          </p>
        </header>

        <DashboardTabs />

        <div className="space-y-8">{children}</div>
      </div>
    </main>
  )
}
