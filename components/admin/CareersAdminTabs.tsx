'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BriefcaseIcon, InboxIcon } from '@heroicons/react/24/outline'

const TABS = [
  { href: '/admin/careers', label: 'Jobs', Icon: BriefcaseIcon },
  { href: '/admin/careers/applications', label: 'Applications', Icon: InboxIcon },
] as const

/**
 * Shared tab strip for the careers admin area. Active tab is matched
 * by pathname so both `/admin/careers` and `/admin/careers/applications`
 * surface the same navigation without one page knowing about the other.
 */
export function CareersAdminTabs() {
  const pathname = usePathname()

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex gap-1">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`inline-flex items-center gap-2 px-4 py-3 -mb-px border-b-2 text-sm font-medium transition-colors ${
                active
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
