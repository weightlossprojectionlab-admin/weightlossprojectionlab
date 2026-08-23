'use client'

/**
 * Dashboard Tabs
 *
 * Client-side tab nav for the franchise dashboard. Uses usePathname() to
 * highlight the active tab.
 *
 * Role-aware: owner-only sections (Packages / Staff / Branding) are hidden from
 * franchise_staff — the scoped "Staff" actor UI. Only an owner-level viewer
 * (super admin, or this tenant's franchise_admin) sees them. The owner-only
 * tabs default to HIDDEN and appear once the viewer is confirmed owner-level,
 * so staff never briefly flash tabs they'd only get bounced from (the pages
 * themselves are already guarded, e.g. StaffAuthGuard — this is the matching UI).
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTenantRole } from '@/hooks/useTenantRole'

interface Tab {
  href: string
  label: string
  // matchExact: only consider this tab active when pathname === href.
  // Defaults to false (prefix match), which is correct for nested sections.
  matchExact?: boolean
  // ownerOnly: hidden from franchise_staff; only owner-level viewers see it.
  ownerOnly?: boolean
}

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Overview', matchExact: true },
  { href: '/dashboard/families', label: 'Families' },
  { href: '/dashboard/packages', label: 'Packages', ownerOnly: true },
  { href: '/dashboard/staff', label: 'Staff', ownerOnly: true },
  { href: '/dashboard/branding', label: 'Branding', ownerOnly: true },
]

interface Props {
  tenantId: string
}

export default function DashboardTabs({ tenantId }: Props) {
  const pathname = usePathname() || ''

  // Owner-level = super admin OR this tenant's franchise_admin. Until the role
  // check resolves, useTenantRole reports isOwnerLevel=false, so franchise_staff
  // never flash owner-only tabs; they reveal once confirmed owner.
  const { isOwnerLevel } = useTenantRole(tenantId)

  const visibleTabs = TABS.filter(tab => !tab.ownerOnly || isOwnerLevel)

  // overflow-x-auto + shrink-0 tabs: on a narrow phone the tab row scrolls
  // WITHIN the nav instead of widening the whole page (horizontal overflow).
  return (
    <nav data-testid="dashboard-tabs" className="border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      <ul className="flex gap-1 -mb-px">
        {visibleTabs.map(tab => {
          const isActive = tab.matchExact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          return (
            <li key={tab.href} className="shrink-0">
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-block px-4 py-3 text-sm font-medium border-b-2 transition ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
