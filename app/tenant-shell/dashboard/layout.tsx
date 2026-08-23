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
import { countManagedFamilies } from './_lib/load-families'
import DashboardTabs from './DashboardTabs'
import TenantHeaderStats from '@/components/tenant/TenantHeaderStats'

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

  // Derive the family "used" count from the actual managed-families data, not
  // the billing.currentFamilies seat counter (which drifts and showed a wrong
  // "N / 200" in the header).
  const managedFamilyCount = await countManagedFamilies(tenant.id)
  const familyLine = formatSeatLine(
    managedFamilyCount,
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
          {/* Practice-capacity readout is owner-only — hidden from staff, who
              get the focused "My Day" caregiver view. Gated client-side. */}
          <TenantHeaderStats tenantId={tenant.id} familyLine={familyLine} staffLine={staffLine} />
        </header>

        <DashboardTabs tenantId={tenant.id} />

        <div className="space-y-8">{children}</div>
      </div>
    </main>
  )
}
