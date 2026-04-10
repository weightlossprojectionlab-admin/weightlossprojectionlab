'use client'

/**
 * Dashboard Tabs
 *
 * Client-side tab nav for the franchise owner dashboard. Uses usePathname()
 * to highlight the active tab. Server can't render this directly because the
 * active state depends on client-side path matching.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Tab {
  href: string
  label: string
  // matchExact: only consider this tab active when pathname === href.
  // Defaults to false (prefix match), which is correct for nested sections.
  matchExact?: boolean
}

const TABS: Tab[] = [
  { href: '/dashboard', label: 'Overview', matchExact: true },
  { href: '/dashboard/families', label: 'Families' },
  { href: '/dashboard/staff', label: 'Staff' },
  { href: '/dashboard/branding', label: 'Branding' },
]

export default function DashboardTabs() {
  const pathname = usePathname() || ''

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700">
      <ul className="flex gap-1 -mb-px">
        {TABS.map(tab => {
          const isActive = tab.matchExact
            ? pathname === tab.href
            : pathname.startsWith(tab.href)
          return (
            <li key={tab.href}>
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
