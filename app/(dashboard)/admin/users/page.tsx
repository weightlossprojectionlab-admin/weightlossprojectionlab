'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAdminAuth } from '@/hooks/useAdminAuth'
import { getPermissions } from '@/lib/admin/permissions'
import { logger } from '@/lib/logger'
import { auth } from '@/lib/firebase'
import {
  MagnifyingGlassIcon,
  UserCircleIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  DocumentArrowDownIcon,
  TrashIcon,
  ChartBarIcon,
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
  const router = useRouter()
  const { isAdmin, role } = useAdminAuth()
  const permissions = getPermissions(role)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Ref for intersection observer
  const observerTarget = useRef<HTMLDivElement>(null)

  // Helper to get auth token
  const getAuthToken = async () => {
    const user = auth.currentUser
    if (!user) {
      throw new Error('User not authenticated')
    }
    return await user.getIdToken()
  }

  // Handler for viewing user analytics
  const handleViewUserAnalytics = (user: UserRecord) => {
    // Navigate to analytics page with user filter
    router.push(`/admin/analytics?uid=${user.uid}&email=${encodeURIComponent(user.email)}`)
  }

  // Load users on mount
  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = useCallback(async (pageToken?: string, append: boolean = false) => {
    if (append) {
      setIsLoadingMore(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const token = await getAuthToken()
      const params = new URLSearchParams()
      params.set('limit', '50')
      if (pageToken) params.set('pageToken', pageToken)

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to load users' }))
        throw new Error(errorData.error || 'Failed to load users')
      }

      const data = await response.json()

      if (append) {
        // Append new users to existing list
        setUsers(prev => [...prev, ...(data.users || [])])
      } else {
        // Replace users list
        setUsers(data.users || [])
      }

      setNextPageToken(data.nextPageToken)
      setHasMore(!!data.nextPageToken)
    } catch (err) {
      logger.error('Load users error:', err as Error)
      setError(err instanceof Error ? err.message : 'Failed to load users')
    } finally {
      setLoading(false)
      setIsLoadingMore(false)
    }
  }, [])

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      // If search is empty, reload all users
      loadUsers()
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/users?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to search users' }))
        throw new Error(errorData.error || 'Failed to search users')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setHasMore(false) // No pagination for search results
      setNextPageToken(undefined)

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

  const handleClearSearch = () => {
    setSearchQuery('')
    loadUsers()
  }

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Only load more if:
        // 1. Element is visible
        // 2. There are more users to load
        // 3. Not currently loading
        // 4. Not in search mode (searchQuery empty)
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !loading && !searchQuery) {
          loadUsers(nextPageToken, true)
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // Start loading 100px before reaching bottom
        threshold: 0.1
      }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, isLoadingMore, loading, nextPageToken, searchQuery, loadUsers])

  const handleSuspend = async (uid: string) => {
    if (!permissions.canSuspendUsers) return
    if (!confirm('Are you sure you want to suspend this user?')) return

    setActionLoading(true)
    try {
      const token = await getAuthToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, action: 'suspend' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to suspend user' }))
        throw new Error(errorData.error || 'Failed to suspend user')
      }

      // Refresh list
      if (searchQuery) {
        await handleSearch()
      } else {
        await loadUsers()
      }
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
      const token = await getAuthToken()
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid, action: 'unsuspend' }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to unsuspend user' }))
        throw new Error(errorData.error || 'Failed to unsuspend user')
      }

      // Refresh list
      if (searchQuery) {
        await handleSearch()
      } else {
        await loadUsers()
      }
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
      const token = await getAuthToken()
      const response = await fetch(`/api/admin/users/export?uid=${uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to export user data' }))
        throw new Error(errorData.error || 'Failed to export user data')
      }

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
      const token = await getAuthToken()
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ uid }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to delete user' }))
        throw new Error(errorData.error || 'Failed to delete user')
      }

      setUsers(prev => prev.filter(u => u.uid !== uid))
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
        <div className="bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-900 dark:text-red-200 mb-2">Access Denied</h2>
          <p className="text-error-dark dark:text-red-300">
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
        <h1 className="text-3xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground mt-1">Search and manage user accounts</p>
      </div>

      {/* Search */}
      <div className="bg-card rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
              Search by Email or UID
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="user@example.com or uid123..."
                className="w-full pl-10 pr-4 py-3 border border-border bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={handleSearch}
              disabled={loading}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                disabled={loading}
                className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 font-medium"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-error-light dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-error-dark dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && users.length === 0 && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading users...</p>
        </div>
      )}

      {/* Results */}
      {!loading && users.length > 0 && (
        <div className="bg-card rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    UID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Activity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.uid} className="hover:bg-background">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <UserCircleIcon className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium text-foreground">
                            {user.displayName || 'No name'}
                          </div>
                          <div className="text-sm text-muted-foreground dark:text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {user.uid.slice(0, 12)}...
                      </code>
                    </td>
                    <td className="px-6 py-4">
                      {user.role ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary-light dark:bg-purple-900/20 text-purple-800 dark:text-purple-200">
                          {user.role}
                        </span>
                      ) : (
                        <span className="text-muted-foreground dark:text-muted-foreground text-sm">User</span>
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
                      <div className="text-sm text-foreground">
                        {user.mealLogsCount ?? 0} meals
                      </div>
                      <div className="text-xs text-muted-foreground dark:text-muted-foreground">
                        Last active: {user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleDateString() : 'Never'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUserAnalytics(user)}
                          className="p-2 bg-indigo-100 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/30 transition-colors"
                          title="View analytics"
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                        {permissions.canSuspendUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              user.suspended ? handleUnsuspend(user.uid) : handleSuspend(user.uid)
                            }}
                            disabled={actionLoading}
                            className={`p-2 rounded-lg transition-colors ${
                              user.suspended
                                ? 'bg-green-100 dark:bg-green-900/20 text-success-dark dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/30'
                                : 'bg-yellow-100 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-200 dark:hover:bg-yellow-900/30'
                            }`}
                            title={user.suspended ? 'Unsuspend' : 'Suspend'}
                          >
                            {user.suspended ? <CheckCircleIcon className="h-5 w-5" /> : <ShieldExclamationIcon className="h-5 w-5" />}
                          </button>
                        )}
                        {permissions.canExportUserData && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportData(user.uid, user.email)
                            }}
                            disabled={actionLoading}
                            className="p-2 bg-blue-100 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
                            title="Export GDPR data"
                          >
                            <DocumentArrowDownIcon className="h-5 w-5" />
                          </button>
                        )}
                        {permissions.canDeleteUsers && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(user.uid, user.email)
                            }}
                            disabled={actionLoading}
                            className="p-2 bg-red-100 dark:bg-red-900/20 text-error-dark dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
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

          {/* Lazy Loading Indicator */}
          {!searchQuery && (
            <div className="px-6 py-4 border-t border-border">
              {isLoadingMore && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                  <span className="text-sm">Loading more users...</span>
                </div>
              )}
              {!isLoadingMore && hasMore && (
                <div className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  Scroll down to load more users
                </div>
              )}
              {!hasMore && users.length > 0 && (
                <div className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
                  All users loaded ({users.length} total)
                </div>
              )}
            </div>
          )}

          {/* Intersection Observer Target */}
          {!searchQuery && hasMore && (
            <div ref={observerTarget} className="h-4"></div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!loading && users.length === 0 && !error && (
        <div className="bg-card rounded-lg shadow p-12 text-center">
          <UserCircleIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">No Users Found</p>
          <p className="text-muted-foreground">
            {searchQuery ? 'Try a different search query' : 'No users registered yet'}
          </p>
        </div>
      )}

      {/* Info */}
      <div className="mt-8 bg-indigo-100 dark:bg-indigo-900/20 border border-accent rounded-lg p-6">
        <h2 className="text-lg font-semibold text-accent-dark mb-2">User Management Guidelines</h2>
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
