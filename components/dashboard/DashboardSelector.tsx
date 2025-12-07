/**
 * Dashboard Selector Component
 *
 * Helps users navigate to the right dashboard based on their role
 * Shows on relevant pages to increase visibility
 */

'use client'

import Link from 'next/link'
import {
  HomeIcon,
  UsersIcon,
  ChartBarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline'

interface DashboardLink {
  title: string
  description: string
  href: string
  icon: React.ReactNode
  color: string
}

export function DashboardSelector() {
  const dashboards: DashboardLink[] = [
    {
      title: 'Personal Dashboard',
      description: 'Your weight loss journey and meal tracking',
      href: '/dashboard',
      icon: <HomeIcon className="w-6 h-6" />,
      color: 'from-blue-600 to-blue-700'
    },
    {
      title: 'Family Admin Dashboard',
      description: 'Manage family health, tasks, and appointments',
      href: '/family-admin/dashboard',
      icon: <ClipboardDocumentListIcon className="w-6 h-6" />,
      color: 'from-purple-600 to-purple-700'
    },
    {
      title: 'Family Directory',
      description: 'View family members, invitations, and roles',
      href: '/family/dashboard',
      icon: <UsersIcon className="w-6 h-6" />,
      color: 'from-indigo-600 to-indigo-700'
    },
    {
      title: 'Progress Charts',
      description: 'Visualize weight, meals, and activity trends',
      href: '/progress',
      icon: <ChartBarIcon className="w-6 h-6" />,
      color: 'from-green-600 to-green-700'
    }
  ]

  return (
    <div className="bg-card rounded-lg border-2 border-border p-6">
      <h2 className="text-xl font-bold text-foreground mb-4">Quick Access Dashboards</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboards.map((dashboard) => (
          <Link
            key={dashboard.href}
            href={dashboard.href}
            className={`bg-gradient-to-r ${dashboard.color} rounded-lg shadow hover:shadow-lg transition-all p-6 text-white`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                {dashboard.icon}
              </div>
              <h3 className="text-lg font-bold">{dashboard.title}</h3>
            </div>
            <p className="text-sm text-white/90">{dashboard.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

/**
 * Compact version for smaller spaces
 */
export function DashboardSelectorCompact() {
  return (
    <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-lg shadow-lg p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold mb-1">Family Admin Dashboard</h3>
          <p className="text-sm text-purple-100">
            Manage all family health tasks, appointments, and daily oversight in one place
          </p>
        </div>
        <Link
          href="/family-admin/dashboard"
          className="px-6 py-3 bg-white text-purple-600 rounded-lg hover:bg-purple-50 transition-colors font-medium flex items-center gap-2 whitespace-nowrap"
        >
          <span>Go to Dashboard</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  )
}
