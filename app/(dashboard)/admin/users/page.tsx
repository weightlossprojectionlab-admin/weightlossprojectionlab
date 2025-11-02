'use client'

import { useState } from 'react'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

interface UserRecord {
  uid: string
  email: string
  displayName?: string
  createdAt: Date
  lastActiveAt?: Date
  role?: 'admin' | 'moderator' | 'support'
  suspended?: boolean
  mealLogsCount?: number
  weightLogsCount?: number
  stepLogsCount?: number
}

export default function AdminUsersPage() {
  const { isAdmin, role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<UserRecord[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an email or UID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`)

      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const data = await response.json()
      setSearchResults(data.users || [])

      if (data.users.length === 0) {
        setError('No users found')
      }
    } catch (err) {
      logger.error('Search error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to search users')
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async (uid: string) => {
    if (!permissions.canSuspendUsers) return
    if (!confirm('Are you sure you want to suspend this user?')) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, action: 'suspend' }),
      })

      if (!response.ok) throw new Error('Failed to suspend user')

      // Refresh search results
      await handleSearch()
      alert('User suspended successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to suspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnsuspend = async (uid: string) => {
    if (!permissions.canSuspendUsers) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, action: 'unsuspend' }),
      })

      if (!response.ok) throw new Error('Failed to unsuspend user')

      await handleSearch()
      alert('User unsuspended successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unsuspend user')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportData = async (uid: string, email: string) => {
    if (!permissions.canExportUserData) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/users/export?uid=${uid}`)

      if (!response.ok) throw new Error('Failed to export user data')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-data-${email}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to export user data')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async (uid: string, email: string) => {
    if (!permissions.canDeleteUsers) return
    if (!confirm(`Are you sure you want to DELETE user ${email}? This action cannot be undone!`)) return

    const confirmDelete = prompt(`Type "${email}" to confirm deletion:`)
    if (confirmDelete !== email) {
      alert('Deletion cancelled - email did not match')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid }),
      })

      if (!response.ok) throw new Error('Failed to delete user')

      setSearchResults(prev => prev.filter(u => u.uid !== uid))
      alert('User deleted successfully')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  if (!isAdmin || !permissions.canViewUsers) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-red-700 dark:text-red-300">
            You do not have permission to access user management.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Search and manage user accounts</p>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search by Email or UID
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="user@example.com or uid123..."
                className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Results */}
      {searchResults.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {searchResults.map((user) => (
                  <tr key={user.uid} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircleIcon className="h-8 w-8 text-gray-400" />
                        <div>
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {user.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {user.uid.slice(0, 12)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {user.role ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                          {user.role}
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-gray-500 text-sm">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.suspended ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                          Suspended
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {user.mealLogsCount ?? 0} meals
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last active: {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {permissions.canSuspendUsers && (
                          <button
                            onClick={() => user.suspended ? handleUnsuspend(user.uid) : handleSuspend(user.uid)}
                            disabled={actionLoading}
                            className={`p-2 rounded-lg transition-colors ${
                              user.suspended
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30'
                                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
                            }`}
                            title={user.suspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {user.suspended ? <CheckCircleIcon className="h-5 w-5" /> : <ShieldExclamationIcon className="h-5 w-5" />}
                          </button>
                        )}
                        {permissions.canExportUserData && (
                          <button
                            onClick={() => handleExportData(user.uid, user.email)}
                            disabled={actionLoading}
                            className="p-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                            title="Export GDPR data"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        )}
                        {permissions.canDeleteUsers && (
                          <button
                            onClick={() => handleDelete(user.uid, user.email)}
                            disabled={actionLoading}
                            className="p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
                            title="Delete user"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h3 className="text-lg font-semibold text-accent-dark mb-2">User Management Guidelines</h3>
        <ul className="space-y-2 text-sm text-accent-dark">
          <li>• Search by email or UID to find specific users</li>
          <li>• Suspend users to temporarily disable their account access</li>
          <li>• Export user data for GDPR compliance requests</li>
          <li>• Delete users only when absolutely necessary - this action is permanent</li>
          <li>• All actions are logged in the audit trail for compliance</li>
        </ul>
      </div>
    </div>
  )
}
