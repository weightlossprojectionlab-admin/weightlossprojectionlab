'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  AcademicCapIcon,
  GiftIcon,
  ChartBarIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface AdminNavProps {
  pendingCounts?: {
    recipes?: number
    cases?: number
    aiDecisions?: number
    coaches?: number
  }
}

export function AdminNav({ pendingCounts }: AdminNavProps) {
  const pathname = usePathname()

  const navItems: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: HomeIcon,
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: UsersIcon,
    },
    {
      name: 'Recipes',
      href: '/admin/recipes',
      icon: DocumentCheckIcon,
      badge: pendingCounts?.recipes,
    },
    {
      name: 'Trust & Safety',
      href: '/admin/trust-safety',
      icon: ShieldCheckIcon,
      badge: pendingCounts?.cases,
    },
    {
      name: 'AI Decisions',
      href: '/admin/ai-decisions',
      icon: CpuChipIcon,
      badge: pendingCounts?.aiDecisions,
    },
    {
      name: 'Coaching',
      href: '/admin/coaching',
      icon: AcademicCapIcon,
      badge: pendingCounts?.coaches,
    },
    {
      name: 'Perks',
      href: '/admin/perks',
      icon: GiftIcon,
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: ChartBarIcon,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Cog6ToothIcon,
    },
  ]

  return (
    <nav className="w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen p-4 border-r border-gray-200 dark:border-gray-800">
      {/* Logo/Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">WLPL Admin</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Administration Panel</p>
      </div>

      {/* Navigation Items */}
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname?.startsWith(item.href))
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  flex items-center justify-between px-4 py-3 rounded-lg transition-colors
                  ${
                    isActive
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Back to App Link */}
      <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-600">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to App</span>
        </Link>
      </div>
    </nav>
  )
}
