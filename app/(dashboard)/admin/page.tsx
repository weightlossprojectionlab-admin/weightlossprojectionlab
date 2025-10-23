'use client'

import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { useAdminStats } from '@/hooks/useAdminStats'
import { getRoleDisplayName, getRoleBadgeColor } from '@/lib/admin/permissions'
import {
  UsersIcon,
  DocumentCheckIcon,
  ShieldCheckIcon,
  CpuChipIcon,
  ChartBarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export default function AdminDashboardPage() {
  const { role, isSuperAdmin } = useAdminAuth()
  const { stats, loading, error } = useAdminStats()

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: UsersIcon,
      href: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Active Today',
      value: stats.activeUsersToday,
      icon: ClockIcon,
      href: '/admin/users',
      color: 'bg-green-500',
    },
    {
      title: 'Pending Recipes',
      value: stats.pendingRecipes,
      icon: DocumentCheckIcon,
      href: '/admin/recipes',
      color: 'bg-yellow-500',
      badge: stats.pendingRecipes > 0,
    },
    {
      title: 'Open Cases',
      value: stats.openCases,
      icon: ShieldCheckIcon,
      href: '/admin/trust-safety',
      color: 'bg-red-500',
      badge: stats.openCases > 0,
    },
    {
      title: 'AI Decisions to Review',
      value: stats.lowConfidenceAIDecisions,
      icon: CpuChipIcon,
      href: '/admin/ai-decisions',
      color: 'bg-purple-500',
      badge: stats.lowConfidenceAIDecisions > 0,
    },
    {
      title: 'Total Recipes',
      value: stats.totalRecipes,
      icon: ChartBarIcon,
      href: '/admin/analytics',
      color: 'bg-indigo-500',
    },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Admin Dashboard</h1>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-gray-600 dark:text-gray-400">Role:</span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleBadgeColor(role)}`}>
            {getRoleDisplayName(role)}
          </span>
          {isSuperAdmin && (
            <span className="px-3 py-1 rounded-full text-sm font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg">
              ⭐ Super Admin
            </span>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-900 dark:text-red-200 font-semibold mb-1">Error Loading Stats</h3>
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Platform Health Overview */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Platform Health</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((card) => {
              const Icon = card.icon
              return (
                <Link key={card.title} href={card.href}>
                  <div className="bg-white dark:bg-gray-900 rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${card.color} p-3 rounded-lg`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      {card.badge && (
                        <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                          Action Required
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{card.title}</h3>
                    <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{card.value.toLocaleString()}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Search Users</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Find and manage user accounts</p>
          </Link>
          <Link
            href="/admin/recipes"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Review Recipes</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Moderate pending recipe submissions</p>
          </Link>
          <Link
            href="/admin/trust-safety"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Handle Cases</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Resolve trust & safety issues</p>
          </Link>
          <Link
            href="/admin/ai-decisions"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Review AI Decisions</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Oversee AI-powered decisions</p>
          </Link>
          <Link
            href="/admin/analytics"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">View Analytics</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Platform metrics and reports</p>
          </Link>
          <Link
            href="/admin/settings"
            className="bg-white dark:bg-gray-900 rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">System Settings</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Configure admin panel</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity (TODO) */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Admin Activity</h2>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <p className="text-gray-500 text-center py-8">
            No recent activity to display. Admin actions will appear here.
          </p>
        </div>
      </div>
    </div>
  )
}
